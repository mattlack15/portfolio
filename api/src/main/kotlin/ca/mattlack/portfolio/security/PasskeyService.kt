package ca.mattlack.portfolio.security

import ca.mattlack.portfolio.model.PasskeyCredential
import ca.mattlack.portfolio.repo.PasskeyCredentialRepo
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.yubico.webauthn.AssertionRequest
import com.yubico.webauthn.CredentialRepository
import com.yubico.webauthn.FinishAssertionOptions
import com.yubico.webauthn.FinishRegistrationOptions
import com.yubico.webauthn.RegisteredCredential
import com.yubico.webauthn.RelyingParty
import com.yubico.webauthn.StartAssertionOptions
import com.yubico.webauthn.StartRegistrationOptions
import com.yubico.webauthn.data.AuthenticatorSelectionCriteria
import com.yubico.webauthn.data.AuthenticatorTransport
import com.yubico.webauthn.data.ByteArray
import com.yubico.webauthn.data.PublicKeyCredential
import com.yubico.webauthn.data.PublicKeyCredentialCreationOptions
import com.yubico.webauthn.data.PublicKeyCredentialDescriptor
import com.yubico.webauthn.data.RelyingPartyIdentity
import com.yubico.webauthn.data.ResidentKeyRequirement
import com.yubico.webauthn.data.UserIdentity
import com.yubico.webauthn.data.UserVerificationRequirement
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException
import java.security.SecureRandom
import java.time.Duration
import java.time.Instant
import java.util.Base64
import java.util.Optional
import java.util.concurrent.ConcurrentHashMap

@Service
class PasskeyService(
    private val credentialRepo: PasskeyCredentialRepo,
    private val sessions: EditorSessionService,
    private val objectMapper: ObjectMapper,
    @Value("\${passkey.rp-id}") private val rpId: String,
    @Value("\${passkey.origins}") originsValue: String,
) {
    companion object {
        private const val OWNER_USERNAME = "owner"
        private const val OWNER_DISPLAY_NAME = "Portfolio owner"
    }

    private val origins = originsValue.split(',').map(String::trim).filter(String::isNotBlank).toSet()
    private val random = SecureRandom()
    private val ceremonyLifetime = Duration.ofMinutes(5)
    private val pendingRegistrations = ConcurrentHashMap<String, PendingRegistration>()
    private val pendingAssertions = ConcurrentHashMap<String, PendingAssertion>()
    private val registrationLock = Mutex()

    data class Status(val configured: Boolean)
    data class CeremonyOptions(val ceremonyId: String, val options: JsonNode)
    data class CredentialResponse(val ceremonyId: String, val credential: JsonNode)
    data class SessionResponse(val token: String, val expiresAt: Instant)

    private data class PendingRegistration(
        val request: PublicKeyCredentialCreationOptions,
        val userHandle: ByteArray,
        val expiresAt: Instant,
    )

    private data class PendingAssertion(
        val request: AssertionRequest,
        val expiresAt: Instant,
    )

    suspend fun status(): Status = Status(credentialRepo.count() > 0)

    suspend fun startRegistration(): CeremonyOptions {
        if (credentialRepo.count() > 0) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "A passkey is already configured")
        }

        purgeExpiredCeremonies()
        val userHandle = ByteArray(ByteArray(32).also(random::nextBytes))
        val user = UserIdentity.builder()
            .name(OWNER_USERNAME)
            .displayName(OWNER_DISPLAY_NAME)
            .id(userHandle)
            .build()
        val selection = AuthenticatorSelectionCriteria.builder()
            .residentKey(ResidentKeyRequirement.REQUIRED)
            .userVerification(UserVerificationRequirement.REQUIRED)
            .build()
        val relyingParty = relyingParty(emptyList())
        val request = relyingParty.startRegistration(
            StartRegistrationOptions.builder()
                .user(user)
                .authenticatorSelection(selection)
                .timeout(ceremonyLifetime.toMillis())
                .build()
        )
        val ceremonyId = randomId()
        pendingRegistrations[ceremonyId] = PendingRegistration(
            request,
            userHandle,
            Instant.now().plus(ceremonyLifetime),
        )
        return CeremonyOptions(ceremonyId, objectMapper.readTree(request.toCredentialsCreateJson()))
    }

    suspend fun finishRegistration(body: CredentialResponse): SessionResponse = registrationLock.withLock {
        val pending = pendingRegistrations.remove(body.ceremonyId)
            ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Registration request expired")
        if (pending.expiresAt.isBefore(Instant.now())) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Registration request expired")
        }
        if (credentialRepo.count() > 0) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "A passkey is already configured")
        }

        try {
            val response = PublicKeyCredential.parseRegistrationResponseJson(body.credential.toString())
            val result = relyingParty(emptyList()).finishRegistration(
                FinishRegistrationOptions.builder()
                    .request(pending.request)
                    .response(response)
                    .build()
            )
            if (!result.isUserVerified) {
                throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "User verification is required")
            }

            val transports = result.keyId.transports.orElse(sortedSetOf())
                .map(AuthenticatorTransport::getId)
                .toSet()
            credentialRepo.save(
                PasskeyCredential(
                    credentialId = result.keyId.id.base64Url,
                    userHandle = pending.userHandle.base64Url,
                    publicKeyCose = result.publicKeyCose.base64Url,
                    signatureCount = result.signatureCount,
                    transports = transports,
                    backupEligible = result.isBackupEligible,
                    backedUp = result.isBackedUp,
                )
            )
            return@withLock sessions.create().toResponse()
        } catch (exception: ResponseStatusException) {
            throw exception
        } catch (exception: Exception) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not verify the passkey", exception)
        }
    }

    suspend fun startAuthentication(): CeremonyOptions {
        val credentials = credentialRepo.findAll().toList()
        if (credentials.isEmpty()) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "No passkey is configured")
        }

        purgeExpiredCeremonies()
        val request = relyingParty(credentials).startAssertion(
            StartAssertionOptions.builder()
                .username(OWNER_USERNAME)
                .userVerification(UserVerificationRequirement.REQUIRED)
                .timeout(ceremonyLifetime.toMillis())
                .build()
        )
        val ceremonyId = randomId()
        pendingAssertions[ceremonyId] = PendingAssertion(request, Instant.now().plus(ceremonyLifetime))
        return CeremonyOptions(ceremonyId, objectMapper.readTree(request.toCredentialsGetJson()))
    }

    suspend fun finishAuthentication(body: CredentialResponse): SessionResponse {
        val pending = pendingAssertions.remove(body.ceremonyId)
            ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Authentication request expired")
        if (pending.expiresAt.isBefore(Instant.now())) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Authentication request expired")
        }

        val credentials = credentialRepo.findAll().toList()
        try {
            val response = PublicKeyCredential.parseAssertionResponseJson(body.credential.toString())
            val result = relyingParty(credentials).finishAssertion(
                FinishAssertionOptions.builder()
                    .request(pending.request)
                    .response(response)
                    .build()
            )
            if (!result.isSuccess || !result.isUserVerified) {
                throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Passkey authentication failed")
            }

            val stored = credentials.find { it.credentialId == result.credentialId.base64Url }
                ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unknown passkey")
            credentialRepo.save(
                stored.copy(
                    signatureCount = result.signatureCount,
                    backupEligible = result.isBackupEligible,
                    backedUp = result.isBackedUp,
                )
            )
            return sessions.create().toResponse()
        } catch (exception: ResponseStatusException) {
            throw exception
        } catch (exception: Exception) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Could not verify the passkey", exception)
        }
    }

    private fun relyingParty(credentials: List<PasskeyCredential>): RelyingParty {
        val identity = RelyingPartyIdentity.builder().id(rpId).name("Matthew Lack's portfolio").build()
        return RelyingParty.builder()
            .identity(identity)
            .credentialRepository(SnapshotCredentialRepository(credentials))
            .origins(origins)
            .allowUntrustedAttestation(true)
            .build()
    }

    private fun randomId(): String {
        val bytes = ByteArray(24).also(random::nextBytes)
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
    }

    private fun purgeExpiredCeremonies() {
        val now = Instant.now()
        pendingRegistrations.entries.removeIf { it.value.expiresAt.isBefore(now) }
        pendingAssertions.entries.removeIf { it.value.expiresAt.isBefore(now) }
    }

    private fun EditorSessionService.CreatedSession.toResponse() = SessionResponse(token, expiresAt)
}

private class SnapshotCredentialRepository(
    credentials: List<PasskeyCredential>,
) : CredentialRepository {
    private val registered = credentials.map { credential ->
        val builder = RegisteredCredential.builder()
            .credentialId(ByteArray.fromBase64Url(credential.credentialId))
            .userHandle(ByteArray.fromBase64Url(credential.userHandle))
            .publicKeyCose(ByteArray.fromBase64Url(credential.publicKeyCose))
            .signatureCount(credential.signatureCount)
        if (credential.transports.isNotEmpty()) {
            builder.transports(credential.transports.map(AuthenticatorTransport::of).toSet())
        }
        credential.backupEligible?.let(builder::backupEligible)
        credential.backedUp?.let(builder::backupState)
        builder.build()
    }

    override fun getCredentialIdsForUsername(username: String): Set<PublicKeyCredentialDescriptor> {
        if (username != "owner") return emptySet()
        return registered.map { credential ->
            val builder = PublicKeyCredentialDescriptor.builder().id(credential.credentialId)
            credential.transports.ifPresent(builder::transports)
            builder.build()
        }.toSet()
    }

    override fun getUserHandleForUsername(username: String): Optional<ByteArray> {
        if (username != "owner") return Optional.empty()
        return registered.firstOrNull()?.userHandle?.let(Optional<ByteArray>::of) ?: Optional.empty()
    }

    override fun getUsernameForUserHandle(userHandle: ByteArray): Optional<String> =
        if (registered.any { it.userHandle == userHandle }) Optional.of("owner") else Optional.empty()

    override fun lookup(credentialId: ByteArray, userHandle: ByteArray): Optional<RegisteredCredential> =
        registered.find { it.credentialId == credentialId && it.userHandle == userHandle }
            ?.let(Optional<RegisteredCredential>::of) ?: Optional.empty()

    override fun lookupAll(credentialId: ByteArray): Set<RegisteredCredential> =
        registered.filter { it.credentialId == credentialId }.toSet()
}

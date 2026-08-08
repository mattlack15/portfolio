package ca.mattlack.portfolio.security

import org.springframework.stereotype.Service
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Duration
import java.time.Instant
import java.util.Base64
import java.util.concurrent.ConcurrentHashMap

@Service
class EditorSessionService {
    private val random = SecureRandom()
    private val sessions = ConcurrentHashMap<String, Instant>()
    private val lifetime = Duration.ofHours(12)

    data class CreatedSession(val token: String, val expiresAt: Instant)

    fun create(): CreatedSession {
        purgeExpired()
        val tokenBytes = ByteArray(32).also(random::nextBytes)
        val token = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes)
        val expiresAt = Instant.now().plus(lifetime)
        sessions[hash(token)] = expiresAt
        return CreatedSession(token, expiresAt)
    }

    fun isValid(token: String): Boolean {
        val tokenHash = hash(token)
        val expiresAt = sessions[tokenHash] ?: return false
        if (expiresAt.isBefore(Instant.now())) {
            sessions.remove(tokenHash)
            return false
        }
        return true
    }

    fun revoke(token: String) {
        sessions.remove(hash(token))
    }

    private fun purgeExpired() {
        val now = Instant.now()
        sessions.entries.removeIf { it.value.isBefore(now) }
    }

    private fun hash(token: String): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(token.toByteArray(Charsets.UTF_8))
        return digest.joinToString("") { "%02x".format(it) }
    }
}

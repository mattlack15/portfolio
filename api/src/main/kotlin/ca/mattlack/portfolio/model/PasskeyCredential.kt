package ca.mattlack.portfolio.model

import org.springframework.data.annotation.Id
import org.springframework.data.mongodb.core.mapping.Document
import java.time.Instant

@Document("passkeyCredentials")
data class PasskeyCredential(
    @Id val credentialId: String,
    val userHandle: String,
    val publicKeyCose: String,
    val signatureCount: Long,
    val transports: Set<String> = emptySet(),
    val backupEligible: Boolean? = null,
    val backedUp: Boolean? = null,
    val createdAt: Instant = Instant.now(),
)

package ca.mattlack.portfolio.security

import ca.mattlack.portfolio.repo.PasskeyCredentialRepo
import com.fasterxml.jackson.databind.ObjectMapper
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Test
import org.mockito.Mockito
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class PasskeyServiceTest {
    @Test
    fun `first visitor receives fingerprint-capable registration options`() = runBlocking {
        val repo = Mockito.mock(PasskeyCredentialRepo::class.java)
        Mockito.`when`(repo.count()).thenReturn(0)
        val service = PasskeyService(
            credentialRepo = repo,
            sessions = EditorSessionService(),
            objectMapper = ObjectMapper(),
            rpId = "localhost",
            originsValue = "http://localhost:5173",
        )

        val ceremony = service.startRegistration()
        val publicKey = ceremony.options.path("publicKey")

        assertTrue(ceremony.ceremonyId.isNotBlank())
        assertTrue(publicKey.path("challenge").isTextual)
        assertEquals("localhost", publicKey.path("rp").path("id").asText())
        assertEquals("required", publicKey.path("authenticatorSelection").path("residentKey").asText())
        assertEquals("required", publicKey.path("authenticatorSelection").path("userVerification").asText())
    }
}

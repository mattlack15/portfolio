package ca.mattlack.portfolio.controller

import ca.mattlack.portfolio.security.EditorSessionService
import ca.mattlack.portfolio.security.PasskeyService
import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/auth")
class PasskeyController(
    private val passkeys: PasskeyService,
    private val sessions: EditorSessionService,
) {
    @GetMapping("passkey/status")
    suspend fun status() = passkeys.status()

    @PostMapping("passkey/register/options")
    suspend fun registrationOptions() = passkeys.startRegistration()

    @PostMapping("passkey/register/finish")
    suspend fun finishRegistration(@RequestBody body: PasskeyService.CredentialResponse) =
        passkeys.finishRegistration(body)

    @PostMapping("passkey/authenticate/options")
    suspend fun authenticationOptions() = passkeys.startAuthentication()

    @PostMapping("passkey/authenticate/finish")
    suspend fun finishAuthentication(@RequestBody body: PasskeyService.CredentialResponse) =
        passkeys.finishAuthentication(body)

    @GetMapping("session")
    fun session() = mapOf("authenticated" to true)

    @PostMapping("logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun logout(request: HttpServletRequest) {
        request.getHeader("Authorization")
            ?.takeIf { it.startsWith("Bearer ") }
            ?.removePrefix("Bearer ")
            ?.let(sessions::revoke)
    }
}

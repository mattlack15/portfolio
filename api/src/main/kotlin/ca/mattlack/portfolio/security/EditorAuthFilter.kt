package ca.mattlack.portfolio.security

import jakarta.servlet.FilterChain
import jakarta.servlet.ServletRequest
import jakarta.servlet.ServletResponse
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.stereotype.Component
import org.springframework.web.filter.GenericFilterBean

@Component
class EditorAuthFilter(
    private val sessions: EditorSessionService,
) : GenericFilterBean() {
    private val publicEndpoints = listOf(
        "/api/projects/list".toRegex(),
        "/api/images/\\d+".toRegex(),
        "/api/auth/passkey/status".toRegex(),
        "/api/auth/passkey/register/options".toRegex(),
        "/api/auth/passkey/register/finish".toRegex(),
        "/api/auth/passkey/authenticate/options".toRegex(),
        "/api/auth/passkey/authenticate/finish".toRegex(),
    )

    override fun doFilter(request: ServletRequest, response: ServletResponse, chain: FilterChain) {
        val httpRequest = request as HttpServletRequest
        val httpResponse = response as HttpServletResponse
        if (httpRequest.method == "OPTIONS" || publicEndpoints.any { it.matches(httpRequest.requestURI) }) {
            chain.doFilter(request, response)
            return
        }

        val sessionToken = httpRequest.getHeader("Authorization")
            ?.takeIf { it.startsWith("Bearer ") }
            ?.removePrefix("Bearer ")
        if (sessionToken == null || !sessions.isValid(sessionToken)) {
            httpResponse.status = HttpServletResponse.SC_UNAUTHORIZED
            httpResponse.writer.write("Unauthorized")
            return
        }

        chain.doFilter(request, response)
    }
}

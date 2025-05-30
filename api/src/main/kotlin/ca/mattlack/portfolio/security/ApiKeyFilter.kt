package ca.mattlack.portfolio.security

import jakarta.servlet.FilterChain
import jakarta.servlet.ServletRequest
import jakarta.servlet.ServletResponse
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import org.springframework.web.filter.GenericFilterBean

@Component
class ApiKeyFilter(
    @Value("\${api.key}") private val apiKey: String,
) : GenericFilterBean() {
    override fun doFilter(
        req: ServletRequest,
        res: ServletResponse,
        chain: FilterChain
    ) {
        req as HttpServletRequest
        res as HttpServletResponse
        val apiKeyHeader = req.getHeader("Authorization")
            ?: req.getParameter("apiKey")

        val endpoint = req.requestURI
        val allowed = listOf(
            "/api/projects/list".toRegex(),
            "/api/projects/validate-key".toRegex(),
            "/api/images/\\d+".toRegex(),
        )
        if (allowed.any { it.matches(endpoint) }) {
            // Allow these endpoints without API key
            chain.doFilter(req, res)
            return
        }

        if (apiKeyHeader != apiKey) {
            res.status = HttpServletResponse.SC_UNAUTHORIZED
            res.writer.write("Unauthorized")
            return
        }

        chain.doFilter(req, res)
    }
}
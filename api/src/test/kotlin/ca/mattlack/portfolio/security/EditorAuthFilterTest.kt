package ca.mattlack.portfolio.security

import org.junit.jupiter.api.Test
import org.springframework.mock.web.MockFilterChain
import org.springframework.mock.web.MockHttpServletRequest
import org.springframework.mock.web.MockHttpServletResponse
import kotlin.test.assertEquals

class EditorAuthFilterTest {
    private val sessions = EditorSessionService()
    private val filter = EditorAuthFilter(sessions)

    @Test
    fun `public project listing does not require a session`() {
        val request = MockHttpServletRequest("GET", "/api/projects/list")
        val response = MockHttpServletResponse()
        val chain = MockFilterChain()

        filter.doFilter(request, response, chain)

        assertEquals(200, response.status)
    }

    @Test
    fun `write endpoints reject missing sessions`() {
        val request = MockHttpServletRequest("POST", "/api/projects/save")
        val response = MockHttpServletResponse()

        filter.doFilter(request, response, MockFilterChain())

        assertEquals(401, response.status)
    }

    @Test
    fun `write endpoints accept passkey sessions`() {
        val session = sessions.create()
        val request = MockHttpServletRequest("POST", "/api/projects/save")
        request.addHeader("Authorization", "Bearer ${session.token}")
        val response = MockHttpServletResponse()

        filter.doFilter(request, response, MockFilterChain())

        assertEquals(200, response.status)
    }
}

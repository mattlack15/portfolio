package ca.mattlack.portfolio.analytics

import ca.mattlack.portfolio.security.EditorAuthFilter
import ca.mattlack.portfolio.security.EditorSessionService
import org.junit.jupiter.api.Test
import org.springframework.mock.web.MockFilterChain
import org.springframework.mock.web.MockHttpServletRequest
import org.springframework.mock.web.MockHttpServletResponse
import java.util.UUID
import kotlin.test.*

class AnalyticsTest {
    private fun input() = AnalyticsInput(UUID.randomUUID().toString(), UUID.randomUUID().toString(), UUID.randomUUID().toString(), "pageview", "/")
    @Test fun `accepts well formed events and rejects invalid data`() {
        val event = input()
        assertTrue(AnalyticsController.valid(event))
        assertFalse(AnalyticsController.valid(event.copy(type = "visit")))
        assertFalse(AnalyticsController.valid(event.copy(path = "/analytics")))
        assertFalse(AnalyticsController.valid(event.copy(path = "https://evil.example")))
        assertFalse(AnalyticsController.valid(event.copy(visitor = "spoof")))
        assertFalse(AnalyticsController.valid(event.copy(label = "x".repeat(101))))
        assertFalse(AnalyticsController.valid(event.copy(type = "click")))
    }
    @Test fun `removes sensitive URL components`() {
        assertEquals("/project/one", AnalyticsController.cleanPath("/project/one?secret=abc#hello"))
        assertEquals("https://example.com/path", AnalyticsController.cleanTarget("https://user:password@example.com/path?secret=abc#private"))
        assertEquals("mailto:", AnalyticsController.cleanTarget("mailto:private@example.com"))
        assertEquals("", AnalyticsController.cleanTarget("javascript:alert(1)"))
        assertEquals("example.com", AnalyticsController.referrerHost("https://example.com/private?q=secret"))
    }
    @Test fun `only loopback proxy may supply the visitor IP`() {
        val request = MockHttpServletRequest()
        request.remoteAddr = "8.8.8.8"
        request.addHeader("X-Real-IP", "1.1.1.1")
        assertEquals("8.8.8.8", AnalyticsController.clientIp(request))
        request.remoteAddr = "127.0.0.1"
        assertEquals("1.1.1.1", AnalyticsController.clientIp(request))
        assertNull(GeoLocationService.numericAddress("evil.example.com"))
    }
    @Test fun `collection is public but analytics data requires passkey session`() {
        val sessions = EditorSessionService()
        val filter = EditorAuthFilter(sessions)
        fun status(method: String, path: String, token: String? = null): Int {
            val request = MockHttpServletRequest(method, path)
            if (token != null) request.addHeader("Authorization", "Bearer $token")
            val response = MockHttpServletResponse()
            filter.doFilter(request, response, MockFilterChain())
            return response.status
        }
        assertEquals(200, status("POST", "/api/analytics/events"))
        assertEquals(401, status("GET", "/api/analytics/events"))
        assertEquals(401, status("GET", "/api/analytics/summary"))
        assertEquals(401, status("GET", "/api/analytics/activity"))
        assertEquals(200, status("GET", "/api/analytics/activity", sessions.create().token))
        assertEquals(200, status("GET", "/api/analytics/summary", sessions.create().token))
    }
}

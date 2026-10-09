package ca.mattlack.portfolio.analytics

import ca.mattlack.portfolio.security.EditorSessionService
import com.mongodb.client.MongoClients
import org.bson.Document
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable
import org.springframework.data.mongodb.core.MongoTemplate
import org.springframework.mock.web.MockHttpServletRequest
import org.springframework.web.server.ResponseStatusException
import java.util.UUID
import kotlin.test.*

@EnabledIfEnvironmentVariable(named = "ANALYTICS_TEST_MONGO", matches = "true")
class AnalyticsIntegrationTest {
    @Test fun `collect deduplicate aggregate and exclude editors against MongoDB`() {
        MongoClients.create("mongodb://127.0.0.1:27017").use { client ->
            val database = "portfolio_analytics_test_" + UUID.randomUUID().toString().replace("-", "")
            val mongo = MongoTemplate(client, database)
            val geo = GeoLocationService(System.getenv("ANALYTICS_GEO_DB") ?: "./data/dbip-city.mmdb")
            try {
                val sessions = EditorSessionService()
                val controller = AnalyticsController(mongo, geo, sessions)
                controller.indexes()
                val request = MockHttpServletRequest("POST", "/api/analytics/events")
                request.remoteAddr = "127.0.0.1"
                request.addHeader("Origin", "https://mattlack.com")
                request.addHeader("X-Real-IP", "8.8.8.8")
                val visitor = UUID.randomUUID().toString()
                val session = UUID.randomUUID().toString()
                val event = AnalyticsInput(UUID.randomUUID().toString(), visitor, session, "pageview", "/")
                controller.collect(event, request)
                controller.collect(event, request)
                controller.collect(event.copy(id = UUID.randomUUID().toString(), path = "/project/one?secret=abc"), request)
                controller.collect(event.copy(id = UUID.randomUUID().toString(), type = "click", target = "/resume.pdf", label = "Resume"), request)
                request.addHeader("Authorization", "Bearer ${sessions.create().token}")
                controller.collect(event.copy(id = UUID.randomUUID().toString()), request)
                request.removeHeader("Authorization")
                request.addHeader("DNT", "1")
                controller.collect(event.copy(id = UUID.randomUUID().toString()), request)
                request.removeHeader("DNT")
                val summary = controller.summary(7, "America/Toronto").body!!
                assertEquals(1, summary["visits"])
                assertEquals(1, summary["visitors"])
                assertEquals(2, summary["pageviews"])
                assertEquals(1, summary["clickCount"])
                assertEquals(7, (summary["daily"] as List<*>).size)
                assertEquals(3L, mongo.getCollection("analytics_events").countDocuments())
                assertTrue(mongo.getCollection("analytics_events").find(Document("path", "/project/one")).first() != null)
                assertFalse(mongo.getCollection("analytics_events").find().first()!!.containsKey("ip"))
                if (geo.available) assertTrue(geo.locate("8.8.8.8")["country"].orEmpty().isNotBlank())
                request.removeHeader("Origin")
                assertFailsWith<ResponseStatusException> { controller.collect(event, request) }
                assertFailsWith<ResponseStatusException> { controller.summary(200, "UTC") }
                assertFailsWith<ResponseStatusException> { controller.summary(7, "invalid") }
            } finally {
                geo.close()
                client.getDatabase(database).drop()
            }
        }
    }
}

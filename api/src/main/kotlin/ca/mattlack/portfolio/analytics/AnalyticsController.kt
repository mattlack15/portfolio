package ca.mattlack.portfolio.analytics

import ca.mattlack.portfolio.security.EditorSessionService
import com.mongodb.MongoWriteException
import com.mongodb.client.model.IndexOptions
import jakarta.annotation.PostConstruct
import jakarta.servlet.http.HttpServletRequest
import org.bson.Document
import org.springframework.data.mongodb.core.MongoTemplate
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.net.URI
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.Date
import java.util.concurrent.TimeUnit

// Identifiers are randomly generated in the browser. Raw IPs are never persisted.
data class AnalyticsInput(
    val id: String, val visitor: String, val session: String, val type: String,
    val path: String, val target: String = "", val label: String = "", val referrer: String = "",
)

@RestController
@RequestMapping("/api/analytics")
class AnalyticsController(
    private val mongo: MongoTemplate,
    private val geo: GeoLocationService,
    private val sessions: EditorSessionService,
) {
    private val collection get() = mongo.getCollection("analytics_events")
    private val limits = LinkedHashMap<String, Pair<Long, Int>>()
    private val allowedHosts = setOf("mattlack.com", "www.mattlack.com", "localhost", "127.0.0.1")

    @PostConstruct
    fun indexes() {
        collection.createIndex(Document("at", 1), IndexOptions().expireAfter(90L, TimeUnit.DAYS))
        collection.createIndex(Document("type", 1).append("at", 1))
    }

    @PostMapping("events")
    fun collect(@RequestBody input: AnalyticsInput, request: HttpServletRequest): ResponseEntity<Void> {
        val origin = request.getHeader("Origin")
        if (origin == null || runCatching { URI(origin).host }.getOrNull() !in allowedHosts) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN)
        }
        if (!valid(input)) throw ResponseStatusException(HttpStatus.BAD_REQUEST)
        val token = request.getHeader("Authorization")?.removePrefix("Bearer ")
        if ((token != null && sessions.isValid(token)) || request.getHeader("DNT") == "1" ||
            request.getHeader("Sec-GPC") == "1" ||
            Regex("bot|crawler|spider|headless", RegexOption.IGNORE_CASE).containsMatchIn(request.getHeader("User-Agent") ?: "")) {
            return ResponseEntity.noContent().build()
        }
        val ip = clientIp(request)
        if (!allow(ip)) throw ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS)
        val location = geo.locate(ip)
        val event = Document("_id", input.id).append("at", Date())
            .append("visitor", input.visitor).append("session", input.session).append("type", input.type)
            .append("path", cleanPath(input.path)).append("target", cleanTarget(input.target))
            .append("label", input.label.take(100)).append("referrer", referrerHost(input.referrer))
            .append("country", location["country"].orEmpty()).append("region", location["region"].orEmpty())
            .append("city", location["city"].orEmpty())
        try { collection.insertOne(event) } catch (error: MongoWriteException) {
            if (error.error.code != 11000) throw error
        }
        return ResponseEntity.noContent().build()
    }

    @Synchronized
    private fun allow(ip: String): Boolean {
        val minute = Instant.now().epochSecond / 60
        limits.entries.removeIf { it.value.first != minute }
        if (!limits.containsKey(ip) && limits.size >= 10000) return false
        val count = (limits[ip]?.second ?: 0) + 1
        limits[ip] = minute to count
        return count <= 120
    }

    @GetMapping("summary")
    fun summary(@RequestParam(defaultValue = "7") days: Int,
                @RequestParam(defaultValue = "America/Toronto") timezone: String): ResponseEntity<Map<String, Any?>> {
        if (days !in listOf(1, 7, 30, 90)) throw ResponseStatusException(HttpStatus.BAD_REQUEST)
        val zone = runCatching { ZoneId.of(timezone) }.getOrElse { throw ResponseStatusException(HttpStatus.BAD_REQUEST) }
        val today = LocalDate.now(zone)
        val start = today.minusDays(days.toLong() - 1).atStartOfDay(zone).toInstant()
        fun stage(key: String, value: Any?) = Document(key, value)
        val views = stage("\$match", Document("type", "pageview"))
        fun distinct(field: String) = listOf(views, stage("\$group", Document("_id", "\$$field")), stage("\$count", "count"))
        fun ranked(field: Any, type: String) = listOf(
            stage("\$match", Document("type", type)),
            stage("\$group", Document("_id", field).append("count", Document("\$sum", 1))),
            stage("\$sort", Document("count", -1).append("_id", 1)), stage("\$limit", 25),
        )
        val day = Document("\$dateToString", Document("format", "%Y-%m-%d").append("date", "\$at").append("timezone", timezone))
        val facets = Document("visits", distinct("session")).append("visitors", distinct("visitor"))
            .append("totals", listOf(stage("\$group", Document("_id", "\$type").append("count", Document("\$sum", 1)))))
            .append("daily", listOf(stage("\$group", Document("_id", Document("day", day).append("type", "\$type"))
                .append("count", Document("\$sum", 1)))))
            .append("dailyVisits", listOf(views, stage("\$group", Document("_id", Document("day", day).append("session", "\$session"))),
                stage("\$group", Document("_id", "\$_id.day").append("count", Document("\$sum", 1)))))
            .append("pages", ranked("\$path", "pageview"))
            .append("clicks", ranked(Document("target", "\$target").append("label", "\$label"), "click"))
            .append("referrers", ranked("\$referrer", "pageview"))
            .append("locations", ranked(Document("country", "\$country").append("region", "\$region").append("city", "\$city"), "pageview"))
            .append("recent", listOf(stage("\$sort", Document("at", -1)), stage("\$limit", 30),
                stage("\$project", Document("visitor", 0).append("session", 0))))
        val result = collection.aggregate(listOf(stage("\$match", Document("at", Document("\$gte", Date.from(start)))),
            stage("\$facet", facets))).maxTime(10, TimeUnit.SECONDS).first() ?: Document()
        val daily = (0 until days).map { offset ->
            val date = today.minusDays((days - 1 - offset).toLong()).toString()
            fun count(type: String): Int = result.getList("daily", Document::class.java).firstOrNull {
                val id = it["_id"] as Document
                id["day"] == date && id["type"] == type
            }?.getInteger("count") ?: 0
            mapOf("date" to date, "pageviews" to count("pageview"), "clicks" to count("click"),
                "visits" to (result.getList("dailyVisits", Document::class.java).firstOrNull { it["_id"] == date }?.getInteger("count") ?: 0))
        }
        return ResponseEntity.ok().header("Cache-Control", "no-store").body(mapOf(
            "visits" to (result.getList("visits", Document::class.java).firstOrNull()?.getInteger("count") ?: 0),
            "visitors" to (result.getList("visitors", Document::class.java).firstOrNull()?.getInteger("count") ?: 0),
            "pageviews" to daily.sumOf { it["pageviews"] as Int }, "clickCount" to daily.sumOf { it["clicks"] as Int },
            "daily" to daily, "pages" to result["pages"], "clicks" to result["clicks"],
            "referrers" to result["referrers"], "locations" to result["locations"], "recent" to result["recent"],
            "geoAvailable" to geo.available, "timezone" to timezone,
        ))
    }

    companion object {
        private val uuid = Regex("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")
        fun valid(input: AnalyticsInput): Boolean = listOf(input.id, input.visitor, input.session).all(uuid::matches) &&
            input.type in setOf("pageview", "click") && input.path.startsWith("/") && !input.path.startsWith("//") &&
            input.path.length <= 500 && !input.path.startsWith("/analytics") && input.target.length <= 500 &&
            input.label.length <= 100 && input.referrer.length <= 500 && (input.type != "click" || input.target.isNotBlank())
        fun cleanPath(path: String) = path.substringBefore('?').substringBefore('#').take(500)
        fun cleanTarget(target: String): String {
            if (target.startsWith("/") || target.startsWith("#")) return target.substringBefore('?').take(500)
            val uri = runCatching { URI(target) }.getOrNull() ?: return ""
            return if (uri.scheme in setOf("http", "https") && uri.host != null) "${uri.scheme}://${uri.host}${uri.path.orEmpty()}".take(500)
                else if (uri.scheme in setOf("mailto", "tel")) "${uri.scheme}:" else ""
        }
        fun referrerHost(value: String) = runCatching { URI(value).host }.getOrNull()?.take(200) ?: ""
        fun clientIp(request: HttpServletRequest): String {
            val peer = request.remoteAddr
            // Only the local nginx proxy is trusted, and it overwrites X-Real-IP.
            return if (peer in setOf("127.0.0.1", "::1", "0:0:0:0:0:0:0:1"))
                request.getHeader("X-Real-IP")?.takeIf { GeoLocationService.numericAddress(it) != null } ?: peer else peer
        }
    }
}

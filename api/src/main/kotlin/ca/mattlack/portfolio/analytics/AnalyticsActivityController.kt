package ca.mattlack.portfolio.analytics

import org.bson.Document
import org.springframework.data.mongodb.core.MongoTemplate
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.Base64
import java.util.Date
import java.util.concurrent.TimeUnit
import java.util.regex.Pattern

/** Reads use an (at, id) cursor so equal timestamps and new arrivals cannot skip rows. */
@RestController
@RequestMapping("/api/analytics")
class AnalyticsActivityController(private val mongo: MongoTemplate) {
    @GetMapping("activity")
    fun activity(
        @RequestParam(defaultValue = "7") days: Int,
        @RequestParam(defaultValue = "America/Toronto") timezone: String,
        @RequestParam(defaultValue = "") q: String,
        @RequestParam(defaultValue = "") type: String,
        @RequestParam(defaultValue = "") country: String,
        @RequestParam(defaultValue = "") path: String,
        @RequestParam(defaultValue = "") referrer: String,
        @RequestParam(defaultValue = "newest") order: String,
        @RequestParam(defaultValue = "50") limit: Int,
        @RequestParam(required = false) cursor: String?,
    ): ResponseEntity<Map<String, Any?>> {
        if (days !in listOf(1, 7, 30, 90) || q.length > 200 || country.length > 200 || path.length > 500 || referrer.length > 200 ||
            type !in listOf("", "pageview", "click") || order !in listOf("newest", "oldest") || limit !in 1..100) badRequest()
        val zone = runCatching { ZoneId.of(timezone) }.getOrElse { badRequest() }
        val decoded = cursor?.let(::decodeCursor)
        val until = decoded?.until ?: Instant.ofEpochMilli(Instant.now().toEpochMilli())
        if (until.isAfter(Instant.now().plusSeconds(60))) badRequest()
        // Anchor both ends to the first page, including when scrolling across midnight.
        val today = LocalDate.ofInstant(until, zone)
        val start = today.minusDays(days.toLong() - 1).atStartOfDay(zone).toInstant()
        val conditions = mutableListOf(Document("at", Document("\$gte", Date.from(start)).append("\$lte", Date.from(until))))
        if (type.isNotEmpty()) conditions += Document("type", type)
        if (country.isNotEmpty()) conditions += if (country == "__unknown__") Document("country", Document("\$in", listOf("", null))) else Document("country", country)
        if (path.isNotEmpty()) conditions += Document("path", path)
        if (referrer.isNotEmpty()) conditions += Document("referrer", if (referrer == "__direct__") "" else referrer)
        val filters = mutableListOf<Document>(Document("\$match", Document("\$and", conditions)), AnalyticsLabels.stage())
        if (q.isNotBlank()) {
            val search = Document("\$regex", Pattern.quote(q.trim())).append("\$options", "i")
            val matchingPaths = mongo.getCollection("projects").find(Document("title", search)).projection(Document("_id", 1))
                .limit(100).maxTime(2, TimeUnit.SECONDS).map { "/project/${it["_id"].toString()}" }.toList()
            val textMatches = listOf("path", "target", "label", "country", "region", "city", "referrer").map { Document(it, search) }
            val projectMatches = if (matchingPaths.isEmpty()) emptyList() else listOf(
                Document("path", Document("\$in", matchingPaths)), Document("target", Document("\$in", matchingPaths)))
            filters += Document("\$match", Document("\$or", textMatches + projectMatches))
        }
        val direction = if (order == "newest") -1 else 1
        val rows = mutableListOf<Document>()
        if (decoded != null) {
            val comparison = if (direction == -1) "\$lt" else "\$gt"
            rows += Document("\$match", Document("\$or", listOf(
                Document("at", Document(comparison, Date.from(decoded.at))),
                Document("at", Date.from(decoded.at)).append("_id", Document(comparison, decoded.id)),
            )))
        }
        rows += listOf(
            Document("\$sort", Document("at", direction).append("_id", direction)),
            Document("\$limit", limit + 1),
            Document("\$project", Document("visitor", 0).append("session", 0)),
        )
        val facets = Document("items", rows).append("total", listOf(Document("\$count", "count")))
        val result = mongo.getCollection("analytics_events").aggregate(filters + Document("\$facet", facets))
            .maxTime(10, TimeUnit.SECONDS).first() ?: Document()
        val all = result.getList("items", Document::class.java).orEmpty()
        val items = all.take(limit)
        val last = items.lastOrNull()
        val next = if (all.size > limit && last != null) encodeCursor(ActivityCursor(last.getDate("at").toInstant(), last.getString("_id"), until)) else null
        val total = (result.getList("total", Document::class.java).firstOrNull()?.get("count") as? Number)?.toLong() ?: 0L
        return ResponseEntity.ok().header("Cache-Control", "no-store").body(mapOf(
            "items" to items, "total" to total, "nextCursor" to next, "asOf" to until.toString(), "timezone" to timezone,
        ))
    }

    data class ActivityCursor(val at: Instant, val id: String, val until: Instant)
    companion object {
        private fun badRequest(): Nothing = throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid activity filters or cursor")
        fun encodeCursor(value: ActivityCursor): String = Base64.getUrlEncoder().withoutPadding().encodeToString(
            "${value.at.toEpochMilli()}|${value.id}|${value.until.toEpochMilli()}".toByteArray(Charsets.UTF_8))
        fun decodeCursor(value: String): ActivityCursor = runCatching {
            require(value.length <= 250)
            val parts = String(Base64.getUrlDecoder().decode(value), Charsets.UTF_8).split('|')
            require(parts.size == 3 && Regex("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}").matches(parts[1]))
            val result = ActivityCursor(Instant.ofEpochMilli(parts[0].toLong()), parts[1], Instant.ofEpochMilli(parts[2].toLong()))
            require(!result.at.isAfter(result.until))
            result
        }.getOrElse { badRequest() }
    }
}

package ca.mattlack.portfolio.analytics

import ca.mattlack.portfolio.security.EditorSessionService
import ca.mattlack.portfolio.security.EditorAuthFilter
import com.mongodb.client.MongoClients
import org.bson.Document
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable
import org.springframework.data.mongodb.core.MongoTemplate
import org.springframework.web.server.ResponseStatusException
import org.springframework.test.web.servlet.setup.MockMvcBuilders
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import java.time.Instant
import java.util.Date
import java.util.UUID
import kotlin.test.*

class AnalyticsCursorTest {
    @Test fun `cursor round trips millisecond boundaries and rejects malformed input`() {
        val cursor = AnalyticsActivityController.ActivityCursor(Instant.ofEpochMilli(1234), UUID.randomUUID().toString(), Instant.ofEpochMilli(5678))
        assertEquals(cursor, AnalyticsActivityController.decodeCursor(AnalyticsActivityController.encodeCursor(cursor)))
        for (invalid in listOf("not-a-cursor", "x".repeat(251), "MTIzfGJhZHwtMQ")) {
            assertFailsWith<ResponseStatusException> { AnalyticsActivityController.decodeCursor(invalid) }
        }
    }
    @Test fun `only known filter targets on the home page are canonicalized`() {
        assertEquals("#filter=systems" to "Filter: Systems", AnalyticsLabels.canonical("#系统", "系统", "/", "click"))
        assertEquals("#filter=mobile" to "Filter: Mobile", AnalyticsLabels.canonical("#莫比尔", "莫比尔", "/", "click"))
        assertEquals("#你好" to "你好", AnalyticsLabels.canonical("#你好", "你好", "/", "click"))
        assertEquals("#系统" to "系统", AnalyticsLabels.canonical("#系统", "系统", "/project/one", "click"))
    }
}

@EnabledIfEnvironmentVariable(named = "ANALYTICS_TEST_MONGO", matches = "true")
class AnalyticsActivityIntegrationTest {
    @Test fun `pages past 30 rows without losing equal timestamps and freezes new arrivals`() {
        withDatabase { mongo ->
            val collection=mongo.getCollection("analytics_events")
            val timestamp=Date.from(Instant.now().minusSeconds(2))
            val expected=(0 until 125).map { index -> event(timestamp,index) }
            collection.insertMany(expected)
            val controller=AnalyticsActivityController(mongo)
            for (order in listOf("newest","oldest")) {
                val ids=mutableListOf<String>()
                var cursor:String?=null
                do {
                    val page=read(controller,order=order,cursor=cursor)
                    val items=page["items"] as List<*>
                    assertEquals(125L,page["total"])
                    for (item in items) {
                        val document=item as Document
                        assertFalse(document.containsKey("session"))
                        assertFalse(document.containsKey("visitor"))
                        ids+=document.getString("_id")
                    }
                    cursor=page["nextCursor"] as String?
                    if (ids.size==50) collection.insertOne(event(Date.from(Instant.now().plusSeconds(10)),999))
                }while(cursor!=null)
                val sorted=expected.map { it.getString("_id") }.sorted().let { if(order=="newest")it.reversed() else it }
                assertEquals(sorted,ids)
                assertEquals(125,ids.toSet().size)
            }
        }
    }
    @Test fun `HTTP activity requires a session and serializes paged responses`() {
        withDatabase { mongo ->
            mongo.getCollection("analytics_events").insertMany((0 until 125).map {event(Date.from(Instant.now().minusSeconds(2)),it)})
            val sessions=EditorSessionService()
            val mvc=MockMvcBuilders.standaloneSetup(AnalyticsActivityController(mongo)).addFilters<org.springframework.test.web.servlet.setup.StandaloneMockMvcBuilder>(EditorAuthFilter(sessions)).build()
            mvc.perform(get("/api/analytics/activity")).andExpect(status().isUnauthorized)
            mvc.perform(get("/api/analytics/activity").header("Authorization","Bearer ${sessions.create().token}").param("country","China").param("limit","10"))
                .andExpect(status().isOk).andExpect(header().string("Cache-Control","no-store"))
                .andExpect(jsonPath("$.items.length()").value(10)).andExpect(jsonPath("$.total").value(42))
                .andExpect(jsonPath("$.nextCursor").isString).andExpect(jsonPath("$.items[0].country").value("China"))
                .andExpect(jsonPath("$.items[0].visitor").doesNotExist()).andExpect(jsonPath("$.items[0].session").doesNotExist())
        }
    }
    @Test fun `search and filters read all matching events including historical translations`() {
        withDatabase { mongo ->
            val collection=mongo.getCollection("analytics_events")
            val now=Instant.now().minusSeconds(2)
            collection.insertMany((0 until 125).map { event(Date.from(now),it) })
            val old=event(Date.from(now.minusSeconds(8*86400)),300)
            collection.insertOne(old)
            mongo.getCollection("projects").insertOne(Document("_id","one").append("title","Example title"))
            val controller=AnalyticsActivityController(mongo)
            assertEquals(62L,read(controller,q="Example title")["total"])
            val matches=read(controller,q="Filter: Systems",type="click",country="China")
            assertTrue((matches["total"] as Long)>0)
            for(item in matches["items"] as List<*>) {
                val document=item as Document
                assertEquals("#filter=systems",document["target"])
                assertEquals("Filter: Systems",document["label"])
                assertEquals("China",document["country"])
            }
            assertEquals(1L,read(controller,q="[.*]")["total"])
            assertEquals(0L,read(controller,q="not present")["total"])
            assertEquals(125L,read(controller)["total"])
            assertEquals(126L,read(controller,days=30)["total"])
            assertEquals(0L,read(controller,country="__unknown__")["total"])
            val paths=read(controller,path="/project/one")["items"] as List<*>
            assertTrue(paths.isNotEmpty());assertTrue(paths.all { (it as Document)["path"]=="/project/one" })
            val direct=read(controller,referrer="__direct__")["items"] as List<*>
            assertTrue(direct.all { (it as Document)["referrer"]=="" })
            val summaryController=AnalyticsController(mongo,GeoLocationService("/missing.mmdb"),EditorSessionService())
            val summary=summaryController.summary(7,"America/Toronto").body!!
            assertEquals(listOf("Canada","China"),summary["countries"])
            val clicks=summary["clicks"] as List<*>
            assertTrue(clicks.any { ((it as Document)["_id"] as Document)["label"]=="Filter: Systems" })
            assertFalse(clicks.any { ((it as Document)["_id"] as Document)["label"]=="系统" })
            assertNotNull(collection.find(Document("label","系统")).first())
            for (action in listOf<()->Unit>(
                {read(controller,days=2)}, {read(controller,order="arbitrary")}, {read(controller,q="a".repeat(201))},
                {read(controller,type="bot")}, {read(controller,timezone="invalid")}, {read(controller,cursor="broken")},
            ))assertFailsWith<ResponseStatusException>(block=action)
        }
    }
    private fun event(at:Date,index:Int):Document = Document("_id",UUID.randomUUID().toString()).append("at",at)
        .append("visitor",UUID.randomUUID().toString()).append("session",UUID.randomUUID().toString())
        .append("type",if(index%4==0)"click" else "pageview").append("path",if(index%2==0)"/" else "/project/one")
        .append("label",if(index==124)"literal [.*]" else if(index%8==0)"系统" else "Systems")
        .append("target",if(index==124)"#special" else if(index%8==0)"#系统" else "#Systems")
        .append("country",if(index%3==0)"China" else "Canada").append("region","Ontario").append("city","Toronto")
        .append("referrer",if(index%3==0)"github.com" else "")
    private fun read(controller:AnalyticsActivityController,days:Int=7,timezone:String="America/Toronto",q:String="",type:String="",country:String="",path:String="",referrer:String="",order:String="newest",cursor:String?=null) =
        controller.activity(days,timezone,q,type,country,path,referrer,order,50,cursor).body!!
    private fun withDatabase(block:(MongoTemplate)->Unit) {
        MongoClients.create("mongodb://127.0.0.1:27017").use { client ->
            val database="portfolio_activity_test_"+UUID.randomUUID().toString().replace("-","")
            try {block(MongoTemplate(client,database))} finally {client.getDatabase(database).drop()}
        }
    }
}

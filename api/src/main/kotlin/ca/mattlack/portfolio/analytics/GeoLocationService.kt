package ca.mattlack.portfolio.analytics

import com.maxmind.db.Reader
import jakarta.annotation.PreDestroy
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.io.File
import java.net.InetAddress

@Service
class GeoLocationService(@Value("\${analytics.geo-db:./data/dbip-city.mmdb}") path: String) {
    private val reader = File(path).takeIf { it.isFile }?.let { Reader(it) }
    init {
        if (reader == null) LoggerFactory.getLogger(javaClass).warn("Analytics location database missing: {}", path)
    }
    val available: Boolean get() = reader != null

    fun locate(ip: String): Map<String, String> {
        val address = numericAddress(ip) ?: return emptyMap()
        if (address.isLoopbackAddress || address.isSiteLocalAddress || address.isLinkLocalAddress || address.isAnyLocalAddress) return emptyMap()
        return try {
            val record = reader?.get(address, Map::class.java) ?: return emptyMap()
            fun name(value: Any?): String = ((value as? Map<*, *>)?.get("names") as? Map<*, *>)?.get("en") as? String ?: ""
            mapOf(
                "country" to name(record["country"]),
                "region" to name((record["subdivisions"] as? List<*>)?.firstOrNull()),
                "city" to name(record["city"]),
            )
        } catch (_: Exception) { emptyMap() }
    }

    @PreDestroy
    fun close() { reader?.close() }

    companion object {
        fun numericAddress(ip: String): InetAddress? {
            if (ip.length > 45 || !ip.matches(Regex("[0-9a-fA-F:.]+"))) return null
            return runCatching { InetAddress.getByName(ip) }.getOrNull()
        }
    }
}

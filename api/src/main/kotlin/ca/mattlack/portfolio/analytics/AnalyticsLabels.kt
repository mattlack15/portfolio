package ca.mattlack.portfolio.analytics

import org.bson.Document

/** Only known portfolio filters are normalized. Other visitor text is preserved. */
object AnalyticsLabels {
    private val filters = linkedMapOf(
        "All" to listOf("All", "全部", "所有"),
        "Hardware" to listOf("Hardware", "硬件"),
        "Systems" to listOf("Systems", "系统"),
        "Web" to listOf("Web", "网络", "网页"),
        "Mobile" to listOf("Mobile", "莫比尔", "移动", "手机"),
        "Games" to listOf("Games", "游戏"),
        "Graphics" to listOf("Graphics", "图形"),
        "Other" to listOf("Other", "其他"),
    )
    private val aliases = filters.flatMap { (name, labels) ->
        (labels.map { "#$it" } + "#filter=${name.lowercase()}").map { it to name }
    }.toMap()

    fun canonical(target: String, label: String, path: String, type: String): Pair<String, String> {
        val name = aliases[target].takeIf { type == "click" && path == "/" } ?: return target to label
        return "#filter=${name.lowercase()}" to "Filter: $name"
    }

    fun stage(): Document {
        fun mapped(field: String) = Document("\$switch", Document("branches", aliases.map { (target, name) ->
            Document("case", Document("\$and", listOf(
                Document("\$eq", listOf("\$type", "click")),
                Document("\$eq", listOf("\$path", "/")),
                Document("\$eq", listOf("\$target", target)),
            ))).append("then", if (field == "target") "#filter=${name.lowercase()}" else "Filter: $name")
        }).append("default", "\$$field"))
        return Document("\$set", Document("target", mapped("target")).append("label", mapped("label")))
    }
}

package ca.mattlack.portfolio.model

import org.springframework.data.annotation.Id
import org.springframework.data.mongodb.core.mapping.Document

@Document("projects")
data class Project(
    @Id val id: String,
    val title: String,
    val imageId: String? = null,
    val brief: String,
    val description: String,
    val technologies: List<String>,
    val orderIndex: Int = 0,
)
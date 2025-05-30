package ca.mattlack.portfolio.repo

import org.springframework.data.annotation.Id
import org.springframework.data.mongodb.core.mapping.Document
import org.springframework.data.repository.kotlin.CoroutineCrudRepository

@Document(collection = "images")
data class SavedImage(
    @Id val id: String,
    val contentType: String?,
    val data: ByteArray
)
interface ImageRepo : CoroutineCrudRepository<SavedImage, String>
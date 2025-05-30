package ca.mattlack.portfolio.controller

import ca.mattlack.portfolio.repo.ImageRepo
import ca.mattlack.portfolio.repo.SavedImage
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import kotlin.random.Random
import kotlin.random.nextInt

@RestController
@RequestMapping("/api/images")
class ImageController(val repo: ImageRepo) {
    @PostMapping("upload")
    suspend fun uploadImage(@RequestParam("image") file: MultipartFile): String {
        val id = Random.nextInt(1000000..9999999).toString()
        val bytes = file.bytes
        val contentType = file.contentType
        val savedImage = SavedImage(id, contentType, bytes)
        repo.save(savedImage)
        return id
    }

    @GetMapping("{id}")
    suspend fun getImage(@PathVariable("id") id: String): ResponseEntity<*> {
        val image = repo.findById(id)
        if (image == null) return ResponseEntity.notFound().build<Any>()
        return ResponseEntity.ok()
            .header("Content-Type", image.contentType ?: "application/octet-stream")
            .body(image.data)
    }
}
package ca.mattlack.portfolio.controller

import ca.mattlack.portfolio.model.Project
import ca.mattlack.portfolio.repo.ProjectRepo
import kotlinx.coroutines.flow.toList
import org.springframework.beans.factory.annotation.Value
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/projects")
class ProjectController(
    val repo: ProjectRepo,
    @Value("\${api.key}") private val apiKey: String,
) {

    @GetMapping("list")
    suspend fun list(): List<Project> {
        return repo.findAll().toList().sortedBy { it.orderIndex }
    }

    @PostMapping("save")
    suspend fun save(@RequestBody body: Project) {
        repo.save(body)
    }

    @DeleteMapping("delete")
    suspend fun delete(id: String) {
        repo.deleteById(id)
    }

    @GetMapping("validate-key")
    suspend fun validateKey(key: String): Boolean {
        return key == apiKey
    }

    @PostMapping("reorder")
    suspend fun reorder(@RequestBody ids: List<String>) {
        // Fetch current projects and index them by id
        val current = repo.findAll().toList().associateBy { it.id }
        // Update orderIndex for each id in the provided order
        ids.forEachIndexed { index, id ->
            val proj = current[id]
            if (proj != null && proj.orderIndex != index) {
                repo.save(proj.copy(orderIndex = index))
            }
        }
    }

}
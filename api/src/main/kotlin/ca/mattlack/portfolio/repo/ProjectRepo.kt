package ca.mattlack.portfolio.repo

import ca.mattlack.portfolio.model.Project
import org.springframework.data.repository.kotlin.CoroutineCrudRepository

interface ProjectRepo : CoroutineCrudRepository<Project, String>
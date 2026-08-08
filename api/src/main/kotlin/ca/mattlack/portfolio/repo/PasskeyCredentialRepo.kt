package ca.mattlack.portfolio.repo

import ca.mattlack.portfolio.model.PasskeyCredential
import org.springframework.data.repository.kotlin.CoroutineCrudRepository

interface PasskeyCredentialRepo : CoroutineCrudRepository<PasskeyCredential, String>

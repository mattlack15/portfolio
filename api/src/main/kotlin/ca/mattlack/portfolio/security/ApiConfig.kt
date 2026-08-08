package ca.mattlack.portfolio.security
import org.springframework.boot.web.servlet.FilterRegistrationBean
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
open class ApiConfig {
    @Bean
    open fun addFilter(filter: EditorAuthFilter): FilterRegistrationBean<EditorAuthFilter> {
        val registration = FilterRegistrationBean<EditorAuthFilter>()
        registration.filter = filter
        registration.addUrlPatterns("/api/*")
        return registration
    }
}

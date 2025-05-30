package ca.mattlack.portfolio.ca.mattlack.portfolio

import ca.mattlack.portfolio.security.ApiKeyFilter
import org.springframework.boot.web.servlet.FilterRegistrationBean
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
open class ApiConfig {
    @Bean
    open fun addFilter(filter: ApiKeyFilter): FilterRegistrationBean<ApiKeyFilter> {
        val registration = FilterRegistrationBean<ApiKeyFilter>()
        registration.filter = filter
        registration.addUrlPatterns("/api/*")
        return registration
    }
}
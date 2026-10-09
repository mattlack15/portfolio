import './style.css'
import { createApp } from 'vue'
import App from '@/App.vue'
import router from './router'
import {installAnalytics} from './analytics'

installAnalytics(router)

const app = createApp(App)
app.use(router)
app.mount('#app')

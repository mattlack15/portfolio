import './style.css'
import { createApp } from 'vue'
import App from '@/App.vue'
import router from './router'
import {installAnalytics} from './analytics'

installAnalytics(router)

const app = createApp(App)
app.use(router)
// Replace the prerendered page only once its route is loaded, so it never flashes blank.
router.isReady().finally(()=>app.mount('#app'))

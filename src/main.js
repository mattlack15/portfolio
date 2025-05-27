import './style.css'
import { createApp } from 'vue'
import App from '@/App.vue'
import { Icon } from '@iconify/vue'
import router from './router'

const app = createApp(App).component('Icon', Icon)
app.use(router)
app.mount('#app')

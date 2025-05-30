import { createRouter, createWebHistory } from 'vue-router';
import HomeView from "@/views/HomeView.vue";

const routes = [
    {
        path: '/',
        name: 'home',
        component: HomeView
    },
    {
        path: '/project/:id',
        name: 'project',
        component: () => import('@/views/ProjectView.vue')
    }
]

export default createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: routes
})
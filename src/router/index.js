import { createRouter, createWebHistory } from 'vue-router';
import HomeView from "@/views/HomeView.vue";

const routes = [
    {path: '/designs', name: 'design-review', component: () => import('@/designs/DesignReview.vue')},
    {path: '/designs/:direction/project/:id', name: 'design-project', component: () => import('@/designs/DesignProject.vue')},
    {path: '/designs/:direction', name: 'design-preview', component: () => import('@/designs/DesignView.vue')},
    {path: "/analytics", name: "analytics", component: () => import("@/views/AnalyticsView.vue")},
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
    routes: routes,
    scrollBehavior(to, from, savedPosition) {
      if (!to.path.startsWith('/designs') && !from.path.startsWith('/designs')) return;
      if (savedPosition) return savedPosition;
      if (to.hash) return {el: to.hash, behavior: 'smooth'};
      return {top: 0};
    },
})

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
        component: () => import('@/designs/DesignView.vue'),
        meta: {portfolio: true},
    },
    {
        path: '/project/:id',
        name: 'project',
        component: () => import('@/designs/DesignProject.vue'),
        meta: {portfolio: true},
    },
    {path: '/editor', name: 'editor', component: HomeView},
    {path: '/editor/project/:id', name: 'editor-project', component: () => import('@/views/ProjectView.vue')},
]

export default createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: routes,
    scrollBehavior(to, from, savedPosition) {
      if (savedPosition) return savedPosition;
      if (to.hash) return {el: to.hash, behavior: 'smooth'};
      return {top: 0};
    },
})

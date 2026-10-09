import {createRouter, createWebHistory} from 'vue-router';
const routes = [
  {path:'/',name:'home',component:()=>import('@/portfolio/Home.vue')},
  {path:'/project/:id',name:'project',component:()=>import('@/portfolio/Project.vue')},
  {path:'/analytics',name:'analytics',component:()=>import('@/views/AnalyticsView.vue')},
  // Existing bookmarks land on the same portfolio pages, with no separate editor.
  {path:'/editor',redirect:'/'},
  {path:'/editor/project/:id',redirect:to=>`/project/${to.params.id}`},
  {path:'/designs/:direction/project/:id',redirect:to=>`/project/${to.params.id}`},
  {path:'/designs/:direction?',redirect:'/'},
  {path:'/:pathMatch(.*)*',redirect:'/'},
];
export default createRouter({history:createWebHistory(import.meta.env.BASE_URL),routes,scrollBehavior(to,from,savedPosition) {
  if (savedPosition) return savedPosition;
  if (to.hash) return {el:to.hash,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'};
  return {top:0};
}});

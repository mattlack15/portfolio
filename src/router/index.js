import {createRouter, createWebHistory} from 'vue-router';
import {routes} from './routes';
export default createRouter({history:createWebHistory(import.meta.env.BASE_URL),routes,scrollBehavior(to,from,savedPosition) {
  if (savedPosition) return savedPosition;
  if (to.hash) return {el:to.hash,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'};
  return {top:0};
}});

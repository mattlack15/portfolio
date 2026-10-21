// Shared by the browser router and the build-time prerender.
export const routes = [
  {path:'/',name:'home',component:()=>import('@/portfolio/Home.vue')},
  {path:'/project/:id',name:'project',component:()=>import('@/portfolio/Project.vue')},
  {path:'/analytics',name:'analytics',component:()=>import('@/views/AnalyticsView.vue')},
  // Existing bookmarks land on the same portfolio pages, with no separate editor.
  {path:'/editor',redirect:'/'},
  {path:'/editor/project/:id',redirect:to=>`/project/${to.params.id}`},
  {path:'/designs/:direction/project/:id',redirect:to=>`/project/${to.params.id}`},
  {path:'/designs/:direction?',redirect:'/'},
  {path:'/:pathMatch(.*)*',name:'not-found',component:()=>import('@/portfolio/NotFound.vue')},
];

import {createSSRApp} from 'vue';
import {createMemoryHistory, createRouter} from 'vue-router';
import {renderToString} from 'vue/server-renderer';
import App from '@/App.vue';
import {routes} from './router/routes';
import {setProjects} from './portfolio/projects';
export {homeMeta, projectMeta, renderMeta, SITE} from './portfolio/meta';

// Used by scripts/prerender.mjs after the browser build.
export async function render(url, data) {
  const projects = setProjects(data);
  const router = createRouter({history:createMemoryHistory(), routes});
  const app = createSSRApp(App).use(router);
  await router.push(url);
  await router.isReady();
  const context = {};
  const html = await renderToString(app, context);
  return {html, modules:context.modules, projects};
}

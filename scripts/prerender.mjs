// Writes static HTML for the home and project pages after `vite build`, so search engines
// see each page's content, title, description, and canonical link without running JavaScript.
// Also writes robots.txt and sitemap.xml. Run through `npm run build`.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import snapshot from '../src/portfolio/projects.json' with {type:'json'};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const api = process.env.PRERENDER_API ?? 'https://mattlack.com/api/projects/list';
const {render, homeMeta, projectMeta, renderMeta, SITE} = await import(pathToFileURL(path.join(root, 'dist-ssr/entry-server.js')).href);
const template = await fs.readFile(path.join(dist, 'index.html'), 'utf8');
const manifest = JSON.parse(await fs.readFile(path.join(dist, '.vite/ssr-manifest.json'), 'utf8'));

// Prefer the live projects, which include edits made on the site since the snapshot was saved.
async function loadProjects() {
  if (!api) return snapshot;
  try {
    const response = await fetch(api, {signal:AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data) || data.some(p => !p.id || typeof p.title !== 'string')) throw new Error('Invalid project response');
    console.log(`Prerendering ${data.length} projects from ${api}`);
    return data;
  } catch (error) {
    console.warn(`Prerendering the bundled snapshot because ${api} could not be loaded: ${error.message}`);
    return snapshot;
  }
}

function preloadLinks(modules) {
  const files = new Set([...modules].flatMap(id => manifest[id] || []));
  return [...files].filter(file => !template.includes(file)).map(file =>
    file.endsWith('.css') ? `<link rel="stylesheet" crossorigin href="${file}">` :
    file.endsWith('.js') ? `<link rel="modulepreload" crossorigin href="${file}">` : '').filter(Boolean).join('\n    ');
}

function page(html, modules, meta) {
  const replace = (text, pattern, value) => {
    if (!pattern.test(text)) throw new Error(`Template is missing ${pattern}`);
    return text.replace(pattern, () => value);
  };
  let result = replace(template, /<html lang="en">/, '<html lang="en" class="portfolio-page">');
  result = replace(result, /<meta name="description"[^>]*>\s*<title>[^<]*<\/title>/, renderMeta(meta));
  result = replace(result, /<\/head>/, `  ${preloadLinks(modules)}\n  </head>`);
  return replace(result, /<div id="app"><\/div>/, `<div id="app">${html}</div>`);
}

const data = await loadProjects();
const home = await render('/', data);
const pages = [['/', page(home.html, home.modules, homeMeta())]];
for (const project of home.projects) {
  const {html, modules} = await render(`/project/${project.id}`, data);
  if (!html.includes('class="project-title"')) throw new Error(`Project ${project.id} did not render`);
  pages.push([`/project/${project.id}`, page(html, modules, projectMeta(project))]);
}
for (const [url, html] of pages) {
  const file = path.join(dist, url, 'index.html');
  await fs.mkdir(path.dirname(file), {recursive:true});
  await fs.writeFile(file, html);
}

const urls = pages.map(([url]) => `  <url><loc>${SITE}${url}</loc></url>`).join('\n');
await fs.writeFile(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
await fs.writeFile(path.join(dist, 'robots.txt'), `User-agent: *\nDisallow: /analytics\n\nSitemap: ${SITE}/sitemap.xml\n`);
await fs.rm(path.join(dist, '.vite'), {recursive:true, force:true});
console.log(`Prerendered ${pages.length} pages, sitemap.xml, and robots.txt`);

import {watchEffect} from 'vue';

// Page titles, descriptions, and canonical links, shared by the browser and the build-time prerender.
export const SITE = 'https://mattlack.com';
const description = 'Matthew Lack, a programmer in Toronto. Projects in software and electronics, with notes on how they work.';
const absolute = path => path && (/^https?:/.test(path) ? path : SITE + path);

export const homeMeta = () => ({title:'Matthew Lack', description, path:'/', image:'/design-assets/images/5606325.webp'});
export const projectMeta = project => ({title:`${project.name} | Matthew Lack`, description:project.summary || description, path:`/project/${project.id}`, image:project.image});
export const notFoundMeta = title => ({title:`${title} | Matthew Lack`, description, noindex:true});

function tags({title, description, path, image, noindex}) {
  return [
    ['meta', {name:'description', content:description}],
    ['meta', {name:'robots', content:noindex ? 'noindex' : null}],
    ['link', {rel:'canonical', href:noindex ? null : absolute(path)}],
    ['meta', {property:'og:type', content:'website'}],
    ['meta', {property:'og:site_name', content:'Matthew Lack'}],
    ['meta', {property:'og:title', content:title}],
    ['meta', {property:'og:description', content:description}],
    ['meta', {property:'og:url', content:noindex ? null : absolute(path)}],
    ['meta', {property:'og:image', content:absolute(image) || null}],
    ['meta', {name:'twitter:card', content:image ? 'summary_large_image' : 'summary'}],
  ];
}
const key = attributes => Object.entries(attributes).find(([name]) => ['name','property','rel'].includes(name));
const escape = value => String(value).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

// Markup for the <head> of a prerendered page. Tags without a value are left out.
export function renderMeta(meta) {
  return [`<title>${escape(meta.title)}</title>`, ...tags(meta).filter(([,attributes]) => Object.values(attributes).every(value => value !== null))
    .map(([tag, attributes]) => `<${tag} ${Object.entries(attributes).map(([name, value]) => `${name}="${escape(value)}"`).join(' ')}>`)].join('\n    ');
}

function applyMeta(meta) {
  document.title = meta.title;
  for (const [tag, attributes] of tags(meta)) {
    const [name, value] = key(attributes);
    const valueName = tag === 'link' ? 'href' : 'content';
    let element = document.head.querySelector(`${tag}[${name}="${value}"]`);
    if (attributes[valueName] === null) { element?.remove(); continue; }
    if (!element) {
      element = document.createElement(tag);
      element.setAttribute(name, value);
      document.head.append(element);
    }
    element.setAttribute(valueName, attributes[valueName]);
  }
}

export function usePageMeta(getMeta) {
  if (!import.meta.env.SSR) watchEffect(() => applyMeta(getMeta()));
}

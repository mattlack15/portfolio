<script setup>
import {computed,watchEffect} from 'vue';
import {useRoute} from 'vue-router';
import {Marked} from 'marked';
import {markedHighlight} from 'marked-highlight';
import hljs from 'highlight.js';
import DesignFrame from './DesignFrame.vue';
import {directions,projects,projectLink} from './content';
const route=useRoute();
const direction=computed(()=>directions.find(d=>d.id===route.params.direction));
const project=computed(()=>projects.find(p=>p.id===route.params.id));
const next=computed(()=>projects[(projects.findIndex(p=>p.id===route.params.id)+1)%projects.length]);
const parser=new Marked(markedHighlight({langPrefix:'hljs language-',highlight(code,lang){return hljs.highlight(code,{language:hljs.getLanguage(lang)?lang:'plaintext'}).value;}}));
const description=computed(()=>parser.parse(project.value?.description||'').replace(/<(\/?)h([1-6])(\b[^>]*)>/g,(_,slash,depth,attributes)=>`<${slash}h${Math.min(6,Number(depth)+1)}${attributes}>`));
watchEffect(()=>{document.title=`${project.value?.name||'Project not found'} | Matthew Lack`;});
</script>

<template>
  <DesignFrame><div :class="['design-project',route.params.direction]">
    <header class="dp-header"><RouterLink :to="`/designs/${direction?.id || 'editorial'}`">Matthew Lack</RouterLink><div><RouterLink :to="`/designs/${direction?.id || 'editorial'}`">All projects</RouterLink><a href="/resume.pdf" target="_blank" rel="noopener">Resume ↗</a></div></header>
    <main v-if="project && direction">
      <RouterLink :to="`/designs/${direction.id}`" class="dp-back">← {{ direction.id === 'editorial' ? 'Back to projects' : `Back to ${direction.name}` }}</RouterLink><div class="dp-title"><span v-if="direction.id !== 'editorial'" class="design-eyebrow">{{ project.category }} / Project {{ String(project.orderIndex+1).padStart(2,'0') }}</span><h1>{{ project.name }}</h1><p>{{ project.summary }}</p><ul v-if="project.technologies.length" class="dp-stack" aria-label="Project technologies"><li v-for="tech in project.technologies" :key="tech">{{ tech }}</li></ul></div>
      <div v-if="project.image" class="dp-cover"><img :src="project.image" :alt="project.name" /></div>
      <article v-if="project.description.trim()" v-html="description" class="dp-prose"></article>
      <article v-else class="dp-prose"><h2>About this project</h2><p>{{ project.summary }}</p><p class="dp-empty-note">I haven't added a longer writeup for this project yet.</p></article>
      <RouterLink :to="projectLink(direction.id,next.id)" class="dp-next"><span class="design-eyebrow">Next project</span><strong>{{ next.name }}</strong><span>↗</span></RouterLink>
      <footer class="design-footer"><span>Matthew Lack · Toronto</span><div><RouterLink :to="`/designs/${direction.id}`">All projects</RouterLink><a href="https://github.com/mattlack15" target="_blank" rel="noopener">GitHub ↗</a></div></footer>
    </main>
    <main v-else class="dp-missing"><h1>Project not found</h1><RouterLink to="/designs">View the design choices →</RouterLink></main>
  </div></DesignFrame>
</template>

<style>
.design-project { --paper:#f4f1e8; --ink:#282a23; --line:#cfcfc0; --muted:#57604d; --accent:#a44128; background:var(--paper); color:var(--ink); min-height:100vh; padding:0 clamp(22px,6vw,96px); }
.design-project.workbench { --paper:#151b18; --ink:#d9e3d8; --line:#344139; --muted:#a3b49f; --accent:#b5d6aa; }
.design-project.gallery { --paper:#f0f1ed; --ink:#161b20; --line:#c4c8c5; --muted:#53614e; --accent:#2146cf; }
.design-project.index { --paper:#f7f8f4; --ink:#263d33; --line:#d7ddd4; --muted:#4d6147; --accent:#263d33; }
.dp-header { display:flex; justify-content:space-between; align-items:center; padding:27px 0; border-bottom:1px solid var(--line); font-size:13px; gap:25px; }.dp-header>a { font:23px/1.3 Georgia,serif; }.dp-header>div { display:flex; gap:30px; }
.design-project main { max-width:1060px; margin:0 auto; }.dp-back { display:inline-block; margin:38px 0 35px; font-size:12px; color:var(--muted)!important; }.dp-back:hover { color:var(--accent)!important; }
.dp-title { max-width:850px; }.dp-title>.design-eyebrow { color:var(--accent); }.dp-title h1 { font:clamp(40px,5vw,70px)/1.08 Georgia,serif; letter-spacing:-.045em; margin:19px 0 25px; }.workbench .dp-title h1,.gallery .dp-title h1 { font-family:Arial,sans-serif; font-weight:500; letter-spacing:-.055em; }.dp-title p { font-size:17px; line-height:1.75; color:var(--muted); max-width:720px; }
.dp-stack { display:flex; flex-wrap:wrap; list-style:none; gap:9px 20px; padding:0; margin:26px 0 36px; font:11px/1.5 'Courier New',monospace; color:var(--muted); }.dp-stack li { padding-bottom:4px; border-bottom:1px solid var(--line); }
.dp-cover { background:var(--line); display:flex; align-items:center; justify-content:center; padding:25px; margin:0 0 55px; }.dp-cover img { width:auto; max-height:520px; object-fit:contain; }
.dp-prose { max-width:800px; margin:0 auto 70px; font-size:16px; line-height:1.9; overflow-wrap:anywhere; }.dp-prose>p,.dp-prose>div,.dp-prose>ul,.dp-prose>ol { margin:22px 0; }.dp-prose h1,.dp-prose h2,.dp-prose h3,.dp-prose h4 { line-height:1.25; margin:50px 0 23px; font-family:Georgia,serif; letter-spacing:-.025em; }.dp-prose h1 { font-size:38px; }.dp-prose h2 { font-size:30px; }.dp-prose h3 { font-size:24px; }.dp-prose h4 { font-size:20px; }.dp-prose ul,.dp-prose ol { padding-left:26px; list-style:revert; }.dp-prose li { margin:10px 0; }.dp-prose a { color:var(--accent); text-decoration:underline; text-underline-offset:3px; }.dp-prose img { margin:35px auto; height:auto!important; max-width:100%!important; object-fit:contain; }.dp-prose pre { max-width:100%; overflow:auto; background:#182019; color:#e1e8de; padding:24px; font:12px/1.8 'Courier New',monospace; border:1px solid #354239; }.dp-prose code { font-family:'Courier New',monospace; font-size:.85em; }.dp-prose pre code { font-size:inherit; white-space:pre; }.dp-prose :not(pre)>code { background:var(--line); padding:2px 4px; }.dp-prose blockquote { border-left:2px solid var(--accent); padding-left:22px; color:var(--muted); }.dp-prose table { display:block; max-width:100%; overflow:auto; border-collapse:collapse; font-size:13px; }.dp-prose td,.dp-prose th { border:1px solid var(--line); padding:12px; }.dp-prose hr { border:0; border-top:1px solid var(--line); margin:40px 0; }.dp-empty-note { color:var(--muted); font-size:14px; }
.dp-next { display:grid; grid-template-columns:1fr auto; gap:15px; padding:35px 0 50px; border-top:1px solid var(--line); }.dp-next>.design-eyebrow { grid-column:span 2; color:var(--muted); }.dp-next strong { font:30px/1.25 Georgia,serif; }.dp-next>span:last-child { font-size:30px; color:var(--accent); }.dp-missing { padding:100px 0; }
.dp-prose .hljs-keyword,.dp-prose .hljs-literal { color:#c9d5af; }.dp-prose .hljs-string { color:#a6ceba; }.dp-prose .hljs-comment { color:#92a58b; }.dp-prose .hljs-number { color:#ddb69b; }
.design-project.editorial { --ink:#252525; --muted:#535353; --accent:#252525; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif; }
.editorial .dp-header, .editorial .dp-next, .editorial .design-footer, .editorial .dp-stack li { border:0; }
.editorial .dp-header>a { font:600 22px/1.3 -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif; }
.editorial .dp-title h1 { font:600 clamp(32px,4vw,48px)/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif; letter-spacing:normal; }
.editorial .dp-title p { color:var(--ink); }
.editorial .dp-stack { font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif; }
.editorial .dp-cover { padding:0; background:transparent; }
.editorial .dp-prose { line-height:1.8; }
.editorial .dp-prose h1, .editorial .dp-prose h2, .editorial .dp-prose h3, .editorial .dp-prose h4, .editorial .dp-next strong { font-family:inherit; letter-spacing:normal; font-weight:600; }
.editorial .dp-next strong { font-size:26px; }
.editorial .design-eyebrow { font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif; letter-spacing:normal; text-transform:none; }
@media(max-width:600px) { .dp-header>a { font-size:20px; }.dp-header>div { gap:20px; font-size:11px; }.dp-title h1 { font-size:41px; }.dp-title p { font-size:15px; }.dp-back { margin:27px 0; }.dp-stack { font-size:10px; gap:7px 15px; }.dp-cover { padding:15px; margin-bottom:35px; }.dp-prose { font-size:14px; line-height:1.85; }.dp-prose h1 { font-size:30px; }.dp-prose h2 { font-size:26px; }.dp-prose h3 { font-size:22px; }.dp-prose pre { font-size:11px; padding:15px; }.dp-next strong { font-size:25px; } }
</style>

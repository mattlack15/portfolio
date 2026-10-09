<script setup>
import {computed,ref} from 'vue';
import {projects,projectLink,bio} from './content';
const selected=ref(projects[0].id);
const filter=ref('All');
const filtered=computed(()=>projects.filter(p=>filter.value==='All'||p.category===filter.value));
const active=computed(()=>projects.find(p=>p.id===selected.value)||projects[0]);
function setFilter(value) { filter.value=value; if(!filtered.value.some(p=>p.id===selected.value))selected.value=filtered.value[0]?.id; }
const tabs=['All','Hardware','Systems','Web','Games'];
const view=ref('overview');
</script>

<template>
  <div class="workbench">
    <aside class="w-sidebar"><RouterLink to="/designs/workbench" class="w-brand">ml<span>Matthew Lack</span></RouterLink><div class="w-sidebar-label">Software developer<br>Toronto, Canada</div><nav aria-label="Portfolio"><a href="#w-projects" class="active"><span>01</span> Projects <span>↗</span></a><a href="#w-background"><span>02</span> Background</a><a href="/resume.pdf" target="_blank" rel="noopener"><span>03</span> Resume ↗</a><a href="https://github.com/mattlack15" target="_blank" rel="noopener"><span>04</span> GitHub ↗</a></nav><div class="w-sidebar-bottom"><span class="w-mark">[ ML ]</span><p>Software. Hardware.<br>A few experiments.</p></div></aside>
    <main class="w-main">
      <header class="w-topline"><span>PORTFOLIO / PROJECT EXPLORER</span><span>{{ projects.length }} PROJECTS</span></header>
      <section class="w-hero"><div class="design-eyebrow">Matthew Lack</div><h1>I like knowing<br>what's under the hood.</h1><p>I build web applications, game servers, and embedded software.<br class="w-desktop-break"> These are some of the projects I've worked on along the way.</p><a href="#w-projects" class="w-jump">Explore the projects <span>↓</span></a></section>
      <section class="w-explorer" id="w-projects">
        <div class="w-explorer-title"><h2>Project explorer</h2><span>Select a project to inspect</span></div>
        <div class="w-filters"><button v-for="t in tabs" :key="t" :class="{active:filter===t}" :aria-pressed="filter===t" @click="setFilter(t)">{{ t }}</button></div>
        <div class="w-split">
          <div class="w-list" aria-label="Projects"><button v-for="p in filtered" :key="p.id" :class="{selected:selected===p.id}" :aria-pressed="selected===p.id" @click="selected=p.id;view='overview'"><span class="w-list-icon">{{ p.category==='Hardware'?'⊞':p.category==='Web'?'◫':'≡' }}</span><span>{{ p.name }}<small>{{ p.category }}</small></span><span class="w-list-arrow">↗</span></button></div>
          <article class="w-inspector" :key="active.id"><div class="w-inspector-tabs"><button :class="{active:view==='overview'}" :aria-pressed="view==='overview'" @click="view='overview'">Overview</button><button :class="{active:view==='stack'}" :aria-pressed="view==='stack'" @click="view='stack'">Technologies</button><span>{{ active.category }}</span></div>
            <div v-if="view==='overview'" class="w-overview"><div class="w-image"><img v-if="active.image" :src="active.id===projects[0].id?'/design-assets/images/7428348.webp':active.image" :alt="active.id===projects[0].id?'Circuit board layout from the display project':active.name" /><div v-else class="w-no-image">{{ active.name }}<span>Source code project</span></div></div><div class="w-inspector-copy"><span class="design-eyebrow">{{ String(active.orderIndex+1).padStart(2,'0') }} / {{ active.category }}</span><h3>{{ active.name }}</h3><p>{{ active.summary }}</p><RouterLink :to="projectLink('workbench',active.id)" class="w-read">Open project writeup <span>↗</span></RouterLink></div></div>
            <div v-else class="w-stack"><span class="design-eyebrow">Project technologies</span><h3>{{ active.name }}</h3><ul v-if="active.technologies.length"><li v-for="(tech,i) in active.technologies" :key="tech"><span>{{ String(i+1).padStart(2,'0') }}</span>{{ tech }}</li></ul><p v-else>No technology list recorded for this project.</p><RouterLink :to="projectLink('workbench',active.id)" class="w-read">Open project writeup <span>↗</span></RouterLink></div>
          </article>
        </div>
      </section>
      <section class="w-background" id="w-background"><div><span class="design-eyebrow">Background</span><h2>How I got here</h2></div><div><p>{{ bio }}</p><dl><div><dt>Study</dt><dd>Computer Science & Mathematics</dd></div><div><dt>School</dt><dd>University of Toronto</dd></div><div><dt>Work</dt><dd>Web, Android, backend, embedded systems</dd></div></dl></div></section>
      <footer class="design-footer"><span>Matthew Lack / Toronto</span><div><a href="/resume.pdf" target="_blank" rel="noopener">Resume ↗</a><a href="https://github.com/mattlack15" target="_blank" rel="noopener">GitHub ↗</a></div></footer>
    </main>
  </div>
</template>

<style scoped>
.workbench { --paper:#151b18; --ink:#d9e3d8; --line:#344139; background:var(--paper); color:var(--ink); display:grid; grid-template-columns:225px minmax(0,1fr); font-family:Arial,sans-serif; min-height:100vh; }
.w-sidebar { position:sticky; top:0; height:100vh; align-self:start; border-right:1px solid var(--line); padding:36px 27px; display:flex; flex-direction:column; background:#111713; }
.w-brand { font:44px/1 'Courier New',monospace; letter-spacing:-.12em; color:#b5d6aa!important; }
.w-brand span { display:block; font:14px/1.5 Arial,sans-serif; letter-spacing:0; margin-top:14px; color:#e1e7de; }
.w-sidebar-label { color:#8a9a8c; font:11px/1.9 'Courier New',monospace; margin:14px 0 52px; }
.w-sidebar nav { display:flex; flex-direction:column; gap:26px; font:12px/1.5 Arial,sans-serif; }
.w-sidebar nav a { display:flex; align-items:center; gap:16px; color:#9aa799; }
.w-sidebar nav a>span:first-child { font:10px 'Courier New',monospace; color:#6d806f; }
.w-sidebar nav a>span:last-child:not(:first-child) { margin-left:auto; }
.w-sidebar nav a.active,.w-sidebar nav a:hover { color:#b5d6aa; }
.w-sidebar-bottom { margin-top:auto; padding-top:160px; font:11px/1.9 'Courier New',monospace; color:#879789; }
.w-mark { display:block; font-size:24px; color:#718a74; margin-bottom:16px; }
.w-main { min-width:0; padding:0 clamp(25px,4vw,70px); }
.w-topline { display:flex; justify-content:space-between; border-bottom:1px solid var(--line); padding:25px 0; font:10px/1.5 'Courier New',monospace; color:#90a090; letter-spacing:.05em; }
.w-hero { padding:55px 0 48px; }
.w-hero>.design-eyebrow { color:#b5d6aa; }
.w-hero h1 { font-size:clamp(38px,4.4vw,66px); line-height:1.03; letter-spacing:-.055em; font-weight:500; margin:17px 0 23px; }
.w-hero p { font-size:14px; line-height:1.75; color:#a3b0a1; }
.w-jump { display:flex; justify-content:space-between; width:200px; color:#b5d6aa!important; font:12px/1.6 'Courier New',monospace; margin-top:22px; }
.w-explorer { border:1px solid var(--line); scroll-margin-top:22px; }
.w-explorer-title { display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid var(--line); background:#1c241f; }
.w-explorer-title h2 { font:13px/1.5 'Courier New',monospace; }
.w-explorer-title>span { font:10px/1.5 'Courier New',monospace; color:#9bac9a; }
.w-filters { display:flex; flex-wrap:wrap; border-bottom:1px solid var(--line); padding:9px 12px; gap:5px; }
.w-filters button { background:transparent; color:#9bab99; padding:5px 12px; font:11px/1.5 'Courier New',monospace; border:1px solid transparent; }
.w-filters button:hover { color:#dce8d8; }
.w-filters button.active { border-color:#53714f; color:#c4e3b9; background:#253c25; }
.w-split { display:grid; grid-template-columns:32% minmax(0,1fr); min-height:465px; }
.w-list { border-right:1px solid var(--line); max-height:530px; overflow:auto; padding:9px; scrollbar-width:thin; scrollbar-color:#465747 #172019; }
.w-list button { display:flex; gap:10px; width:100%; text-align:left; color:#bac7b7; align-items:center; padding:13px 10px; border:1px solid transparent; background:transparent; font-size:12px; line-height:1.4; }
.w-list button:hover { background:#202b22; }
.w-list button.selected { border-color:#52654a; background:#283a27; color:#d9ebcf; }
.w-list small { display:block; color:#8fa089; font:10px/1.5 'Courier New',monospace; margin-top:5px; }
.w-list-icon { color:#a7bb9e; font:15px 'Courier New',monospace; }
.w-list-arrow { margin-left:auto; color:#92b984; }
.w-inspector { min-width:0; }
.w-inspector-tabs { display:flex; gap:20px; align-items:center; padding:13px 20px; border-bottom:1px solid var(--line); font:10px/1.5 'Courier New',monospace; }
.w-inspector-tabs button { background:transparent; border:0; font:inherit; color:#91a18e; padding:4px 0; }
.w-inspector-tabs button.active { color:#c4e3b9; border-bottom:1px solid #c4e3b9; }
.w-inspector-tabs>span { margin-left:auto; color:#859581; }
.w-image { height:205px; background:#0d130f; padding:16px 25px; border-bottom:1px solid var(--line); }
.w-image img { width:100%; height:100%; object-fit:contain; }
.w-inspector-copy { padding:23px; }
.w-inspector-copy>.design-eyebrow { color:#96b88d; font-size:10px; }
.w-inspector h3 { font-size:25px; font-weight:500; letter-spacing:-.035em; margin:8px 0 14px; line-height:1.25; }
.w-inspector p { color:#a4b29f; font-size:13px; line-height:1.75; }
.w-read { display:flex; justify-content:space-between; color:#b5d6aa!important; margin-top:21px; padding-top:14px; border-top:1px solid var(--line); font:11px/1.5 'Courier New',monospace; }
.w-no-image { height:100%; display:flex; justify-content:center; align-items:center; flex-direction:column; font:24px/1.5 'Courier New',monospace; }.w-no-image span { font-size:11px; color:#97a493; margin-top:14px; }
.w-stack { padding:28px; }.w-stack>.design-eyebrow { color:#96b88d; }.w-stack ul { list-style:none; padding:0; margin:22px 0; }.w-stack li { border-bottom:1px solid var(--line); padding:12px 0; font:12px/1.5 'Courier New',monospace; }.w-stack li span { color:#849c7e; margin-right:20px; }
.w-background { display:grid; grid-template-columns:1fr 1.7fr; gap:40px; padding:60px 0; }.w-background h2 { font-size:28px; font-weight:500; letter-spacing:-.035em; margin-top:10px; }.w-background>.design-eyebrow { color:#9bb990; }.w-background p { font-size:14px; line-height:1.85; color:#b0bdae; }.w-background dl { font:11px/1.5 'Courier New',monospace; margin:24px 0 0; }.w-background dl>div { display:flex; gap:30px; border-top:1px solid var(--line); padding:12px 0; }.w-background dt { width:40px; color:#8eaa83; }.w-background dd { margin:0; }
.design-footer { color:#9eae98; font-family:'Courier New',monospace; font-size:10px; }
@media(max-width:1100px) { .workbench { grid-template-columns:180px minmax(0,1fr); }.w-sidebar { padding:30px 20px; }.w-split { grid-template-columns:38% minmax(0,1fr); }.w-main { padding-inline:28px; }.w-list-icon { display:none; } }
@media(max-width:750px) { .workbench { display:block; }.w-sidebar { position:static; height:auto; border-right:0; border-bottom:1px solid var(--line); display:flex; flex-direction:row; align-items:center; gap:25px; padding:20px; }.w-brand { font-size:28px; }.w-brand span { font-size:11px; margin-top:7px; }.w-sidebar-label,.w-sidebar-bottom { display:none; }.w-sidebar nav { margin-left:auto; flex-direction:row; gap:18px; font-size:11px; }.w-sidebar nav span { display:none; }.w-sidebar nav a:nth-child(2) { display:none; }.w-main { padding-inline:20px; }.w-topline { font-size:9px; }.w-hero { padding:40px 0; }.w-hero h1 { font-size:41px; }.w-desktop-break { display:none; }.w-explorer-title>span { display:none; }.w-split { display:block; }.w-list { max-height:230px; border-right:0; border-bottom:1px solid var(--line); }.w-list button { padding:10px; }.w-list button>span:nth-child(2) { display:flex; align-items:center; width:100%; gap:12px; }.w-list small { margin-left:auto; margin-top:0; }.w-inspector h3 { font-size:26px; }.w-image { height:225px; }.w-background { grid-template-columns:1fr; gap:25px; padding:42px 0; } }
</style>

<script setup>
import {computed,ref} from 'vue';
import {projects,categories,bio,projectLink} from './content';
const filter=ref('All');
const filtered=computed(()=>projects.filter(p=>filter.value==='All'||p.category===filter.value));
const featured=projects[0];
</script>

<template>
  <div class="editorial">
    <header class="e-header"><RouterLink to="/designs/editorial" class="e-brand">Matthew Lack<span>A collection of things I've made</span></RouterLink><nav aria-label="Portfolio"><a href="#e-work">Projects</a><a href="#e-about">About</a><a href="/resume.pdf" target="_blank" rel="noopener">Resume ↗</a></nav></header>
    <main>
      <section class="e-intro">
        <div class="e-margin"><span class="design-eyebrow">Toronto, Canada</span><span class="e-margin-rule"></span><span class="e-note">Software development<br>Computer science<br>Mathematics</span></div>
        <div class="e-intro-copy"><h1>From game servers<br>to circuit boards.</h1><p>I'm Matt. I build software and like figuring out how things work, whether that's a Minecraft network or the signals going into an iPhone display.</p><a href="#e-work" class="design-link">Take a look at my work <span>↓</span></a></div>
      </section>
      <section class="e-feature" aria-labelledby="e-feature-title">
        <RouterLink :to="projectLink('editorial',featured.id)" class="e-feature-photo"><img src="/design-assets/images/5606325.webp" alt="The custom circuit board from my iPhone X display investigation" /><div class="e-photo-caption"><span>iPhone X display investigation</span><span>Board photograph</span></div></RouterLink>
        <div class="e-feature-copy"><span class="design-eyebrow">From the workbench / Hardware</span><h2 id="e-feature-title">Getting an iPhone<br>display to talk.</h2><p>{{ featured.summary }}</p><div class="e-tech">C · KiCad · RP2350</div><RouterLink :to="projectLink('editorial',featured.id)" class="design-link">Read the investigation <span>↗</span></RouterLink></div>
      </section>
      <section id="e-work" class="e-work">
        <div class="e-section-title"><div><span class="design-eyebrow">The collection</span><h2>Selected projects</h2></div><span class="e-count">{{ projects.length }} projects, and counting.</span></div>
        <div class="design-filter"><button v-for="c in categories" :key="c" :class="{active:filter===c}" :aria-pressed="filter===c" @click="filter=c">{{ c }}</button></div>
        <div class="e-projects">
          <RouterLink v-for="(p,i) in filtered" :key="p.id" :to="projectLink('editorial',p.id)" class="e-project">
            <div class="e-project-image"><img v-if="p.image" :src="p.image" :alt="p.name" loading="lazy" /><div v-else class="design-placeholder">{{ p.name.slice(0,2) }}</div></div>
            <div class="e-project-meta"><span class="design-eyebrow">{{ p.category }}</span><span>↗</span></div><h3>{{ p.name }}</h3><p>{{ p.summary }}</p>
          </RouterLink>
        </div>
      </section>
      <section class="e-about" id="e-about"><div><span class="design-eyebrow">A little context</span><h2>It started with<br>Minecraft plugins.</h2></div><div><p>{{ bio }}</p><p>MidnightSky grew into a business that supported me through university. More recently, I've been working on event software and learning about mobile display hardware.</p><a href="https://github.com/mattlack15" target="_blank" rel="noopener" class="design-link">Find me on GitHub <span>↗</span></a></div></section>
    </main>
    <footer class="design-footer"><span>Matthew Lack · Toronto</span><div><a href="/resume.pdf" target="_blank" rel="noopener">Resume ↗</a><a href="https://github.com/mattlack15" target="_blank" rel="noopener">GitHub ↗</a><a href="#">Back to top ↑</a></div></footer>
  </div>
</template>

<style scoped>
.editorial { --paper:#f4f1e8; --ink:#282a23; --line:#cfcfc0; background:var(--paper); color:var(--ink); padding:0 clamp(22px,6vw,96px); }
.e-header { display:flex; align-items:center; justify-content:space-between; padding:30px 0 26px; border-bottom:1px solid var(--line); gap:24px; }
.e-brand { font:24px/1.2 Georgia,serif; }
.e-brand span { display:block; font:11px/1.5 Arial,sans-serif; color:#626454; margin-top:7px; }
.e-header nav { display:flex; gap:35px; font-size:13px; }
.e-header nav a:hover { color:#a44128; }
.e-intro { display:grid; grid-template-columns:22% 1fr; padding:80px 0 74px; }
.e-margin { padding-top:13px; display:flex; flex-direction:column; align-items:flex-start; gap:25px; }
.e-margin-rule { height:45px; width:1px; background:#a44128; }
.e-note { font:12px/1.8 Arial,sans-serif; color:#626454; }
.e-intro h1 { font:clamp(48px,5.5vw,84px)/1.04 Georgia,serif; letter-spacing:-.055em; font-weight:400; }
.e-intro-copy>p { max-width:535px; font:17px/1.7 Arial,sans-serif; margin:28px 0 24px; color:#555849; }
.e-intro .design-link { color:#a44128; }
.e-feature { display:grid; grid-template-columns:1.25fr 1fr; gap:6%; border-top:1px solid var(--line); border-bottom:1px solid var(--line); padding:36px 0; }
.e-feature-photo { display:flex; flex-direction:column; background:#deded1; }
.e-feature-photo img { width:100%; height:290px; object-fit:contain; mix-blend-mode:multiply; padding:36px; }
.e-photo-caption { display:flex; justify-content:space-between; gap:15px; font:10px/1.5 'Courier New',monospace; padding:12px 18px; border-top:1px solid #c4c6b9; }
.e-feature-copy { padding:16px 0; }
.e-feature-copy>.design-eyebrow { color:#a44128; }
.e-feature h2 { font:clamp(30px,3.3vw,48px)/1.12 Georgia,serif; letter-spacing:-.04em; margin:18px 0; }
.e-feature-copy p { font-size:14px; color:#555849; max-width:410px; line-height:1.7; }
.e-tech { font:11px/1.6 'Courier New',monospace; margin:20px 0; color:#636554; }
.e-work { padding:72px 0; scroll-margin-top:24px; }
.e-section-title { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:27px; gap:20px; }
.e-section-title h2 { font:42px/1.2 Georgia,serif; letter-spacing:-.045em; margin-top:8px; }
.e-count { font:12px/1.4 Georgia,serif; font-style:italic; color:#666956; }
.e-projects { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); column-gap:32px; row-gap:46px; margin-top:32px; }
.e-project-image { background:#e3e3d9; height:210px; overflow:hidden; }
.e-project-image img { width:100%; height:100%; object-fit:contain; transition:transform .3s; }
.e-project:hover img { transform:scale(1.035); }
.e-project-meta { display:flex; justify-content:space-between; align-items:center; margin:17px 0 7px; color:#777866; }
.e-project h3 { font:24px/1.2 Georgia,serif; letter-spacing:-.03em; }
.e-project p { margin-top:12px; font-size:13px; line-height:1.75; color:#5b5e50; }
.e-about { display:grid; grid-template-columns:1fr 1fr; gap:8%; padding:64px 0 72px; border-top:1px solid var(--line); scroll-margin-top:24px; }
.e-about h2 { font:43px/1.12 Georgia,serif; letter-spacing:-.04em; margin-top:15px; }
.e-about p { font-size:15px; line-height:1.85; margin-bottom:22px; color:#555849; }
@media(min-width:1600px) { .editorial { padding-inline:max(96px,calc((100vw - 1320px)/2)); } }
@media(max-width:900px) { .e-intro { grid-template-columns:1fr; padding-top:55px; } .e-margin { flex-direction:row; align-items:center; padding:0 0 24px; gap:16px; } .e-margin-rule { width:30px; height:1px; } .e-note { display:none; } .e-feature { gap:30px; } .e-feature-photo img { padding:15px; } .e-projects { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media(max-width:600px) { .e-header { align-items:flex-start; padding:24px 0; } .e-header nav { gap:15px; flex-wrap:wrap; justify-content:flex-end; font-size:11px; max-width:120px; } .e-brand { font-size:21px; } .e-brand span { max-width:140px; font-size:10px; } .e-intro { padding-bottom:45px; } .e-intro h1 { font-size:48px; } .e-intro-copy>p { font-size:15px; } .e-feature { grid-template-columns:1fr; gap:10px; padding:22px 0; } .e-feature-photo img { height:230px; padding:28px; } .e-feature h2 { font-size:38px; } .e-work { padding:48px 0; } .e-section-title h2 { font-size:34px; } .e-count { display:none; } .e-projects { grid-template-columns:1fr; gap:35px; } .e-project-image { height:240px; } .e-about { grid-template-columns:1fr; gap:28px; padding:45px 0; } .e-about h2 { font-size:36px; } }
</style>

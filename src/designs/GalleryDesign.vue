<script setup>
import {computed,ref} from 'vue';
import {projects,categories,bio,projectLink} from './content';
const filter=ref('All');
const filtered=computed(()=>projects.filter(p=>filter.value==='All'||p.category===filter.value));
const colors=['#dfded4','#d9dbeb','#dadfc9','#cbd6ed','#ddd6c9','#e3d6d0'];
</script>

<template>
  <div class="gallery">
    <div class="g-masthead"><header class="g-header"><RouterLink to="/designs/gallery">ML / PORTFOLIO</RouterLink><nav aria-label="Portfolio"><a href="#g-work">Projects</a><a href="#g-about">About</a><a href="/resume.pdf" target="_blank" rel="noopener">Resume ↗</a></nav></header><section class="g-hero"><h1>Matthew<br><span>Lack.</span></h1><div class="g-hero-bottom"><p>Software developer in Toronto.<br>Web apps, game servers,<br>and experiments with hardware.</p><div><span>Computer Science & Mathematics<br>University of Toronto</span><a href="#g-work">Scroll to the work <span>↓</span></a></div></div><span class="g-masthead-mark" aria-hidden="true">m/l</span></section></div>
    <main>
      <section id="g-work" class="g-work"><div class="g-work-heading"><h2>The work<span>({{ String(projects.length).padStart(2,'0') }})</span></h2><span>Built independently & with friends</span></div><div class="g-filters"><button v-for="c in categories" :key="c" :class="{active:filter===c}" :aria-pressed="filter===c" @click="filter=c">{{ c }}</button></div>
        <div class="g-projects"><RouterLink v-for="(p,i) in filtered" :key="p.id" :to="projectLink('gallery',p.id)" class="g-project" :class="{'g-wide':i===0||i===5}"><div class="g-project-image" :style="{background:colors[i%colors.length]}"><span class="g-project-number">{{ String(p.orderIndex+1).padStart(2,'0') }}</span><img v-if="p.image" :src="p.id===projects[0].id?'/design-assets/images/5606325.webp':p.image" :alt="p.id===projects[0].id?'Custom display circuit board':p.name" :loading="i<2?'eager':'lazy'" /><div v-else class="g-type-image">{{ p.name }}<span>{{ p.category }}</span></div><span class="g-image-arrow">↗</span></div><div class="g-caption"><div><h3>{{ p.name }}</h3><p>{{ p.summary }}</p></div><span>{{ p.category }}</span></div></RouterLink></div>
      </section>
      <section class="g-about" id="g-about"><span class="design-eyebrow">The person behind the projects</span><div class="g-about-grid"><h2>Hi, I'm Matt.</h2><div><p>{{ bio }}</p><p>Some of my projects became businesses. Others were built over a hackathon weekend, or started with a question I wanted to answer.</p><a href="https://github.com/mattlack15" target="_blank" rel="noopener" class="design-link">More on GitHub <span>↗</span></a></div></div></section>
      <footer class="design-footer"><span>Matthew Lack · Toronto, Canada</span><div><a href="/resume.pdf" target="_blank" rel="noopener">Resume ↗</a><a href="https://github.com/mattlack15" target="_blank" rel="noopener">GitHub ↗</a><a href="#">Back to top ↑</a></div></footer>
    </main>
  </div>
</template>

<style scoped>
.gallery { --paper:#f0f1ed; --ink:#161b20; --line:#c4c8c5; background:var(--paper); color:var(--ink); }
.g-masthead { background:#2146cf; color:#f3f5ee; padding:0 clamp(24px,5vw,80px); overflow:hidden; }
.g-header { display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #7190e4; padding:24px 0; font-size:12px; letter-spacing:.035em; gap:20px; }
.g-header>a { font-family:'Courier New',monospace; }
.g-header nav { display:flex; gap:34px; letter-spacing:0; }
.g-header a:hover { text-decoration:underline; }
.g-hero { position:relative; padding:46px 0 44px; }
.g-hero h1 { font-size:clamp(85px,12vw,185px); font-weight:650; line-height:.89; letter-spacing:-.075em; position:relative; z-index:1; }
.g-hero h1>span { margin-left:20%; }
.g-hero-bottom { display:grid; grid-template-columns:1fr 1fr; margin-top:42px; position:relative; z-index:1; }
.g-hero-bottom>p { font-size:17px; line-height:1.6; }
.g-hero-bottom>div { justify-self:end; display:flex; flex-direction:column; gap:24px; font-size:12px; line-height:1.7; width:220px; }
.g-hero-bottom a { display:flex; justify-content:space-between; padding-bottom:7px; border-bottom:1px solid #9db1ec; }
.g-masthead-mark { position:absolute; right:-28px; top:10px; font-size:300px; font-family:Georgia,serif; font-style:italic; letter-spacing:-.16em; color:#4162db; transform:rotate(-14deg); user-select:none; }
.gallery main { padding:0 clamp(24px,5vw,80px); }
.g-work { padding:58px 0; scroll-margin-top:24px; }
.g-work-heading { display:flex; align-items:center; justify-content:space-between; gap:20px; margin-bottom:24px; }
.g-work-heading h2 { font-size:40px; font-weight:500; letter-spacing:-.045em; }
.g-work-heading h2>span { vertical-align:top; font:12px/1.5 'Courier New',monospace; letter-spacing:0; margin-left:12px; }
.g-work-heading>span { font-size:12px; color:#60665e; }
.g-filters { display:flex; flex-wrap:wrap; gap:25px; border-bottom:1px solid var(--line); margin-bottom:30px; }
.g-filters button { background:transparent; border:0; padding:0 0 12px; font-size:13px; color:#62665f; border-bottom:2px solid transparent; }
.g-filters button.active { color:#2146cf; border-bottom-color:#2146cf; }
.g-filters button:hover { color:#2146cf; }
.g-projects { display:grid; grid-template-columns:1fr 1fr; gap:45px 30px; }
.g-project.g-wide { grid-column:span 2; }
.g-project-image { position:relative; height:350px; display:flex; align-items:center; justify-content:center; padding:48px; overflow:hidden; }
.g-wide .g-project-image { height:430px; }
.g-project-image img { max-height:100%; width:100%; object-fit:contain; transition:transform .35s; }
.g-project:first-child .g-project-image img { mix-blend-mode:multiply; max-width:950px; }
.g-project:hover .g-project-image img { transform:scale(1.025); }
.g-project-number { position:absolute; left:20px; top:18px; font:12px 'Courier New',monospace; }
.g-image-arrow { position:absolute; right:20px; bottom:18px; font-size:24px; }
.g-caption { display:flex; gap:25px; justify-content:space-between; padding-top:19px; }
.g-caption h3 { font-size:22px; line-height:1.2; letter-spacing:-.025em; font-weight:500; }
.g-caption p { font-size:13px; line-height:1.7; color:#5e665b; max-width:600px; margin-top:11px; }
.g-caption>span { font:10px/1.5 'Courier New',monospace; text-transform:uppercase; margin-top:4px; }
.g-type-image { font-size:clamp(26px,3vw,48px); line-height:1.1; letter-spacing:-.045em; }.g-type-image>span { display:block; font:11px/1.5 'Courier New',monospace; text-transform:uppercase; letter-spacing:.08em; margin-top:20px; }
.g-about { border-top:1px solid var(--line); padding:65px 0 80px; scroll-margin-top:24px; }
.g-about>.design-eyebrow { color:#2146cf; }.g-about-grid { display:grid; grid-template-columns:1fr 1fr; gap:50px; margin-top:30px; }.g-about-grid h2 { font-size:clamp(40px,5vw,70px); line-height:1; letter-spacing:-.065em; font-weight:500; }.g-about-grid p { font-size:16px; line-height:1.8; margin-bottom:23px; color:#4e584b; }.g-about .design-link { color:#2146cf; }
@media(min-width:1600px) { .g-masthead,.gallery main { padding-inline:max(80px,calc((100vw - 1400px)/2)); } }
@media(max-width:800px) { .g-hero h1 { font-size:110px; }.g-masthead-mark { font-size:210px; }.g-project-image { padding:25px; height:270px; }.g-wide .g-project-image { height:330px; }.g-work-heading>span { display:none; }.g-caption>span { display:none; } }
@media(max-width:550px) { .g-header { font-size:10px; }.g-header nav { gap:16px; }.g-hero { padding-top:45px; }.g-hero h1 { font-size:85px; }.g-hero h1>span { margin-left:15%; }.g-masthead-mark { right:-20px; font-size:170px; top:58px; }.g-hero-bottom { margin-top:33px; gap:25px; grid-template-columns:1fr; }.g-hero-bottom>p { font-size:15px; }.g-hero-bottom>div { width:100%; justify-self:stretch; flex-direction:row; justify-content:space-between; font-size:10px; align-items:flex-end; }.g-hero-bottom a { width:120px; }.g-work { padding-top:38px; }.g-work-heading h2 { font-size:34px; }.g-filters { gap:18px; }.g-filters button { font-size:12px; }.g-projects { grid-template-columns:1fr; gap:35px; }.g-project.g-wide { grid-column:auto; }.g-project-image,.g-wide .g-project-image { height:270px; padding:40px 25px; }.g-caption h3 { font-size:23px; }.g-about { padding:45px 0; }.g-about-grid { grid-template-columns:1fr; gap:26px; }.g-about-grid h2 { font-size:47px; }.g-about-grid p { font-size:15px; } }
</style>

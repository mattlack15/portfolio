<script setup>
import {computed, defineAsyncComponent, ref} from 'vue';
import {categories} from './content';
import {homeMeta, usePageMeta} from './meta';
import snapshot from './projects.json';
import {usePortfolio} from './projects';
import Header from './Header.vue';
import EditorAccess from './EditorAccess.vue';
import {useEditorAuth} from '@/auth/editor';
import {moveProject, deleteProject} from './projects';
const ProjectEditor=defineAsyncComponent(()=>import('./ProjectEditor.vue'));
defineProps({authToken:{type:String,default:null}});
const {token}=useEditorAuth();
const editing=ref(null);const editError=ref('');const pending=ref(false);
usePageMeta(homeMeta);

const {projects, projectLink, loaded, error, refreshProjects} = usePortfolio();
async function move(id,amount) { pending.value=true;editError.value='';try { await moveProject(id,amount); }catch(e){ editError.value=e.message; }finally { pending.value=false; } }
async function remove(project) { if(!confirm(`Delete ${project.name}?`))return;pending.value=true;editError.value='';try { await deleteProject(project.id); }catch(e){ editError.value=e.message; }finally { pending.value=false; } }

const filter = ref('All');
const filtered = computed(() => projects.value.filter(project => filter.value === 'All' || project.category === filter.value));
const featured = computed(() => projects.value.find(project => project.id === '1785866116116'));
const filters = computed(() => [...categories, ...(projects.value.some(p => p.category === 'Other') ? ['Other'] : [])]);
const originalFeature=snapshot.find(project=>project.id==='1785866116116');
const projectImage = project => project.id === originalFeature.id && project.imageId===originalFeature.imageId ? '/design-assets/images/5606325.webp' : project.image;
const featureTechnologies=computed(()=>JSON.stringify(featured.value?.technologies)===JSON.stringify(originalFeature.technologies)?'C, KiCad, RP2350':featured.value?.technologies.join(', '));
const featureSummary=computed(()=>featured.value?.brief===originalFeature.brief ? "I'm trying to drive this display with an RP2350. First, I need to find out how the phone turns it on, so I built a logic analyzer and a board to record the signals between them." : featured.value?.summary);
</script>

<template>
  <div class="editorial">
    <Header />

    <main>
      <section class="e-intro">
        <div class="e-margin">
          <span>Toronto</span>
          <p>Computer Science &amp; Mathematics<br> University of Toronto</p>
        </div>
        <div class="e-intro-copy">
          <h1>I'm Matt, a programmer in Toronto.</h1>
          <p>My dad introduced me to programming when I was young. I started making Minecraft plugins, then built and ran a server network called MidnightSky. More recently, I've been working on web apps and learning about electronics.</p>
          <a href="https://github.com/mattlack15" target="_blank" rel="noopener" class="e-read-link editorial-action" data-analytics-label="GitHub">GitHub</a>
        </div>
      </section>

      <section v-if="featured" class="e-feature" :class="{'e-feature-text':!featured.image}" aria-labelledby="e-feature-title">
        <figure v-if="featured.image" class="e-feature-photo">
          <RouterLink :to="projectLink(featured.id)" :data-analytics-label="featured.name">
            <img :src="projectImage(featured)" :alt="featured.imageId===originalFeature.imageId ? 'Green interposer board with display connectors and a USB port' : featured.name" />
          </RouterLink>
          <figcaption v-if="featured.imageId===originalFeature.imageId">The interposer board I built to tap the display signals.</figcaption>
        </figure>
        <div class="e-feature-copy">
          <h2 id="e-feature-title">{{ featured.name }}</h2>
          <p>{{ featureSummary }}</p>
          <p class="e-tech">{{ featureTechnologies }}</p>
          <RouterLink :to="projectLink(featured.id)" class="e-read-link editorial-action" data-analytics-label="Read the project notes">Read the project notes</RouterLink>
        </div>
      </section>

      <section id="e-work" class="e-work">
        <div class="e-section-title"><h2>Projects</h2><button v-if="token" class="editorial-action" :disabled="!loaded || error" @click="editing={project:null}" data-analytics-ignore>Add project</button></div>
        <p v-if="token && error" role="alert" class="editor-notice">The latest projects could not be loaded. <button class="editorial-action" @click="refreshProjects">Retry</button></p>
        <p v-if="editError" role="alert" class="editor-notice">{{ editError }}</p>
        <div class="design-filter" aria-label="Filter projects">
          <button v-for="category in filters" :key="category" :class="{active: filter === category}" :aria-pressed="filter === category" :data-analytics-label="`Filter: ${category}`" :data-analytics-target="`#filter=${category.toLowerCase()}`" @click="filter = category">{{ category }}</button>
        </div>
        <div class="e-projects">
          <article v-for="project in filtered" :key="project.id" class="e-project">
            <RouterLink v-if="project.image" :to="projectLink(project.id)" class="e-project-image" :data-analytics-label="project.name" tabindex="-1" aria-hidden="true">
              <img :src="projectImage(project)" alt="" loading="lazy" />
            </RouterLink>
            <h3><RouterLink :to="projectLink(project.id)" :data-analytics-label="project.name">{{ project.name }}</RouterLink></h3>
            <p>{{ project.summary }}</p>
            <div v-if="token" class="editor-controls" data-analytics-ignore>
              <button class="editorial-action" :disabled="!loaded || error || pending" @click="editing={project}">Edit project</button>
              <button class="editorial-action" :aria-label="`Move ${project.name} earlier`" :disabled="pending || error || projects[0]?.id===project.id" @click="move(project.id,-1)">Move up</button>
              <button class="editorial-action" :aria-label="`Move ${project.name} later`" :disabled="pending || error || projects.at(-1)?.id===project.id" @click="move(project.id,1)">Move down</button>
              <button class="editorial-action" :disabled="pending || error" @click="remove(project)">Delete</button>
            </div>
          </article>
        </div>
      </section>

      <section class="e-about" id="e-about">
        <h2>About me</h2>
        <div>
          <p>I study Computer Science and Mathematics at the University of Toronto. MidnightSky was also a business that supported me through university.</p>
          <p>I also go to hackathons with friends. We made FinHog at HackMIT, Clarify at GenAI, and Seascript at HackThe6ix.</p>
          <a href="https://github.com/mattlack15" target="_blank" rel="noopener" class="e-read-link editorial-action" data-analytics-label="GitHub">GitHub</a>
        </div>
      </section>
    </main>

    <footer class="design-footer">
      <span>Matthew Lack</span>
      <div>
        <a href="/resume.pdf" target="_blank" rel="noopener" data-analytics-label="Resume">Resume</a>
        <a href="https://github.com/mattlack15" target="_blank" rel="noopener" data-analytics-label="GitHub">GitHub</a>
        <a href="#" data-analytics-label="Back to top">Back to top</a>
        <EditorAccess />
      </div>
    </footer>
    <ProjectEditor v-if="editing" :project="editing.project" :order-index="projects.length" @close="editing=null" @saved="editing=null" />
  </div>
</template>

<style scoped>
.editorial {
  --paper: var(--editorial-paper);
  --ink: var(--editorial-ink);
  background: var(--paper);
  color: var(--ink);
  padding: 0 clamp(22px, 6vw, 96px);
  font-family: var(--editorial-font);
  font-size: 17px;
  line-height: 1.55;
}
.editorial a:not(.editorial-action) { color: var(--editorial-link); text-decoration: underline; text-decoration-color: var(--editorial-underline); text-underline-offset: 4px; text-decoration-thickness: 1px; }
.editorial a:not(.editorial-action):hover { text-decoration-color: currentColor; }
.e-intro { display: grid; grid-template-columns: 22% 1fr; padding: 74px 0 66px; }
.e-margin { padding-top: 7px; font-size: 15px; color: var(--editorial-muted); }
.e-margin p { margin-top: 20px; line-height: 1.55; max-width: 230px; }
.e-intro h1 { font-size: clamp(29px, 2.5vw, 36px); line-height: 1.3; font-weight: 400; max-width: 640px; text-wrap: pretty; }
.e-intro-copy > p { max-width: 610px; font-size: 19px; line-height: 1.6; margin: 22px 0 20px; text-wrap: pretty; }
.e-read-link { display: inline-block; font-size: 17px; }
.e-feature { display: grid; grid-template-columns: 1.25fr 1fr; gap: 6%; padding: 36px 0; align-items: center; }
.e-feature-text { grid-template-columns:1fr; max-width:650px; }
.e-feature-photo { margin: 0; }
.e-feature-photo img { width: 100%; height: auto; }
.e-feature-photo figcaption { margin-top: 12px; font-size: 15px; color: var(--editorial-muted); }
.e-feature-copy { padding: 12px 0; }
.e-feature h2 { font-size: clamp(26px, 2.2vw, 31px); line-height: 1.3; font-weight: 400; margin: 0 0 18px; text-wrap: pretty; }
.e-feature-copy > p { max-width: 450px; font-size: 18px; line-height: 1.6; }
.e-feature-copy > p.e-tech { font-size: 16px; margin: 18px 0; color: var(--editorial-muted); }
.e-work { padding: 70px 0; scroll-margin-top: 24px; }
.e-section-title { margin-bottom:19px; display:flex; align-items:center; justify-content:space-between; gap:18px; }
.e-section-title h2 { font-size: 29px; line-height: 1.3; font-weight: 400; }
.design-filter { gap: 8px; }
.design-filter button { padding: 7px 13px; border: 1px solid var(--editorial-border); background: var(--editorial-paper); color: var(--editorial-muted); font-size: 16px; border-radius: 6px; }
.design-filter button:hover { background: var(--editorial-control); border-color: var(--editorial-underline); }
.design-filter button.active { background: var(--ink); color: var(--paper); border-color: var(--ink); font-weight: 400; }
.e-projects { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); column-gap: 38px; row-gap: 48px; margin-top: 38px; align-items: start; }
.editorial .e-project-image { display: block; width: fit-content; max-width: 100%; margin-bottom: 18px; }
.e-project-image img { width: auto; height: auto; max-height: 250px; max-width: 100%; object-fit: contain; object-position: left bottom; }
.e-project h3 { font-size: 23px; line-height: 1.3; font-weight: 400; text-wrap: pretty; }
.editorial .e-project h3 a { text-decoration: none; }
.editorial .e-project h3 a:hover { text-decoration: underline; }
.e-project p { margin-top: 12px; font-size: 17px; line-height: 1.55; text-wrap: pretty; }
.e-about { display: grid; grid-template-columns: 1fr 1fr; gap: 8%; padding: 62px 0 72px; scroll-margin-top: 24px; }
.e-about h2 { font-size: 29px; line-height: 1.3; font-weight: 400; }
.e-about p { font-size: 19px; line-height: 1.6; margin-bottom: 22px; text-wrap: pretty; }
.design-footer { border: 0; font-size: 16px; padding: 28px 0 38px; }
@media (min-width: 1600px) { .editorial { padding-inline: max(96px, calc((100vw - 1320px)/2)); } }
@media (max-width: 1000px) {
  .e-margin { font-size: 14px; padding-right: 24px; }
  .e-intro { grid-template-columns: 26% 1fr; }
  .e-projects { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 700px) {
  .e-intro { grid-template-columns: 1fr; padding: 38px 0 44px; }
  .e-margin { padding: 0 0 28px; font-size: 15px; }
  .e-margin p { margin-top: 5px; max-width: none; }
  .e-intro h1 { font-size: 29px; }
  .e-intro-copy > p { font-size: 18px; }
  .e-feature { grid-template-columns: 1fr; gap: 25px; padding: 22px 0; }
  .e-feature h2 { font-size: 27px; }
  .e-feature-copy { padding: 0; }
  .e-work { padding: 50px 0; }
  .e-projects { grid-template-columns: 1fr; gap: 40px; margin-top: 32px; }
  .e-project-image img { max-height: 330px; }
  .e-about { grid-template-columns: 1fr; gap: 24px; padding: 40px 0; }
  .e-about p { font-size: 18px; }
  .design-filter { gap: 8px; }
}
</style>

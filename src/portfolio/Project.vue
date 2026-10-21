<script setup>
import {computed, defineAsyncComponent, ref, watch} from 'vue';
import {useRoute} from 'vue-router';
import Header from './Header.vue';
import EditorAccess from './EditorAccess.vue';
import {useEditorAuth} from '@/auth/editor';
import {usePortfolio} from './projects';
import {renderMarkdown} from './markdown';
import {notFoundMeta, projectMeta, usePageMeta} from './meta';
defineProps({authToken:{type:String,default:null}});
const ProjectEditor=defineAsyncComponent(()=>import('./ProjectEditor.vue'));
const route=useRoute();const {token}=useEditorAuth();
const {projects,projectLink,loaded,error}=usePortfolio();
const project=computed(()=>projects.value.find(p=>p.id===route.params.id));
const next=computed(()=>projects.value[(projects.value.findIndex(p=>p.id===route.params.id)+1)%projects.value.length]);
const description=computed(()=>renderMarkdown(project.value?.description));
const editing=ref(false);
watch(()=>route.params.id,()=>{editing.value=false;});
usePageMeta(()=>project.value?projectMeta(project.value):notFoundMeta(!loaded.value?'Loading project':'Project not found'));
</script>
<template>
  <div class="portfolio-content project-page">
    <Header />
    <main v-if="project">
      <div class="project-back"><RouterLink to="/" data-analytics-label="Back to projects">← Back to projects</RouterLink><button v-if="token" type="button" class="editorial-action" :disabled="!loaded || error" @click="editing=true" data-analytics-ignore>Edit project</button></div>
      <header class="project-title"><h1>{{ project.name }}</h1><p>{{ project.summary }}</p><ul v-if="project.technologies.length" class="project-stack" aria-label="Project technologies"><li v-for="tech in project.technologies" :key="tech">{{ tech }}</li></ul></header>
      <div v-if="project.image" class="project-cover"><img :src="project.image" :alt="project.name" /></div>
      <article v-if="project.description.trim()" class="portfolio-prose project-prose" v-html="description" />
      <article v-else class="portfolio-prose project-prose"><h2>About this project</h2><p>{{ project.summary }}</p><p>I haven't added a longer writeup for this project yet.</p></article>
      <RouterLink v-if="next" :to="projectLink(next.id)" class="project-next" :data-analytics-label="`Next project: ${next.name}`"><span>Next project</span><strong>{{ next.name }}</strong></RouterLink>
    </main>
    <main v-else class="project-missing"><h1>{{ !loaded ? 'Loading project' : error ? 'Project could not be loaded' : 'Project not found' }}</h1><RouterLink to="/">Back to projects</RouterLink></main>
    <footer class="design-footer"><span>Matthew Lack · Toronto</span><div><RouterLink to="/" data-analytics-label="All projects">All projects</RouterLink><a href="https://github.com/mattlack15" target="_blank" rel="noopener" data-analytics-label="GitHub">GitHub</a><EditorAccess /></div></footer>
    <ProjectEditor v-if="editing && project" :project="project" @close="editing=false" @saved="editing=false" />
  </div>
</template>
<style scoped>
main { max-width:1060px; margin:0 auto; }
.project-back { display:flex; align-items:center; justify-content:space-between; gap:20px; margin:38px 0 35px; font-size:16px; }
.project-back a,.project-missing>a { text-decoration:underline; text-decoration-color:var(--editorial-underline); text-underline-offset:4px; }
.project-title { max-width:850px; }.project-title h1 { font:400 clamp(32px,4vw,44px)/1.25 var(--editorial-font); margin:19px 0 25px; text-wrap:pretty; }.project-title>p { font-size:19px; line-height:1.6; max-width:720px; }
.project-stack { display:flex; flex-wrap:wrap; list-style:none; gap:9px 20px; padding:0; margin:26px 0 36px; font-size:16px; color:var(--editorial-muted); }
.project-cover { display:flex; align-items:center; justify-content:center; margin:0 0 55px; }.project-cover img { width:auto; max-height:520px; object-fit:contain; }
.project-prose { max-width:800px; margin:0 auto 70px; }
.project-next { display:flex; flex-direction:column; gap:15px; padding:35px 0 50px; }.project-next>span { color:var(--editorial-muted); font-size:16px; }.project-next strong { font-weight:400; font-size:26px; }.project-next:hover strong { text-decoration:underline; text-underline-offset:4px; }
.project-missing { padding:100px 0; }.project-missing h1 { margin-bottom:25px; font-weight:400; }
@media(max-width:600px) { .project-title h1 { font-size:32px; }.project-title>p { font-size:17px; }.project-back { margin:27px 0; }.project-cover { margin-bottom:35px; } }
</style>

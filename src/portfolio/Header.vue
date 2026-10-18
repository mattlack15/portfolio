<script setup>
import {useRoute} from 'vue-router';
import {useEditorAuth} from '@/auth/editor';
import ThemeToggle from './ThemeToggle.vue';
const route = useRoute();
const {token} = useEditorAuth();
</script>
<template>
  <header class="portfolio-header">
    <RouterLink to="/" class="portfolio-brand" data-analytics-label="Matthew Lack">Matthew Lack</RouterLink>
    <nav aria-label="Portfolio">
      <a v-if="route.name === 'home'" href="#e-work" data-analytics-label="Projects">Projects</a>
      <RouterLink v-else to="/" data-analytics-label="All projects">All projects</RouterLink>
      <a v-if="route.name === 'home'" href="#e-about" data-analytics-label="About">About</a>
      <a href="/resume.pdf" data-analytics-label="Resume" target="_blank" rel="noopener">Resume</a>
      <RouterLink v-if="token" to="/analytics" data-analytics-ignore>Analytics</RouterLink>
      <ThemeToggle />
    </nav>
  </header>
</template>
<style scoped>
.portfolio-header { display:flex; align-items:baseline; justify-content:space-between; padding:32px 0 26px; gap:24px; }
.portfolio-brand { font-size:23px; color:var(--editorial-ink); white-space:nowrap; }
nav { display:flex; align-items:center; flex-wrap:wrap; justify-content:flex-end; gap:12px 28px; font-size:16px; }
nav a { color:var(--editorial-link); }
nav a:hover { text-decoration:underline; text-underline-offset:4px; }
@media(max-width:700px) { .portfolio-header { padding:24px 0; align-items:flex-start; gap:14px; }.portfolio-brand { font-size:21px; }nav { max-width:185px; gap:8px 18px; font-size:15px; } }
@media(max-width:380px) { .portfolio-header { flex-direction:column; gap:16px; }nav { max-width:none; justify-content:flex-start; } }
</style>

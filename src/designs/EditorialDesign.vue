<script setup>
import {computed, ref} from 'vue';
import {projects, categories, projectLink} from './content';

const filter = ref('All');
const filtered = computed(() => projects.filter(project => filter.value === 'All' || project.category === filter.value));
const featured = projects[0];
</script>

<template>
  <div class="editorial">
    <header class="e-header">
      <RouterLink to="/designs/editorial" class="e-brand">Matthew Lack</RouterLink>
      <nav aria-label="Portfolio">
        <a href="#e-work">Projects</a>
        <a href="#e-about">About</a>
        <a href="/resume.pdf" target="_blank" rel="noopener">Resume</a>
      </nav>
    </header>

    <main>
      <section class="e-intro">
        <div class="e-margin">
          <span>Toronto, Canada</span>
          <p>Computer Science &amp; Mathematics<br>University of Toronto</p>
        </div>
        <div class="e-intro-copy">
          <h1>Hi, I'm Matt.</h1>
          <p>I've been programming since I was a kid. I started with Minecraft plugins and have since worked on web applications, Android apps, and backend systems. This site has some of those projects, along with what I've been working on lately.</p>
          <a href="#e-work" class="e-read-link">See my projects</a>
        </div>
      </section>

      <section class="e-feature" aria-labelledby="e-feature-title">
        <RouterLink :to="projectLink('editorial', featured.id)" class="e-feature-photo">
          <img src="/design-assets/images/5606325.webp" alt="Interposer PCB from the iPhone X display project" />
        </RouterLink>
        <div class="e-feature-copy">
          <h2 id="e-feature-title">Reverse engineering an iPhone X display</h2>
          <p>{{ featured.summary }}</p>
          <p class="e-tech">C, KiCad, RP2350</p>
          <RouterLink :to="projectLink('editorial', featured.id)" class="e-read-link">Read about this project</RouterLink>
        </div>
      </section>

      <section id="e-work" class="e-work">
        <div class="e-section-title"><h2>Projects</h2></div>
        <div class="design-filter" aria-label="Filter projects">
          <button v-for="category in categories" :key="category" :class="{active: filter === category}" :aria-pressed="filter === category" @click="filter = category">{{ category }}</button>
        </div>
        <div class="e-projects">
          <RouterLink v-for="project in filtered" :key="project.id" :to="projectLink('editorial', project.id)" class="e-project">
            <div v-if="project.image" class="e-project-image">
              <img :src="project.image" :alt="project.name" loading="lazy" />
            </div>
            <div class="e-project-meta">{{ project.category }}</div>
            <h3>{{ project.name }}</h3>
            <p>{{ project.summary }}</p>
          </RouterLink>
        </div>
      </section>

      <section class="e-about" id="e-about">
        <h2>About me</h2>
        <div>
          <p>My dad introduced me to programming when I was young, and I got started by making Minecraft plugins. MidnightSky eventually became a business that supported me through university.</p>
          <p>I also enjoy hackathons. FinHog, Clarify, and Seascript were built with friends, and I've kept them here alongside the projects I worked on alone.</p>
          <a href="https://github.com/mattlack15" target="_blank" rel="noopener" class="e-read-link">GitHub</a>
        </div>
      </section>
    </main>

    <footer class="design-footer">
      <span>Matthew Lack</span>
      <div>
        <a href="/resume.pdf" target="_blank" rel="noopener">Resume</a>
        <a href="https://github.com/mattlack15" target="_blank" rel="noopener">GitHub</a>
        <a href="#">Back to top</a>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.editorial {
  --paper: #f4f1e8;
  --ink: #252525;
  background: var(--paper);
  color: var(--ink);
  padding: 0 clamp(22px, 6vw, 96px);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
}
.e-header { display: flex; align-items: center; justify-content: space-between; padding: 30px 0 26px; gap: 24px; }
.e-brand { font-size: 22px; font-weight: 600; }
.e-header nav { display: flex; gap: 35px; font-size: 14px; }
.e-header nav a:hover { text-decoration: underline; }
.e-intro { display: grid; grid-template-columns: 22% 1fr; padding: 80px 0 74px; }
.e-margin { padding-top: 10px; font-size: 13px; line-height: 1.6; color: #535353; }
.e-margin p { margin-top: 26px; font-size: 12px; line-height: 1.8; }
.e-intro h1 { font-size: clamp(36px, 4vw, 54px); line-height: 1.15; font-weight: 600; }
.e-intro-copy > p { max-width: 570px; font-size: 17px; line-height: 1.75; margin: 28px 0 24px; }
.e-read-link { display: inline-block; font-size: 14px; text-decoration: underline; text-underline-offset: 3px; }
.e-read-link:hover { text-decoration-thickness: 2px; }
.e-feature { display: grid; grid-template-columns: 1.25fr 1fr; gap: 6%; padding: 36px 0; align-items: center; }
.e-feature-photo img { width: 100%; height: 290px; object-fit: contain; }
.e-feature-copy { padding: 16px 0; }
.e-feature h2 { font-size: clamp(26px, 2.7vw, 36px); line-height: 1.25; font-weight: 600; margin: 0 0 20px; }
.e-feature-copy > p { font-size: 15px; max-width: 430px; line-height: 1.75; }
.e-feature-copy > p.e-tech { font-size: 13px; margin: 20px 0; color: #535353; }
.e-work { padding: 72px 0; scroll-margin-top: 24px; }
.e-section-title { margin-bottom: 27px; }
.e-section-title h2 { font-size: 30px; line-height: 1.3; font-weight: 600; }
.design-filter { gap: 10px 24px; }
.design-filter button { padding: 4px 0; border: 0; background: transparent; color: #535353; font-size: 14px; border-radius: 0; }
.design-filter button:hover { color: #252525; text-decoration: underline; }
.design-filter button.active { background: transparent; color: #252525; font-weight: 700; }
.e-projects { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); column-gap: 32px; row-gap: 46px; margin-top: 32px; }
.e-project-image { height: 210px; overflow: hidden; }
.e-project-image img { width: 100%; height: 100%; object-fit: contain; }
.e-project-meta { margin: 17px 0 7px; color: #535353; font-size: 12px; }
.e-project h3 { font-size: 22px; line-height: 1.3; font-weight: 600; }
.e-project:hover h3 { text-decoration: underline; text-underline-offset: 3px; }
.e-project p { margin-top: 12px; font-size: 14px; line-height: 1.75; }
.e-about { display: grid; grid-template-columns: 1fr 1fr; gap: 8%; padding: 64px 0 72px; scroll-margin-top: 24px; }
.e-about h2 { font-size: 30px; line-height: 1.3; font-weight: 600; }
.e-about p { font-size: 16px; line-height: 1.8; margin-bottom: 22px; }
.design-footer { border: 0; }
@media (min-width: 1600px) { .editorial { padding-inline: max(96px, calc((100vw - 1320px)/2)); } }
@media (max-width: 900px) {
  .e-intro { grid-template-columns: 1fr; padding-top: 55px; }
  .e-margin { display: flex; gap: 24px; padding: 0 0 24px; align-items: center; }
  .e-margin p { margin: 0; }
  .e-feature { gap: 30px; }
  .e-projects { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 600px) {
  .e-header { align-items: flex-start; padding: 24px 0; }
  .e-header nav { gap: 15px; flex-wrap: wrap; justify-content: flex-end; font-size: 12px; max-width: 125px; }
  .e-brand { font-size: 20px; }
  .e-intro { padding-bottom: 45px; }
  .e-margin { font-size: 12px; }
  .e-margin p { font-size: 11px; }
  .e-intro-copy > p { font-size: 16px; }
  .e-feature { grid-template-columns: 1fr; gap: 10px; padding: 22px 0; }
  .e-feature-photo img { height: 230px; }
  .e-feature h2 { font-size: 28px; }
  .e-work { padding: 48px 0; }
  .e-section-title h2 { font-size: 28px; }
  .e-projects { grid-template-columns: 1fr; gap: 35px; }
  .e-project-image { height: 240px; }
  .e-about { grid-template-columns: 1fr; gap: 28px; padding: 45px 0; }
  .e-about h2 { font-size: 28px; }
}
</style>

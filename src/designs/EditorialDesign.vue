<script setup>
import {computed, ref} from 'vue';
import {categories} from './content';
import {usePortfolio} from './portfolio';
import ThemeToggle from './ThemeToggle.vue';

const {projects, home, projectLink, live} = usePortfolio();

const filter = ref('All');
const filtered = computed(() => projects.value.filter(project => filter.value === 'All' || project.category === filter.value));
const featured = computed(() => projects.value.find(project => project.id === '1785866116116'));
const filters = computed(() => [...categories, ...(projects.value.some(p => p.category === 'Other') ? ['Other'] : [])]);
const projectImage = project => project.id === featured.value?.id ? '/design-assets/images/5606325.webp' : project.image;
</script>

<template>
  <div class="editorial">
    <header class="e-header">
      <RouterLink :to="home" class="e-brand">Matthew Lack</RouterLink>
      <nav aria-label="Portfolio">
        <a href="#e-work">Projects</a>
        <a href="#e-about">About</a>
        <a href="/resume.pdf" target="_blank" rel="noopener">Resume</a>
        <ThemeToggle />
      </nav>
    </header>

    <main>
      <section class="e-intro">
        <div class="e-margin">
          <span>Toronto</span>
          <p>Computer Science &amp; Mathematics<br> University of Toronto</p>
        </div>
        <div class="e-intro-copy">
          <h1>I'm Matt, a programmer in Toronto.</h1>
          <p>My dad introduced me to programming when I was young. I started making Minecraft plugins, then built and ran a server network called MidnightSky. More recently, I've been working on web apps and learning about electronics.</p>
          <a href="https://github.com/mattlack15" target="_blank" rel="noopener" class="e-read-link editorial-action">GitHub</a>
        </div>
      </section>

      <section v-if="featured" class="e-feature" aria-labelledby="e-feature-title">
        <figure class="e-feature-photo">
          <RouterLink :to="projectLink(featured.id)">
            <img src="/design-assets/images/5606325.webp" alt="Green interposer board with display connectors and a USB port" />
          </RouterLink>
          <figcaption>The interposer board I built to tap the display signals.</figcaption>
        </figure>
        <div class="e-feature-copy">
          <h2 id="e-feature-title">Reverse engineering an iPhone X display</h2>
          <p>I'm trying to drive this display with an RP2350. First, I need to find out how the phone turns it on, so I built a logic analyzer and a board to record the signals between them.</p>
          <p class="e-tech">C, KiCad, RP2350</p>
          <RouterLink :to="projectLink(featured.id)" class="e-read-link editorial-action">Read the project notes</RouterLink>
        </div>
      </section>

      <section id="e-work" class="e-work">
        <div class="e-section-title"><h2>Projects</h2></div>
        <div class="design-filter" aria-label="Filter projects">
          <button v-for="category in filters" :key="category" :class="{active: filter === category}" :aria-pressed="filter === category" @click="filter = category">{{ category }}</button>
        </div>
        <div class="e-projects">
          <article v-for="project in filtered" :key="project.id" class="e-project">
            <RouterLink v-if="project.image" :to="projectLink(project.id)" class="e-project-image" tabindex="-1" aria-hidden="true">
              <img :src="projectImage(project)" alt="" loading="lazy" />
            </RouterLink>
            <h3><RouterLink :to="projectLink(project.id)">{{ project.name }}</RouterLink></h3>
            <p>{{ project.summary }}</p>
          </article>
        </div>
      </section>

      <section class="e-about" id="e-about">
        <h2>About me</h2>
        <div>
          <p>I study Computer Science and Mathematics at the University of Toronto. MidnightSky was also a business that supported me through university.</p>
          <p>I also go to hackathons with friends. We made FinHog at HackMIT, Clarify at GenAI, and Seascript at HackThe6ix.</p>
          <a href="https://github.com/mattlack15" target="_blank" rel="noopener" class="e-read-link editorial-action">GitHub</a>
        </div>
      </section>
    </main>

    <footer class="design-footer">
      <span>Matthew Lack</span>
      <div>
        <a href="/resume.pdf" target="_blank" rel="noopener">Resume</a>
        <a href="https://github.com/mattlack15" target="_blank" rel="noopener">GitHub</a>
        <a href="#">Back to top</a>
        <RouterLink v-if="live" to="/editor" data-analytics-ignore>Edit</RouterLink>
      </div>
    </footer>
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
.e-header { display: flex; align-items: baseline; justify-content: space-between; padding: 32px 0 26px; gap: 24px; }
.editorial a.e-brand { color: var(--ink); font-size: 23px; font-weight: 400; text-decoration: none; }
.e-header nav { display: flex; align-items: center; gap: 28px; font-size: 16px; }
.editorial .e-header nav a { text-decoration: none; }
.editorial .e-header nav a:hover { text-decoration: underline; }
.e-intro { display: grid; grid-template-columns: 22% 1fr; padding: 74px 0 66px; }
.e-margin { padding-top: 7px; font-size: 15px; color: var(--editorial-muted); }
.e-margin p { margin-top: 20px; line-height: 1.55; max-width: 230px; }
.e-intro h1 { font-size: clamp(29px, 2.5vw, 36px); line-height: 1.3; font-weight: 400; max-width: 640px; text-wrap: pretty; }
.e-intro-copy > p { max-width: 610px; font-size: 19px; line-height: 1.6; margin: 22px 0 20px; text-wrap: pretty; }
.e-read-link { display: inline-block; font-size: 17px; }
.e-feature { display: grid; grid-template-columns: 1.25fr 1fr; gap: 6%; padding: 36px 0; align-items: center; }
.e-feature-photo { margin: 0; }
.e-feature-photo img { width: 100%; height: auto; }
.e-feature-photo figcaption { margin-top: 12px; font-size: 15px; color: var(--editorial-muted); }
.e-feature-copy { padding: 12px 0; }
.e-feature h2 { font-size: clamp(26px, 2.2vw, 31px); line-height: 1.3; font-weight: 400; margin: 0 0 18px; text-wrap: pretty; }
.e-feature-copy > p { max-width: 450px; font-size: 18px; line-height: 1.6; }
.e-feature-copy > p.e-tech { font-size: 16px; margin: 18px 0; color: var(--editorial-muted); }
.e-work { padding: 70px 0; scroll-margin-top: 24px; }
.e-section-title { margin-bottom: 19px; }
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
  .e-header { gap: 14px; padding: 24px 0; align-items: flex-start; }
  .e-header nav { gap: 8px 18px; flex-wrap: wrap; justify-content: flex-end; font-size: 15px; max-width: 185px; }
  .editorial a.e-brand { font-size: 21px; white-space: nowrap; line-height: 1.25; }
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
@media (max-width: 380px) {
  .e-header { flex-direction: column; gap: 16px; }
  .e-header nav { max-width: none; justify-content: flex-start; }
}
</style>

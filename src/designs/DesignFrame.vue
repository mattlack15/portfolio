<script setup>
import {computed} from 'vue';
import {useRoute} from 'vue-router';
import {directions} from './content';
const route = useRoute();
const current = computed(() => directions.find(d => d.id === route.params.direction));
</script>

<template>
  <div class="design-frame">
    <div class="review-bar" data-analytics-ignore>
      <RouterLink to="/designs" class="review-back">← All four designs</RouterLink>
      <nav aria-label="Design choices">
        <RouterLink v-for="d in directions" :key="d.id" :to="`/designs/${d.id}`" :class="{chosen: current?.id === d.id}" :aria-current="current?.id === d.id ? 'page' : undefined"><span>{{ d.number }}</span> {{ d.name }}</RouterLink>
      </nav>
      <span class="review-note">Local design preview</span>
    </div>
    <slot />
  </div>
</template>

<style>
.design-frame { min-height:100vh; background:#f3f1ec; color:#20231f; font-family:Arial,Helvetica,sans-serif; font-size:16px; line-height:1.5; }
.design-frame *, .design-review * { box-sizing:border-box; }
.design-frame a, .design-review a { text-decoration:none; color:inherit; }
.design-frame button, .design-review button { font:inherit; cursor:pointer; }
.design-frame :focus-visible, .design-review :focus-visible { outline:3px solid #d36e40; outline-offset:5px; }
.design-frame img { max-width:100%; display:block; }
.design-frame h1,.design-frame h2,.design-frame h3,.design-frame p { margin:0; }
.review-bar { min-height:46px; background:#fafafa; color:#343434; padding:8px 26px; display:flex; align-items:center; gap:28px; border-bottom:1px solid #ddd; font:12px/1.4 Arial,sans-serif; position:relative; z-index:30; }
.review-bar nav { display:flex; flex-wrap:wrap; gap:5px; }
.review-bar nav a { padding:5px 9px; border-radius:3px; }
.review-bar nav a:hover { background:#eee; }
.review-bar nav a.chosen { background:#222; color:white; }
.review-bar nav span { opacity:.6; margin-right:4px; }
.review-back { white-space:nowrap; }
.review-note { margin-left:auto; color:#737373; white-space:nowrap; }
.design-eyebrow { font:11px/1.5 'Courier New',monospace; text-transform:uppercase; letter-spacing:.13em; }
.design-link { display:inline-flex; gap:18px; align-items:center; border-bottom:1px solid currentColor; padding-bottom:5px; font-size:14px; }
.design-filter { display:flex; flex-wrap:wrap; gap:7px; }
.design-filter button { padding:7px 12px; border:1px solid var(--line,#d1d2ca); background:transparent; color:inherit; font-size:12px; border-radius:2px; }
.design-filter button:hover { border-color:currentColor; }
.design-filter button.active { background:var(--ink,#262d25); color:var(--paper,#f3f1ec); border-color:var(--ink,#262d25); }
.design-footer { display:flex; justify-content:space-between; align-items:center; gap:24px; padding:32px 0; border-top:1px solid var(--line,#d1d2ca); font-size:12px; }
.design-footer div { display:flex; gap:24px; }
.design-footer a:hover { text-decoration:underline; }
.design-placeholder { display:grid; place-items:center; background:#deded8; aspect-ratio:1.8; font-family:'Courier New',monospace; color:#424b42; font-size:clamp(20px,3vw,44px); }
@media(max-width:800px) { .review-bar { padding:10px 16px; gap:12px; align-items:flex-start; flex-wrap:wrap; } .review-bar nav { order:3; width:100%; } .review-bar nav a { padding:4px 8px; } .review-note { margin-left:auto; } .design-footer { align-items:flex-start; flex-direction:column; } }
@media(prefers-reduced-motion:reduce) { .design-frame *, .design-review * { scroll-behavior:auto!important; transition:none!important; animation:none!important; } }
</style>

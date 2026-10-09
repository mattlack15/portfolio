<script setup>
import {theme, toggleTheme} from './theme';
</script>

<template>
  <button type="button" class="editorial-action theme-toggle" :aria-pressed="theme === 'dark'" @click="toggleTheme" data-analytics-ignore>
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
      <path d="M16.8 12.1A7.1 7.1 0 0 1 7.9 3.2a7.2 7.2 0 1 0 8.9 8.9Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" />
    </svg>
    <span>Dark mode</span>
  </button>
</template>

<style scoped>
.theme-toggle { display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; font-size: 14px; }
.theme-toggle[aria-pressed="true"] { background: var(--editorial-control-hover); }
</style>

<script setup>
import Header from './Header.vue';
import {notFoundMeta, usePageMeta} from './meta';
defineProps({authToken:{type:String,default:null}});
usePageMeta(()=>notFoundMeta('Page not found'));
</script>
<template>
  <div class="portfolio-content">
    <Header />
    <main class="page-missing"><h1>Page not found</h1><p>There's nothing at this address.</p><RouterLink to="/" data-analytics-label="Back to projects">Back to projects</RouterLink></main>
  </div>
</template>
<style scoped>
.page-missing { max-width:1060px; margin:0 auto; padding:100px 0; }
.page-missing h1 { margin-bottom:25px; font-weight:400; }
.page-missing p { margin-bottom:25px; font-size:19px; }
.page-missing a { text-decoration:underline; text-decoration-color:var(--editorial-underline); text-underline-offset:4px; }
</style>

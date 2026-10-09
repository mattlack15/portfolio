<script setup>
import {computed,watchEffect} from 'vue';
import {useRoute} from 'vue-router';
import DesignFrame from './DesignFrame.vue';
import EditorialDesign from './EditorialDesign.vue';
import WorkbenchDesign from './WorkbenchDesign.vue';
import GalleryDesign from './GalleryDesign.vue';
import IndexDesign from './IndexDesign.vue';
import {directions} from './content';
const route=useRoute();
const views={editorial:EditorialDesign,workbench:WorkbenchDesign,gallery:GalleryDesign,index:IndexDesign};
const direction=computed(()=>route.meta.portfolio?'editorial':route.params.direction);
const view=computed(()=>views[direction.value]);
watchEffect(()=>{document.title=route.meta.portfolio?'Matthew Lack':direction.value==='editorial'?'Matthew Lack | Portfolio preview':`Matthew Lack | ${directions.find(d=>d.id===direction.value)?.name || 'Design preview'}`;});
</script>
<template>
  <DesignFrame>
    <component v-if="view" :is="view" :key="`${direction}:${Boolean(route.meta.portfolio)}`" />
    <main v-else class="unknown-design"><h1>Design not found</h1><RouterLink to="/designs">View the four choices →</RouterLink></main>
  </DesignFrame>
</template>
<style scoped>.unknown-design { padding:100px 10%; }</style>

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
const view=computed(()=>views[route.params.direction]);
watchEffect(()=>{document.title=route.params.direction==='editorial'?'Matthew Lack | Portfolio preview':`Matthew Lack | ${directions.find(d=>d.id===route.params.direction)?.name || 'Design preview'}`;});
</script>
<template>
  <DesignFrame>
    <component v-if="view" :is="view" :key="route.params.direction" />
    <main v-else class="unknown-design"><h1>Design not found</h1><RouterLink to="/designs">View the four choices →</RouterLink></main>
  </DesignFrame>
</template>
<style scoped>.unknown-design { padding:100px 10%; }</style>

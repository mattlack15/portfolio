<script setup lang="ts">

import HeroSection from "@/components/HeroSection.vue";
import ExperienceSection from "@/components/ExperienceSection.vue";
import ProjectsSection from "@/components/ProjectsSection.vue";
import AboutMeSection from "@/components/AboutMeSection.vue";
import {computed} from "vue";

const props = withDefaults(defineProps<{
  apiKey: string | null;
}>(), {
  apiKey: null,
})

const edit = computed(() => {
  return props.apiKey !== null && props.apiKey !== '';
})

</script>

<template>
  <HeroSection/>
  <ExperienceSection/>
  <AboutMeSection/>
  <ProjectsSection :api-key="apiKey"/>
</template>

<style scoped>

</style>
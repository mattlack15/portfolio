<script setup lang="ts">
import NavBar from "@/components/NavBar.vue";
import {ref} from "vue";

const key = ref<string | null>(null);

</script>

<template>
  <div class="bg-background fixed w-full z-50">
    <NavBar :api-key="key" @update="key = $event" />
  </div>
  <div class="bg-background min-h-screen pt-32">
    <RouterView v-slot="{ Component }">
      <component v-if="Component" :is="Component" :api-key="key" />
    </RouterView>
  </div>
</template>
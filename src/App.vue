<script setup>
import NavBar from "@/components/NavBar.vue";

</script>

<template>
  <div class="bg-background">
    <NavBar/>
  </div>
  <div class="bg-background min-h-screen">
    <RouterView/>
  </div>
</template>
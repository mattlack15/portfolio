<script setup>
import {ref} from "vue";

const menu = ref([
  { name: "Home", link: "/" },
  { name: "About Me", link: "/about-me" },
  { name: "Contact", link: "#contact" }
]);
</script>

<template>
  <header>
    <div class="flex justify-between items-center p-8 lg:px-12 relative z-20">
      <div class="text-3xl font-bold text-white">Matt Lack</div>
      <nav>
        <ul class="flex space-x-6">
          <li v-for="item in menu" :key="item.name">
            <a :href="item.link" class="block hover:text-primary text-white transition">
              {{ item.name }}
            </a>
          </li>
        </ul>
      </nav>
    </div>
  </header>
</template>

<style scoped>

</style>
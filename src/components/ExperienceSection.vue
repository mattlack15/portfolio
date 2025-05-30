<template>
  <section class="text-white mt-20" id="services">
    <div class="px-4 xl:pl-16">
      <h2 class="text-4xl text-center font-bold text-white mb-4">What I Can Do</h2>
    </div>
    <div class="py-8 px-4 sm:py-16 flex flex-wrap flex-row justify-center pt-10  md:pt-12">
      <div v-for="service in services" :key="service.name" data-aos="fade-up"
           class="px-6 py-10 m-2 max-w-72 hover:scale-105 transition rounded-xl bg-surface shadow-lg border-accent
            border">
        <div class="flex flew-row justify-around mx-auto h-24 text-center xl:h-28 xl:w-28">
          <Icon class="text-8xl" :icon="service.icon"/>
        </div>
        <div class="text-center">
          <h3 class="pt-8 text-lg font-semibold uppercase text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
            {{ service.name }}
          </h3>
          <p class="text-neutral pt-4 text-sm group-hover:text-white md:text-base">
            {{ service.description }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
<script setup>
import {ref} from 'vue';
import { Icon } from "@iconify/vue";

const services = ref([
  {
    icon: 'mingcute:web-fill',
    name: 'WEB DEVELOPMENT',
    description: 'I have extensive experience creating websites using Vue.js, Tailwind, HTML, CSS, and JavaScript'
  },
  {
    icon: 'fluent:phone-32-regular',
    name: 'ANDROID DEVELOPMENT',
    description: 'I\'ve made several Android apps using Kotlin and Jetpack Compose, and will be doing an internship in the summer working on android apps.'
  },
  {
    icon: 'mdi:server',
    name: 'BACKEND DEVELOPMENT',
    description: 'I\'ve worked on complex backend systems in Java, Kotlin, and Python. My experience includes building web APIs, microservices, and more with Spring Boot, Ktor, Flask, and FastAPI.',
  },
  {
    icon: 'mdi:minecraft',
    name: 'MINECRAFT DEVELOPMENT',
    description: 'I learned to program by making Minecraft plugins and have made almost a hundred of them by now. I have a rich knowledge of Minecraft\'s internals and ' +
    'have made many high performance plugins that work at scale',
  },
  {
    icon: 'grommet-icons:system',
    name: 'SYSTEM ADMINISTRATION',
    description: 'Managing minecraft servers has left me with a deep understanding of Linux, DNS, Security and system administration. I\'ve set up and managed secure bare-metal servers for various purposes, including web hosting, game servers, and more.',
  },
  {
    icon: 'uil:circuit',
    name: 'LOW-LEVEL SYSTEMS',
    description: 'I have a strong understanding of low-level systems programming, including memory management, concurrency, and performance optimization. I built a threading library from scratch for the Raspberry Pi Pico microcontroller, to multiplex its single core.',
  },
])
</script>

<style scoped>

</style>
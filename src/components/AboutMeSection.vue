<script setup>
import { ref } from 'vue';
import { Icon } from '@iconify/vue';
const education = ref([
  {
    id: 1,
    school: 'University of Toronto',
    program: 'Honours Bachelor of Science',
    major: 'Computer Science and Mathematics',
    year: '2022 - 2025 and 2027'
  },
]);
</script>

<template>
  <section class="text-white mt-18" id="about">
    <div class="absolute z-0 top-[-93rem] inset-x-0 h-64 flex items-start">
      <div class="h-24 w-64 bg-gradient-to-br from-primary via-secondary blur-2xl to-[#570cac] opacity-20"></div>
    </div>
    <div class="md:grid md:grid-cols-2 gap-8 items-center py-8 px-4 xl:gap-16 sm:py-16 xl:px-16 z-1">
      <div data-aos="flip-right">
        <h2 class="text-4xl font-bold text-white text-left mb-8">My Education</h2>
        <div class="space-y-8 py-8">
          <div v-for="element in education" :key="element.id"
               class="flex items-center md:w-[80%] w-full rounded-xl bg-surface p-3 shadow-surface shadow-xl border border-accent">
            <div class="w-1/4 flex justify-center items-center">
              <Icon icon="mdi:graduation-cap-outline" class="text-6xl"/>
            </div>
            <div class="w-3/4 pl-4  ">
              <h3 class="text-2xl font-semibold uppercase text-transparent bg-clip-text bg-gradient-to-r from-white to-[#6FC7EA]">
                {{ element.school }}
              </h3>
              <p class="text-white">{{ element.program }}</p>
              <p class="text-white">{{ element.major }}</p>
              <p class="text-white">{{ element.year }}</p>
            </div>
          </div>
        </div>
      </div>
      <div class="mt-4 md:mt-0 text-left flex flex-col z-10 h-full" data-aos="flip-right">
        <h2 class="text-4xl font-bold text-white md:text-center text-left mb-4">
          More <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">About</span> Me
        </h2>
        <p class="text-base lg:text-lg mt-8 py-8">
          Lorem ipsum dolor sit amet consectetur, adipisicing elit.
          Qui facere libero cupiditate fugit minima voluptates numquam est eos voluptate saepe
          eius amet harum provident accusamus omnis sit in cum incidunt dolorum, necessitatibus
          illo reiciendis ipsam debitis velit! Itaque officia architecto fugit, cum dolorum eos dolore
          quaerat quis nobis id similique!
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
</style>
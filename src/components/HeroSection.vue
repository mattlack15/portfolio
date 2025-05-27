<script setup>
import { ref, onMounted } from 'vue';

const showSubtitle = ref(false);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const doSubtitle = async () => {
  await sleep(750);
  showSubtitle.value = true;
  await sleep(3000);
  showSubtitle.value = false;
}

onMounted(() => {
  doSubtitle()
});
</script>

<template>
  <section class="relative w-full" data-aos="zoom-in-up">
    <div class="absolute top-0 inset-x-0 h-64 flex items-start">
    </div>
    <div class="w-full px-5 sm:px-8 md:px-12 lg:px-8 max-w-screen-lg lg:max-w-screen-xl mx-auto relative">
      <div class="grid lg:grid-cols-2 gap-10 xl:gap-14 relative pt-24 lg:max-w-none max-w-2xl md:max-w-3xl mx-auto">
        <div class="lg:py-6">
          <div class="text-center lg:text-left">
            <h1 class="pt-4 text-white font-bold text-4xl md:text-5xl lg:text-6xl">
              Hi, I'm
              <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary to-pink-500">
                Matt
              </span>
            </h1>
            <transition name="fade-slide" appear>
              <p
                v-if="showSubtitle"
                class="absolute text-neutral text-md"
              >
                But I'm guessing you knew that from the url...
              </p>
            </transition>
          </div>
          <p class="text-gray-300 pt-8 text-center lg:text-left mx-auto max-w-xl">
            Nice to meet you! I'm an aspiring software developer with a passion for creating systems at scale.
            I have built many projects over the years and this is my portfolio website showcasing my work. I hope you enjoy!
          </p>
          <div class="flex items-center gap-3 pt-9 flex-col sm:flex-row sm:w-max sm:mx-auto lg:mx-0">
            <button class="cursor-pointer border border-primary px-6 md:px-7 py-3 rounded-full relative group w-full sm:w-max flex justify-center items-center relative">
              <span class="hover:scale-105 transition-all ease-in-out flex justify-center items-center">
                <span class="svg-container">
                  <svg class="download-icon" width="18" height="22" viewBox="0 0 18 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path class="download-arrow" d="M13 9L9 13L5 9M9 13V1" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M1 17V18C1 18.7956 1.31607 19.5587 1.87868 20.1213C2.44129 20.6839 3.20435 21 4 21H14C14.7956 21 15.5587 20.6839 16.1213 20.1213C16.6839 19.5587 17 18.7956 17 18V17" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" />
                  </svg>
                  <span class="download-loader text-white hidden"></span>
                </span>
                <a href="/resume.pdf" download="resume.pdf" class="pl-2 text-primary">Download resume</a>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px); /* start/finish slightly above */
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 400ms ease;
}

.fade-slide-enter-to,
.fade-slide-leave-from {
  opacity: 1;
  transform: translateY(0);
}
</style>
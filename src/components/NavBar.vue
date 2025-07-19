<script setup lang="ts">
import {onMounted, onUnmounted, ref} from "vue";
import { Icon } from "@iconify/vue";
import EnterKey from "@/components/EnterKey.vue";

const menu = ref([
  { name: "Home", link: "/" },
]);

const props = defineProps<{
  apiKey: string | null;
}>();

const emits = defineEmits<{
  (e: 'update'): string | null;
}>();

const showKeyModal = ref(false);

const toggleKeyModal = () => {
  showKeyModal.value = !showKeyModal.value;
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape" && showKeyModal.value) {
    showKeyModal.value = false;
  }
};

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
});

</script>

<template>
  <header>
    <div class="flex justify-between items-center p-6 lg:px-12 relative z-20 border-b border-b-surface">
      <button @click.prevent="toggleKeyModal" class="text-gray-400 cursor-pointer bg-surface rounded-full p-2 hover:bg-accent transition">
        <Icon icon="material-symbols:key" />
      </button>
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
    <EnterKey v-if="showKeyModal" @update="emits('update', $event); showKeyModal = false" :apiKey="props.apiKey" />
  </header>
</template>

<style scoped>

</style>
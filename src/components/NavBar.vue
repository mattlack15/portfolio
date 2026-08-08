<script setup lang="ts">
import {onMounted, onUnmounted, ref} from "vue";
import { Icon } from "@iconify/vue";
import PasskeyAuth from '@/components/PasskeyAuth.vue';
import {API_BASE, withEditorSession} from '@/auth/api';

const menu = ref([
  { name: "Home", link: "/" },
]);

const props = defineProps<{
  authToken: string | null;
}>();

const emits = defineEmits<{
  (e: 'update', value: string | null): void;
}>();

const showKeyModal = ref(false);

const toggleKeyModal = () => {
  if (props.authToken) {
    fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      headers: withEditorSession(props.authToken),
    }).catch(() => undefined);
    emits('update', null);
    return;
  }
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
      <button
        @click.prevent="toggleKeyModal"
        class="cursor-pointer rounded-full bg-surface p-2 text-gray-400 transition hover:bg-accent"
        :class="{'text-primary': authToken}"
        :aria-label="authToken ? 'Lock editing' : 'Unlock editing'"
        :title="authToken ? 'Lock editing' : 'Unlock editing'"
      >
        <Icon :icon="authToken ? 'material-symbols:lock-open-right-outline-rounded' : 'material-symbols:key'" />
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
    <PasskeyAuth
      v-if="showKeyModal"
      @authenticated="emits('update', $event); showKeyModal = false"
      @close="showKeyModal = false"
    />
  </header>
</template>

<style scoped>

</style>

<script setup lang="ts">
import NavBar from "@/components/NavBar.vue";
import {onMounted, ref} from "vue";
import {API_BASE, withEditorSession} from '@/auth/api';

const storageKey = 'portfolio-editor-session';
const editorToken = ref<string | null>(sessionStorage.getItem(storageKey));

const updateEditorToken = (token: string | null) => {
  editorToken.value = token;
  if (token) sessionStorage.setItem(storageKey, token);
  else sessionStorage.removeItem(storageKey);
};

onMounted(async () => {
  if (!editorToken.value) return;
  const response = await fetch(`${API_BASE}/api/auth/session`, {
    headers: withEditorSession(editorToken.value),
  }).catch(() => null);
  if (!response?.ok) updateEditorToken(null);
});

</script>

<template>
  <div class="bg-background fixed w-full z-50">
    <NavBar :auth-token="editorToken" @update="updateEditorToken" />
  </div>
  <div class="bg-background min-h-screen pt-32">
    <RouterView v-slot="{ Component }">
      <component v-if="Component" :is="Component" :auth-token="editorToken" />
    </RouterView>
  </div>
</template>

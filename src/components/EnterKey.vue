<script setup lang="ts">

import {ref} from "vue";

const props = defineProps<{
  apiKey: string | null;
}>();

const emits = defineEmits<{
  (e: 'update'): string | null;
}>();

const currInput = ref(props.apiKey ?? '');

const API_BASE = (import.meta as any).env?.VITE_API_BASE || '';

const error = ref('');

const validate = async () => {
  if (currInput.value.trim() === '') {
    emits('update', null);
    return;
  }
  try {
    const response = await fetch(`${API_BASE}/api/projects/validate-key?key=${encodeURIComponent(currInput.value)}`);
    if (!response.ok) throw new Error('Key validation failed');
    const isValid: boolean = await response.json();
    if (isValid) {
      emits('update', currInput.value);
      return;
    }
    error.value = 'Invalid key';
  } catch {
    error.value = 'Could not validate the key';
  }
}

</script>

<template>

  <!-- modal background -->
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-surface text-white rounded-lg shadow-lg p-6 w-96">
      <h2 class="text-xl font-semibold mb-4">Enter Key</h2>
      <p class="mb-4">Please enter your API key to continue:</p>
      <input
          v-model="currInput"
          type="text"
          placeholder="API Key"
          class="w-full p-2 border border-gray-300 rounded mb-4"
      />
      <div class="flex flex-row justify-between items-center mb-4">
        <p class="text-red-400">{{ error }}</p>
        <button
            @click="validate"
            class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Save
        </button>
      </div>
    </div>
  </div>

</template>

<style scoped>

</style>

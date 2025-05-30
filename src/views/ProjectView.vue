<script setup lang="ts">
import {computed, onMounted, ref} from 'vue';
import { useRoute } from 'vue-router';
import { useRouter } from 'vue-router';
import { Marked } from 'marked';
import { Icon } from '@iconify/vue';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import { markedHighlight } from "marked-highlight";

const props = withDefaults(defineProps<{
  apiKey: string | null;
}>(), {
  apiKey: null,
})

interface Project {
  id: string;
  title: string;
  imageId: string;
  brief: string;
  description: string;
  technologies: string[];
}

const route = useRoute();
const router = useRouter();
const project = ref<Project | null>(null);
const loading = ref<boolean>(false);
const error = ref<string | null>(null);

const API_BASE: string = (import.meta as any).env?.VITE_API_BASE || '';

const marked = new Marked(
    markedHighlight({
      emptyLangClass: 'hljs',
      langPrefix: 'hljs language-',
      highlight(code, lang, info) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
      }
    })
);

// Constant edit computed by seeing if key is blank or not
const edit = computed(() => {
  return props.apiKey !== null && props.apiKey !== '';
});

const fetchProject = async () => {
  const id = route.params.id as string;
  if (!id) return;
  loading.value = true;
  try {
    const response = await fetch(`/api/projects/list`);
    if (!response.ok) throw new Error('Failed to fetch');
    const data: Project[] = await response.json();
    project.value = data.find((p) => p.id === id) || null;
    if (!project.value) error.value = 'Project not found';
  } catch (e: any) {
    error.value = e.message ?? 'Error';
  } finally {
    loading.value = false;
  }
};

const editingMarkdown = ref(false);
const editedMarkdown = ref('');

const toggleEdit = () => {
  editingMarkdown.value = !editingMarkdown.value;
  if (!editingMarkdown.value) {
    // Save the edited markdown back to the project
    if (!project.value) return;
    project.value.description = editedMarkdown.value;
    try {
      fetch(`/api/projects/save?apiKey=${props.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project.value),
      });
    } catch (e: any) {
      error.value = e.message ?? 'Failed to save project';
    }
  } else {
    editedMarkdown.value = project.value?.description || '';
  }
}

const handleDrop = async (event: DragEvent) => {
  if (!edit.value) return;
  event.preventDefault()
  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) return;
  const file = files[0];
  if (!file.type.startsWith('image/')) {
    error.value = 'Only image files are allowed';
    return;
  }

  try {
    const formData = new FormData();
    formData.append('image', file);
    const response = await fetch(`/api/images/upload?apiKey=${props.apiKey}`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error('Image upload failed');
    const data: string = await response.json();
    const el = document.querySelector('#markdown-area') as HTMLTextAreaElement;
    const selectedStart = el.selectionStart
    const imageMarkdown = `![${file.name}](${API_BASE}/api/images/${data})\n`;
    editedMarkdown.value = editedMarkdown.value.slice(0, selectedStart) + imageMarkdown + editedMarkdown.value.slice(el.selectionEnd);
    el.selectionStart = selectedStart + imageMarkdown.length;
    el.selectionEnd = el.selectionStart;
  } catch (e: any) {
    error.value = e.message ?? 'Image upload failed';
  }

}

onMounted(fetchProject);
</script>

<template>
  <section class="text-white px-4 xl:px-16 max-w-3xl mx-auto pb-48">
    <div v-if="loading" class="text-center py-12">Loading...</div>
    <div v-else-if="error" class="text-center py-12 text-red-400">{{ error }}</div>

    <div v-else-if="project" class="space-y-6 relative">
      <button @click.prevent="router.back()" class="absolute top-2 -left-10 rounded-full p-1 bg-surface cursor-pointer border border-neutral">
        <Icon icon="famicons:arrow-back" class="text-neutral"/>
      </button>
      <h1 class="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
        {{ project.title }}
      </h1>

      <img
        v-if="project.imageId"
        :src="`${API_BASE}/api/images/${project.imageId}`"
        :alt="project.title"
        class="h-[60vh] mx-auto rounded-lg shadow-lg"
      />

      <!-- technologies -->
      <div v-if="project.technologies?.length" class="flex flex-wrap gap-2">
        <span
          v-for="tech in project.technologies"
          :key="tech"
          class="text-xs bg-accent/30 text-onBackground px-2 py-1 rounded-full"
        >
          {{ tech }}
        </span>
      </div>

      <!-- editing markdown -->
      <div v-if="edit" class="flex justify-end">
        <button
          @click.stop="toggleEdit"
          class="text-primary bg-surface border border-neutral rounded p-2 text-sm cursor-pointer"
        >
          {{ editingMarkdown ? 'Preview' : 'Edit Description' }}
        </button>
      </div>

      <!-- markdown description -->
      <div v-if="!editingMarkdown" v-html="marked.parse(project.description || '')" class="prose prose-invert"></div>
      <div v-else>
        <textarea
          v-model="editedMarkdown"
          rows="25"
          class="w-full px-2 py-1 rounded bg-surface border border-neutral"
          @dragover.stop
          @drop="handleDrop($event, project)"
          id="markdown-area"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Tailwind’s prose classes used for markdown styling */
</style>

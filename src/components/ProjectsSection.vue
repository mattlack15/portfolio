<script setup lang="ts">
import {computed, ref, onMounted} from 'vue';
import {useRouter} from 'vue-router';
import {Icon} from '@iconify/vue';
import ProjectCard from "@/components/ProjectCard.vue";

interface Project {
  id: string;
  title: string;
  imageId: string;
  brief: string;
  description: string;
  technologies: string[];
}

// Props
const props = defineProps<{ apiKey: string | null }>();

const API_BASE: string = (import.meta as any).env?.VITE_API_BASE || '';

const projects = ref<Project[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

// Router for navigation when not editing
const router = useRouter();

const edit = computed(() => {
  return props.apiKey !== null && props.apiKey !== '';
});

/* --------------------------- Fetch Projects --------------------------- */
const fetchProjects = async () => {
  loading.value = true;
  try {
    const resp = await fetch(`${API_BASE}/api/projects/list`);
    if (!resp.ok) throw new Error(`Failed to fetch (${resp.status})`);
    projects.value = await resp.json();
  } catch (e: any) {
    error.value = e.message ?? 'Unknown error';
  } finally {
    loading.value = false;
  }
};

onMounted(fetchProjects);

/* -------------------------- Add new project -------------------------- */
const showAddForm = ref(false);
const newTitle = ref('');
const newBrief = ref('');

const resetForm = () => {
  showAddForm.value = false;
  newTitle.value = '';
  newBrief.value = '';
};

const saveProject = async () => {
  if (!newTitle.value.trim()) return;
  const temp: Project = {
    id: Date.now().toString(),
    title: newTitle.value.trim(),
    brief: newBrief.value.trim(),
    imageId: null,
    description: '',
    technologies: []
  };

  try {
    const resp = await fetch(`${API_BASE}/api/projects/save?apiKey=123`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(temp)
    });
    if (!resp.ok) throw new Error('Failed to save');
    projects.value.push(temp);
    resetForm();
  } catch (e: any) {
    error.value = e.message ?? 'Error saving project';
  }
};
</script>

<template>
  <section class="text-white mt-20" id="projects">
    <div class="px-4 xl:px-16">
      <h2 class="text-4xl text-center font-bold mb-4">
        My <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Projects</span>
      </h2>
    </div>

    <div v-if="loading" class="text-center py-12">Loading...</div>
    <div v-else-if="error" class="text-center py-12 text-red-400">{{ error }}</div>

    <div v-else class="py-8 px-4 sm:py-16 flex flex-wrap justify-center gap-6">
      <!-- Cards -->
      <template v-for="project in projects" :key="project.id">
        <ProjectCard :api-key="apiKey" :project="project" @fetch="fetchProjects"/>
      </template>

      <!-- Add new card -->
      <div
          v-if="props.edit && !showAddForm"
          @click="showAddForm = true"
          class="cursor-pointer flex items-center justify-center border-2 border-dashed border-accent rounded-xl w-full sm:w-64 md:w-80 h-32 hover:bg-accent/10 transition"
      >
        <span class="text-4xl text-accent">＋</span>
      </div>

      <!-- Add form card -->
      <div v-if="props.edit && showAddForm"
           class="bg-surface border border-accent rounded-xl w-full sm:w-64 md:w-80 p-4 shadow-lg">
        <h3 class="text-lg font-semibold mb-3">Add Project</h3>
        <div class="space-y-3">
          <input v-model="newTitle" placeholder="Title"
                 class="w-full px-2 py-1 rounded bg-background border border-neutral"/>
          <textarea v-model="newBrief" rows="3" placeholder="Brief"
                    class="w-full px-2 py-1 rounded bg-background border border-neutral"/>
        </div>
        <div class="flex justify-end gap-2 mt-3">
          <button @click="resetForm" class="border border-neutral px-3 py-0.5 rounded text-neutral">Cancel</button>
          <button @click="saveProject" class="bg-primary px-3 py-0.5 rounded text-background">Save</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
</style>

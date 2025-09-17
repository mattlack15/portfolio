<script setup lang="ts">
import {computed, ref, onMounted} from 'vue';
import ProjectCard from "@/components/ProjectCard.vue";

interface Project {
  id: string;
  title: string;
  imageId: string | null;
  brief: string;
  description: string;
  technologies: string[];
  orderIndex?: number;
}

// Props
const props = defineProps<{ apiKey: string | null }>();

const projects = ref<Project[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const edit = computed(() => {
  return props.apiKey !== null && props.apiKey !== '';
});

/* --------------------------- Fetch Projects --------------------------- */
const fetchProjects = async () => {
  loading.value = true;
  try {
    const resp = await fetch(`/api/projects/list`);
    if (!resp.ok) throw new Error(`Failed to fetch (${resp.status})`);
    projects.value = await resp.json();
    // Ensure projects are sorted by orderIndex
    projects.value.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  } catch (e: any) {
    error.value = e.message ?? 'Unknown error';
  } finally {
    loading.value = false;
  }
};

onMounted(fetchProjects);

/* -------------------------- Drag & Drop Reordering -------------------------- */
const dragId = ref<string | null>(null);
const dragOverIndex = ref<number | null>(null);

const onDragStart = (event: DragEvent, id: string) => {
  dragId.value = id;
  try { event.dataTransfer?.setData('text/plain', id); } catch(e) {}
};
const onDragEnter = (event: DragEvent, index: number) => {
  event.preventDefault();
  dragOverIndex.value = index;
};

const onDragOver = (event: DragEvent) => {
  event.preventDefault();
};

const onDrop = async (event: DragEvent, index: number) => {
  event.preventDefault();
  const id = dragId.value || event.dataTransfer?.getData('text/plain');
  if (!id) return;
  const from = projects.value.findIndex(p => p.id === id);
  if (from === -1) return;
  // Remove and insert at new index
  const item = projects.value.splice(from, 1)[0];
  // If dropping after removal, and dropping position is after original, adjust index
  let to = index;
  if (from < index) to = index - 1;
  projects.value.splice(to, 0, item);

  // Recalculate orderIndex locally
  projects.value.forEach((p, i) => p.orderIndex = i);

  // Reset drag state
  dragId.value = null;
  dragOverIndex.value = null;

  // Send new order to backend
  await sendReorder();
};

const sendReorder = async () => {
  if (!props.apiKey) return; // require key for reorder
  try {
    const ids = projects.value.map(p => p.id);
    const resp = await fetch(`/api/projects/reorder?apiKey=${props.apiKey}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(ids)
    });
    if (!resp.ok) throw new Error('Failed to reorder');
  } catch (e: any) {
    error.value = e.message ?? 'Failed to reorder projects';
    // Re-fetch to restore authoritative order
    await fetchProjects();
  }
};

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
    technologies: [],
    orderIndex: projects.value.length // put new project at the end
  };

  try {
    const resp = await fetch(`/api/projects/save?apiKey=${props.apiKey}`, {
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
      <template v-for="(project, index) in projects" :key="project.id">
        <div
          :draggable="edit"
          @dragstart="(e) => onDragStart(e, project.id)"
          @dragenter="(e) => onDragEnter(e, index)"
          @dragover.prevent="onDragOver"
          @drop="(e) => onDrop(e, index)"
          class="w-full sm:w-64 md:w-80"
        >
          <ProjectCard :api-key="apiKey" :project="project" @fetch="fetchProjects"/>
        </div>
      </template>

      <!-- Add new card -->
      <div
          v-if="edit && !showAddForm"
          @click="showAddForm = true"
          class="cursor-pointer flex items-center justify-center border-2 border-dashed border-accent rounded-xl w-full sm:w-64 md:w-80 h-32 hover:bg-accent/10 transition"
      >
        <span class="text-4xl text-accent">＋</span>
      </div>

      <!-- Add form card -->
      <div v-if="edit && showAddForm"
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

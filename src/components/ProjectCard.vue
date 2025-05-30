<script setup lang="ts">

import {Icon} from "@iconify/vue";
import {computed, ref} from "vue";
import {useRouter} from "vue-router";

const API_BASE = (import.meta as any).env?.VITE_API_BASE || '';

const router = useRouter();

const emits = defineEmits<{
  (e: 'fetch'): void;
}>();

const props = defineProps<{
  project: {
    id: string;
    title: string;
    imageId?: string;
    brief: string;
    technologies: string[];
  };
  apiKey: string | null;
}>();

const edit = computed(() => {
  return props.apiKey !== null && props.apiKey !== '';
});

const deleteProject = async (id: string) => {
  try {
    const resp = await fetch(`${API_BASE}/api/projects/delete?apiKey=${props.apiKey}id=${encodeURIComponent(id)}`, {method: 'DELETE'});
    if (!resp.ok) throw new Error('Failed delete');
    emits('fetch'); // Notify parent to refresh projects
  } catch (e: any) {
    console.log(e)
  }
};

const removeTech = async (project: Project, tech: string) => {
  const prev = [...project.technologies];
  project.technologies = project.technologies.filter(t => t !== tech);
  try {
    const resp = await fetch(`${API_BASE}/api/projects/save?apiKey=${props.apiKey}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(project)
    });
    if (!resp.ok) throw new Error('Remove tech failed');
  } catch (e: any) {
    project.technologies = prev;
    error.value = e.message ?? 'Remove tech failed';
  }
};

const cardClick = (id: string) => {
  if (editingId.value) return; // Don't navigate while editing
  router.push({name: 'project', params: {id}});
};

const newTechInputs = ref<Record<string, string>>({});

const addTech = async (project: Project) => {
  const tech = (newTechInputs.value[project.id] || '').trim();
  if (!tech || project.technologies.includes(tech)) return;
  const prev = [...project.technologies];
  project.technologies.push(tech);
  newTechInputs.value[project.id] = '';
  try {
    const resp = await fetch(`${API_BASE}/api/projects/save?apiKey=${props.apiKey}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(project)
    });
    if (!resp.ok) throw new Error('Add tech failed');
  } catch (e: any) {
    project.technologies = prev;
    error.value = e.message ?? 'Add tech failed';
  }
};

const editingId = ref<string | null>(null);
const editedBrief = ref('');

const startEditBrief = (p: Project) => {
  editingId.value = p.id;
  editedBrief.value = p.brief;
};
const cancelEditBrief = () => {
  editingId.value = null;
};
const saveBrief = async (project: Project) => {
  const trimmed = editedBrief.value.trim();
  if (!trimmed) return;
  const prev = project.brief;
  project.brief = trimmed;
  try {
    const resp = await fetch(`${API_BASE}/api/projects/save?apiKey=${props.apiKey}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(project)
    });
    if (!resp.ok) throw new Error('Update failed');
    editingId.value = null;
  } catch (e: any) {
    project.brief = prev;
    error.value = e.message ?? 'Update failed';
  }
};

const handleDrop = async (event: DragEvent, project: Project) => {
  event.preventDefault();
  if (!event.dataTransfer || !event.dataTransfer.files.length) return;

  const file = event.dataTransfer.files[0];
  if (!file.type.startsWith('image/')) return; // Only accept images

  const formData = new FormData();
  formData.append('image', file);
  formData.append('id', project.id); // Not technically needed but maybe use in future?

  try {
    const resp = await fetch(`${API_BASE}/api/images/upload?apiKey=${props.apiKey}`, {
      method: 'POST',
      body: formData
    });
    if (!resp.ok) throw new Error('Image upload failed');
    project.imageId = await resp.json()
    // Update project
    await fetch(`${API_BASE}/api/projects/save?apiKey=${props.apiKey}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(project)
    });
  } catch (e: any) {
    console.error(e);
  }
};

</script>

<template>
  <div class="bg-surface border border-accent rounded-xl shadow-lg hover:scale-105 transition w-full sm:w-64 md:w-80 relative block">
    <div class="cursor-pointer">
      <!-- Image -->
      <div class="relative" @dragover.prevent @drop="handleDrop($event, project)">
        <img v-if="project.imageId" :src="`${API_BASE}/api/images/${project.imageId}`" :alt="project.title"
             class="w-full h-40 object-cover rounded-t-xl" @click.stop="cardClick(project.id)"/>
        <div v-else-if="edit" class="w-full h-40 flex items-center justify-center border border-dashed border-neutral text-neutral rounded-t-xl">
          Drop image here
        </div>
      </div>

      <!-- Edit controls -->
      <template v-if="edit">
        <button @click.stop="deleteProject(project.id)"
                class="cursor-pointer absolute top-2 right-2 text-red-400 hover:text-red-300">
          <Icon icon="mdi:garbage" class="w-5 h-5"/>
        </button>
        <button v-if="editingId !== project.id" @click.stop="startEditBrief(project)"
                class="cursor-pointer absolute top-10 right-2 text-primary">
          <Icon icon="mdi:pencil" class="w-5 h-5"/>
        </button>
      </template>

      <div class="p-4 flex flex-col">
        <h3 @click.stop="cardClick(project.id)" class="text-lg font-semibold uppercase text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
          {{ project.title }}</h3>

        <div  v-if="editingId === project.id" class="space-y-2 mt-2">
                <textarea v-model="editedBrief" rows="3"
                          class="w-full px-2 py-1 rounded bg-background border border-neutral"/>
          <div class="flex gap-2 justify-end text-sm">
            <button @click.stop="cancelEditBrief" class="border border-neutral px-2 py-0.5 rounded text-neutral">
              Cancel
            </button>
            <button @click.stop="saveBrief(project)" class="bg-primary px-2 py-0.5 rounded text-background">Save
            </button>
          </div>
        </div>
        <p @click.stop="cardClick(project.id)" v-else class="text-gray-400 mt-2 line-clamp-5">{{ project.brief }}</p>

        <!-- tech area -->
        <div v-if="project.technologies?.length || props.edit" class="mt-4">
          <h4 class="text-sm text-primary font-semibold mb-1">Tags</h4>
          <div class="flex flex-wrap gap-2 items-center">
            <div v-for="tech in project.technologies" :key="tech" class="relative group">
              <span class="text-xs bg-accent/30 text-onBackground px-2 py-0.5 pr-4 rounded-full">{{ tech }}</span>
              <button @click.stop="removeTech(project, tech)"
                      class="absolute right-0 top-0 h-full flex items-center px-1 text-red-400 opacity-0 group-hover:opacity-100">
                ×
              </button>
            </div>
            <template v-if="edit">
              <input v-model="newTechInputs[project.id]" placeholder="New"
                     class="text-xs bg-background border border-neutral rounded px-1 py-0.5 w-20"/>
              <button @click.stop="addTech(project)" class="text-primary text-sm px-1">+</button>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>
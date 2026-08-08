<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {Marked} from 'marked';
import {Icon} from '@iconify/vue';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import {markedHighlight} from 'marked-highlight';
import MarkdownEditor from '@/components/MarkdownEditor.vue';
import {pioasmHighlightLanguage} from '@/editor/pioasm';
import {API_BASE, withEditorSession} from '@/auth/api';

const props = withDefaults(defineProps<{
  authToken: string | null;
}>(), {
  authToken: null,
});

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
const loading = ref(false);
const error = ref<string | null>(null);
const editingMarkdown = ref(false);
const editedMarkdown = ref('');
const savedMarkdown = ref('');
const saving = ref(false);
const uploadingImage = ref(false);
const editorError = ref<string | null>(null);
const savedAt = ref<Date | null>(null);
const mobilePane = ref<'write' | 'preview'>('write');
const markdownEditor = ref<InstanceType<typeof MarkdownEditor> | null>(null);
let previousBodyOverflow = '';

const highlightAliases: Record<string, string> = {
  asm: 'x86asm',
  assembly: 'x86asm',
  gas: 'x86asm',
  pio: 'pioasm',
};

hljs.registerLanguage('pioasm', pioasmHighlightLanguage);

const marked = new Marked(
  markedHighlight({
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const requestedLanguage = lang.trim().toLowerCase();
      const aliasedLanguage = highlightAliases[requestedLanguage] || requestedLanguage;
      const language = hljs.getLanguage(aliasedLanguage) ? aliasedLanguage : 'plaintext';
      return hljs.highlight(code, {language}).value;
    },
  }),
);

const canEdit = computed(() => Boolean(props.authToken));
const hasChanges = computed(() => editedMarkdown.value !== savedMarkdown.value);
const renderedDescription = computed(() => marked.parse(project.value?.description || '') as string);
const renderedPreview = computed(() => marked.parse(editedMarkdown.value || '') as string);

const fetchProject = async () => {
  const id = route.params.id as string;
  if (!id) return;
  loading.value = true;
  error.value = null;
  try {
    const response = await fetch(`${API_BASE}/api/projects/list`);
    if (!response.ok) throw new Error('Failed to load this project');
    const data: Project[] = await response.json();
    project.value = data.find((item) => item.id === id) || null;
    if (!project.value) error.value = 'Project not found';
  } catch (caught: any) {
    error.value = caught.message ?? 'Failed to load this project';
  } finally {
    loading.value = false;
  }
};

const openEditor = () => {
  if (!project.value) return;
  editedMarkdown.value = project.value.description || '';
  savedMarkdown.value = editedMarkdown.value;
  editorError.value = null;
  savedAt.value = null;
  mobilePane.value = 'write';
  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  editingMarkdown.value = true;
};

const restorePageScroll = () => {
  document.body.style.overflow = previousBodyOverflow;
};

const closeEditor = () => {
  if (hasChanges.value && !window.confirm('Discard your unsaved description changes?')) return;
  editingMarkdown.value = false;
  restorePageScroll();
};

const saveMarkdown = async () => {
  if (!project.value || !props.authToken || saving.value || !hasChanges.value) return;
  saving.value = true;
  editorError.value = null;
  const updatedProject = {...project.value, description: editedMarkdown.value};
  try {
    const response = await fetch(`${API_BASE}/api/projects/save`, {
      method: 'POST',
      headers: withEditorSession(props.authToken, {'Content-Type': 'application/json'}),
      body: JSON.stringify(updatedProject),
    });
    if (!response.ok) throw new Error('The description could not be saved');
    project.value = updatedProject;
    savedMarkdown.value = editedMarkdown.value;
    savedAt.value = new Date();
  } catch (caught: any) {
    editorError.value = caught.message ?? 'The description could not be saved';
  } finally {
    saving.value = false;
  }
};

const handleImageDrop = async (file: File, position: number) => {
  if (!props.authToken || uploadingImage.value) return;
  uploadingImage.value = true;
  editorError.value = null;
  try {
    const formData = new FormData();
    formData.append('image', file);
    const response = await fetch(`${API_BASE}/api/images/upload`, {
      method: 'POST',
      headers: withEditorSession(props.authToken),
      body: formData,
    });
    if (!response.ok) throw new Error('The image could not be uploaded');
    const imageId: string = await response.json();
    const base = API_BASE ? API_BASE.replace(/\/$/, '') : window.location.origin;
    const escapedAlt = file.name.replace(/["<>]/g, '');
    markdownEditor.value?.insertText(`<img src="${base}/api/images/${imageId}" alt="${escapedAlt}" />\n`, position);
  } catch (caught: any) {
    editorError.value = caught.message ?? 'The image could not be uploaded';
  } finally {
    uploadingImage.value = false;
  }
};

const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  if (!editingMarkdown.value || !hasChanges.value) return;
  event.preventDefault();
};

onMounted(() => {
  fetchProject();
  window.addEventListener('beforeunload', handleBeforeUnload);
});

onBeforeUnmount(() => {
  restorePageScroll();
  window.removeEventListener('beforeunload', handleBeforeUnload);
});
</script>

<template>
  <section class="mx-auto max-w-6xl px-5 pb-48 text-white sm:px-8 xl:px-0">
    <div v-if="loading" class="py-12 text-center text-neutral-400">Loading project…</div>
    <div v-else-if="error" class="py-12 text-center text-red-400">{{ error }}</div>

    <article v-else-if="project" class="space-y-7">
      <header class="mx-auto w-full max-w-4xl space-y-5">
        <button
          type="button"
          class="inline-flex cursor-pointer items-center gap-2 text-sm text-neutral-400 transition hover:text-white"
          @click="router.back()"
        >
          <Icon icon="material-symbols:arrow-back-rounded" />
          Back
        </button>
        <h1 class="text-4xl font-bold leading-tight text-primary sm:text-5xl">
          {{ project.title }}
        </h1>
      </header>

      <img
        v-if="project.imageId"
        :src="`${API_BASE}/api/images/${project.imageId}`"
        :alt="project.title"
        class="project-cover mx-auto max-h-[65vh] max-w-full rounded-xl shadow-2xl shadow-black/40"
      />

      <div v-if="project.technologies?.length" class="mx-auto flex w-full max-w-4xl flex-wrap gap-2">
        <span
          v-for="tech in project.technologies"
          :key="tech"
          class="rounded-full bg-accent/30 px-2.5 py-1 text-xs text-onBackground"
        >
          {{ tech }}
        </span>
      </div>

      <div class="mx-auto w-full max-w-4xl">
        <div v-html="renderedDescription" class="markdown-content prose prose-invert max-w-none"></div>
      </div>
    </article>

    <button
      v-if="project && canEdit && !editingMarkdown"
      type="button"
      class="floating-edit-button"
      aria-label="Edit project description"
      @click="openEditor"
    >
      <Icon icon="material-symbols:edit-outline-rounded" class="text-xl" />
      <span>Edit</span>
    </button>
  </section>

  <Teleport to="body">
    <div v-if="editingMarkdown && project" class="editor-workspace" role="dialog" aria-modal="true" aria-label="Edit project description">
      <header class="workspace-header">
        <div class="min-w-0">
          <div class="flex items-center gap-3">
            <button type="button" class="close-button" aria-label="Close editor" @click="closeEditor">
              <Icon icon="material-symbols:close-rounded" />
            </button>
            <div class="min-w-0">
              <h1 class="truncate text-sm font-semibold text-white sm:text-base">{{ project.title }}</h1>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="save-status" aria-live="polite">
            <span v-if="editorError" class="text-red-400">{{ editorError }}</span>
            <span v-else-if="saving">Saving…</span>
            <span v-else-if="hasChanges" class="unsaved-dot">Unsaved changes</span>
            <span v-else-if="savedAt">Saved at {{ savedAt.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'}) }}</span>
          </div>
          <button
            type="button"
            class="save-button"
            :disabled="!hasChanges || saving"
            @click="saveMarkdown"
          >
            <Icon v-if="saving" icon="svg-spinners:ring-resize" />
            <Icon v-else icon="material-symbols:save-outline-rounded" />
            <span>Save</span>
            <kbd class="hidden sm:inline">⌘S</kbd>
          </button>
        </div>
      </header>

      <div class="mobile-tabs" role="tablist" aria-label="Editor view">
        <button type="button" :class="{active: mobilePane === 'write'}" role="tab" @click="mobilePane = 'write'">
          <Icon icon="material-symbols:edit-outline-rounded" /> Write
        </button>
        <button type="button" :class="{active: mobilePane === 'preview'}" role="tab" @click="mobilePane = 'preview'">
          <Icon icon="material-symbols:visibility-outline-rounded" /> Preview
        </button>
      </div>

      <main class="workspace-content">
        <section :class="['workspace-pane editor-pane', mobilePane === 'write' ? 'flex' : 'hidden']">
          <div class="pane-label">
            <span>Markdown</span>
          </div>
          <MarkdownEditor
            ref="markdownEditor"
            v-model="editedMarkdown"
            :uploading="uploadingImage"
            @save="saveMarkdown"
            @image-drop="handleImageDrop"
          />
        </section>

        <section :class="['workspace-pane preview-pane', mobilePane === 'preview' ? 'flex' : 'hidden']">
          <div class="pane-label">
            <span>Preview</span>
          </div>
          <div class="preview-scroll">
            <div v-if="editedMarkdown.trim()" v-html="renderedPreview" class="markdown-content prose prose-invert mx-auto max-w-3xl"></div>
          </div>
        </section>
      </main>
    </div>
  </Teleport>
</template>

<style scoped>
.project-cover {
  display: block;
  width: auto;
  height: auto;
  object-fit: contain;
}

.markdown-content :deep(img) {
  display: block;
  height: auto !important;
  max-width: 100% !important;
  margin-inline: auto;
  object-fit: contain;
}

.floating-edit-button {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 40;
  display: flex;
  cursor: pointer;
  align-items: center;
  gap: 8px;
  border: 1px solid #525252;
  border-radius: 999px;
  padding: 11px 17px;
  background: #f5f5f5;
  color: #111;
  box-shadow: 0 12px 35px rgb(0 0 0 / .45);
  font-size: 14px;
  font-weight: 650;
  transition: transform 120ms ease, background-color 120ms ease;
}

.floating-edit-button:hover { transform: translateY(-2px); background: white; }

.editor-workspace {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  background: #0a0a0a;
  color: #e5e5e5;
}

.workspace-header {
  display: flex;
  min-height: 70px;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border-bottom: 1px solid #292929;
  padding: 10px 18px;
  background: #111;
}

.close-button {
  display: grid;
  height: 36px;
  width: 36px;
  flex: none;
  cursor: pointer;
  place-items: center;
  border: 1px solid #303030;
  border-radius: 8px;
  color: #a3a3a3;
  font-size: 21px;
  transition: background-color 120ms ease, color 120ms ease;
}

.close-button:hover { background: #262626; color: white; }

.save-status {
  display: none;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #737373;
  font-size: 12px;
}

.unsaved-dot::before {
  display: inline-block;
  height: 6px;
  width: 6px;
  margin: 0 7px 1px 0;
  border-radius: 50%;
  background: #f59e0b;
  content: '';
}

.save-button {
  display: inline-flex;
  height: 38px;
  cursor: pointer;
  align-items: center;
  gap: 7px;
  border-radius: 8px;
  padding: 0 13px;
  background: #f5f5f5;
  color: #111;
  font-size: 13px;
  font-weight: 700;
  transition: background-color 120ms ease, opacity 120ms ease;
}

.save-button:hover:not(:disabled) { background: white; }
.save-button:disabled { cursor: default; opacity: .35; }
.save-button kbd { border-color: #a3a3a3; color: #404040; }

.mobile-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  border-bottom: 1px solid #292929;
  padding: 7px;
  background: #111;
}

.mobile-tabs button {
  display: flex;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 7px;
  padding: 8px;
  color: #737373;
  font-size: 13px;
}

.mobile-tabs button.active { background: #292929; color: #f5f5f5; }

.workspace-content {
  display: grid;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.workspace-pane {
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
}

.pane-label {
  display: flex;
  min-height: 39px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #292929;
  padding: 0 14px;
  background: #171717;
  color: #737373;
  font-size: 11px;
  font-weight: 650;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.preview-scroll {
  min-height: 0;
  flex: 1;
  overflow: auto;
  padding: 28px clamp(20px, 4vw, 64px) 35vh;
  background: #0d0d0d;
}

@media (min-width: 640px) {
  .save-status { display: block; }
}

@media (min-width: 1024px) {
  .workspace-header { padding-inline: 24px; }
  .mobile-tabs { display: none; }
  .workspace-content { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .workspace-pane { display: flex !important; }
  .editor-pane { border-right: 1px solid #292929; }
}

@media (max-width: 640px) {
  .workspace-header { min-height: 62px; padding-inline: 10px; }
  .floating-edit-button { right: 16px; bottom: 16px; }
}
</style>

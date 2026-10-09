<script setup>
import {computed, onBeforeUnmount, onMounted, ref} from 'vue';
import {onBeforeRouteLeave, onBeforeRouteUpdate} from 'vue-router';
import MarkdownEditor from '@/components/MarkdownEditor.vue';
import {API_BASE} from '@/auth/api';
import {useEditorAuth} from '@/auth/editor';
import {saveProject, uploadImage} from './projects';
import {renderMarkdown} from './markdown';
const props = defineProps({project:{type:Object,default:null},orderIndex:{type:Number,default:0}});
const emit = defineEmits(['close','saved']);
const {token,signIn,showSignIn} = useEditorAuth();
const source = props.project;
const initial = {
  title:source?.name || '', brief:source?.summary || '',
  description:source?.description || '', imageId:source?.imageId || null,
  technologies:(source?.technologies || []).join(', '),
};
const draft = ref({...initial});
const dirty = computed(()=>Object.keys(initial).some(key=>draft.value[key]!==initial[key]));
const saving = ref(false);const uploading = ref(false);const error = ref('');
const pane = ref('write');const markdownEditor = ref(null);
const preview = computed(()=>renderMarkdown(draft.value.description));
const cover = computed(()=>draft.value.imageId===source?.imageId?source?.image:draft.value.imageId?`${API_BASE}/api/images/${draft.value.imageId}`:null);
const previousOverflow = document.body.style.overflow;
function canClose() {
  if (saving.value || uploading.value) return false;
  return !dirty.value || window.confirm('Discard your unsaved project changes?');
}
function close() { if (canClose()) emit('close'); }
async function save() {
  if (saving.value || uploading.value || !token.value) return;
  if (!draft.value.title.trim()) { error.value='Enter a project title.'; return; }
  saving.value=true;error.value='';
  try {
    const value = draft.value;
    await saveProject({
      id:source?.id || Date.now().toString(),
      title:source && value.title===initial.title?source.title:value.title.trim(),
      brief:source && value.brief===initial.brief?source.brief:value.brief.trim(),
      description:value.description,
      technologies:[...new Set(value.technologies.split(',').map(t=>t.trim()).filter(Boolean))],
      imageId:value.imageId,
      orderIndex:source?.orderIndex ?? props.orderIndex,
    });
    Object.assign(initial,value);
    emit('saved');
  } catch (caught) { error.value=caught.message; }
  finally { saving.value=false; }
}
async function upload(file, position, asCover=false) {
  if (!file || uploading.value || !token.value) return;
  if (!file.type.startsWith('image/')) { error.value='Choose an image file.'; return; }
  uploading.value=true;error.value='';
  try {
    const id=await uploadImage(file);
    if (asCover) draft.value.imageId=id;
    else {
      const alt=file.name.replace(/["<>]/g,'');
      markdownEditor.value?.insertText(`<img src="${API_BASE}/api/images/${id}" alt="${alt}" />\n`,position);
    }
  } catch (caught) { error.value=caught.message; }
  finally { uploading.value=false; }
}
function beforeUnload(event) { if (dirty.value) event.preventDefault(); }
function keydown(event) { if (!showSignIn.value && event.key==='Escape') { event.preventDefault();close(); } }
onBeforeRouteLeave(canClose);
onBeforeRouteUpdate(canClose);
onMounted(()=>{
  document.body.style.overflow='hidden';
  window.addEventListener('beforeunload',beforeUnload);
  window.addEventListener('keydown',keydown);
  document.querySelector('.project-editor .close-editor')?.focus();
});
onBeforeUnmount(()=>{
  document.body.style.overflow=previousOverflow;
  window.removeEventListener('beforeunload',beforeUnload);
  window.removeEventListener('keydown',keydown);
});
</script>
<template>
  <Teleport to="body">
    <section class="project-editor editorial-preview" role="dialog" aria-modal="true" aria-labelledby="editor-heading" data-analytics-ignore @keydown.tab="event=>{const fields=[...event.currentTarget.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),[contenteditable=true]')].filter(el=>el.getClientRects().length);if(event.shiftKey&&event.target===fields[0]){event.preventDefault();fields.at(-1)?.focus()}else if(!event.shiftKey&&event.target===fields.at(-1)){event.preventDefault();fields[0]?.focus()}}">
      <header class="editor-header">
        <div><button type="button" class="editorial-action close-editor" @click="close" :disabled="saving || uploading" aria-label="Close editor">Close</button><h2 id="editor-heading">{{ source ? 'Edit project' : 'Add project' }}</h2></div>
        <div><span class="draft-state" role="status">{{ uploading ? 'Uploading image' : dirty ? 'Unsaved changes' : '' }}</span><button type="button" class="editorial-action" @click="save" :disabled="saving || uploading || !token || !dirty">{{ saving ? 'Saving...' : 'Save' }}</button></div>
      </header>
      <p v-if="error" role="alert" class="editor-error">{{ error }} <button v-if="!token" class="editorial-action" @click="signIn">Sign in</button></p>
      <div class="editor-fields">
        <label>Title<input v-model="draft.title" :disabled="saving" /></label>
        <label>Summary<textarea v-model="draft.brief" rows="2" :disabled="saving" /></label>
        <label>Technologies<input v-model="draft.technologies" placeholder="Comma-separated names" :disabled="saving" /></label>
        <div class="cover-field"><label>Cover image<input type="file" accept="image/*" :disabled="saving || uploading" @change="event=>upload(event.target.files?.[0],null,true)" /></label><img v-if="cover" :src="cover" alt="Current cover" /><button v-if="cover" type="button" class="editorial-action" @click="draft.imageId=null" :disabled="saving || uploading">Remove cover</button></div>
      </div>
      <div class="editor-tabs" role="tablist" aria-label="Description view"><button type="button" role="tab" :aria-selected="pane==='write'" @click="pane='write'">Write</button><button type="button" role="tab" :aria-selected="pane==='preview'" @click="pane='preview'">Preview</button></div>
      <div class="editor-description" :inert="saving">
        <div class="write-pane" :class="{visible:pane==='write'}"><MarkdownEditor ref="markdownEditor" v-model="draft.description" :uploading="uploading" @save="save" @image-drop="upload" /></div>
        <div class="preview-pane portfolio-prose" :class="{visible:pane==='preview'}" v-html="preview" />
      </div>
    </section>
  </Teleport>
</template>
<style scoped>
.project-editor { position:fixed; inset:0; z-index:100; display:flex; flex-direction:column; background:var(--editorial-paper); color:var(--editorial-ink); font:16px/1.5 var(--editorial-font); }
.editor-header { display:flex; justify-content:space-between; gap:16px; padding:14px 22px; border-bottom:1px solid var(--editorial-border); }
.editor-header>div { display:flex; align-items:center; gap:18px; }.editor-header h2 { font-size:20px; font-weight:400; margin:0; }
.draft-state { color:var(--editorial-muted); font-size:14px; }
.editor-fields { display:grid; grid-template-columns:1fr 1.8fr 1fr 1fr; gap:20px; padding:18px 22px; border-bottom:1px solid var(--editorial-border); max-height:35vh; overflow:auto; }
label { display:flex; flex-direction:column; gap:7px; font-size:14px; }
input,textarea { width:100%; background:var(--editorial-control); color:var(--editorial-ink); border:1px solid var(--editorial-border); border-radius:6px; padding:8px 10px; font:16px/1.5 var(--editorial-font); }
textarea { resize:vertical; }.cover-field { min-width:0; }.cover-field input { font-size:12px; padding:6px; }.cover-field img { height:50px; max-width:100px; object-fit:contain; display:inline-block; vertical-align:middle; margin-top:8px; }.cover-field button { font-size:12px; margin:8px; padding:4px 8px; }
.editor-tabs { display:none; }.editor-description { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); flex:1; min-height:0; overflow:hidden; }
.write-pane { min-width:0; min-height:0; border-right:1px solid var(--editorial-border); }.preview-pane { padding:20px clamp(20px,3vw,48px) 120px; overflow:auto; min-width:0; }.editor-error { margin:0; padding:10px 22px; color:var(--editorial-ink); background:var(--editorial-control-hover); }
@media(max-width:900px) { .editor-fields { grid-template-columns:1fr 1fr; }.editor-description { grid-template-columns:1fr; }.write-pane,.preview-pane { display:none; }.visible { display:block; }.write-pane { border:0; }.editor-tabs { display:flex; gap:6px; padding:8px 14px; border-bottom:1px solid var(--editorial-border); }.editor-tabs button { padding:6px 16px; border-radius:6px; }.editor-tabs button[aria-selected=true] { background:var(--editorial-control-hover); } }
@media(max-width:500px) { .editor-header { padding:12px; }.editor-header h2 { font-size:17px; }.editor-header>div { gap:12px; }.draft-state { display:none; }.editor-fields { padding:14px; gap:14px; max-height:30vh; }.editor-fields label:nth-child(2) { grid-column:span 2; grid-row:2; } }
</style>

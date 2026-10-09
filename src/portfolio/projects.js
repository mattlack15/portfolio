import {onMounted, readonly, ref} from 'vue';
import {API_BASE, withEditorSession} from '@/auth/api';
import {useEditorAuth} from '@/auth/editor';
import {projects as snapshot, prepareProjects, projectLink} from './content';

const projects = ref(snapshot);
const loaded = ref(false);
const error = ref(null);
let request;
export async function refreshProjects() {
  if (request) return request;
  request = (async () => {
    try {
      const response = await fetch(`${API_BASE}/api/projects/list`);
      if (!response.ok) throw new Error('Projects could not be loaded');
      const data = await response.json();
      if (!Array.isArray(data) || data.some(p=>!p.id || typeof p.title !== 'string')) throw new Error('Invalid project response');
      projects.value = prepareProjects(data,true);
      error.value = null;
    } catch (caught) { error.value = caught; }
    finally { loaded.value = true; request = null; }
  })();
  return request;
}
async function authorized(path, options) {
  const {token, lock} = useEditorAuth();
  if (!token.value) throw new Error('Sign in to edit projects.');
  const response = await fetch(`${API_BASE}${path}`, {...options,headers:withEditorSession(token.value,options.headers)});
  if (response.status === 401) { lock(); throw new Error('Sign in again to continue editing.'); }
  if (!response.ok) throw new Error('The change could not be saved. Please try again.');
  return response;
}
export async function saveProject(draft) {
  const payload = Object.fromEntries(['id','title','imageId','brief','description','technologies','orderIndex'].map(key=>[key,draft[key]]));
  await authorized('/api/projects/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  projects.value = prepareProjects([...projects.value.filter(p=>p.id!==draft.id),payload],true);
}
export async function deleteProject(id) {
  await authorized(`/api/projects/delete?id=${encodeURIComponent(id)}`,{method:'DELETE'});
  projects.value = projects.value.filter(p=>p.id!==id);
}
export async function moveProject(id, amount) {
  const copy = [...projects.value];
  const from = copy.findIndex(p=>p.id===id);const to = from+amount;
  if (from<0 || to<0 || to>=copy.length) return;
  [copy[from],copy[to]]=[copy[to],copy[from]];
  await authorized('/api/projects/reorder',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(copy.map(p=>p.id))});
  projects.value = copy.map((p,orderIndex)=>({...p,orderIndex}));
}
export async function uploadImage(file) {
  const form = new FormData();form.append('image',file);
  const response = await authorized('/api/images/upload',{method:'POST',body:form});
  return String(await response.json());
}
export function usePortfolio() {
  onMounted(refreshProjects);
  return {projects:readonly(projects), loaded:readonly(loaded), error:readonly(error), projectLink, refreshProjects};
}

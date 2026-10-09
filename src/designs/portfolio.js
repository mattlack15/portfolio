import {computed, onMounted, ref} from 'vue';
import {useRoute} from 'vue-router';
import {API_BASE} from '@/auth/api';
import {projects as snapshot, prepareProjects, projectLink} from './content';

const liveProjects = ref(snapshot);
const loaded = ref(false);
const error = ref(null);
let request;

async function refreshProjects() {
  if (request) return request;
  request = (async () => {
    try {
      const response = await fetch(`${API_BASE}/api/projects/list`);
      if (!response.ok) throw new Error('Projects could not be loaded');
      const data = await response.json();
      if (!Array.isArray(data) || data.some(p => !p.id || typeof p.title !== 'string')) {
        throw new Error('Invalid project response');
      }
      liveProjects.value = prepareProjects(data, true);
      error.value = null;
    } catch (caught) {
      error.value = caught;
    } finally {
      loaded.value = true;
      request = null;
    }
  })();
  return request;
}

export function usePortfolio() {
  const route = useRoute();
  const live = computed(() => Boolean(route.meta.portfolio));
  onMounted(() => { if (live.value) refreshProjects(); });
  return {
    projects: computed(() => live.value ? liveProjects.value : snapshot),
    home: computed(() => live.value ? '/' : '/designs/editorial'),
    projectLink: id => projectLink(route.params.direction || 'editorial', id, live.value),
    live, loaded, error,
  };
}

<script setup>
import {computed, nextTick, onBeforeUnmount, ref, watch} from 'vue';
import {API_BASE, withEditorSession} from '@/auth/api';
import {useEditorAuth} from '@/auth/editor';
import {usePortfolio} from './projects';
const {projects:projectNames}=usePortfolio();

const props = defineProps({days:Number, countries:{type:Array,default:()=>[]}, refreshVersion:Number});
const {token,lock}=useEditorAuth();
const search = ref('');
const query = ref('');
const type = ref('');
const country = ref('');
const order = ref('newest');
const path = ref('');
const referrer = ref('');
const items = ref([]);
const total = ref(null);
const nextCursor = ref(null);
const loading = ref(false);
const error = ref('');
const section = ref(null);
const sentinel = ref(null);
let controller;
let observer;
let debounce;
let version=0;
const format = value=>new Intl.NumberFormat().format(value);
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Toronto';
const countries = computed(()=>[...new Set([...props.countries,country.value].filter(value=>value && value!=='__unknown__'))].sort());
const filtered = computed(()=>Boolean(search.value || type.value || country.value || path.value || referrer.value));
const place = row=>[...new Set([row.city,row.region,row.country].filter(Boolean))].join(', ') || 'Unknown location';
const date = value=>new Date(value).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',second:'2-digit'});
const projectName = value=>projectNames.value.find(project=>`/project/${project.id}`===value)?.name;
const pageName = value=>value==='/'?'Home':projectName(value) || value;
const activityName = row=>row.type==='pageview'?pageName(row.path):row.label || projectName(row.target) || row.target;

async function loadMore() {
  if (loading.value || !nextCursor.value || error.value) return;
  await fetchActivity(false);
}
async function fetchActivity(reset=true) {
  if (!token.value) return;
  if (reset) {
    controller?.abort();version++;
    items.value=[];total.value=null;nextCursor.value=null;
  }
  const session=token.value;
  const currentVersion=version;
  const current=new AbortController();controller=current;
  loading.value=true;error.value='';
  try {
    const params=new URLSearchParams({days:String(props.days),timezone,limit:'50',order:order.value});
    for (const [key,value] of Object.entries({q:query.value,type:type.value,country:country.value,path:path.value,referrer:referrer.value})) if(value) params.set(key,value);
    if(!reset && nextCursor.value)params.set('cursor',nextCursor.value);
    const response=await fetch(`${API_BASE}/api/analytics/activity?${params}`,{headers:withEditorSession(session),signal:current.signal});
    if(current.signal.aborted || currentVersion!==version || token.value!==session)return;
    if(response.status===401){lock();return;}
    if(!response.ok)throw new Error('Could not load activity.');
    const result=await response.json();
    if(current.signal.aborted || currentVersion!==version)return;
    const seen=new Set(items.value.map(item=>item._id));
    items.value.push(...result.items.filter(item=>!seen.has(item._id)));
    if(result.total!=null)total.value=result.total;
    nextCursor.value=result.nextCursor;
  } catch(caught) {
    if(caught.name!=='AbortError' && currentVersion===version)error.value=caught.message;
  } finally {
    if(current===controller)loading.value=false;
  }
  if(currentVersion===version)await observe();
}
async function observe() {
  await nextTick();observer?.disconnect();
  if(!sentinel.value || !nextCursor.value || error.value || !('IntersectionObserver' in window))return;
  observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting))loadMore();},{rootMargin:'300px'});
  observer.observe(sentinel.value);
}
function clear() {
  clearTimeout(debounce);search.value='';query.value='';type.value='';country.value='';path.value='';referrer.value='';
}
function filterBy(filter) {
  clear();
  if(filter.path!=null)path.value=filter.path;
  if(filter.country!=null)country.value=filter.country;
  if(filter.referrer!=null)referrer.value=filter.referrer || '__direct__';
  if(filter.q!=null){search.value=filter.q;query.value=filter.q;}
  if(filter.type!=null)type.value=filter.type;
  nextTick(()=>section.value?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'}));
}
function submitSearch() {
  clearTimeout(debounce);
  if(query.value===search.value.trim())fetchActivity();
  else query.value=search.value.trim();
}
watch(search,()=>{
  clearTimeout(debounce);
  if(query.value===search.value.trim()){if(!items.value.length && loading.value)fetchActivity();return;}
  // Abort immediately so a slower old search cannot append unrelated rows.
  controller?.abort();controller=undefined;version++;loading.value=true;items.value=[];total.value=null;nextCursor.value=null;
  debounce=setTimeout(()=>{query.value=search.value.trim();},250);
});
watch([()=>props.days,()=>props.refreshVersion,()=>token.value,query,type,country,order,path,referrer],()=>fetchActivity(),{immediate:true});
onBeforeUnmount(()=>{clearTimeout(debounce);controller?.abort();observer?.disconnect();});
defineExpose({filterBy});
</script>

<template>
  <section ref="section" class="activity" aria-labelledby="activity-heading" data-analytics-ignore>
    <header class="activity-heading"><div><h2 id="activity-heading">Activity</h2><p>Search and filters apply to this list.</p></div><button v-if="filtered" class="editorial-action" @click="clear">Clear filters</button></header>
    <form class="activity-filters" role="search" @submit.prevent="submitSearch">
      <label class="activity-search">Search activity<input v-model="search" type="search" maxlength="200" placeholder="Page, click, location, or referrer" autocomplete="off" /></label>
      <label>Event<select v-model="type"><option value="">All activity</option><option value="pageview">Page views</option><option value="click">Clicks</option></select></label>
      <label>Country<select v-model="country"><option value="">All countries</option><option v-for="name in countries" :key="name" :value="name">{{ name }}</option><option value="__unknown__">Unknown location</option></select></label>
      <label>Order<select v-model="order"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
    </form>
    <div v-if="path || referrer" class="activity-specific">
      <button v-if="path" class="editorial-action" @click="path=''">Page: {{ pageName(path) }} <span aria-hidden="true">×</span><span class="sr-only">Remove page filter</span></button>
      <button v-if="referrer" class="editorial-action" @click="referrer=''">Referrer: {{ referrer==='__direct__'?'Direct':referrer }} <span aria-hidden="true">×</span><span class="sr-only">Remove referrer filter</span></button>
    </div>
    <div class="activity-caption"><p role="status" aria-live="polite">{{ total==null ? (loading?'Loading activity...':'') : `${format(items.length)} of ${format(total)} ${filtered?'matching ':''}${total===1?'entry':'entries'}` }}</p><span>Times in {{ timezone }}</span></div>
    <div class="activity-table" :aria-busy="loading">
      <table><thead><tr><th scope="col">Event</th><th scope="col">Page / target</th><th scope="col">Location</th><th scope="col">Time</th></tr></thead>
        <tbody><tr v-for="row in items" :key="row._id" class="activity-row">
          <td class="activity-type"><span class="dot" :class="{clicked:row.type==='click'}" aria-hidden="true" />{{ row.type==='click'?'Click':'Page view' }}</td>
          <td class="activity-target"><span>{{ activityName(row) }}</span><small>{{ row.type==='click'?`${row.path} → ${row.target}`:row.path==='/'?'':row.path }}</small><small v-if="row.referrer">From {{ row.referrer }}</small></td>
          <td class="activity-place">{{ place(row) }}</td><td class="activity-time"><time :datetime="row.at" :title="new Date(row.at).toLocaleString()">{{ date(row.at) }}</time></td>
        </tr></tbody>
      </table>
      <div v-if="!items.length && !loading && !error" class="activity-empty"><p>{{ filtered?'No activity matches these filters.':'No activity in this date range.' }}</p><button v-if="filtered" class="editorial-action" @click="clear">Clear filters</button><p v-else>Choose a longer date range to check earlier visits.</p></div>
      <div ref="sentinel" class="activity-more">
        <p v-if="loading" role="status">Loading activity...</p>
        <template v-else-if="error"><p role="alert">{{ error }}</p><button class="editorial-action" @click="fetchActivity(!items.length)">Retry activity</button></template>
        <button v-else-if="nextCursor" class="editorial-action" @click="loadMore">Load more activity</button>
        <p v-else-if="items.length">All {{ filtered?'matching ':'' }}activity in this date range is loaded.</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.activity { margin-top:34px; scroll-margin-top:24px; }
.activity-heading { display:flex; align-items:center; justify-content:space-between; gap:18px; margin-bottom:20px; }
.activity h2 { font-size:24px; font-weight:400; margin:0 0 5px; }
.activity-heading p,.activity-caption { font-size:13px; color:var(--editorial-muted); }
.activity-filters { display:grid; grid-template-columns:minmax(200px,2fr) repeat(3,minmax(120px,1fr)); gap:14px; }
.activity-filters label { display:flex; flex-direction:column; gap:7px; font-size:13px; min-width:0; }
input,select { min-width:0; width:100%; padding:10px 12px; border:1px solid var(--editorial-border); border-radius:6px; background:var(--editorial-paper); color:var(--editorial-ink); font:inherit; font-size:15px; }
input::placeholder { color:var(--editorial-muted); opacity:1; }
.activity-specific { display:flex; flex-wrap:wrap; gap:8px; margin-top:14px; }.activity-specific button { gap:12px; max-width:100%; text-align:left; overflow-wrap:anywhere; }
.activity-caption { display:flex; justify-content:space-between; gap:16px; margin:18px 0 12px; min-height:20px; }
.activity-table { border:1px solid var(--editorial-border); border-radius:10px; overflow:hidden; }
table { width:100%; border-collapse:collapse; table-layout:fixed; text-align:left; }
th { padding:16px 20px; color:var(--editorial-muted); font-size:12px; font-weight:400; background:var(--editorial-control); }
th:first-child { width:115px; }th:nth-child(3) { width:24%; }th:last-child { width:170px; text-align:right; }
td { padding:17px 20px; border-top:1px solid var(--editorial-border); overflow-wrap:anywhere; font-size:14px; line-height:1.6; }
small { display:block; color:var(--editorial-muted); font-size:12px; margin-top:4px; }.activity-time { text-align:right; font-size:12px; color:var(--editorial-muted); }
.dot { display:inline-block; width:6px; height:6px; margin-right:8px; border-radius:50%; background:var(--editorial-muted); }.dot.clicked { background:var(--editorial-ink); }
.activity-empty { padding:40px 20px; text-align:center; color:var(--editorial-muted); }.activity-empty p+p { margin-top:10px; }.activity-empty button { margin-top:16px; }
.activity-more { display:flex; align-items:center; justify-content:center; flex-wrap:wrap; gap:12px; padding:20px; min-height:70px; color:var(--editorial-muted); font-size:13px; border-top:1px solid var(--editorial-border); }
@media(max-width:900px) { .activity-filters { grid-template-columns:repeat(3,minmax(0,1fr)); }.activity-search { grid-column:1/-1; }th:first-child { width:100px; }th:last-child { width:145px; }td,th { padding:14px; } }
@media(max-width:600px) { .activity-filters { grid-template-columns:1fr 1fr; }.activity-filters label:last-child { grid-column:1/-1; }.activity-caption { flex-direction:column; gap:4px; }.activity-heading { align-items:flex-start; }.activity-heading .editorial-action { font-size:12px; padding:6px 9px; }table,tbody { display:block; }thead { display:none; }.activity-row { display:grid; grid-template-columns:auto 1fr; padding:16px; gap:8px 12px; border-top:1px solid var(--editorial-border); }.activity-row:first-child { border:0; }td { display:block; border:0; padding:0; }.activity-type { font-size:12px; }.activity-time { grid-column:2; grid-row:1; font-size:11px; align-self:center; }.activity-target { grid-column:1/-1; font-size:15px; }.activity-place { grid-column:1/-1; color:var(--editorial-muted); font-size:12px; } }
</style>

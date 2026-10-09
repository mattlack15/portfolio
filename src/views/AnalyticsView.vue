<script setup>
import {computed, onUnmounted, ref, watch} from 'vue';
import {API_BASE, withEditorSession} from '@/auth/api';

const props = defineProps({authToken: {type: String, default: null}});
const days = ref(7);
const data = ref(null);
const loading = ref(false);
const error = ref('');
const metric = ref('visits');
const activeDay = ref(null);
let controller;
const format = value => new Intl.NumberFormat().format(value || 0);
const dateLabel = date => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
const place = row => [row.city, row.region, row.country].filter(Boolean).join(', ') || 'Unknown';
const totals = computed(() => data.value ? [
  {key: 'visits', label: 'Visits', value: data.value.visits},
  {key: 'visitors', label: 'Visitors', value: data.value.visitors},
  {key: 'pageviews', label: 'Page views', value: data.value.pageviews},
  {key: 'clicks', label: 'Clicks', value: data.value.clickCount},
] : []);
const max = computed(() => Math.max(1, ...(data.value?.daily || []).map(row => row[metric.value])));
const selected = computed(() => data.value?.daily.find(row => row.date === activeDay.value));
const tables = computed(() => !data.value ? [] : [
  {label: 'Pages', count: 'Views', rows: data.value.pages.map(row => ({label: row._id, count: row.count}))},
  {label: 'Clicks', count: 'Clicks', rows: data.value.clicks.map(row => ({label: row._id.label || row._id.target, detail: row._id.target, count: row.count}))},
  {label: 'Locations', count: 'Views', rows: data.value.locations.map(row => ({label: place(row._id), count: row.count}))},
  {label: 'Referrers', count: 'Views', rows: data.value.referrers.map(row => ({label: row._id || 'Direct', count: row.count}))},
]);
async function refresh() {
  controller?.abort();
  data.value = null;
  error.value = '';
  activeDay.value = null;
  if (!props.authToken) { loading.value = false; return; }
  const current = new AbortController();
  controller = current;
  loading.value = true;
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Toronto';
    const response = await fetch(`${API_BASE}/api/analytics/summary?days=${days.value}&timezone=${encodeURIComponent(timezone)}`, {
      headers: withEditorSession(props.authToken), signal: current.signal,
    });
    if (!response.ok) throw new Error(response.status === 401 ? 'Sign in again to view analytics.' : 'Could not load analytics.');
    const result = await response.json();
    if (!current.signal.aborted) data.value = result;
  } catch (caught) {
    if (caught.name !== 'AbortError') error.value = caught.message;
  } finally {
    if (controller === current) loading.value = false;
  }
}
watch([() => props.authToken, days], refresh, {immediate: true});
onUnmounted(() => controller?.abort());
</script>

<template>
  <main class="analytics" data-analytics-ignore>
    <div v-if="!authToken" class="locked">Use the key button to sign in.</div>
    <template v-else>
      <div class="toolbar">
        <div class="periods" aria-label="Date range">
          <button v-for="period in [{n: 1, label: 'Today'}, {n: 7, label: '7 days'}, {n: 30, label: '30 days'}, {n: 90, label: '90 days'}]"
            :key="period.n" :aria-pressed="days === period.n" :class="{active: days === period.n}" @click="days = period.n">{{ period.label }}</button>
        </div>
        <button class="refresh" :disabled="loading" @click="refresh" aria-label="Refresh analytics"><Icon icon="material-symbols:refresh-rounded" :class="{spinning: loading}" /></button>
      </div>
      <p v-if="error" role="alert" class="error">{{ error }} <button @click="refresh">Retry</button></p>
      <div v-if="loading" role="status" class="loading">Loading…</div>
      <template v-if="data">
        <div class="stats">
          <div v-for="item in totals" :key="item.key" class="stat"><span>{{ item.label }}</span><strong>{{ format(item.value) }}</strong></div>
        </div>
        <section class="chart-panel" aria-label="Traffic over time">
          <div class="chart-toolbar">
            <div class="metrics"><button v-for="item in [{key: 'visits', label: 'Visits'}, {key: 'pageviews', label: 'Page views'}, {key: 'clicks', label: 'Clicks'}]" :key="item.key"
              :class="{active: metric === item.key}" :aria-pressed="metric === item.key" @click="metric = item.key">{{ item.label }}</button></div>
            <span class="day-value">{{ selected ? `${dateLabel(selected.date)} · ${format(selected[metric])}` : '' }}</span>
          </div>
          <div class="chart" @mouseleave="activeDay = null">
            <div class="gridlines" aria-hidden="true"><span>{{ format(max) }}</span><span>{{ format(Math.round(max / 2)) }}</span><span>0</span></div>
            <div class="bars">
              <button v-for="row in data.daily" :key="row.date" class="bar-hit" @mouseenter="activeDay = row.date" @focus="activeDay = row.date" @blur="activeDay = null"
                :aria-label="`${dateLabel(row.date)}: ${row[metric]} ${metric}`" :title="`${dateLabel(row.date)}: ${row[metric]}`">
                <span class="bar" :style="{height: `${row[metric] / max * 100}%`, minHeight: row[metric] ? '3px' : '0'}"></span>
              </button>
            </div>
          </div>
          <div class="axis"><span>{{ dateLabel(data.daily[0].date) }}</span><span v-if="days > 1">{{ dateLabel(data.daily.at(-1).date) }}</span></div>
        </section>
        <div class="tables">
          <section v-for="table in tables" :key="table.label" class="table-panel">
            <table><thead><tr><th>{{ table.label }}</th><th>{{ table.count }}</th></tr></thead>
              <tbody><tr v-for="(row, index) in table.rows" :key="index"><td><span>{{ row.label }}</span><small v-if="row.detail && row.detail !== row.label">{{ row.detail }}</small></td><td>{{ format(row.count) }}</td></tr>
              <tr v-if="!table.rows.length"><td colspan="2" class="empty">No {{ table.label.toLowerCase() }} yet</td></tr></tbody>
            </table>
            <a v-if="table.label === 'Locations'" class="attribution" href="https://db-ip.com" target="_blank" rel="noopener noreferrer" title="Approximate location based on IP address">IP Geolocation by DB-IP</a>
            <p v-if="table.label === 'Locations' && !data.geoAvailable" class="error">Location database unavailable.</p>
          </section>
        </div>
        <section class="table-panel recent">
          <table><thead><tr><th>Recent activity</th><th>Page / target</th><th>Location</th><th>Time</th></tr></thead><tbody>
            <tr v-for="row in data.recent" :key="row._id"><td><span class="dot" :class="{clicked: row.type === 'click'}"></span>{{ row.type === 'click' ? 'Click' : 'Page view' }}</td>
              <td>{{ row.type === 'click' ? row.label || row.target : row.path }}<small v-if="row.type === 'click'">{{ row.path }} → {{ row.target }}</small></td>
              <td>{{ place(row) }}</td><td class="time">{{ new Date(row.at).toLocaleString(undefined, {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'}) }}</td></tr>
            <tr v-if="!data.recent.length"><td colspan="4" class="empty">No activity yet</td></tr>
          </tbody></table>
        </section>
      </template>
    </template>
  </main>
</template>

<style scoped>
.analytics {max-width: 1200px; margin: 0 auto; padding: 0 28px 72px; color: #e5e5e5; font-family: inherit; font-size: 14px;}
.toolbar, .chart-toolbar {display: flex; justify-content: space-between; align-items: center; gap: 12px;}
.toolbar {margin-bottom: 28px;}.periods {display: flex; gap: 4px; border: 1px solid #292929; border-radius: 9px; padding: 4px;}
button {cursor: pointer;}button:focus-visible, a:focus-visible {outline: 2px solid #bbb; outline-offset: 3px;}
.periods button, .metrics button {padding: 7px 13px; color: #929292; border-radius: 6px; transition: background .15s; white-space: nowrap;}
.periods button.active {background: #282828; color: white;}.periods button:hover, .metrics button:hover {color: white;}
.refresh {font-size: 22px; padding: 8px; color: #999;}.refresh:disabled {opacity: .5; cursor: wait;}
.stats {display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid #292929; border-radius: 12px; overflow: hidden; margin-bottom: 20px;}
.stat {padding: 24px 26px; border-right: 1px solid #292929;}.stat:last-child {border-right: 0;}.stat span {display: block; color: #999; margin-bottom: 12px;}.stat strong {font-size: 34px; letter-spacing: -1px; font-weight: 500; font-variant-numeric: tabular-nums;}
.chart-panel, .table-panel {border: 1px solid #292929; border-radius: 12px; overflow: hidden; background: #101010;}
.chart-panel {padding: 20px 24px; margin-bottom: 20px;}.chart-toolbar {margin-bottom: 26px; min-height: 34px;}.metrics {display: flex; gap: 4px;}.metrics button {padding: 4px 9px;}.metrics button.active {color: #eee; background: #262626;}.day-value {font-size: 12px; color: #aaa; font-variant-numeric: tabular-nums;}
.chart {height: 190px; position: relative;}.gridlines {position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none;}.gridlines span {border-bottom: 1px solid #252525; color: #666; font-size: 11px; line-height: 0; text-align: right; padding-right: 0;}
.bars {display: flex; gap: clamp(2px, .5vw, 7px); align-items: end; position: absolute; inset: 0 35px 0 0;}.bar-hit {flex: 1; height: 100%; display: flex; align-items: end; justify-content: center; min-width: 0;}.bar {display: block; width: 100%; max-width: 72px; background: #b9c6bd; border-radius: 3px 3px 0 0;}.bar-hit:hover .bar, .bar-hit:focus .bar {background: #eff5f0;}.axis {display: flex; justify-content: space-between; margin-top: 12px; padding-right: 35px; color: #777; font-size: 12px;}
.tables {display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;}table {width: 100%; border-collapse: collapse; text-align: left; table-layout: fixed;}th {font-weight: 500; color: #aaa; font-size: 12px; padding: 17px 22px; border-bottom: 1px solid #292929;}td {padding: 13px 22px; border-bottom: 1px solid #202020; overflow-wrap: anywhere; font-size: 13px;}tr:last-child td {border-bottom: 0;}th:last-child, td:last-child {text-align: right; width: 80px; font-variant-numeric: tabular-nums;}td small {display: block; color: #727272; font-size: 11px; margin-top: 3px;}.empty {color: #666; height: 100px; text-align: center !important;}.attribution {display: block; padding: 12px 22px; font-size: 10px; color: #666; border-top: 1px solid #202020;}.attribution:hover {color: #aaa;}.recent {overflow-x: auto;}.recent table {min-width: 660px;}.recent th:first-child {width: 145px;}.recent th:last-child {width: 155px;}.recent th:nth-child(3) {width: 26%;}.time {color: #888; font-size: 12px;}.dot {display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #b9c6bd; margin-right: 9px;}.dot.clicked {background: #b0a0cc;}.locked, .loading {padding: 60px 0; text-align: center; color: #888;}.error {color: #e7a19a; padding: 14px 0;}.error button {text-decoration: underline; margin-left: 8px;}.spinning {animation: spin 1s linear infinite;}@keyframes spin {to {transform: rotate(360deg);}}
@media(max-width: 640px) {.analytics {padding: 0 16px 40px;}.stats {grid-template-columns: 1fr 1fr;}.stat {padding: 18px;}.stat:nth-child(2) {border-right: 0;}.stat:nth-child(-n+2) {border-bottom: 1px solid #292929;}.stat strong {font-size: 28px;}.tables {grid-template-columns: 1fr;}.chart-panel {padding: 16px 12px;}.chart-toolbar {flex-wrap: wrap;}.chart {height: 160px;}.periods button {padding: 6px 10px;}.day-value {min-height: 16px;}.stat span {font-size: 12px;}}
@media(prefers-reduced-motion: reduce) {.spinning {animation: none;}}
</style>

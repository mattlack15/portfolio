<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref} from 'vue';
import {API_BASE} from '@/auth/api';
import {
  prepareCreationOptions,
  prepareRequestOptions,
  serializeCredential,
  supportsPasskeys,
} from '@/auth/passkeys';

const emits = defineEmits<{
  (event: 'authenticated', token: string): void;
  (event: 'close'): void;
}>();

type Mode = 'loading' | 'setup' | 'authenticating' | 'error';

const mode = ref<Mode>('loading');
const error = ref('');

const messageForError = (caught: unknown): string => {
  if (caught instanceof DOMException && caught.name === 'NotAllowedError') return 'Passkey prompt cancelled.';
  if (caught instanceof Error) return caught.message;
  return 'Passkey authentication failed.';
};

const post = async (path: string, body?: unknown) => {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: body === undefined ? undefined : {'Content-Type': 'application/json'},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const details = await response.json().catch(() => null);
    throw new Error(details?.message || 'The passkey request failed.');
  }
  return response.json();
};

const finish = (session: {token: string}) => emits('authenticated', session.token);

const createPasskey = async () => {
  mode.value = 'authenticating';
  error.value = '';
  try {
    const ceremony = await post('/api/auth/passkey/register/options');
    const credential = await navigator.credentials.create(prepareCreationOptions(ceremony.options));
    if (!(credential instanceof PublicKeyCredential)) throw new Error('No passkey was created.');
    const session = await post('/api/auth/passkey/register/finish', {
      ceremonyId: ceremony.ceremonyId,
      credential: serializeCredential(credential),
    });
    finish(session);
  } catch (caught) {
    error.value = messageForError(caught);
    mode.value = 'error';
  }
};

const authenticate = async () => {
  mode.value = 'authenticating';
  error.value = '';
  try {
    const ceremony = await post('/api/auth/passkey/authenticate/options');
    const credential = await navigator.credentials.get(prepareRequestOptions(ceremony.options));
    if (!(credential instanceof PublicKeyCredential)) throw new Error('No passkey was selected.');
    const session = await post('/api/auth/passkey/authenticate/finish', {
      ceremonyId: ceremony.ceremonyId,
      credential: serializeCredential(credential),
    });
    finish(session);
  } catch (caught) {
    error.value = messageForError(caught);
    mode.value = 'error';
  }
};

const initialize = async () => {
  if (!supportsPasskeys()) {
    error.value = 'Passkeys are not supported in this browser.';
    mode.value = 'error';
    return;
  }
  try {
    const response = await fetch(`${API_BASE}/api/auth/passkey/status`);
    if (!response.ok) throw new Error('Could not check passkey setup.');
    const status: {configured: boolean} = await response.json();
    if (status.configured) await authenticate();
    else mode.value = 'setup';
  } catch (caught) {
    error.value = messageForError(caught);
    mode.value = 'error';
  }
};

function keydown(event) { if (event.key==='Escape') emits('close'); }
onMounted(()=>{initialize();window.addEventListener('keydown',keydown);document.querySelector('.auth-dialog button')?.focus();});
onBeforeUnmount(()=>window.removeEventListener('keydown',keydown));
</script>

<template>
  <div class="auth-overlay editorial-preview" @click.self="emits('close')" data-analytics-ignore>
    <section class="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-heading" @keydown.tab="event=>{const buttons=[...event.currentTarget.querySelectorAll('button')];if(event.shiftKey&&event.target===buttons[0]){event.preventDefault();buttons.at(-1)?.focus()}else if(!event.shiftKey&&event.target===buttons.at(-1)){event.preventDefault();buttons[0]?.focus()}}">
      <header><h2 id="auth-heading">{{ mode==='setup'?'Set up passkey':'Unlock editing' }}</h2><button type="button" class="editorial-action" aria-label="Close" @click="emits('close')">Close</button></header>
      <p v-if="mode==='setup'">Create the passkey you'll use to edit this portfolio.</p>
      <p v-else-if="mode==='loading' || mode==='authenticating'" role="status">Follow your browser's passkey prompt.</p>
      <button v-if="mode==='setup'" type="button" class="editorial-action" @click="createPasskey">Create passkey</button>
      <template v-if="mode==='error'"><p role="alert">{{ error }}</p><div class="auth-actions"><button type="button" class="editorial-action" @click="emits('close')">Cancel</button><button type="button" class="editorial-action" @click="initialize">Try again</button></div></template>
    </section>
  </div>
</template>
<style scoped>
.auth-overlay { position:fixed; inset:0; z-index:200; display:grid; place-items:center; padding:24px; background:#0008; font:17px/1.6 var(--editorial-font); color:var(--editorial-ink); }
.auth-dialog { width:100%; max-width:420px; padding:24px; background:var(--editorial-paper); border:1px solid var(--editorial-border); border-radius:10px; box-shadow:0 20px 60px #0005; }
.auth-dialog header { display:flex; align-items:center; justify-content:space-between; gap:18px; }.auth-dialog h2 { margin:0; font-size:22px; font-weight:400; }.auth-dialog p { margin:20px 0; }.auth-dialog button { font-size:15px; }.auth-actions { display:flex; justify-content:flex-end; gap:12px; }
</style>

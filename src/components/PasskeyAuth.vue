<script setup lang="ts">
import {onMounted, ref} from 'vue';
import {Icon} from '@iconify/vue';
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

onMounted(initialize);
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" @click.self="emits('close')">
    <div class="w-full max-w-sm rounded-xl border border-accent bg-surface p-6 text-white shadow-2xl">
      <div class="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 class="text-xl font-semibold">{{ mode === 'setup' ? 'Set up passkey' : 'Unlock editing' }}</h2>
          <p v-if="mode === 'setup'" class="mt-2 text-sm text-gray-400">
            Create the passkey you’ll use to edit this portfolio.
          </p>
          <p v-else-if="mode === 'authenticating' || mode === 'loading'" class="mt-2 text-sm text-gray-400">
            Follow your browser’s passkey prompt.
          </p>
        </div>
        <button type="button" class="text-gray-400 transition hover:text-white" aria-label="Close" @click="emits('close')">
          <Icon icon="material-symbols:close-rounded" class="text-xl" />
        </button>
      </div>

      <div v-if="mode === 'loading' || mode === 'authenticating'" class="flex items-center gap-3 text-sm text-gray-300">
        <Icon icon="svg-spinners:ring-resize" class="text-xl text-primary" />
        Waiting for passkey…
      </div>

      <button
        v-else-if="mode === 'setup'"
        type="button"
        class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-background transition hover:brightness-110"
        @click="createPasskey"
      >
        <Icon icon="material-symbols:fingerprint" class="text-xl" />
        Create passkey
      </button>

      <div v-else class="space-y-4">
        <p class="text-sm text-red-400">{{ error }}</p>
        <div class="flex justify-end gap-3">
          <button type="button" class="rounded-lg border border-neutral px-4 py-2 text-sm text-gray-300" @click="emits('close')">
            Cancel
          </button>
          <button type="button" class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-background" @click="initialize">
            Try again
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

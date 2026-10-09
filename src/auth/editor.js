import {readonly, ref} from 'vue';
import {API_BASE, withEditorSession} from './api';

const key = 'portfolio-editor-session';
let saved;
try { saved = sessionStorage.getItem(key); } catch { saved = null; }
const token = ref(saved);
const showSignIn = ref(false);

function setSession(value) {
  token.value = value;
  try {
    if (value) sessionStorage.setItem(key, value);
    else sessionStorage.removeItem(key);
  } catch { /* Editing remains available for this page when storage is disabled. */ }
}

export async function validateEditorSession() {
  if (!token.value) return;
  const current = token.value;
  const response = await fetch(`${API_BASE}/api/auth/session`, {headers:withEditorSession(current)}).catch(()=>null);
  if (token.value === current && (response?.status === 401 || response?.status === 403)) setSession(null);
}

export function useEditorAuth() {
  return {
    token: readonly(token), showSignIn: readonly(showSignIn),
    signIn: () => { showSignIn.value = true; },
    closeSignIn: () => { showSignIn.value = false; },
    authenticated: value => { setSession(value); showSignIn.value = false; },
    lock: () => {
      const current = token.value;
      setSession(null);
      if (current) fetch(`${API_BASE}/api/auth/logout`, {method:'POST',headers:withEditorSession(current)}).catch(()=>{});
    },
  };
}

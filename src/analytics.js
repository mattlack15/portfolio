import {API_BASE} from './auth/api';
import {useEditorAuth} from './auth/editor';

export function installAnalytics(router) {
  const {token}=useEditorAuth();
  let memoryVisitor = crypto.randomUUID();
  let memorySession = null;
  const read = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, value); } catch { /* Storage can be disabled. */ } };
  const enabled = () => {
    return !token.value && navigator.doNotTrack !== '1' && !navigator.globalPrivacyControl &&
      !location.pathname.startsWith('/analytics') && !location.pathname.startsWith('/editor') && !navigator.webdriver;
  };
  const identities = () => {
    const visitor = read('portfolio-visitor') || memoryVisitor;
    write('portfolio-visitor', visitor);
    let session;
    try { session = JSON.parse(read('portfolio-visit')); } catch { /* Invalid stored state. */ }
    session ||= memorySession;
    const now = Date.now();
    if (!session?.id || !Number.isFinite(session.at) || now - session.at > 30 * 60 * 1000) {
      session = {id: crypto.randomUUID(), at: now};
    }
    session.at = now;
    memorySession = session;
    write('portfolio-visit', JSON.stringify(session));
    return {visitor, session: session.id};
  };
  const send = (type, path, target = '', label = '') => {
    if (!enabled()) return;
    const payload = {id: crypto.randomUUID(), ...identities(), type, path: path.slice(0, 500),
      target: target.slice(0, 500), label: label.trim().replace(/\s+/g, ' ').slice(0, 100),
      referrer: document.referrer ? new URL(document.referrer).origin : ''};
    fetch(`${API_BASE}/api/analytics/events`, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload), keepalive: true,
    }).catch(() => {});
  };
  router.afterEach((to, from, failure) => {
    if (!failure && to.path !== from.path) send('pageview', to.path);
    else if (!failure && !from.matched.length) send('pageview', to.path);
  });
  // Capture phase also catches Vue handlers that stop propagation.
  document.addEventListener('click', (event) => {
    const element = event.target instanceof Element ? event.target.closest('a, button, [data-analytics-target]') : null;
    if (!element || element.closest('[data-analytics-ignore]')) return;
    let target = element.getAttribute('data-analytics-target') || element.getAttribute('href');
    const label = element.getAttribute('data-analytics-label') || element.getAttribute('aria-label') || element.textContent || '';
    if (!target) target = `#${element.id || label.trim().slice(0, 80) || 'button'}`;
    if (!target.startsWith('#')) {
      try {
        const url = new URL(target, location.origin);
        target = url.origin === location.origin ? url.pathname + url.hash :
          ['http:', 'https:'].includes(url.protocol) ? url.origin + url.pathname : url.protocol;
      } catch { return; }
    }
    send('click', router.currentRoute.value.path, target, label);
  }, true);
}

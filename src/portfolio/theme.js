import {ref} from 'vue';

const key = 'portfolio-theme';
const system = window.matchMedia('(prefers-color-scheme: dark)');
const readPreference = () => {
  try {
    const value = localStorage.getItem(key);
    return value === 'light' || value === 'dark' ? value : null;
  } catch { return null; }
};
let preference = readPreference();
export const theme = ref(preference || (system.matches ? 'dark' : 'light'));

function apply() {
  document.documentElement.dataset.portfolioTheme = theme.value;
}
apply();
system.addEventListener('change', event => {
  if (!preference) {
    theme.value = event.matches ? 'dark' : 'light';
    apply();
  }
});
window.addEventListener('storage', event => {
  if (event.key !== key && event.key !== null) return;
  preference = readPreference();
  theme.value = preference || (system.matches ? 'dark' : 'light');
  apply();
});

export function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
  preference = theme.value;
  try { localStorage.setItem(key, preference); } catch { /* The switch also works without storage. */ }
  apply();
}

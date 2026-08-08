export const API_BASE: string = (import.meta as any).env?.VITE_API_BASE || '';

export const withEditorSession = (token: string | null, headers?: HeadersInit): Headers => {
  const authorized = new Headers(headers);
  if (token) authorized.set('Authorization', `Bearer ${token}`);
  return authorized;
};

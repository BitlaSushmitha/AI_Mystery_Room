const BASE = import.meta.env.VITE_API_BASE_URL || '';
export function credentials(caseId) { try { return JSON.parse(localStorage.getItem(`mystery-session:${caseId}`) || '{}'); } catch { return {}; } }
async function request(path, options = {}, caseId) {
  const auth = caseId ? credentials(caseId) : {};
  const response = await fetch(`${BASE}/api/v1${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(auth.token ? { 'X-Session-Token': auth.token } : {}), ...options.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message || 'The request could not be completed.');
  return body.data;
}
export const api = {
  createCase: payload => request('/cases', { method: 'POST', body: JSON.stringify(payload) }),
  getCase: id => request(`/cases/${id}`, {}, id),
  getResults: id => request(`/cases/${id}/results`, {}, id),
  saveNotes: (id, text) => request(`/cases/${id}/notes`, { method: 'PUT', body: JSON.stringify({ text }) }, id),
  reviewed: (id, evidenceId) => request(`/cases/${id}/evidence/${evidenceId}/reviewed`, { method: 'PUT', body: '{}' }, id),
  accuse: (id, payload) => request(`/cases/${id}/accusation`, { method: 'POST', body: JSON.stringify(payload) }, id)
};

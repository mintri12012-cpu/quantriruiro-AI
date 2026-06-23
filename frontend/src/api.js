const BASE = '/api'

async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, options)
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export const api = {
  predict: (data) => request('/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  portfolio: () => request('/portfolio'),
  alerts: () => request('/alerts'),
  company: (companyId) => request(`/company/${companyId}`),
  history: (companyId) => request(`/history/${companyId}`),
  stressTest: (gdpShock, lendingShock) => request('/stress-test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gdp_shock: gdpShock, lending_shock: lendingShock }),
  }),
  riskSummary: (lgd) => request(`/risk-summary?lgd=${lgd}`),
  riskOverview: () => request('/risk-overview'),
  approvals: (status) => request(`/approvals${status ? `?status=${status}` : ''}`),
  updateStatus: (companyId, status) => request(`/approvals/${companyId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  }),
  listDocuments: (companyId) => request(`/documents/${companyId}`),
  uploadDocument: async (companyId, file) => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`${BASE}/documents/${companyId}`, { method: 'POST', body: fd })
    if (!res.ok) throw new Error(`API error ${res.status}`)
    return res.json()
  },
  deleteDocument: (companyId, name) => request(`/documents/${companyId}/${encodeURIComponent(name)}`, { method: 'DELETE' }),
  documentUrl: (companyId, name) => `${BASE}/documents/${companyId}/${encodeURIComponent(name)}`,
  exportReportUrl: (format) => `${BASE}/reports/export?format=${format}`,
  benchmark: (nganh) => request(`/benchmark/${encodeURIComponent(nganh)}`),
  chat: (message, context) => request('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context }),
  }),
}

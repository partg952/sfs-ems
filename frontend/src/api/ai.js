import api from './client'

export const aiAPI = {
  getStatus: () => api.get('/ai/status'),
  getWorkforceInsights: (refresh = false) =>
    api.get(`/ai/workforce-insights${refresh ? '?refresh=true' : ''}`),
  simulateRisk: (payload) => api.post('/ai/simulate', payload),
  generateExecutiveSummary: (force = false) => api.post('/ai/executive-summary', { force }),
  getGrievanceAnalysis: (id) => api.get(`/ai/grievances/${id}`),
  analyzeGrievanceWithAI: (id) => api.post(`/ai/grievances/${id}/analyze-ai`),
  askCopilot: (payload) =>
    api.post('/ai/copilot/ask', typeof payload === 'string' ? { question: payload } : payload),
}

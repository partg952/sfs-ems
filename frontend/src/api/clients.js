import api from './client'

export const getClients      = ()          => api.get('/clients')
export const getClient       = (id)        => api.get(`/clients/${id}`)
export const createClient    = (data)      => api.post('/clients', data)
export const updateClient    = (id, data)  => api.put(`/clients/${id}`, data)
export const toggleClient    = (id)        => api.patch(`/clients/${id}/toggle`)

export const getSites            = ()         => api.get('/sites')
export const getSitesByClient    = (clientId) => api.get(`/clients/${clientId}/sites`)
export const createSite          = (clientId, data) => api.post(`/clients/${clientId}/sites`, data)
export const updateSite          = (id, data) => api.put(`/sites/${id}`, data)
export const toggleSite          = (id)       => api.patch(`/sites/${id}/toggle`)

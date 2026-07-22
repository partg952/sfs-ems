import api from './client'

export const getUsers    = ()       => api.get('/admin/users')
export const getUser     = (id)     => api.get(`/admin/users/${id}`)
export const createUser  = (data)   => api.post('/admin/users', data)
export const updateUser  = (id, d)  => api.put(`/admin/users/${id}`, d)
export const toggleUser  = (id)     => api.patch(`/admin/users/${id}/toggle`)

export const getSlipTemplate    = ()        => api.get('/admin/slip-template')
export const updateSlipTemplate = (content) => api.put('/admin/slip-template', { content })

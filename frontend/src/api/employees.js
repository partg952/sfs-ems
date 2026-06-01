import api from './client'

export const getEmployees = (params) => api.get('/employees', { params })
export const getEmployee  = (id)     => api.get(`/employees/${id}`)
export const getByCode    = (code)   => api.get(`/employees/code/${code}`)
export const createEmployee = (data) => api.post('/employees', data)
export const updateEmployee = (id, data) => api.put(`/employees/${id}`, data)
export const updateStatus   = (id, data) => api.patch(`/employees/${id}/status`, data)
export const getStatusHistory = (id)     => api.get(`/employees/${id}/status-history`)
export const getEmploymentHistory = (id) => api.get(`/employees/${id}/employment-history`)
export const getTransactionHistory = (id) => api.get(`/employees/${id}/transactions`)
export const uploadEmployeePhoto = (id, file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post(`/employees/${id}/photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

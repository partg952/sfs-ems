import api from './client'

export const getLeaveTypes         = ()       => api.get('/leave/types')
export const createLeaveType       = (data)   => api.post('/leave/types', data)
export const getLeaveBalances      = (empId)  => api.get(`/leave/balances/employee/${empId}`)
export const createLeaveRequest    = (data)   => api.post('/leave/requests', data)
export const getLeaveRequests      = (params) => api.get('/leave/requests', { params })
export const approveLeaveRequest   = (id)     => api.patch(`/leave/requests/${id}/approve`)
export const rejectLeaveRequest    = (id)     => api.patch(`/leave/requests/${id}/reject`)

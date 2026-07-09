import api from './client'

export const getMyProfile        = ()               => api.get('/self/profile')
export const getMyPayslips       = ()               => api.get('/self/payslips')
export const getMyPayslipHtml    = (month, year)    => api.get('/self/payslips/slip', { params: { month, year } })
export const getMyAttendance     = ()               => api.get('/self/attendance')
export const getMyLeaveTypes     = ()               => api.get('/self/leave/types')
export const getMyLeaveBalances  = ()               => api.get('/self/leave/balances')
export const applyForLeave       = (data)           => api.post('/self/leave/requests', data)
export const getMyLeaveRequests  = ()               => api.get('/self/leave/requests')
export const raiseGrievance      = (description)    => api.post('/self/grievances', { description })
export const getMyGrievances     = ()               => api.get('/self/grievances')

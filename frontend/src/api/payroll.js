import api from './client'

export const saveAttendance  = (data)           => api.post('/payroll/attendance', data)
export const processPayroll  = (data)           => api.post('/payroll/process', data)
export const markPayrollPaid = (id)             => api.patch(`/payroll/${id}/mark-paid`)
export const getPayrollByMonth = (month, year)  => api.get('/payroll', { params: { month, year } })
export const getAttendancePrefill = (month, year) => api.get('/payroll/attendance-prefill', { params: { month, year } })
export const getPayrollByEmployee = (id)        => api.get(`/payroll/employee/${id}`)
export const getPayrollSlip = (employeeId, month, year) =>
  api.get('/payroll/slip', { params: { employeeId, month, year } })
export const getPayrollSlipHtml = (employeeId, month, year) =>
  api.get('/payroll/slip/html', { params: { employeeId, month, year } })

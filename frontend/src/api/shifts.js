import api from './client'

export const getShifts             = ()        => api.get('/shifts')
export const createShift           = (data)    => api.post('/shifts', data)
export const assignShift           = (data)    => api.post('/shifts/assign', data)
export const getShiftsByEmployee   = (empId)   => api.get(`/shifts/employee/${empId}`)

export const recordOvertime        = (data)          => api.post('/overtime', data)
export const getOvertimeByMonth    = (month, year)   => api.get('/overtime', { params: { month, year } })
export const getOvertimeByEmployee = (empId)         => api.get(`/overtime/employee/${empId}`)

import api from './client'

export const allotRoom          = (data) => api.post('/assets/rooms', data)
export const getAllActiveRooms  = ()     => api.get('/assets/rooms')
export const getRoomByEmployee  = (id)  => api.get(`/assets/rooms/employee/${id}`)
export const vacateRoom         = (id)  => api.patch(`/assets/rooms/employee/${id}/vacate`)

export const setUniform          = (id, data) => api.patch(`/assets/uniforms/employee/${id}`, data)
export const getUniformByEmployee = (id)      => api.get(`/assets/uniforms/employee/${id}`)
export const returnUniform        = (id)      => api.patch(`/assets/uniforms/employee/${id}/return`)
export const getAllUniforms       = ()        => api.get('/assets/uniforms')

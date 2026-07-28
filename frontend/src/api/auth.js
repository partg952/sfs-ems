import api from './client'

export const login = (username, password) =>
  api.post('/auth/login', { username, password })

export const getMe = () =>
  api.get('/auth/me')

export const refreshToken = () =>
  api.post('/auth/refresh')

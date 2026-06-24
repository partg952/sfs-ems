import api from './client'

export const createAdvance        = (data)  => api.post('/ledger/advances', data)
export const getAllAdvances        = ()      => api.get('/ledger/advances')
export const getAdvancesByEmployee = (id)   => api.get(`/ledger/advances/employee/${id}`)
export const markAdvanceRecovered  = (id)   => api.patch(`/ledger/advances/${id}/recover`)

export const createFine          = (data)  => api.post('/ledger/fines', data)
export const getAllFines          = ()      => api.get('/ledger/fines')
export const getFinesByEmployee  = (id)    => api.get(`/ledger/fines/employee/${id}`)

export const getAllTransactions  = ()      => api.get('/ledger/transactions')

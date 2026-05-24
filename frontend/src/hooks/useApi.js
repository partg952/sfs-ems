import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'

export function useApi(apiFn, { onSuccess, successMsg } = {}) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const execute = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFn(...args)
      const result = res.data?.data ?? res.data
      setData(result)
      if (successMsg) toast.success(successMsg)
      if (onSuccess) onSuccess(result)
      return result
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Something went wrong'
      setError(msg)
      toast.error(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [apiFn, successMsg, onSuccess])

  return { data, loading, error, execute }
}

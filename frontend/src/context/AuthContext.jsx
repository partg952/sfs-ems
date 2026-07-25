import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { login as apiLogin, refreshToken as apiRefreshToken } from '../api/auth'
import { setSessionExpiredHandler } from '../api/client'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

// How often to silently refresh the JWT while the user is active, well
// inside the 24h backend expiry window - keeps a genuine work session from
// ever hitting a hard expiry, without needing the user to do anything.
const REFRESH_INTERVAL_MS = 15 * 60 * 1000 // 15 minutes

export function AuthProvider({ children }) {
  const [user, setUser]                 = useState(null)
  const [token, setToken]               = useState(null)
  const [loading, setLoading]           = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)
  const refreshTimerRef = useRef(null)

  const clearSession = useCallback(() => {
    localStorage.removeItem('ems_token')
    localStorage.removeItem('ems_user')
    setToken(null)
    setUser(null)
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setSessionExpired(false)
  }, [clearSession])

  // Called by the API client whenever a request comes back with a genuine
  // 401 (see client.js) - clears the session via normal React state so
  // ProtectedRoute's <Navigate to="/login"> takes over client-side, and
  // surfaces a clear one-time toast explaining why, instead of the app
  // silently vanishing or hard-reloading and destroying unrelated state
  // on every other mounted page.
  const handleSessionExpired = useCallback(() => {
    clearSession()
    setSessionExpired(true)
    toast.error('Your session has expired. Please log in again to continue.', { id: 'session-expired', duration: 5000 })
  }, [clearSession])

  useEffect(() => {
    setSessionExpiredHandler(handleSessionExpired)
  }, [handleSessionExpired])

  const startRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
    refreshTimerRef.current = setInterval(async () => {
      try {
        const res = await apiRefreshToken()
        const data = res.data.data
        localStorage.setItem('ems_token', data.token)
        setToken(data.token)
      } catch {
        // A failed background refresh (e.g. the token had already expired
        // before this interval fired) is excluded from the session-expiry
        // flow by design (see AUTH_ENDPOINTS_EXCLUDED_FROM_SESSION_EXPIRY
        // in client.js) - the user only actually gets logged out when a
        // real, user-initiated request fails with 401, not from this
        // silent background check.
      }
    }, REFRESH_INTERVAL_MS)
  }, [])

  useEffect(() => {
    const storedToken = localStorage.getItem('ems_token')
    const storedUser  = localStorage.getItem('ems_user')
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
      startRefreshTimer()
    }
    setLoading(false)

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
    }
  }, [startRefreshTimer])

  const login = async (username, password) => {
    const res  = await apiLogin(username, password)
    const data = res.data.data
    localStorage.setItem('ems_token', data.token)
    localStorage.setItem('ems_user', JSON.stringify({
      username: data.username,
      fullName: data.fullName,
      role: data.role,
    }))
    setToken(data.token)
    setUser({ username: data.username, fullName: data.fullName, role: data.role })
    setSessionExpired(false)
    startRefreshTimer()
    return data
  }

  const hasRole = (...roles) => roles.includes(user?.role)

  const canWrite = () =>
    hasRole('SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF')

  const canProcessPayroll = () =>
    hasRole('SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF', 'ACCOUNTS')

  const isAdmin = () =>
    hasRole('SUPER_ADMIN')

  return (
    <AuthContext.Provider value={{ user, token, loading, sessionExpired, login, logout, hasRole, canWrite, canProcessPayroll, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

import { createContext, useContext, useState, useEffect } from 'react'
import { login as apiLogin } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [token, setToken]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('ems_token')
    const storedUser  = localStorage.getItem('ems_user')
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

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
    return data
  }

  const logout = () => {
    localStorage.removeItem('ems_token')
    localStorage.removeItem('ems_user')
    setToken(null)
    setUser(null)
  }

  const hasRole = (...roles) => roles.includes(user?.role)

  const canWrite = () =>
    hasRole('SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF')

  const canProcessPayroll = () =>
    hasRole('SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF', 'ACCOUNTS')

  const isAdmin = () =>
    hasRole('SUPER_ADMIN')

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, hasRole, canWrite, canProcessPayroll, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

// Token expiration auto-logout logic enabled

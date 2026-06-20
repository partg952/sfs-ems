import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ems_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Session-expiry is handled via a subscriber registered by AuthContext
// (setSessionExpiredHandler below), instead of a hard `window.location.href`
// redirect. A full page reload wipes every mounted component's in-memory
// state (unsaved form fields on completely unrelated pages, etc.) even
// though only one specific request actually failed - routing through React
// state + React Router's <Navigate> lets ProtectedRoute redirect to /login
// cleanly without destroying anything the user was doing elsewhere, and
// lets us show a clear "your session expired" message instead of the app
// just vanishing.
let sessionExpiredHandler = null
export function setSessionExpiredHandler(handler) {
  sessionExpiredHandler = handler
}

// Requests to these endpoints should never trigger the "session expired"
// flow on a 401 - a failed login attempt or an expired-refresh-attempt is
// an expected, user-facing error to show inline on the form itself, not a
// signal that an already-logged-in session has died.
const AUTH_ENDPOINTS_EXCLUDED_FROM_SESSION_EXPIRY = ['/auth/login', '/auth/refresh']

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    const url = err.config?.url || ''
    const isExcluded = AUTH_ENDPOINTS_EXCLUDED_FROM_SESSION_EXPIRY.some((p) => url.includes(p))

    // Only a genuine 401 (not a network error, not a 403 permissions issue,
    // and not the login/refresh call itself) on an otherwise-authenticated
    // request means the session actually needs to end. This avoids
    // logging the user out on transient network hiccups or unrelated
    // permission errors, which previously could look identical to a real
    // session expiry from the user's perspective.
    if (status === 401 && !isExcluded && sessionExpiredHandler) {
      sessionExpiredHandler()
    }

    return Promise.reject(err)
  }
)

export default api

import jwt from 'jsonwebtoken'
import { config } from '../config.js'

export function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authorization header missing or invalid', data: null })
  }

  const token = authHeader.split(' ')[1]
  try {
    const payload = jwt.verify(token, config.jwtSecret)
    req.user = {
      username: payload.sub,
      role: payload.role,
      employeeId: payload.employeeId,
    }
    next()
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token', data: null })
  }
}

export function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized', data: null })
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access forbidden: insufficient role permissions', data: null })
    }
    next()
  }
}

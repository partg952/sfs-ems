import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '../db.js'
import { config } from '../config.js'
import { authenticateJWT, requireRoles } from '../middleware/auth.js'

const router = Router()

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required', data: null })
  }

  try {
    const userRes = await query('SELECT * FROM app_users WHERE username = $1 AND is_active = true', [username])
    if (userRes.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid username or password', data: null })
    }

    const user = userRes.rows[0]
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid username or password', data: null })
    }

    const token = jwt.sign(
      {
        sub: user.username,
        role: user.role,
        employeeId: user.employee_id,
      },
      config.jwtSecret,
      { expiresIn: '24h' }
    )

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        employeeId: user.employee_id,
      },
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ success: false, message: 'Internal server error', data: null })
  }
})

// GET /api/auth/me
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    const userRes = await query('SELECT id, username, full_name, role, employee_id, is_active FROM app_users WHERE username = $1', [req.user.username])
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found', data: null })
    }
    const user = userRes.rows[0]
    res.json({
      success: true,
      message: 'Success',
      data: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        employeeId: user.employee_id,
        isActive: user.is_active,
      },
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

export default router

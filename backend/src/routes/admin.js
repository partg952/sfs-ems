import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { query } from '../db.js'
import { authenticateJWT, requireRoles } from '../middleware/auth.js'

const router = Router()
router.use(authenticateJWT)

// SUPER_ADMIN only
router.use(requireRoles('SUPER_ADMIN'))

// GET /api/admin/slip-template
router.get('/slip-template', async (req, res) => {
  try {
    const result = await query('SELECT * FROM salary_slip_templates ORDER BY id DESC LIMIT 1')
    res.json({ success: true, message: 'Success', data: result.rows[0] || { templateHtml: '' } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// PUT /api/admin/slip-template
router.put('/slip-template', async (req, res) => {
  const { templateHtml } = req.body
  try {
    const result = await query(`
      INSERT INTO salary_slip_templates (template_html, is_active, updated_by, updated_at)
      VALUES ($1, true, $2, NOW()) RETURNING *
    `, [templateHtml, req.user.username])
    res.json({ success: true, message: 'Template updated', data: result.rows[0] })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const result = await query(`
      SELECT u.id, u.username, u.full_name as "fullName", u.role, u.employee_id as "employeeId",
             u.is_active as "isActive", u.created_at as "createdAt", e.name as "employeeName"
      FROM app_users u
      LEFT JOIN employees e ON e.id = u.employee_id
      ORDER BY u.id
    `)
    res.json({ success: true, message: 'Success', data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/admin/users/:id
router.get('/users/:id', async (req, res) => {
  try {
    const result = await query(`
      SELECT id, username, full_name as "fullName", role, employee_id as "employeeId", is_active as "isActive"
      FROM app_users WHERE id = $1
    `, [req.params.id])
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found', data: null })
    res.json({ success: true, message: 'Success', data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// POST /api/admin/users
router.post('/users', async (req, res) => {
  const { username, password, fullName, role, employeeId } = req.body
  try {
    const hash = await bcrypt.hash(password || 'password123', 10)
    const result = await query(`
      INSERT INTO app_users (username, password, full_name, role, employee_id, is_active)
      VALUES ($1, $2, $3, $4, $5, true) RETURNING id, username, full_name as "fullName", role, employee_id as "employeeId", is_active as "isActive"
    `, [username, hash, fullName, role, employeeId || null])
    res.status(201).json({ success: true, message: 'User created', data: result.rows[0] })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message, data: null })
  }
})

// PUT /api/admin/users/:id
router.put('/users/:id', async (req, res) => {
  const { fullName, role, password, employeeId } = req.body
  try {
    let sql = 'UPDATE app_users SET full_name = $1, role = $2, employee_id = $3'
    const params = [fullName, role, employeeId || null]
    if (password) {
      const hash = await bcrypt.hash(password, 10)
      params.push(hash)
      sql += `, password = $${params.length}`
    }
    params.push(req.params.id)
    sql += `, updated_at = NOW() WHERE id = $${params.length} RETURNING id, username, full_name as "fullName", role, is_active as "isActive"`

    const result = await query(sql, params)
    res.json({ success: true, message: 'User updated', data: result.rows[0] })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message, data: null })
  }
})

// PATCH /api/admin/users/:id/toggle
router.patch('/users/:id/toggle', async (req, res) => {
  try {
    const result = await query('UPDATE app_users SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING id, is_active as "isActive"', [req.params.id])
    res.json({ success: true, message: 'User status toggled', data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

export default router

import { Router } from 'express'
import { query } from '../db.js'
import { authenticateJWT, requireRoles } from '../middleware/auth.js'

const router = Router()
router.use(authenticateJWT)

const ALL_PAYROLL_READ = ['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF', 'ACCOUNTS']
const HR_WRITE = ['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF']

// GET /api/overtime
router.get('/', requireRoles(...ALL_PAYROLL_READ), async (req, res) => {
  const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1
  const year = parseInt(req.query.year, 10) || new Date().getFullYear()
  try {
    const result = await query(`
      SELECT o.id, o.employee_id as "employeeId", e.name as "employeeName", e.employee_code as "employeeCode",
             o.month, o.year, o.hours, o.rate, o.amount, o.created_at as "createdAt"
      FROM overtime_records o
      JOIN employees e ON e.id = o.employee_id
      WHERE o.month = $1 AND o.year = $2
      ORDER BY e.name
    `, [month, year])
    res.json({ success: true, message: 'Success', data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/overtime/employee/:employeeId
router.get('/employee/:employeeId', requireRoles(...ALL_PAYROLL_READ), async (req, res) => {
  try {
    const result = await query(`
      SELECT o.id, o.employee_id as "employeeId", o.month, o.year, o.hours, o.rate, o.amount, o.created_at as "createdAt"
      FROM overtime_records o
      WHERE o.employee_id = $1
      ORDER BY o.year DESC, o.month DESC
    `, [req.params.employeeId])
    res.json({ success: true, message: 'Success', data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// POST /api/overtime
router.post('/', requireRoles(...HR_WRITE), async (req, res) => {
  const { employeeId, month, year, hours, rate } = req.body
  const h = parseFloat(hours) || 0
  const r = parseFloat(rate) || 0
  const amt = Math.round(h * r * 100) / 100
  try {
    const result = await query(`
      INSERT INTO overtime_records (employee_id, month, year, hours, rate, amount)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (employee_id, month, year) DO UPDATE SET
        hours = EXCLUDED.hours,
        rate = EXCLUDED.rate,
        amount = EXCLUDED.amount,
        updated_at = NOW()
      RETURNING *
    `, [employeeId, month, year, h, r, amt])
    res.status(201).json({ success: true, message: 'Overtime recorded', data: result.rows[0] })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message, data: null })
  }
})

export default router

// Overtime rate calculation multiplier

// Monthly OT validation threshold

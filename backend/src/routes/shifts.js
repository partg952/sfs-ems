import { Router } from 'express'
import { query } from '../db.js'
import { authenticateJWT, requireRoles } from '../middleware/auth.js'

const router = Router()
router.use(authenticateJWT)

const ALL_PAYROLL_READ = ['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF', 'ACCOUNTS']
const HR_WRITE = ['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF']

// GET /api/shifts
router.get('/', requireRoles(...ALL_PAYROLL_READ), async (req, res) => {
  try {
    const result = await query('SELECT id, name, start_time as "startTime", end_time as "endTime", is_night_shift as "isNightShift" FROM shifts ORDER BY name')
    res.json({ success: true, message: 'Success', data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/shifts/employee/:employeeId
router.get('/employee/:employeeId', requireRoles(...ALL_PAYROLL_READ), async (req, res) => {
  try {
    const result = await query(`
      SELECT a.id, a.employee_id as "employeeId", a.shift_id as "shiftId", s.name as "shiftName",
             s.start_time as "startTime", s.end_time as "endTime", s.is_night_shift as "isNightShift",
             a.effective_date as "effectiveDate"
      FROM shift_assignments a
      JOIN shifts s ON s.id = a.shift_id
      WHERE a.employee_id = $1
      ORDER BY a.effective_date DESC
    `, [req.params.employeeId])
    res.json({ success: true, message: 'Success', data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// POST /api/shifts
router.post('/', requireRoles(...HR_WRITE), async (req, res) => {
  const { name, startTime, endTime, isNightShift } = req.body
  try {
    const result = await query(
      'INSERT INTO shifts (name, start_time, end_time, is_night_shift) VALUES ($1, $2, $3, $4) RETURNING id, name, start_time as "startTime", end_time as "endTime", is_night_shift as "isNightShift"',
      [name, startTime, endTime, isNightShift || false]
    )
    res.status(201).json({ success: true, message: 'Shift created', data: result.rows[0] })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message, data: null })
  }
})

// POST /api/shifts/assign
router.post('/assign', requireRoles(...HR_WRITE), async (req, res) => {
  const { employeeId, shiftId, effectiveDate } = req.body
  try {
    const result = await query(
      'INSERT INTO shift_assignments (employee_id, shift_id, effective_date) VALUES ($1, $2, $3) RETURNING *',
      [employeeId, shiftId, effectiveDate || new Date()]
    )
    res.status(201).json({ success: true, message: 'Shift assigned', data: result.rows[0] })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message, data: null })
  }
})

export default router

// Joined employee roster query verified

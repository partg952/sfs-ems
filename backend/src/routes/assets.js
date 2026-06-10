import { Router } from 'express'
import { query } from '../db.js'
import { authenticateJWT, requireRoles } from '../middleware/auth.js'

const router = Router()
router.use(authenticateJWT)

const HR_WRITE = ['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF']

// POST /api/assets/rooms
router.post('/rooms', requireRoles(...HR_WRITE), async (req, res) => {
  const { employeeId, roomNumber, monthlyRent, allottedDate } = req.body
  try {
    const result = await query(`
      INSERT INTO rooms (employee_id, room_number, monthly_rent, allotted_date)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [employeeId, roomNumber, monthlyRent, allottedDate || new Date()])
    res.status(201).json({ success: true, message: 'Room allotted', data: result.rows[0] })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/assets/rooms
router.get('/rooms', requireRoles(...HR_WRITE), async (req, res) => {
  try {
    const result = await query(`
      SELECT r.*, e.name as employee_name, e.employee_code
      FROM rooms r JOIN employees e ON e.id = r.employee_id
      WHERE r.is_vacated = false
    `)
    res.json({ success: true, message: 'Success', data: result.rows.map(r => ({
      id: r.id,
      employeeId: r.employee_id,
      employeeName: r.employee_name,
      employeeCode: r.employee_code,
      roomNumber: r.room_number,
      monthlyRent: parseFloat(r.monthly_rent),
      allottedDate: r.allotted_date,
      isVacated: r.is_vacated,
      vacatedDate: r.vacated_date,
    })) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/assets/rooms/employee/:employeeId
router.get('/rooms/employee/:employeeId', requireRoles(...HR_WRITE), async (req, res) => {
  try {
    const result = await query('SELECT * FROM rooms WHERE employee_id = $1 AND is_vacated = false', [req.params.employeeId])
    res.json({ success: true, message: 'Success', data: result.rows[0] || null })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// PATCH /api/assets/rooms/employee/:employeeId/vacate
router.patch('/rooms/employee/:employeeId/vacate', requireRoles(...HR_WRITE), async (req, res) => {
  try {
    await query('UPDATE rooms SET is_vacated = true, vacated_date = CURRENT_DATE WHERE employee_id = $1 AND is_vacated = false', [req.params.employeeId])
    res.json({ success: true, message: 'Room vacated', data: null })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// PATCH /api/assets/uniforms/employee/:employeeId
router.patch('/uniforms/employee/:employeeId', requireRoles(...HR_WRITE), async (req, res) => {
  const { shirtSize, pantSize, shoesSize } = req.body
  const empId = req.params.employeeId
  try {
    const result = await query(`
      INSERT INTO uniforms (employee_id, shirt_size, pant_size, shoes_size, allotted_date, is_returned)
      VALUES ($1, $2, $3, $4, CURRENT_DATE, false)
      ON CONFLICT (employee_id) DO UPDATE SET
        shirt_size = EXCLUDED.shirt_size,
        pant_size = EXCLUDED.pant_size,
        shoes_size = EXCLUDED.shoes_size,
        is_returned = false,
        allotted_date = CURRENT_DATE
      RETURNING *
    `, [empId, shirtSize, pantSize, shoesSize])
    res.json({ success: true, message: 'Uniform issued', data: result.rows[0] })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/assets/uniforms/employee/:employeeId
router.get('/uniforms/employee/:employeeId', requireRoles(...HR_WRITE), async (req, res) => {
  try {
    const result = await query('SELECT * FROM uniforms WHERE employee_id = $1', [req.params.employeeId])
    res.json({ success: true, message: 'Success', data: result.rows[0] || null })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/assets/uniforms
router.get('/uniforms', requireRoles(...HR_WRITE), async (req, res) => {
  try {
    const result = await query(`
      SELECT u.*, e.name as employee_name, e.employee_code
      FROM uniforms u JOIN employees e ON e.id = u.employee_id
    `)
    res.json({ success: true, message: 'Success', data: result.rows.map(u => ({
      id: u.id,
      employeeId: u.employee_id,
      employeeName: u.employee_name,
      employeeCode: u.employee_code,
      shirtSize: u.shirt_size,
      pantSize: u.pant_size,
      shoesSize: u.shoes_size,
      allottedDate: u.allotted_date,
      isReturned: u.is_returned,
      returnedDate: u.returned_date,
    })) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// PATCH /api/assets/uniforms/employee/:employeeId/return
router.patch('/uniforms/employee/:employeeId/return', requireRoles(...HR_WRITE), async (req, res) => {
  try {
    await query('UPDATE uniforms SET is_returned = true, returned_date = CURRENT_DATE WHERE employee_id = $1', [req.params.employeeId])
    res.json({ success: true, message: 'Uniform marked returned', data: null })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

export default router

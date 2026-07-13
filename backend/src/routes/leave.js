import { Router } from 'express'
import { query } from '../db.js'
import { authenticateJWT, requireRoles } from '../middleware/auth.js'

const router = Router()
router.use(authenticateJWT)

const HR_WRITE = ['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF']

// GET /api/leave/types
router.get('/types', requireRoles(...HR_WRITE), async (req, res) => {
  try {
    const result = await query('SELECT id, name, annual_quota as "annualQuota", is_paid as "isPaid" FROM leave_types ORDER BY id')
    res.json({ success: true, message: 'Success', data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// POST /api/leave/types
router.post('/types', requireRoles(...HR_WRITE), async (req, res) => {
  const { name, annualQuota, isPaid } = req.body
  try {
    const result = await query(
      'INSERT INTO leave_types (name, annual_quota, is_paid) VALUES ($1, $2, $3) RETURNING id, name, annual_quota as "annualQuota", is_paid as "isPaid"',
      [name, annualQuota || 12, isPaid !== false]
    )
    res.status(201).json({ success: true, message: 'Leave type created', data: result.rows[0] })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/leave/balances/employee/:employeeId
router.get('/balances/employee/:employeeId', requireRoles(...HR_WRITE), async (req, res) => {
  try {
    const result = await query(`
      SELECT b.id, b.employee_id as "employeeId", b.leave_type_id as "leaveTypeId",
             t.name as "leaveTypeName", b.year, b.total_allocated as "totalAllocated",
             b.used, b.remaining
      FROM leave_balances b
      JOIN leave_types t ON t.id = b.leave_type_id
      WHERE b.employee_id = $1
      ORDER BY b.year DESC, t.name
    `, [req.params.employeeId])
    res.json({ success: true, message: 'Success', data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// POST /api/leave/requests
router.post('/requests', requireRoles(...HR_WRITE), async (req, res) => {
  const { employeeId, leaveTypeId, startDate, endDate, days, reason } = req.body
  try {
    const result = await query(`
      INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, days, reason, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'PENDING') RETURNING *
    `, [employeeId, leaveTypeId, startDate, endDate, days || 1, reason])
    res.status(201).json({ success: true, message: 'Leave request created', data: result.rows[0] })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/leave/requests
router.get('/requests', requireRoles(...HR_WRITE), async (req, res) => {
  try {
    const result = await query(`
      SELECT r.id, r.employee_id as "employeeId", e.name as "employeeName", e.employee_code as "employeeCode",
             r.leave_type_id as "leaveTypeId", t.name as "leaveTypeName", r.start_date as "startDate",
             r.end_date as "endDate", r.days, r.reason, r.status, r.action_by as "actionBy",
             r.action_remark as "actionRemark", r.created_at as "createdAt"
      FROM leave_requests r
      JOIN employees e ON e.id = r.employee_id
      JOIN leave_types t ON t.id = r.leave_type_id
      ORDER BY r.created_at DESC
    `)
    res.json({ success: true, message: 'Success', data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// PATCH /api/leave/requests/:id/approve
router.patch('/requests/:id/approve', requireRoles(...HR_WRITE), async (req, res) => {
  try {
    const result = await query(
      `UPDATE leave_requests SET status = 'APPROVED', action_by = $1, action_remark = $2 WHERE id = $3 RETURNING *`,
      [req.user.username, req.body.remark || 'Approved', req.params.id]
    )
    res.json({ success: true, message: 'Leave approved', data: result.rows[0] })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message, data: null })
  }
})

// PATCH /api/leave/requests/:id/reject
router.patch('/requests/:id/reject', requireRoles(...HR_WRITE), async (req, res) => {
  try {
    const result = await query(
      `UPDATE leave_requests SET status = 'REJECTED', action_by = $1, action_remark = $2 WHERE id = $3 RETURNING *`,
      [req.user.username, req.body.remark || 'Rejected', req.params.id]
    )
    res.json({ success: true, message: 'Leave rejected', data: result.rows[0] })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message, data: null })
  }
})

export default router

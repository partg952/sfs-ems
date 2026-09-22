import { Router } from 'express'
import { query, pool } from '../db.js'
import { authenticateJWT, requireRoles } from '../middleware/auth.js'

const router = Router()
router.use(authenticateJWT)

const HR_WRITE = ['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF']

function parseDays(value, startDate, endDate) {
  if (value !== undefined && value !== null && value !== '') {
    const n = Number(value)
    return Number.isFinite(n) && n > 0 ? n : null
  }
  // Fall back to computing inclusive day span from the date range
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diff = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1
  return diff > 0 ? diff : null
}

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
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Leave type name is required', data: null })
  }
  const quota = Number(annualQuota)
  if (annualQuota !== undefined && (!Number.isFinite(quota) || quota < 0)) {
    return res.status(400).json({ success: false, message: 'Annual quota must be a non-negative number', data: null })
  }
  try {
    const result = await query(
      'INSERT INTO leave_types (name, annual_quota, is_paid) VALUES ($1, $2, $3) RETURNING id, name, annual_quota as "annualQuota", is_paid as "isPaid"',
      [name.trim(), Number.isFinite(quota) ? quota : 12, isPaid !== false]
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

  if (!employeeId || !leaveTypeId || !startDate || !endDate) {
    return res.status(400).json({ success: false, message: 'employeeId, leaveTypeId, startDate and endDate are required', data: null })
  }
  if (new Date(endDate) < new Date(startDate)) {
    return res.status(400).json({ success: false, message: 'endDate cannot be before startDate', data: null })
  }
  const numDays = parseDays(days, startDate, endDate)
  if (!numDays) {
    return res.status(400).json({ success: false, message: 'Invalid number of leave days', data: null })
  }

  try {
    const emp = await query('SELECT id FROM employees WHERE id = $1', [employeeId])
    if (emp.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found', data: null })
    }
    const type = await query('SELECT id FROM leave_types WHERE id = $1', [leaveTypeId])
    if (type.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Leave type not found', data: null })
    }

    // Prevent overlapping leave requests (pending or approved) for the same employee
    const overlap = await query(`
      SELECT id FROM leave_requests
      WHERE employee_id = $1 AND status IN ('PENDING', 'APPROVED')
        AND start_date <= $3 AND end_date >= $2
    `, [employeeId, startDate, endDate])
    if (overlap.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Employee already has an overlapping leave request', data: null })
    }

    const result = await query(`
      INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, days, reason, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'PENDING') RETURNING *
    `, [employeeId, leaveTypeId, startDate, endDate, numDays, reason || null])
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
  const id = req.params.id
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const reqRes = await client.query('SELECT * FROM leave_requests WHERE id = $1 FOR UPDATE', [id])
    if (reqRes.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'Leave request not found', data: null })
    }
    const leaveReq = reqRes.rows[0]
    if (leaveReq.status !== 'PENDING') {
      await client.query('ROLLBACK')
      return res.status(409).json({ success: false, message: `Leave request is already ${leaveReq.status.toLowerCase()}`, data: null })
    }

    const year = new Date(leaveReq.start_date).getFullYear()
    const balRes = await client.query(
      'SELECT * FROM leave_balances WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3 FOR UPDATE',
      [leaveReq.employee_id, leaveReq.leave_type_id, year]
    )

    if (balRes.rows.length > 0) {
      const bal = balRes.rows[0]
      const remaining = parseFloat(bal.remaining)
      const days = parseFloat(leaveReq.days)
      if (remaining < days) {
        await client.query('ROLLBACK')
        return res.status(409).json({ success: false, message: `Insufficient leave balance: ${remaining} day(s) remaining, ${days} requested`, data: null })
      }
      await client.query(
        'UPDATE leave_balances SET used = used + $1, remaining = remaining - $1 WHERE id = $2',
        [days, bal.id]
      )
    }
    // If no balance record exists for this employee/type/year, approve without balance tracking
    // (balances are optional bookkeeping; absence of a record should not block HR from approving leave)

    const updated = await client.query(
      `UPDATE leave_requests SET status = 'APPROVED', action_by = $1, action_remark = $2 WHERE id = $3 RETURNING *`,
      [req.user.username, req.body.remark || 'Approved', id]
    )

    await client.query('COMMIT')
    res.json({ success: true, message: 'Leave approved', data: updated.rows[0] })
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(400).json({ success: false, message: err.message, data: null })
  } finally {
    client.release()
  }
})

// PATCH /api/leave/requests/:id/reject
router.patch('/requests/:id/reject', requireRoles(...HR_WRITE), async (req, res) => {
  try {
    const existing = await query('SELECT status FROM leave_requests WHERE id = $1', [req.params.id])
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Leave request not found', data: null })
    }
    if (existing.rows[0].status !== 'PENDING') {
      return res.status(409).json({ success: false, message: `Leave request is already ${existing.rows[0].status.toLowerCase()}`, data: null })
    }
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

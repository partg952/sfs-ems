import { Router } from 'express'
import { query } from '../db.js'
import { authenticateJWT, requireRoles } from '../middleware/auth.js'

const router = Router()
router.use(authenticateJWT)

const HR_WRITE = ['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF']

function formatGrievance(g) {
  return {
    id: g.id,
    employeeId: g.employee_id,
    employeeName: g.employee_name,
    employeeCode: g.employee_code,
    type: g.type,
    description: g.description,
    status: g.status,
    actionTaken: g.action_taken,
    handledBy: g.handled_by,
    raisedBy: g.raised_by,
    createdAt: g.created_at,
    resolvedAt: g.resolved_at,
  }
}

// POST /api/grievances
router.post('/', requireRoles(...HR_WRITE), async (req, res) => {
  const { employeeId, type, description } = req.body
  try {
    const result = await query(`
      INSERT INTO grievances (employee_id, type, description, status, raised_by)
      VALUES ($1, $2, $3, 'OPEN', $4) RETURNING *
    `, [employeeId, type, description, req.user.username])
    res.status(201).json({ success: true, message: 'Grievance recorded', data: result.rows[0] })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/grievances
router.get('/', requireRoles(...HR_WRITE), async (req, res) => {
  const { status, type, employeeId } = req.query
  try {
    let sql = `
      SELECT g.*, e.name as employee_name, e.employee_code
      FROM grievances g
      JOIN employees e ON e.id = g.employee_id
    `
    const params = []
    const conds = []
    if (status) {
      params.push(status)
      conds.push(`g.status = $${params.length}`)
    }
    if (type) {
      params.push(type)
      conds.push(`g.type = $${params.length}`)
    }
    if (employeeId) {
      params.push(employeeId)
      conds.push(`g.employee_id = $${params.length}`)
    }
    if (conds.length > 0) sql += ' WHERE ' + conds.join(' AND ')
    sql += ' ORDER BY g.created_at DESC'

    const result = await query(sql, params)
    res.json({ success: true, message: 'Success', data: result.rows.map(formatGrievance) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/grievances/:id
router.get('/:id', requireRoles(...HR_WRITE), async (req, res) => {
  try {
    const result = await query(`
      SELECT g.*, e.name as employee_name, e.employee_code
      FROM grievances g
      JOIN employees e ON e.id = g.employee_id
      WHERE g.id = $1
    `, [req.params.id])
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Grievance not found', data: null })
    res.json({ success: true, message: 'Success', data: formatGrievance(result.rows[0]) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// PATCH /api/grievances/:id/status
router.patch('/:id/status', requireRoles(...HR_WRITE), async (req, res) => {
  const { status, actionTaken } = req.body
  try {
    let resolvedAt = null
    if (status === 'RESOLVED' || status === 'CLOSED') resolvedAt = new Date()

    const result = await query(`
      UPDATE grievances SET
        status = $1,
        action_taken = $2,
        handled_by = $3,
        resolved_at = $4,
        updated_at = NOW()
      WHERE id = $5 RETURNING *
    `, [status, actionTaken, req.user.username, resolvedAt, req.params.id])

    res.json({ success: true, message: 'Grievance updated', data: result.rows[0] })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message, data: null })
  }
})

export default router

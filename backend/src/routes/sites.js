import { Router } from 'express'
import { query } from '../db.js'
import { authenticateJWT, requireRoles } from '../middleware/auth.js'

const router = Router()
router.use(authenticateJWT)

const ALL_HR = ['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF', 'ACCOUNTS', 'VIEWER']
const HR_WRITE = ['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF']

// GET /api/sites
router.get('/', requireRoles(...ALL_HR), async (req, res) => {
  try {
    const result = await query(`
      SELECT s.*, c.name as client_name 
      FROM sites s JOIN clients c ON c.id = s.client_id 
      ORDER BY s.name
    `)
    res.json({ success: true, message: 'Success', data: result.rows.map(s => ({
      id: s.id,
      clientId: s.client_id,
      clientName: s.client_name,
      name: s.name,
      address: s.address,
      supervisorName: s.supervisor_name,
      supervisorPhone: s.supervisor_phone,
      isActive: s.is_active,
    })) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// PUT /api/sites/:id
router.put('/:id', requireRoles(...HR_WRITE), async (req, res) => {
  const b = req.body
  try {
    const result = await query(`
      UPDATE sites SET
        name = COALESCE($1, name), address = $2, supervisor_name = $3, supervisor_phone = $4, updated_at = NOW()
      WHERE id = $5 RETURNING *
    `, [b.name, b.address, b.supervisorName, b.supervisorPhone, req.params.id])
    res.json({ success: true, message: 'Site updated', data: result.rows[0] })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message, data: null })
  }
})

// PATCH /api/sites/:id/toggle
router.patch('/:id/toggle', requireRoles(...HR_WRITE), async (req, res) => {
  try {
    const result = await query('UPDATE sites SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING *', [req.params.id])
    res.json({ success: true, message: 'Site status toggled', data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

export default router

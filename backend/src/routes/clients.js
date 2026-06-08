import { Router } from 'express'
import { query } from '../db.js'
import { authenticateJWT, requireRoles } from '../middleware/auth.js'

const router = Router()
router.use(authenticateJWT)

const ALL_HR = ['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF', 'ACCOUNTS', 'VIEWER']
const HR_WRITE = ['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF']

// GET /api/clients
router.get('/', requireRoles(...ALL_HR), async (req, res) => {
  try {
    const result = await query('SELECT * FROM clients ORDER BY name')
    res.json({ success: true, message: 'Success', data: result.rows.map(c => ({
      id: c.id,
      name: c.name,
      contactPerson: c.contact_person,
      contactPhone: c.contact_phone,
      contactEmail: c.contact_email,
      address: c.address,
      contractStartDate: c.contract_start_date,
      contractEndDate: c.contract_end_date,
      billingRate: parseFloat(c.billing_rate) || 0,
      isActive: c.is_active,
    })) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/clients/:id
router.get('/:id', requireRoles(...ALL_HR), async (req, res) => {
  try {
    const result = await query('SELECT * FROM clients WHERE id = $1', [req.params.id])
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Client not found', data: null })
    const c = result.rows[0]
    res.json({ success: true, message: 'Success', data: {
      id: c.id, name: c.name, contactPerson: c.contact_person, contactPhone: c.contact_phone,
      contactEmail: c.contact_email, address: c.address, contractStartDate: c.contract_start_date,
      contractEndDate: c.contract_end_date, billingRate: parseFloat(c.billing_rate) || 0, isActive: c.is_active,
    } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/clients/:id/sites
router.get('/:id/sites', requireRoles(...ALL_HR), async (req, res) => {
  try {
    const result = await query('SELECT * FROM sites WHERE client_id = $1 ORDER BY name', [req.params.id])
    res.json({ success: true, message: 'Success', data: result.rows.map(s => ({
      id: s.id, clientId: s.client_id, name: s.name, address: s.address,
      supervisorName: s.supervisor_name, supervisorPhone: s.supervisor_phone, isActive: s.is_active,
    })) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// POST /api/clients
router.post('/', requireRoles(...HR_WRITE), async (req, res) => {
  const b = req.body
  try {
    const result = await query(`
      INSERT INTO clients (name, contact_person, contact_phone, contact_email, address, contract_start_date, contract_end_date, billing_rate, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true) RETURNING *
    `, [b.name, b.contactPerson, b.contactPhone, b.contactEmail, b.address, b.contractStartDate || null, b.contractEndDate || null, b.billingRate || 0])
    res.status(201).json({ success: true, message: 'Client created', data: result.rows[0] })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message, data: null })
  }
})

// PUT /api/clients/:id
router.put('/:id', requireRoles(...HR_WRITE), async (req, res) => {
  const b = req.body
  try {
    const result = await query(`
      UPDATE clients SET
        name = COALESCE($1, name), contact_person = $2, contact_phone = $3, contact_email = $4,
        address = $5, contract_start_date = $6, contract_end_date = $7, billing_rate = $8, updated_at = NOW()
      WHERE id = $9 RETURNING *
    `, [b.name, b.contactPerson, b.contactPhone, b.contactEmail, b.address, b.contractStartDate || null, b.contractEndDate || null, b.billingRate || 0, req.params.id])
    res.json({ success: true, message: 'Client updated', data: result.rows[0] })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message, data: null })
  }
})

// PATCH /api/clients/:id/toggle
router.patch('/:id/toggle', requireRoles(...HR_WRITE), async (req, res) => {
  try {
    const result = await query('UPDATE clients SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING *', [req.params.id])
    res.json({ success: true, message: 'Client status toggled', data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// POST /api/clients/:id/sites
router.post('/:id/sites', requireRoles(...HR_WRITE), async (req, res) => {
  const b = req.body
  try {
    const result = await query(`
      INSERT INTO sites (client_id, name, address, supervisor_name, supervisor_phone, is_active)
      VALUES ($1, $2, $3, $4, $5, true) RETURNING *
    `, [req.params.id, b.name, b.address, b.supervisorName, b.supervisorPhone])
    res.status(201).json({ success: true, message: 'Site created', data: result.rows[0] })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message, data: null })
  }
})

export default router

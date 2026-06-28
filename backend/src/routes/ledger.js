import { Router } from 'express'
import { query } from '../db.js'
import { authenticateJWT, requireRoles } from '../middleware/auth.js'

const router = Router()
router.use(authenticateJWT)

const HR_WRITE = ['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF']

// GET /api/ledger/transactions
router.get('/transactions', requireRoles(...HR_WRITE), async (req, res) => {
  try {
    const adv = await query(`SELECT a.transaction_id as "transactionId", 'ADVANCE' as type, a.employee_id as "employeeId", e.name as "employeeName", e.employee_code as "employeeCode", a.amount, a.advance_date as date, a.remark, a.is_recovered as "isRecovered" FROM advances a JOIN employees e ON e.id = a.employee_id`)
    const fines = await query(`SELECT f.transaction_id as "transactionId", 'FINE' as type, f.employee_id as "employeeId", e.name as "employeeName", e.employee_code as "employeeCode", f.amount, f.fine_date as date, f.reason as remark, true as "isRecovered" FROM fines f JOIN employees e ON e.id = f.employee_id`)
    const pay = await query(`SELECT p.transaction_id as "transactionId", 'SALARY' as type, p.employee_id as "employeeId", e.name as "employeeName", e.employee_code as "employeeCode", p.net_salary as amount, p.created_at as date, p.status as remark, true as "isRecovered" FROM payroll_records p JOIN employees e ON e.id = p.employee_id`)

    const txs = [...adv.rows, ...fines.rows, ...pay.rows].sort((a, b) => new Date(b.date) - new Date(a.date))
    res.json({ success: true, message: 'Success', data: txs })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// POST /api/ledger/advances
router.post('/advances', requireRoles(...HR_WRITE), async (req, res) => {
  const { employeeId, amount, advanceDate, remark } = req.body
  const txId = `ADV-${Date.now()}`
  try {
    const result = await query(`
      INSERT INTO advances (transaction_id, employee_id, amount, advance_date, remark, is_recovered)
      VALUES ($1, $2, $3, $4, $5, false) RETURNING *
    `, [txId, employeeId, amount, advanceDate || new Date(), remark || ''])
    res.status(201).json({ success: true, message: 'Advance created', data: result.rows[0] })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/ledger/advances
router.get('/advances', requireRoles(...HR_WRITE), async (req, res) => {
  try {
    const result = await query(`
      SELECT a.*, e.name as employee_name, e.employee_code
      FROM advances a JOIN employees e ON e.id = a.employee_id
      ORDER BY a.advance_date DESC
    `)
    res.json({ success: true, message: 'Success', data: result.rows.map(r => ({
      id: r.id,
      transactionId: r.transaction_id,
      employeeId: r.employee_id,
      employeeName: r.employee_name,
      employeeCode: r.employee_code,
      amount: parseFloat(r.amount),
      advanceDate: r.advance_date,
      remark: r.remark,
      isRecovered: r.is_recovered,
      createdAt: r.created_at,
    })) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/ledger/advances/employee/:employeeId
router.get('/advances/employee/:employeeId', requireRoles(...HR_WRITE), async (req, res) => {
  try {
    const result = await query(`
      SELECT a.*, e.name as employee_name, e.employee_code
      FROM advances a JOIN employees e ON e.id = a.employee_id
      WHERE a.employee_id = $1
      ORDER BY a.advance_date DESC
    `, [req.params.employeeId])
    res.json({ success: true, message: 'Success', data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// PATCH /api/ledger/advances/:id/recover
router.patch('/advances/:id/recover', requireRoles(...HR_WRITE), async (req, res) => {
  try {
    await query('UPDATE advances SET is_recovered = true WHERE id = $1', [req.params.id])
    res.json({ success: true, message: 'Advance marked as recovered', data: null })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// POST /api/ledger/fines
router.post('/fines', requireRoles(...HR_WRITE), async (req, res) => {
  const { employeeId, amount, fineDate, site, reason } = req.body
  const txId = `FIN-${Date.now()}`
  try {
    const result = await query(`
      INSERT INTO fines (transaction_id, employee_id, amount, fine_date, site, reason)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [txId, employeeId, amount, fineDate || new Date(), site || '', reason])
    res.status(201).json({ success: true, message: 'Fine created', data: result.rows[0] })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/ledger/fines
router.get('/fines', requireRoles(...HR_WRITE), async (req, res) => {
  try {
    const result = await query(`
      SELECT f.*, e.name as employee_name, e.employee_code
      FROM fines f JOIN employees e ON e.id = f.employee_id
      ORDER BY f.fine_date DESC
    `)
    res.json({ success: true, message: 'Success', data: result.rows.map(r => ({
      id: r.id,
      transactionId: r.transaction_id,
      employeeId: r.employee_id,
      employeeName: r.employee_name,
      employeeCode: r.employee_code,
      amount: parseFloat(r.amount),
      fineDate: r.fine_date,
      site: r.site,
      reason: r.reason,
      createdAt: r.created_at,
    })) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/ledger/fines/employee/:employeeId
router.get('/fines/employee/:employeeId', requireRoles(...HR_WRITE), async (req, res) => {
  try {
    const result = await query(`
      SELECT f.*, e.name as employee_name, e.employee_code
      FROM fines f JOIN employees e ON e.id = f.employee_id
      WHERE f.employee_id = $1
      ORDER BY f.fine_date DESC
    `, [req.params.employeeId])
    res.json({ success: true, message: 'Success', data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

export default router

// Validation strictly requiring positive advance and fine amounts

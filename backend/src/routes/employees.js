import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { query } from '../db.js'
import { config } from '../config.js'
import { authenticateJWT, requireRoles } from '../middleware/auth.js'

const router = Router()
router.use(authenticateJWT)

const ALL_HR = ['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF', 'ACCOUNTS', 'VIEWER']
const HR_WRITE = ['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF']

// Setup multer for photo upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(config.uploadDir)) {
      fs.mkdirSync(config.uploadDir, { recursive: true })
    }
    cb(null, config.uploadDir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg'
    cb(null, `emp-${req.params.id}-${Date.now()}${ext}`)
  },
})
const upload = multer({ storage })

function formatEmp(e) {
  return {
    id: e.id,
    employeeCode: e.employee_code,
    name: e.name,
    dateOfBirth: e.date_of_birth,
    mobileNumber: e.mobile_number,
    address: e.address,
    photoUrl: e.photo_url,
    siteId: e.site_id,
    siteName: e.site_name,
    site: e.site_id ? { id: e.site_id, name: e.site_name } : null,
    designation: e.designation,
    dailyWage: parseFloat(e.daily_wage) || 0,
    monthlyWage: parseFloat(e.monthly_wage) || 0,
    status: e.status,
    joiningDate: e.joining_date,
    leavingDate: e.leaving_date,
    esicNumber: e.esic_number,
    epfNumber: e.epf_number,
    createdAt: e.created_at,
    updatedAt: e.updated_at,
  }
}

// GET /api/employees
router.get('/', requireRoles(...ALL_HR), async (req, res) => {
  const { query: q, status } = req.query
  try {
    let sql = `
      SELECT e.*, s.name as site_name 
      FROM employees e 
      LEFT JOIN sites s ON s.id = e.site_id
    `
    const params = []
    const conditions = []

    if (status) {
      params.push(status)
      conditions.push(`e.status = $${params.length}`)
    }
    if (q) {
      params.push(`%${q}%`)
      conditions.push(`(e.name ILIKE $${params.length} OR e.employee_code ILIKE $${params.length} OR e.designation ILIKE $${params.length} OR s.name ILIKE $${params.length})`)
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ')
    }
    sql += ` ORDER BY e.id`

    const result = await query(sql, params)
    res.json({ success: true, message: 'Success', data: result.rows.map(formatEmp) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/employees/code/:code
router.get('/code/:code', requireRoles(...ALL_HR), async (req, res) => {
  try {
    const result = await query(
      `SELECT e.*, s.name as site_name FROM employees e LEFT JOIN sites s ON s.id = e.site_id WHERE e.employee_code = $1`,
      [req.params.code]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found', data: null })
    }
    res.json({ success: true, message: 'Success', data: formatEmp(result.rows[0]) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/employees/:id
router.get('/:id', requireRoles(...ALL_HR), async (req, res) => {
  try {
    const result = await query(
      `SELECT e.*, s.name as site_name FROM employees e LEFT JOIN sites s ON s.id = e.site_id WHERE e.id = $1`,
      [req.params.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found', data: null })
    }
    res.json({ success: true, message: 'Success', data: formatEmp(result.rows[0]) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/employees/:id/status-history
router.get('/:id/status-history', requireRoles(...ALL_HR), async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM status_history WHERE employee_id = $1 ORDER BY changed_at DESC`,
      [req.params.id]
    )
    res.json({ success: true, message: 'Success', data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/employees/:id/employment-history
router.get('/:id/employment-history', requireRoles(...ALL_HR), async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM employment_history WHERE employee_id = $1 ORDER BY changed_at DESC`,
      [req.params.id]
    )
    res.json({ success: true, message: 'Success', data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/employees/:id/transactions
router.get('/:id/transactions', requireRoles(...ALL_HR), async (req, res) => {
  try {
    const id = req.params.id
    const adv = await query(`SELECT transaction_id as "transactionId", 'ADVANCE' as type, amount, advance_date as date, remark, is_recovered as "isRecovered" FROM advances WHERE employee_id = $1`, [id])
    const fines = await query(`SELECT transaction_id as "transactionId", 'FINE' as type, amount, fine_date as date, reason as remark, true as "isRecovered" FROM fines WHERE employee_id = $1`, [id])
    const pay = await query(`SELECT transaction_id as "transactionId", 'SALARY' as type, net_salary as amount, created_at as date, status as remark, true as "isRecovered" FROM payroll_records WHERE employee_id = $1`, [id])

    const txs = [...adv.rows, ...fines.rows, ...pay.rows].sort((a, b) => new Date(b.date) - new Date(a.date))
    res.json({ success: true, message: 'Success', data: txs })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// POST /api/employees
router.post('/', requireRoles(...HR_WRITE), async (req, res) => {
  const b = req.body
  try {
    // Generate employee code if not supplied
    let code = b.employeeCode
    if (!code) {
      const countRes = await query('SELECT count(*) FROM employees')
      const nextNum = parseInt(countRes.rows[0].count, 10) + 101
      code = `SFS-${nextNum}`
    }

    const result = await query(`
      INSERT INTO employees (
        employee_code, name, date_of_birth, mobile_number, address,
        site_id, designation, daily_wage, monthly_wage, status,
        joining_date, esic_number, epf_number
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      code, b.name, b.dateOfBirth || null, b.mobileNumber || null, b.address || null,
      b.siteId || null, b.designation, b.dailyWage || 0, b.monthlyWage || 0, b.status || 'ACTIVE',
      b.joiningDate || new Date(), b.esicNumber || null, b.epfNumber || null
    ])

    res.status(201).json({ success: true, message: 'Employee created successfully', data: formatEmp(result.rows[0]) })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message, data: null })
  }
})

// PUT /api/employees/:id
router.put('/:id', requireRoles(...HR_WRITE), async (req, res) => {
  const id = req.params.id
  const b = req.body
  try {
    const oldRes = await query('SELECT * FROM employees WHERE id = $1', [id])
    if (oldRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found', data: null })
    }
    const old = oldRes.rows[0]

    // Track employment history if site/designation/wage changes
    if (
      (b.siteId && b.siteId !== old.site_id) ||
      (b.designation && b.designation !== old.designation) ||
      (b.dailyWage && parseFloat(b.dailyWage) !== parseFloat(old.daily_wage)) ||
      (b.monthlyWage && parseFloat(b.monthlyWage) !== parseFloat(old.monthly_wage))
    ) {
      await query(`
        INSERT INTO employment_history (
          employee_id, old_site_id, new_site_id, old_designation, new_designation,
          old_daily_wage, new_daily_wage, old_monthly_wage, new_monthly_wage, changed_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        id, old.site_id, b.siteId || old.site_id, old.designation, b.designation || old.designation,
        old.daily_wage, b.dailyWage || old.daily_wage, old.monthly_wage, b.monthlyWage || old.monthly_wage,
        req.user.username
      ])
    }

    const updated = await query(`
      UPDATE employees SET
        name = COALESCE($1, name),
        date_of_birth = $2,
        mobile_number = COALESCE($3, mobile_number),
        address = COALESCE($4, address),
        site_id = $5,
        designation = COALESCE($6, designation),
        daily_wage = COALESCE($7, daily_wage),
        monthly_wage = COALESCE($8, monthly_wage),
        joining_date = $9,
        esic_number = COALESCE($10, esic_number),
        epf_number = COALESCE($11, epf_number),
        updated_at = NOW()
      WHERE id = $12
      RETURNING *
    `, [
      b.name, b.dateOfBirth || null, b.mobileNumber, b.address, b.siteId || null,
      b.designation, b.dailyWage, b.monthlyWage, b.joiningDate || null,
      b.esicNumber, b.epfNumber, id
    ])

    res.json({ success: true, message: 'Employee updated successfully', data: formatEmp(updated.rows[0]) })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message, data: null })
  }
})

// POST /api/employees/:id/photo
router.post('/:id/photo', requireRoles(...HR_WRITE), upload.single('photo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No photo file provided', data: null })
  }
  const photoUrl = `/uploads/${req.file.filename}`
  try {
    await query('UPDATE employees SET photo_url = $1, updated_at = NOW() WHERE id = $2', [photoUrl, req.params.id])
    res.json({ success: true, message: 'Photo uploaded successfully', data: { photoUrl } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// PATCH /api/employees/:id/status
router.patch('/:id/status', requireRoles(...HR_WRITE), async (req, res) => {
  const { status, remark } = req.body
  const id = req.params.id
  try {
    const cur = await query('SELECT status FROM employees WHERE id = $1', [id])
    if (cur.rows.length === 0) return res.status(404).json({ success: false, message: 'Employee not found', data: null })

    const oldStatus = cur.rows[0].status
    let leavingDate = null
    if (status === 'LEFT') leavingDate = new Date()

    await query('UPDATE employees SET status = $1, leaving_date = $2, updated_at = NOW() WHERE id = $3', [status, leavingDate, id])
    await query(`
      INSERT INTO status_history (employee_id, old_status, new_status, remark, changed_by)
      VALUES ($1, $2, $3, $4, $5)
    `, [id, oldStatus, status, remark || '', req.user.username])

    res.json({ success: true, message: 'Status updated', data: { id, status } })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message, data: null })
  }
})

export default router

// Wage and designation revision audit logging

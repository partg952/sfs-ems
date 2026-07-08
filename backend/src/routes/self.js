import { Router } from 'express'
import { query } from '../db.js'
import { authenticateJWT, requireRoles } from '../middleware/auth.js'

const router = Router()
router.use(authenticateJWT)
router.use(requireRoles('EMPLOYEE'))

// Helper to get logged-in employee ID
async function getSelfEmployeeId(req) {
  if (req.user.employeeId) return req.user.employeeId
  const u = await query('SELECT employee_id FROM app_users WHERE username = $1', [req.user.username])
  return u.rows[0]?.employee_id
}

// GET /api/self/profile
router.get('/profile', async (req, res) => {
  try {
    const empId = await getSelfEmployeeId(req)
    if (!empId) return res.status(404).json({ success: false, message: 'Employee profile not linked', data: null })

    const result = await query(`
      SELECT e.*, s.name as site_name, c.name as client_name
      FROM employees e
      LEFT JOIN sites s ON s.id = e.site_id
      LEFT JOIN clients c ON c.id = s.client_id
      WHERE e.id = $1
    `, [empId])
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Employee not found', data: null })

    const e = result.rows[0]
    res.json({
      success: true,
      message: 'Success',
      data: {
        id: e.id,
        employeeCode: e.employee_code,
        name: e.name,
        designation: e.designation,
        mobileNumber: e.mobile_number,
        address: e.address,
        siteName: e.site_name,
        clientName: e.client_name,
        joiningDate: e.joining_date,
        esicNumber: e.esic_number,
        epfNumber: e.epf_number,
        status: e.status,
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/self/payslips
router.get('/payslips', async (req, res) => {
  try {
    const empId = await getSelfEmployeeId(req)
    const result = await query(`
      SELECT * FROM payroll_records WHERE employee_id = $1 ORDER BY payroll_year DESC, payroll_month DESC
    `, [empId])
    res.json({
      success: true,
      message: 'Success',
      data: result.rows.map(r => ({
        id: r.id,
        transactionId: r.transaction_id,
        payrollMonth: r.payroll_month,
        payrollYear: r.payroll_year,
        attendanceDays: r.attendance_days,
        grossSalary: parseFloat(r.gross_salary),
        netSalary: parseFloat(r.net_salary),
        totalDeductions: parseFloat(r.total_deductions),
        status: r.status,
      }))
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/self/payslips/slip?month=&year=
router.get('/payslips/slip', async (req, res) => {
  const { month, year } = req.query
  try {
    const empId = await getSelfEmployeeId(req)
    const pRes = await query(`
      SELECT p.*, e.name as employee_name, e.employee_code, e.designation, e.esic_number, e.epf_number, s.name as site_name
      FROM payroll_records p
      JOIN employees e ON e.id = p.employee_id
      LEFT JOIN sites s ON s.id = e.site_id
      WHERE p.employee_id = $1 AND p.payroll_month = $2 AND p.payroll_year = $3
    `, [empId, month, year])

    if (pRes.rows.length === 0) return res.status(404).send('<h2>Salary slip not found</h2>')
    const p = pRes.rows[0]

    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>My Payslip</title><style>body { font-family: sans-serif; padding: 30px; } table { width:100%; border-collapse: collapse; } th,td { border: 1px solid #ccc; padding: 8px; }</style></head>
      <body>
        <h2>Shreeji Facility Services - Payslip (${month}/${year})</h2>
        <p><strong>Name:</strong> ${p.employee_name} (${p.employee_code}) &nbsp;|&nbsp; <strong>Designation:</strong> ${p.designation}</p>
        <table>
          <tr><th>Gross Salary</th><td>₹ ${parseFloat(p.gross_salary).toFixed(2)}</td></tr>
          <tr><th>Total Deductions</th><td>₹ ${parseFloat(p.total_deductions).toFixed(2)}</td></tr>
          <tr style="font-weight:bold; background:#eef;"><th>Net Salary Payable</th><td>₹ ${parseFloat(p.net_salary).toFixed(2)}</td></tr>
        </table>
      </body>
      </html>
    `
    res.setHeader('Content-Type', 'text/html')
    res.send(html)
  } catch (err) {
    res.status(500).send(err.message)
  }
})

// GET /api/self/attendance
router.get('/attendance', async (req, res) => {
  try {
    const empId = await getSelfEmployeeId(req)
    const result = await query(`
      SELECT payroll_month as month, payroll_year as year, attendance_days as days, total_working_days as "totalDays"
      FROM payroll_records WHERE employee_id = $1 ORDER BY payroll_year DESC, payroll_month DESC
    `, [empId])
    res.json({ success: true, message: 'Success', data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/self/leave/types
router.get('/leave/types', async (req, res) => {
  try {
    const result = await query('SELECT id, name, annual_quota as "annualQuota", is_paid as "isPaid" FROM leave_types')
    res.json({ success: true, message: 'Success', data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/self/leave/balances
router.get('/leave/balances', async (req, res) => {
  try {
    const empId = await getSelfEmployeeId(req)
    const result = await query(`
      SELECT b.*, t.name as "leaveTypeName"
      FROM leave_balances b JOIN leave_types t ON t.id = b.leave_type_id
      WHERE b.employee_id = $1
    `, [empId])
    res.json({ success: true, message: 'Success', data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// POST /api/self/leave/requests
router.post('/leave/requests', async (req, res) => {
  const { leaveTypeId, startDate, endDate, days, reason } = req.body
  try {
    const empId = await getSelfEmployeeId(req)
    const result = await query(`
      INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, days, reason, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'PENDING') RETURNING *
    `, [empId, leaveTypeId, startDate, endDate, days || 1, reason])
    res.status(201).json({ success: true, message: 'Leave applied', data: result.rows[0] })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/self/leave/requests
router.get('/leave/requests', async (req, res) => {
  try {
    const empId = await getSelfEmployeeId(req)
    const result = await query(`
      SELECT r.*, t.name as "leaveTypeName"
      FROM leave_requests r JOIN leave_types t ON t.id = r.leave_type_id
      WHERE r.employee_id = $1 ORDER BY r.created_at DESC
    `, [empId])
    res.json({ success: true, message: 'Success', data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// POST /api/self/grievances
router.post('/grievances', async (req, res) => {
  const { type, description } = req.body
  try {
    const empId = await getSelfEmployeeId(req)
    const result = await query(`
      INSERT INTO grievances (employee_id, type, description, status, raised_by)
      VALUES ($1, $2, $3, 'OPEN', $4) RETURNING *
    `, [empId, type || 'EMPLOYEE_GRIEVANCE', description, req.user.username])
    res.status(201).json({ success: true, message: 'Grievance submitted', data: result.rows[0] })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/self/grievances
router.get('/grievances', async (req, res) => {
  try {
    const empId = await getSelfEmployeeId(req)
    const result = await query('SELECT * FROM grievances WHERE employee_id = $1 ORDER BY created_at DESC', [empId])
    res.json({ success: true, message: 'Success', data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

export default router

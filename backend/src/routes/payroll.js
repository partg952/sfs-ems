import { Router } from 'express'
import { query } from '../db.js'
import { authenticateJWT, requireRoles } from '../middleware/auth.js'

const router = Router()
router.use(authenticateJWT)

const ALL_PAYROLL_READ = ['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF', 'ACCOUNTS']
const HR_WRITE = ['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF']

function formatPayroll(r) {
  return {
    id: r.id,
    transactionId: r.transaction_id,
    employeeId: r.employee_id,
    employeeName: r.employee_name,
    employeeCode: r.employee_code,
    designation: r.designation,
    siteName: r.site_name,
    payrollMonth: r.payroll_month,
    payrollYear: r.payroll_year,
    attendanceDays: r.attendance_days,
    totalWorkingDays: r.total_working_days || 26,
    grossSalary: parseFloat(r.gross_salary) || 0,
    overtimeEarning: parseFloat(r.overtime_earning) || 0,
    esicDeduction: parseFloat(r.esic_deduction) || 0,
    epfDeduction: parseFloat(r.epf_deduction) || 0,
    advanceDeduction: parseFloat(r.advance_deduction) || 0,
    fineDeduction: parseFloat(r.fine_deduction) || 0,
    rentDeduction: parseFloat(r.rent_deduction) || 0,
    totalDeductions: parseFloat(r.total_deductions) || 0,
    netSalary: parseFloat(r.net_salary) || 0,
    status: r.status,
    processedBy: r.processed_by,
    createdAt: r.created_at,
  }
}

// GET /api/payroll?month=&year=
router.get('/', requireRoles(...ALL_PAYROLL_READ), async (req, res) => {
  const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1
  const year = parseInt(req.query.year, 10) || new Date().getFullYear()

  try {
    const result = await query(`
      SELECT p.*, e.name as employee_name, e.employee_code, e.designation, s.name as site_name
      FROM payroll_records p
      JOIN employees e ON e.id = p.employee_id
      LEFT JOIN sites s ON s.id = e.site_id
      WHERE p.payroll_month = $1 AND p.payroll_year = $2
      ORDER BY e.name
    `, [month, year])
    res.json({ success: true, message: 'Success', data: result.rows.map(formatPayroll) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/payroll/employee/:employeeId
router.get('/employee/:employeeId', requireRoles(...ALL_PAYROLL_READ), async (req, res) => {
  try {
    const result = await query(`
      SELECT p.*, e.name as employee_name, e.employee_code, e.designation, s.name as site_name
      FROM payroll_records p
      JOIN employees e ON e.id = p.employee_id
      LEFT JOIN sites s ON s.id = e.site_id
      WHERE p.employee_id = $1
      ORDER BY p.payroll_year DESC, p.payroll_month DESC
    `, [req.params.employeeId])
    res.json({ success: true, message: 'Success', data: result.rows.map(formatPayroll) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/payroll/slip?employeeId=&month=&year=
router.get('/slip', requireRoles(...ALL_PAYROLL_READ), async (req, res) => {
  const { employeeId, month, year } = req.query
  try {
    const result = await query(`
      SELECT p.*, e.name as employee_name, e.employee_code, e.designation, e.joining_date,
             e.esic_number, e.epf_number, s.name as site_name, c.name as client_name
      FROM payroll_records p
      JOIN employees e ON e.id = p.employee_id
      LEFT JOIN sites s ON s.id = e.site_id
      LEFT JOIN clients c ON c.id = s.client_id
      WHERE p.employee_id = $1 AND p.payroll_month = $2 AND p.payroll_year = $3
    `, [employeeId, month, year])

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Salary slip not found for selected period', data: null })
    }
    res.json({ success: true, message: 'Success', data: formatPayroll(result.rows[0]) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/payroll/slip/html?employeeId=&month=&year=
router.get('/slip/html', requireRoles(...ALL_PAYROLL_READ), async (req, res) => {
  const { employeeId, month, year } = req.query
  try {
    const pRes = await query(`
      SELECT p.*, e.name as employee_name, e.employee_code, e.designation, e.esic_number, e.epf_number, s.name as site_name
      FROM payroll_records p
      JOIN employees e ON e.id = p.employee_id
      LEFT JOIN sites s ON s.id = e.site_id
      WHERE p.employee_id = $1 AND p.payroll_month = $2 AND p.payroll_year = $3
    `, [employeeId, month, year])

    if (pRes.rows.length === 0) {
      return res.status(404).send('<h2>Salary slip not found</h2>')
    }
    const p = pRes.rows[0]
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Salary Slip - ${p.employee_name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          .slip-box { border: 2px solid #333; padding: 25px; max-width: 700px; margin: auto; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .title { font-size: 22px; font-weight: bold; }
          .sub { font-size: 14px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; }
          th { background-color: #f2f2f2; }
          .total { font-weight: bold; background-color: #f9f9f9; }
        </style>
      </head>
      <body>
        <div class="slip-box">
          <div class="header">
            <div class="title">SHREEJI FACILITY SERVICES</div>
            <div class="sub">PAYSLIP FOR MONTH: ${month} / ${year}</div>
          </div>
          <p><strong>Employee:</strong> ${p.employee_name} (${p.employee_code}) &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Designation:</strong> ${p.designation}</p>
          <p><strong>Site:</strong> ${p.site_name || 'General Pool'} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Attendance Days:</strong> ${p.attendance_days} / ${p.total_working_days || 26}</p>
          <p><strong>ESIC No:</strong> ${p.esic_number || 'N/A'} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>EPF No:</strong> ${p.epf_number || 'N/A'}</p>
          
          <table>
            <tr><th>Earnings</th><th>Amount (₹)</th><th>Deductions</th><th>Amount (₹)</th></tr>
            <tr><td>Gross Salary</td><td>${parseFloat(p.gross_salary).toFixed(2)}</td><td>ESIC (0.75%)</td><td>${parseFloat(p.esic_deduction).toFixed(2)}</td></tr>
            <tr><td>Overtime Pay</td><td>${parseFloat(p.overtime_earning).toFixed(2)}</td><td>EPF (12%)</td><td>${parseFloat(p.epf_deduction).toFixed(2)}</td></tr>
            <tr><td></td><td></td><td>Advance Loan</td><td>${parseFloat(p.advance_deduction).toFixed(2)}</td></tr>
            <tr><td></td><td></td><td>Fines</td><td>${parseFloat(p.fine_deduction).toFixed(2)}</td></tr>
            <tr><td></td><td></td><td>Room Rent</td><td>${parseFloat(p.rent_deduction).toFixed(2)}</td></tr>
            <tr class="total">
              <td>Total Earnings</td><td>${(parseFloat(p.gross_salary) + parseFloat(p.overtime_earning)).toFixed(2)}</td>
              <td>Total Deductions</td><td>${parseFloat(p.total_deductions).toFixed(2)}</td>
            </tr>
          </table>

          <div style="margin-top: 25px; padding: 15px; background: #eef2ff; border: 1px solid #c7d2fe; text-align: right; font-size: 18px; font-weight: bold;">
            NET SALARY PAYABLE: ₹ ${parseFloat(p.net_salary).toFixed(2)}
          </div>
        </div>
      </body>
      </html>
    `
    res.setHeader('Content-Type', 'text/html')
    res.send(html)
  } catch (err) {
    res.status(500).send(err.message)
  }
})

// POST /api/payroll/attendance
router.post('/attendance', requireRoles(...HR_WRITE), async (req, res) => {
  const { entries, month, year } = req.body
  if (!entries || !Array.isArray(entries)) {
    return res.status(400).json({ success: false, message: 'Invalid entries list', data: null })
  }

  try {
    for (const e of entries) {
      const txId = `PAY-${year}-${month}-${e.employeeId}`
      const empRes = await query('SELECT daily_wage, monthly_wage FROM employees WHERE id = $1', [e.employeeId])
      if (empRes.rows.length === 0) continue

      const daily = parseFloat(empRes.rows[0].daily_wage) || 0
      const gross = daily * parseInt(e.days, 10)

      await query(`
        INSERT INTO payroll_records (
          transaction_id, employee_id, payroll_month, payroll_year,
          attendance_days, total_working_days, gross_salary, net_salary, status, processed_by
        ) VALUES ($1, $2, $3, $4, $5, 26, $6, $6, 'DRAFT', $7)
        ON CONFLICT (employee_id, payroll_month, payroll_year) DO UPDATE SET
          attendance_days = EXCLUDED.attendance_days,
          gross_salary = EXCLUDED.gross_salary,
          net_salary = EXCLUDED.gross_salary,
          updated_at = NOW();
      `, [txId, e.employeeId, month, year, e.days, gross, req.user.username])
    }
    res.json({ success: true, message: 'Attendance saved successfully', data: null })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message, data: null })
  }
})

// POST /api/payroll/process
router.post('/process', requireRoles(...HR_WRITE), async (req, res) => {
  const { month, year } = req.body
  try {
    const drafts = await query(
      `SELECT p.*, e.daily_wage, e.monthly_wage FROM payroll_records p JOIN employees e ON e.id = p.employee_id WHERE p.payroll_month = $1 AND p.payroll_year = $2`,
      [month, year]
    )

    for (const p of drafts.rows) {
      const gross = parseFloat(p.gross_salary) || 0

      // Overtime
      const otRes = await query('SELECT amount FROM overtime_records WHERE employee_id = $1 AND month = $2 AND year = $3', [p.employee_id, month, year])
      const otPay = otRes.rows.length > 0 ? parseFloat(otRes.rows[0].amount) : 0
      const totalGross = gross + otPay

      // Statutory ESIC (0.75% if gross <= 21,000)
      let esic = 0
      if (totalGross <= 21000) {
        esic = Math.round(totalGross * 0.0075 * 100) / 100
      }

      // Statutory EPF (12% of basic wage, capped)
      const epf = Math.round(Math.min(totalGross, 15000) * 0.12 * 100) / 100

      // Advances pending
      const advRes = await query('SELECT COALESCE(SUM(amount), 0) as total FROM advances WHERE employee_id = $1 AND is_recovered = false', [p.employee_id])
      const adv = parseFloat(advRes.rows[0].total) || 0

      // Fines for current month
      const fineRes = await query('SELECT COALESCE(SUM(amount), 0) as total FROM fines WHERE employee_id = $1 AND EXTRACT(MONTH FROM fine_date) = $2 AND EXTRACT(YEAR FROM fine_date) = $3', [p.employee_id, month, year])
      const fine = parseFloat(fineRes.rows[0].total) || 0

      // Rent
      const roomRes = await query('SELECT monthly_rent FROM rooms WHERE employee_id = $1 AND is_vacated = false LIMIT 1', [p.employee_id])
      const rent = roomRes.rows.length > 0 ? parseFloat(roomRes.rows[0].monthly_rent) : 0

      const totalDeductions = esic + epf + adv + fine + rent
      const net = Math.max(0, totalGross - totalDeductions)

      await query(`
        UPDATE payroll_records SET
          overtime_earning = $1,
          esic_deduction = $2,
          epf_deduction = $3,
          advance_deduction = $4,
          fine_deduction = $5,
          rent_deduction = $6,
          total_deductions = $7,
          net_salary = $8,
          status = 'PROCESSED',
          processed_by = $9,
          updated_at = NOW()
        WHERE id = $10
      `, [otPay, esic, epf, adv, fine, rent, totalDeductions, net, req.user.username, p.id])

      // Mark advances recovered if deducted
      if (adv > 0) {
        await query('UPDATE advances SET is_recovered = true WHERE employee_id = $1 AND is_recovered = false', [p.employee_id])
      }
    }

    res.json({ success: true, message: `Payroll processed successfully for ${month}/${year}`, data: null })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

export default router

import { query } from '../../db.js'

export const lookupEmployeeDeclaration = {
  name: 'lookup_employee',
  description: 'Retrieves complete 360-degree worker profile by name or employee code, including base salary, attendance rate, overtime hours, unrecovered advance debt, open grievances, and attrition risk score from live PostgreSQL database.',
  parameters: {
    type: 'OBJECT',
    properties: {
      query: {
        type: 'STRING',
        description: 'Employee name or unique badge/company code (e.g., Paresh, Ramesh, SFS-0103)',
      },
    },
    required: ['query'],
  },
}

export async function lookupEmployee({ query: searchTerm }) {
  if (!searchTerm) {
    return { error: 'Search term (name or employee code) is required.' }
  }

  const cleanTerm = searchTerm.trim().toLowerCase()
  const empRes = await query(`
    SELECT e.*, s.name as site_name, c.name as client_name 
    FROM employees e 
    LEFT JOIN sites s ON s.id = e.site_id 
    LEFT JOIN clients c ON c.id = s.client_id 
    WHERE LOWER(e.name) LIKE $1 OR LOWER(e.employee_code) LIKE $1
    LIMIT 1
  `, [`%${cleanTerm}%`])

  if (empRes.rows.length === 0) {
    return { found: false, message: `No active employee found matching '${searchTerm}'.` }
  }

  const emp = empRes.rows[0]

  // Latest payroll & attendance
  const payRes = await query(
    'SELECT * FROM payroll_records WHERE employee_id = $1 ORDER BY payroll_year DESC, payroll_month DESC LIMIT 1',
    [emp.id]
  )
  let attendanceRate = 92.0
  let monthlyWage = parseFloat(emp.monthly_wage) || (parseFloat(emp.daily_wage) * 26) || 15000
  let totalWorkingDays = 26
  let attendanceDays = 24
  if (payRes.rows.length > 0) {
    const p = payRes.rows[0]
    totalWorkingDays = p.total_working_days || 26
    attendanceDays = p.attendance_days || 24
    monthlyWage = parseFloat(p.gross_earnings || emp.monthly_wage || 15000)
    attendanceRate = Math.min(100.0, (attendanceDays / totalWorkingDays) * 100.0)
  }

  // Overtime records
  const otRes = await query(
    'SELECT COALESCE(SUM(hours), 0) as total_ot FROM overtime_records WHERE employee_id = $1',
    [emp.id]
  )
  const otHours = parseFloat(otRes.rows[0]?.total_ot) || 0

  // Advances & debt
  const advRes = await query(
    'SELECT COALESCE(SUM(amount), 0) as unrecovered FROM advances WHERE employee_id = $1 AND is_recovered = false',
    [emp.id]
  )
  const advanceBalance = parseFloat(advRes.rows[0]?.unrecovered) || 0
  const debtRatio = monthlyWage > 0 ? advanceBalance / monthlyWage : 0

  // Grievances
  const grievRes = await query(
    'SELECT * FROM grievances WHERE employee_id = $1 AND status IN (\'OPEN\', \'IN_REVIEW\', \'INVESTIGATING\') ORDER BY created_at DESC',
    [emp.id]
  )
  const openGrievances = grievRes.rows

  // Tenure
  const joinDate = new Date(emp.joining_date || Date.now())
  const tenureMonths = Math.max(1, Math.floor((Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30.4)))

  // Calculate 5-Factor Risk Profile
  let f1 = 5.0
  if (attendanceRate >= 90) f1 = 5.0
  else if (attendanceRate >= 75) f1 = (90.0 - attendanceRate) * 2.5
  else if (attendanceRate >= 50) f1 = 37.5 + (75.0 - attendanceRate) * 1.8
  else f1 = 95.0

  const f2 = Math.min(100.0, (otHours / 45.0) * 100.0)
  const f3 = Math.min(100.0, (debtRatio / 0.35) * 100.0)
  const f4 = Math.min(100.0, openGrievances.length * 40.0)
  let f5 = 15.0
  if (tenureMonths < 3) f5 = 75.0
  else if (tenureMonths < 6) f5 = 45.0

  let composite = (0.28 * f1) + (0.24 * f2) + (0.22 * f3) + (0.16 * f4) + (0.10 * f5)
  composite = Math.min(100.0, Math.max(0.0, Math.round(composite * 10) / 10))

  let riskLevel = 'LOW'
  if (composite >= 75) riskLevel = 'CRITICAL'
  else if (composite >= 55) riskLevel = 'HIGH'
  else if (composite >= 35) riskLevel = 'MODERATE'

  const primaryDrivers = []
  if (f2 >= 60) primaryDrivers.push(`High Overtime Fatigue (${otHours.toFixed(1)}h)`)
  if (f1 >= 50) primaryDrivers.push(`Low Attendance Reliability (${attendanceRate.toFixed(0)}%)`)
  if (f3 >= 50) primaryDrivers.push(`Heavy Debt Burden (${(debtRatio * 100).toFixed(0)}% of monthly wage)`)
  if (f4 >= 40) primaryDrivers.push(`${openGrievances.length} Active Workplace Grievances`)
  if (f5 >= 60) primaryDrivers.push('New Hire Probation Phase (<3 months)')

  return {
    found: true,
    employeeId: emp.id,
    employeeCode: emp.employee_code,
    name: emp.name,
    designation: emp.designation,
    siteName: emp.site_name || 'Unassigned Floating Pool',
    clientName: emp.client_name || 'Direct Client',
    baseSalary: monthlyWage,
    attendanceDays,
    totalWorkingDays,
    attendanceRate: Math.round(attendanceRate * 10) / 10,
    monthlyOvertimeHours: otHours,
    outstandingAdvanceDebt: advanceBalance,
    debtToWageRatioPercent: Math.round(debtRatio * 100),
    openGrievanceCount: openGrievances.length,
    openGrievances: openGrievances.map(g => ({ id: g.id, type: g.type, description: g.description, status: g.status })),
    tenureMonths,
    turnoverRiskScore: composite,
    turnoverRiskLevel: riskLevel,
    primaryDrivers: primaryDrivers.length > 0 ? primaryDrivers : ['Metrics within normal threshold'],
  }
}

import { query } from '../../db.js'

export const getWorkforceSummaryDeclaration = {
  name: 'get_workforce_summary',
  description: 'Aggregates company-wide headcount, average attrition risk score, count of critical/high risk workers, client deployment status, and active operational anomalies across all sites.',
  parameters: {
    type: 'OBJECT',
    properties: {},
  },
}

export async function getWorkforceSummary() {
  const empRes = await query(`
    SELECT e.id, e.employee_code, e.name, e.monthly_wage, e.daily_wage, e.site_id, s.name as site_name, c.name as client_name
    FROM employees e
    LEFT JOIN sites s ON s.id = e.site_id
    LEFT JOIN clients c ON c.id = s.client_id
    WHERE e.status = 'ACTIVE'
  `)
  const employees = empRes.rows

  const siteRes = await query(`
    SELECT s.id, s.name as site_name, c.name as client_name, COUNT(e.id) as staff_count
    FROM sites s
    LEFT JOIN clients c ON c.id = s.client_id
    LEFT JOIN employees e ON e.site_id = s.id AND e.status = 'ACTIVE'
    GROUP BY s.id, s.name, c.name
  `)

  const otRes = await query(`
    SELECT employee_id, COALESCE(SUM(hours), 0) as ot_hours
    FROM overtime_records
    GROUP BY employee_id
  `)
  const otMap = new Map()
  otRes.rows.forEach(r => otMap.set(r.employee_id, parseFloat(r.ot_hours)))

  const advRes = await query(`
    SELECT employee_id, COALESCE(SUM(amount), 0) as unrecovered
    FROM advances
    WHERE is_recovered = false
    GROUP BY employee_id
  `)
  const advMap = new Map()
  advRes.rows.forEach(r => advMap.set(r.employee_id, parseFloat(r.unrecovered)))

  const anomalies = []
  let highRiskCount = 0

  employees.forEach(emp => {
    const ot = otMap.get(emp.id) || 0
    const adv = advMap.get(emp.id) || 0
    const wage = parseFloat(emp.monthly_wage) || (parseFloat(emp.daily_wage) * 26) || 15000
    const debtRatio = adv / wage

    if (ot > 45) {
      anomalies.push({
        type: 'FATIGUE_OVERLOAD',
        severity: 'CRITICAL',
        employeeName: emp.name,
        site: emp.site_name,
        detail: `${emp.name} recorded ${ot.toFixed(1)}h overtime (exceeds statutory 45h limit).`,
      })
      highRiskCount++
    }
    if (debtRatio > 0.40) {
      anomalies.push({
        type: 'DEBT_STRESS',
        severity: 'WARNING',
        employeeName: emp.name,
        site: emp.site_name,
        detail: `Advance liabilities equal ${(debtRatio * 100).toFixed(0)}% of monthly salary.`,
      })
      highRiskCount++
    }
  })

  return {
    totalActivePersonnel: employees.length,
    activeSitesCount: siteRes.rows.length,
    highRiskPersonnelCount: highRiskCount,
    activeAnomaliesCount: anomalies.length,
    detectedAnomalies: anomalies,
    siteDeployments: siteRes.rows.map(s => ({
      site: s.site_name,
      client: s.client_name || 'Direct Client',
      personnelDeployed: parseInt(s.staff_count, 10),
    })),
  }
}

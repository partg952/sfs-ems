import { query } from '../../db.js'

export const scanOvertimeAndFatigueDeclaration = {
  name: 'scan_overtime_and_fatigue',
  description: 'Scans workforce overtime records across client deployment sites to detect employees exceeding safe physical fatigue thresholds (35h warning) or statutory overtime limits (45h legal maximum).',
  parameters: {
    type: 'OBJECT',
    properties: {
      thresholdHours: {
        type: 'NUMBER',
        description: 'Minimum overtime hours to filter by (default is 35 hours)',
      },
      siteName: {
        type: 'STRING',
        description: 'Optional client site filter name (e.g., Hazira, Diamond Bourse)',
      },
    },
  },
}

export async function scanOvertimeAndFatigue({ thresholdHours = 35, siteName = null } = {}) {
  let sql = `
    SELECT e.employee_code, e.name, e.designation, s.name as site_name, COALESCE(SUM(o.hours), 0) as total_ot
    FROM employees e
    JOIN sites s ON s.id = e.site_id
    JOIN overtime_records o ON o.employee_id = e.id
    WHERE e.status = 'ACTIVE'
  `
  const params = []
  if (siteName) {
    params.push(`%${siteName.toLowerCase()}%`)
    sql += ` AND LOWER(s.name) LIKE $${params.length}`
  }
  sql += ` GROUP BY e.id, e.employee_code, e.name, e.designation, s.name`
  sql += ` HAVING COALESCE(SUM(o.hours), 0) >= ${parseFloat(thresholdHours)}`
  sql += ` ORDER BY total_ot DESC`

  const res = await query(sql, params)
  return {
    thresholdAppliedHours: thresholdHours,
    siteFilterApplied: siteName || 'All Deployment Sites',
    overworkedPersonnelCount: res.rows.length,
    overworkedPersonnel: res.rows.map(r => ({
      code: r.employee_code,
      name: r.name,
      designation: r.designation,
      site: r.site_name,
      overtimeHoursLogged: parseFloat(r.total_ot),
      fatigueClassification: parseFloat(r.total_ot) >= 45 ? 'CRITICAL_EXHAUSTION' : 'ELEVATED_FATIGUE',
      complianceViolation: parseFloat(r.total_ot) >= 45 ? 'VIOLATES_FACTORIES_ACT_OVERTIME_LIMIT' : 'WITHIN_LEGAL_MAXIMUM',
    })),
  }
}

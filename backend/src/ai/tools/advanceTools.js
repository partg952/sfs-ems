import { query } from '../../db.js'

export const scanAdvancesAndDebtDeclaration = {
  name: 'scan_advances_and_debt',
  description: 'Scans the financial ledger for personnel whose outstanding cash advance liabilities represent an unsustainable debt-to-wage burden (e.g. >25% or >40% of salary), triggering high flight and desertion risk.',
  parameters: {
    type: 'OBJECT',
    properties: {
      minDebtRatio: {
        type: 'NUMBER',
        description: 'Minimum debt-to-monthly-wage ratio threshold (e.g. 0.25 for 25%, 0.40 for 40%)',
      },
    },
  },
}

export async function scanAdvancesAndDebt({ minDebtRatio = 0.25 } = {}) {
  const empRes = await query(`
    SELECT e.id, e.employee_code, e.name, e.monthly_wage, e.daily_wage, s.name as site_name,
           COALESCE(SUM(a.amount), 0) as total_unrecovered
    FROM employees e
    LEFT JOIN sites s ON s.id = e.site_id
    JOIN advances a ON a.employee_id = e.id AND a.is_recovered = false
    WHERE e.status = 'ACTIVE'
    GROUP BY e.id, e.employee_code, e.name, e.monthly_wage, e.daily_wage, s.name
  `)

  const indebted = []
  empRes.rows.forEach(r => {
    const wage = parseFloat(r.monthly_wage) || (parseFloat(r.daily_wage) * 26) || 15000
    const debt = parseFloat(r.total_unrecovered)
    const ratio = wage > 0 ? debt / wage : 0
    if (ratio >= minDebtRatio) {
      indebted.push({
        code: r.employee_code,
        name: r.name,
        site: r.site_name || 'Unassigned',
        monthlyWage: wage,
        unrecoveredAdvanceDebt: debt,
        debtToWageRatioPercent: Math.round(ratio * 100),
        stressLevel: ratio >= 0.40 ? 'CRITICAL_DESERTION_RISK' : 'MODERATE_BURDEN',
      })
    }
  })

  return {
    minDebtRatioAppliedPercent: Math.round(minDebtRatio * 100),
    flaggedPersonnelCount: indebted.length,
    indebtedPersonnel: indebted,
  }
}

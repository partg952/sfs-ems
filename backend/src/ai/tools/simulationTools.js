import { lookupEmployee } from './employeeTools.js'

export const simulateRiskImpactDeclaration = {
  name: 'simulate_risk_impact',
  description: 'Simulates the quantitative impact on employee turnover risk score and solvency when hypothetically adjusting salary advance, overtime load, or attendance days.',
  parameters: {
    type: 'OBJECT',
    properties: {
      employeeCode: {
        type: 'STRING',
        description: 'Target employee code or name to simulate upon (e.g. SFS-0103, Paresh)',
      },
      additionalAdvance: {
        type: 'NUMBER',
        description: 'Hypothetical additional cash advance amount in INR (e.g. 4000)',
      },
      additionalOvertime: {
        type: 'NUMBER',
        description: 'Hypothetical additional overtime hours to assign (e.g. 15)',
      },
      changeAttendanceDays: {
        type: 'NUMBER',
        description: 'Hypothetical shift in monthly attendance days (+2, -4, etc.)',
      },
    },
    required: ['employeeCode'],
  },
}

export async function simulateRiskImpact({
  employeeCode,
  additionalAdvance = 0,
  additionalOvertime = 0,
  changeAttendanceDays = 0,
}) {
  const baseline = await lookupEmployee({ query: employeeCode })
  if (!baseline.found) {
    return { error: `Employee '${employeeCode}' was not found in active roster.` }
  }

  const baseAttDays = parseInt(baseline.attendanceDays, 10) || 24
  const newAttDays = Math.max(5, Math.min(26, baseAttDays + parseInt(changeAttendanceDays || 0, 10)))
  const newAttRate = (newAttDays / 26) * 100

  const newOT = Math.max(0, parseFloat(baseline.monthlyOvertimeHours || 0) + parseFloat(additionalOvertime || 0))
  const newAdvance = Math.max(0, parseFloat(baseline.outstandingAdvanceDebt || 0) + parseFloat(additionalAdvance || 0))
  const wage = baseline.baseSalary || 15000
  const newDebtRatio = wage > 0 ? newAdvance / wage : 0

  // 5-Factor Calculation
  let f1 = 5.0
  if (newAttRate >= 90) f1 = 5.0
  else if (newAttRate >= 75) f1 = (90.0 - newAttRate) * 2.5
  else if (newAttRate >= 50) f1 = 37.5 + (75.0 - newAttRate) * 1.8
  else f1 = 95.0

  const f2 = Math.min(100.0, (newOT / 45.0) * 100.0)
  const f3 = Math.min(100.0, (newDebtRatio / 0.35) * 100.0)
  const f4 = Math.min(100.0, (baseline.openGrievanceCount || 0) * 40.0)
  let f5 = 15.0
  if (baseline.tenureMonths < 3) f5 = 75.0
  else if (baseline.tenureMonths < 6) f5 = 45.0

  let simulatedScore = (0.28 * f1) + (0.24 * f2) + (0.22 * f3) + (0.16 * f4) + (0.10 * f5)
  simulatedScore = Math.min(100.0, Math.max(0.0, Math.round(simulatedScore * 10) / 10))

  let simRiskLevel = 'LOW'
  if (simulatedScore >= 75) simRiskLevel = 'CRITICAL'
  else if (simulatedScore >= 55) simRiskLevel = 'HIGH'
  else if (simulatedScore >= 35) simRiskLevel = 'MODERATE'

  const scoreDelta = Math.round((simulatedScore - baseline.turnoverRiskScore) * 10) / 10

  return {
    targetEmployee: baseline.name,
    targetCode: baseline.employeeCode,
    baselineRiskScore: baseline.turnoverRiskScore,
    baselineRiskLevel: baseline.turnoverRiskLevel,
    baselineDebt: baseline.outstandingAdvanceDebt,
    baselineDebtRatioPercent: baseline.debtToWageRatioPercent,
    simulatedAdvanceDebt: newAdvance,
    simulatedDebtRatioPercent: Math.round(newDebtRatio * 100),
    simulatedMonthlyOvertime: newOT,
    simulatedAttendanceRate: Math.round(newAttRate * 10) / 10,
    simulatedRiskScore: simulatedScore,
    simulatedRiskLevel: simRiskLevel,
    riskScoreDelta: scoreDelta > 0 ? `+${scoreDelta}%` : `${scoreDelta}%`,
    verdictAdvice:
      newDebtRatio > 0.40
        ? 'HIGH_FINANCIAL_STRESS: Disbursing requested advance pushes debt above 40% threshold. Recommend split installments or refusal.'
        : newOT > 45
        ? 'CRITICAL_FATIGUE_HAZARD: Additional overtime violates legal limit. Recommend relief squad assignment.'
        : 'ACCEPTABLE_OPERATIONAL_RISK: Parameters remain within stable performance tolerances.',
  }
}

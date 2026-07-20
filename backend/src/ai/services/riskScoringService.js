import { query } from '../../db.js'
import { cacheService } from './cacheService.js'
import { aiConfig } from '../config.js'
import { GrievanceNLPService } from './grievanceNLPService.js'

export class RiskScoringService {
  static calculateRiskProfile(emp, attendanceRate, otHours, debtRatio, openGrievances, tenureMonths, siteName) {
    // Factor 1: Attendance Consistency (Weight: 0.28)
    let f1 = 5.0
    if (attendanceRate >= 90) f1 = 5.0
    else if (attendanceRate >= 75) f1 = (90.0 - attendanceRate) * 2.5
    else if (attendanceRate >= 50) f1 = 37.5 + (75.0 - attendanceRate) * 1.8
    else f1 = 95.0

    // Factor 2: Overtime Fatigue (Weight: 0.24)
    const f2 = Math.min(100.0, (otHours / 45.0) * 100.0)

    // Factor 3: Debt & Financial Stress (Weight: 0.22)
    const f3 = Math.min(100.0, (debtRatio / 0.35) * 100.0)

    // Factor 4: Grievance Friction (Weight: 0.16)
    const f4 = Math.min(100.0, openGrievances * 40.0)

    // Factor 5: Tenure Instability (Weight: 0.10)
    let f5 = 15.0
    if (tenureMonths < 3) f5 = 75.0
    else if (tenureMonths < 6) f5 = 45.0

    // Composite Calculation
    let composite = (0.28 * f1) + (0.24 * f2) + (0.22 * f3) + (0.16 * f4) + (0.10 * f5)
    composite = Math.min(100.0, Math.max(0.0, Math.round(composite * 10) / 10))

    let riskLevel = 'LOW'
    if (composite >= 75) riskLevel = 'CRITICAL'
    else if (composite >= 55) riskLevel = 'HIGH'
    else if (composite >= 35) riskLevel = 'MODERATE'

    const factors = [
      { name: 'Attendance Volatility', impactScore: Math.round(f1), weight: 0.28, description: `Attendance reliability is at ${attendanceRate.toFixed(1)}%` },
      { name: 'Overtime Fatigue Load', impactScore: Math.round(f2), weight: 0.24, description: `${otHours.toFixed(1)} overtime hours accumulated this cycle` },
      { name: 'Debt & Advance Burden', impactScore: Math.round(f3), weight: 0.22, description: `Advance liabilities equal ${(debtRatio * 100).toFixed(0)}% of monthly wage` },
      { name: 'Dispute / Grievance Friction', impactScore: Math.round(f4), weight: 0.16, description: `${openGrievances} unresolved grievance(s) logged` },
      { name: 'Tenure Stability', impactScore: Math.round(f5), weight: 0.10, description: `Tenure duration is ${tenureMonths} month(s)` },
    ]

    const drivers = []
    if (f2 >= 60) drivers.push(`High Overtime Fatigue (${otHours.toFixed(1)}h)`)
    if (f1 >= 50) drivers.push(`Unstable Attendance (${attendanceRate.toFixed(0)}%)`)
    if (f3 >= 50) drivers.push(`Heavy Advance Debt (${(debtRatio * 100).toFixed(0)}% of wage)`)
    if (f4 >= 40) drivers.push(`${openGrievances} Unresolved Workplace Grievances`)
    if (f5 >= 60) drivers.push('New Deployment Probation (<3 months)')
    if (drivers.length === 0) drivers.push('Operational metrics within healthy baseline')

    let rec = 'Staff member performing consistently. Consider for site supervisor succession.'
    if (riskLevel === 'CRITICAL') {
      rec = 'Mandate an immediate 48-hour rest cycle, freeze additional overtime, and conduct HR check-in on advance repayment.'
    } else if (riskLevel === 'HIGH') {
      rec = 'Cap overtime at 15 hours, review roster rotation at current site, and resolve pending grievances.'
    } else if (riskLevel === 'MODERATE') {
      rec = 'Monitor attendance trend and ensure supervisor distributes night shifts evenly across team.'
    }

    return {
      employeeId: emp.id,
      employeeCode: emp.employee_code || emp.employeeCode,
      name: emp.name,
      designation: emp.designation,
      siteName: siteName || 'Unassigned Floating Pool',
      riskScore: composite,
      riskLevel,
      primaryDrivers: drivers,
      factors,
      recommendedAction: rec,
      attendanceRate: Math.round(attendanceRate * 10) / 10,
      monthlyOvertimeHours: otHours,
      advanceDebtRatio: Math.round(debtRatio * 100) / 100,
      unresolvedGrievances: openGrievances,
    }
  }

  static async analyzeWorkforce(forceRefresh = false) {
    const cacheKey = 'workforce_insights_data'
    if (!forceRefresh) {
      const cached = cacheService.get(cacheKey)
      if (cached) return cached
    }

    const empRes = await query(`
      SELECT e.*, s.name as site_name, c.name as client_name 
      FROM employees e 
      LEFT JOIN sites s ON s.id = e.site_id 
      LEFT JOIN clients c ON c.id = s.client_id 
      WHERE e.status = 'ACTIVE' 
      ORDER BY e.id
    `)
    const employees = empRes.rows

    const sitesRes = await query(`
      SELECT s.*, c.name as client_name 
      FROM sites s 
      LEFT JOIN clients c ON c.id = s.client_id 
      ORDER BY s.name
    `)
    const sites = sitesRes.rows

    const grievRes = await query(`
      SELECT g.*, e.name as employee_name, e.employee_code 
      FROM grievances g 
      LEFT JOIN employees e ON e.id = g.employee_id 
      ORDER BY g.created_at DESC
    `)
    const grievances = grievRes.rows

    const profiles = []
    const anomalies = []
    const siteAccumulator = {}
    for (const s of sites) {
      siteAccumulator[s.id] = { totalScore: 0, count: 0, highRisk: 0, totalOT: 0 }
    }

    const now = new Date()
    const curMonth = now.getMonth() + 1
    const curYear = now.getFullYear()

    let totalScore = 0
    let critCount = 0, highCount = 0, modCount = 0, lowCount = 0

    for (const emp of employees) {
      // 1. Attendance
      const payRes = await query(
        'SELECT * FROM payroll_records WHERE employee_id = $1 ORDER BY payroll_year DESC, payroll_month DESC LIMIT 1',
        [emp.id]
      )
      let attendanceRate = 92.0
      if (payRes.rows.length > 0) {
        const latest = payRes.rows[0]
        const totalDays = latest.total_working_days || 26
        attendanceRate = Math.min(100.0, (latest.attendance_days / totalDays) * 100.0)
      }

      // 2. Overtime
      let otHours = 0
      const otRes = await query(
        'SELECT * FROM overtime_records WHERE employee_id = $1 AND month = $2 AND year = $3 LIMIT 1',
        [emp.id, curMonth, curYear]
      )
      if (otRes.rows.length > 0) {
        otHours = parseFloat(otRes.rows[0].hours) || 0
      } else if (payRes.rows.length > 0 && parseFloat(payRes.rows[0].overtime_earning) > 0) {
        otHours = parseFloat(payRes.rows[0].overtime_earning) / 200.0
      }

      // 3. Advance debt
      const advRes = await query(
        'SELECT COALESCE(SUM(amount), 0) as unrecovered FROM advances WHERE employee_id = $1 AND is_recovered = false',
        [emp.id]
      )
      const unrecovered = parseFloat(advRes.rows[0]?.unrecovered) || 0
      let wage = parseFloat(emp.monthly_wage) || (parseFloat(emp.daily_wage) * 26) || 15000
      const debtRatio = Math.min(1.0, unrecovered / wage)

      // 4. Open Grievances
      const openGrievances = grievances.filter(
        g => g.employee_id === emp.id && (g.status === 'OPEN' || g.status === 'IN_REVIEW')
      ).length

      // 5. Tenure
      let tenureMonths = 12
      if (emp.joining_date) {
        const join = new Date(emp.joining_date)
        tenureMonths = Math.max(1, Math.floor((now - join) / (1000 * 60 * 60 * 24 * 30)))
      }

      const profile = this.calculateRiskProfile(emp, attendanceRate, otHours, debtRatio, openGrievances, tenureMonths, emp.site_name)
      profiles.push(profile)
      totalScore += profile.riskScore

      if (emp.site_id && siteAccumulator[emp.site_id]) {
        siteAccumulator[emp.site_id].totalScore += profile.riskScore
        siteAccumulator[emp.site_id].count++
        siteAccumulator[emp.site_id].totalOT += otHours
        if (profile.riskLevel === 'CRITICAL' || profile.riskLevel === 'HIGH') {
          siteAccumulator[emp.site_id].highRisk++
        }
      }

      if (profile.riskLevel === 'CRITICAL') critCount++
      else if (profile.riskLevel === 'HIGH') highCount++
      else if (profile.riskLevel === 'MODERATE') modCount++
      else lowCount++

      // Anomalies
      if (otHours > 45) {
        anomalies.push({
          id: `ANO-OT-${emp.id}`,
          type: 'FATIGUE_OVERLOAD',
          severity: 'CRITICAL',
          employeeName: emp.name,
          siteName: emp.site_name || 'Floating Pool',
          description: `${emp.name} recorded ${otHours.toFixed(1)} overtime hours this month. Exceeds statutory fatigue limits.`,
          action: 'Immediate shift rotation required to mitigate workplace injury/fallout.',
        })
      }

      if (attendanceRate < 60 && otHours > 10) {
        anomalies.push({
          id: `ANO-ATT-${emp.id}`,
          type: 'PAYROLL_ANOMALY',
          severity: 'WARNING',
          employeeName: emp.name,
          siteName: emp.site_name || 'Floating Pool',
          description: `Inconsistent pattern: Low attendance (${attendanceRate.toFixed(0)}%) with overtime hours (${otHours.toFixed(1)}h).`,
          action: 'Audit biometrics / muster roll for potential proxy attendance.',
        })
      }

      if (debtRatio > 0.40) {
        anomalies.push({
          id: `ANO-DEBT-${emp.id}`,
          type: 'UNRECOVERED_DEBT',
          severity: 'WARNING',
          employeeName: emp.name,
          siteName: emp.site_name || 'Floating Pool',
          description: `Unrecovered advance represents ${(debtRatio * 100).toFixed(0)}% of monthly earnings. High desertion risk.`,
          action: 'Restructure recovery installments across multiple payroll cycles to preserve take-home pay.',
        })
      }
    }

    // Site Health Summaries
    const siteSummaries = sites.map(s => {
      const stat = siteAccumulator[s.id] || { totalScore: 0, count: 0, highRisk: 0, totalOT: 0 }
      const avgScore = stat.count > 0 ? stat.totalScore / stat.count : 0
      let status = 'EXCELLENT'
      if (avgScore > 65 || stat.highRisk >= 2) status = 'CRITICAL'
      else if (avgScore > 45 || stat.highRisk >= 1) status = 'ATTENTION_NEEDED'
      else if (avgScore > 25) status = 'HEALTHY'

      return {
        siteId: s.id,
        siteName: s.name,
        clientName: s.client_name || 'Direct Client',
        totalDeployed: stat.count,
        averageRiskScore: Math.round(avgScore * 10) / 10,
        highRiskCount: stat.highRisk,
        totalOvertimeHours: Math.round(stat.totalOT * 10) / 10,
        healthStatus: status,
      }
    })

    // Grievance Analyses via GrievanceNLPService (cached + lexical, 0 LLM tokens on bulk load)
    const grievanceAnalyses = await Promise.all(
      grievances.map(g =>
        GrievanceNLPService.analyzeGrievance(g.id, g.employee_name || 'Facility Operative', g.description, g.type, false)
      )
    )

    const totalAnalyzed = employees.length
    const avgRisk = totalAnalyzed > 0 ? Math.round((totalScore / totalAnalyzed) * 10) / 10 : 0

    const execSummary = `Shreeji Facility Services Workforce Intelligence: Analyzed ${totalAnalyzed} active personnel across ${sites.length} deployment sites. Company-wide Average Turnover Risk Index stands at ${avgRisk}%. Currently, ${critCount} personnel are flagged at CRITICAL risk and ${highCount} at HIGH risk (primarily driven by overtime burnout and unrecovered advance liabilities). ${anomalies.length} operational anomalies detected.`

    const result = {
      totalEmployeesAnalyzed: totalAnalyzed,
      averageRiskScore: avgRisk,
      criticalRiskCount: critCount,
      highRiskCount: highCount,
      moderateRiskCount: modCount,
      lowRiskCount: lowCount,
      executiveSummary: execSummary,
      topAtRiskEmployees: profiles,
      siteHealthSummaries: siteSummaries,
      detectedAnomalies: anomalies,
      grievanceAnalyses: grievanceAnalyses,
      lastComputedAt: new Date().toISOString(),
    }

    cacheService.set(cacheKey, result, aiConfig.cacheTTL.workforceInsights)
    return result
  }

  static simulateRisk(req) {
    const totalWorking = req.totalWorkingDays || 26
    const attDays = req.attendanceDays || 26
    const attRate = Math.min(100.0, (attDays / totalWorking) * 100.0)

    const wage = req.monthlyWage || 15000
    const adv = (req.advanceBalance || 0) + (req.finesAmount || 0)
    const debtRatio = Math.min(1.0, adv / wage)

    const dummyEmp = { id: 0, employee_code: 'SIM-001', name: 'Simulated Candidate', designation: 'Facility Operative' }
    const profile = this.calculateRiskProfile(dummyEmp, attRate, req.overtimeHours || 0, debtRatio, req.openGrievances || 0, req.tenureMonths || 12, 'Simulation Sandbox')

    if (req.isNightShift && req.overtimeHours > 25) {
      profile.riskScore = Math.min(100.0, profile.riskScore + 8.0)
      profile.primaryDrivers.push('Night Shift Circadian Disruption')
    }

    const advice = []
    if (req.overtimeHours > 35) advice.push(`Excessive overtime (${req.overtimeHours}h): Reassign ~15h to floating relief staff to avert physical exhaustion.`)
    if (debtRatio > 0.30) advice.push(`High debt burden (${(debtRatio * 100).toFixed(0)}% of earnings): Split advance recovery across multiple months.`)
    if (attRate < 75) advice.push(`Attendance is ${attRate.toFixed(0)}%: Investigate site commute issues or health difficulties.`)
    if (req.openGrievances > 0) advice.push('Expedite pending grievance resolution to restore operational morale.')
    if (advice.length === 0) advice.push('Parameters indicate an optimal and stable workforce configuration.')

    const playbook = `AI Prediction: Composite Risk Score of ${profile.riskScore}% (${profile.riskLevel}). Interventions: ${profile.recommendedAction}`

    return {
      predictedRiskScore: profile.riskScore,
      riskLevel: profile.riskLevel,
      primaryDrivers: profile.primaryDrivers,
      factors: profile.factors,
      aiPlaybook: playbook,
      retentionAdvice: advice,
    }
  }
}

// Calibrated sensitivity curves for simulation parameters

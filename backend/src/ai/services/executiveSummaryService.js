import { isLLMConfigured, getOpenAIClient, getLLMProviderConfig, markQuotaExhausted } from '../llmClient.js'
import { cacheService } from './cacheService.js'
import { RiskScoringService } from './riskScoringService.js'

export class ExecutiveSummaryService {
  static async generateSummary(forceRefresh = false) {
    const cacheKey = 'ai_executive_operations_summary'
    if (!forceRefresh) {
      const cached = cacheService.get(cacheKey)
      if (cached) return cached
    }

    const data = await RiskScoringService.analyzeWorkforce(false)

    if (isLLMConfigured()) {
      try {
        const client = getOpenAIClient()
        const conf = getLLMProviderConfig()

        const prompt = `You are the Chief Operations AI Advisor for Shreeji Facility Services (EMS), an industrial security and facility staffing company managing personnel across high-security client deployments (such as Adani Hazira Port and Surat Diamond Bourse).

Analyze this live workforce operational telemetry from the database:
- Total Deployed Headcount: ${data.totalEmployeesAnalyzed} personnel
- Company-wide Average Turnover Risk: ${data.averageRiskScore}%
- Risk Breakdown: ${data.criticalRiskCount} Critical, ${data.highRiskCount} High, ${data.moderateRiskCount} Moderate, ${data.lowRiskCount} Low Risk
- Personnel Requiring Attention: ${JSON.stringify(
          (data.topAtRiskEmployees || []).slice(0, 4).map(e => ({
            name: e.name,
            code: e.employeeCode,
            site: e.siteName,
            riskScore: e.riskScore,
            riskLevel: e.riskLevel,
            attendanceRate: e.attendanceRate,
            overtimeHours: e.monthlyOvertimeHours,
            primaryDrivers: e.primaryDrivers,
          }))
        )}
- Operational Fatigue & Payroll Anomalies: ${JSON.stringify(
          (data.detectedAnomalies || []).map(a => ({
            type: a.type,
            severity: a.severity,
            employee: a.employeeName,
            site: a.siteName,
            details: a.description,
          }))
        )}
- Active Grievance Tickets: ${(data.grievanceAnalyses || []).length} open disputes across sites

Generate a high-impact, professional Executive Operations Briefing in clean Markdown:
### Executive Operations Briefing
**Operational Health Status**: [One concise paragraph analyzing stability, post fulfillment safety, and turnover threat level]

#### Priority Attention Items
- [3-4 concise bullet points highlighting specific staff members, deployment sites, overtime fatigue exceeding safety caps, or unrecovered debt liabilities]

#### Prescriptive 72-Hour Directives
- [3 actionable, concrete instructions for Site Supervisors, HR Accounts, and Roster Coordinators]`

        const res = await client.chat.completions.create({
          model: conf.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
        })

        const summaryContent = res.choices?.[0]?.message?.content || ''

        const result = {
          summary: summaryContent,
          generatedBy: conf.provider,
          model: conf.model,
          generatedAt: new Date().toISOString(),
          isAIGenerated: true,
        }

        // Cache for 15 minutes
        cacheService.set(cacheKey, result, 900)
        return result
      } catch (err) {
        if (err.status === 429 || err.message?.includes('429') || err.message?.includes('quota')) {
          markQuotaExhausted(60000, 'Free tier rate limit reached')
        }
        console.warn('AI Executive Summary generation notice:', err.message)
      }
    }

    // Deterministic fallback if API key not available or quota limit hit
    const fallbackText = `### Executive Operations Briefing
**Operational Health Status**: Company-wide workforce stability remains active across ${data.siteHealthSummaries?.length || 3} sites with ${data.totalEmployeesAnalyzed} deployed personnel and an average turnover hazard of ${data.averageRiskScore}%.

#### Priority Attention Items
${(data.detectedAnomalies || []).map(a => `- **${a.employeeName} (${a.siteName})**: ${a.description}`).join('\n')}

#### Prescriptive 72-Hour Directives
- Implement mandatory rest cycles for operatives logging >40h overtime this cycle.
- Conduct payroll ledger audit on unrecovered advance balances exceeding 35% of monthly salary.
- Accelerate site-level review of open workplace grievances with deployed supervisors.`

    const result = {
      summary: fallbackText,
      generatedBy: 'On-Premise Operations Engine',
      model: 'deterministic-v1',
      generatedAt: new Date().toISOString(),
      isAIGenerated: false,
    }

    return result
  }
}

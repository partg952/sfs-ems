import { isLLMConfigured, getOpenAIClient, getLLMProviderConfig, markQuotaExhausted } from '../llmClient.js'
import { cacheService } from './cacheService.js'
import { aiConfig } from '../config.js'

export class GrievanceNLPService {
  static async analyzeGrievance(id, empName, text, originalType = 'OPERATIONAL', forceLLM = false) {
    const cacheKey = forceLLM
      ? `grievance_nlp_llm_${id}_${text?.length || 0}`
      : `grievance_nlp_lex_${id}_${text?.length || 0}`
    const cached = cacheService.get(cacheKey)
    if (cached) return cached

    // 1. Only call external LLM when explicitly requested by user action (e.g. clicking "Generate AI Memo")
    if (forceLLM && isLLMConfigured()) {
      try {
        const client = getOpenAIClient()
        const conf = getLLMProviderConfig()
        const res = await client.chat.completions.create({
          model: conf.model,
          messages: [
            {
              role: 'system',
              content: `You are an expert HR Workplace Grievance & Labor Compliance NLP triaging engine for Shreeji Facility Services.
Analyze worker complaint text and return STRICT JSON with:
{
  "sentiment": "DISTRESSED" | "FRUSTRATED" | "ANGRY" | "NEUTRAL",
  "urgencyScore": integer between 1 and 10,
  "urgencyLevel": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "detectedCategory": "WORKPLACE_SAFETY" | "HARASSMENT" | "WAGE_COMPLIANCE" | "HOUSING_FACILITY" | "OPERATIONAL",
  "keyKeywords": ["keyword1", "keyword2", "keyword3"],
  "suggestedAction": "Concrete immediate operational action for site coordinator or HR",
  "draftResponse": "Empathetic, professional official memo addressing the employee"
}`,
            },
            {
              role: 'user',
              content: `Employee Name: ${empName}\nReported Type: ${originalType}\nGrievance Statement: "${text}"`,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        })

        const parsed = JSON.parse(res.choices[0].message.content)

        const result = {
          grievanceId: id,
          employeeName: empName,
          sentiment: parsed.sentiment || 'NEUTRAL',
          urgencyScore: parsed.urgencyScore || 5,
          urgencyLevel: parsed.urgencyLevel || 'MEDIUM',
          detectedCategory: parsed.detectedCategory || originalType || 'OPERATIONAL',
          keyKeywords: parsed.keyKeywords || [],
          suggestedAction: parsed.suggestedAction,
          draftResponse: parsed.draftResponse,
          analyzedBy: `${conf.provider} (${conf.model})`,
          isLLMGenerated: true,
        }

        cacheService.set(cacheKey, result, aiConfig.cacheTTL.grievanceNLP)
        return result
      } catch (err) {
        if (err.status === 429 || err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('RESOURCE_EXHAUSTED')) {
          markQuotaExhausted(60000, 'Daily Free Tier Quota Limit')
        } else {
          console.warn('LLM grievance analysis notice:', err.message)
        }
      }
    }

    // 2. Deterministic Lexical Fallback
    const lower = (text || '').toLowerCase()
    const safetyWords = ['injury', 'hurt', 'danger', 'shock', 'chemical', 'hazard', 'fire', 'unsafe', 'accident', 'broken']
    const wageWords = ['salary', 'wage', 'payment', 'deduction', 'unpaid', 'epf', 'esic', 'money', 'advance', 'delayed']
    const harassmentWords = ['abused', 'harass', 'threat', 'insult', 'shout', 'behavior', 'supervisor', 'fight']
    const housingWords = ['room', 'water', 'bed', 'fan', 'electricity', 'clean', 'uniform', 'toilet', 'accommodation']

    let category = 'OPERATIONAL'
    if (safetyWords.some(w => lower.includes(w))) category = 'WORKPLACE_SAFETY'
    else if (harassmentWords.some(w => lower.includes(w))) category = 'HARASSMENT'
    else if (wageWords.some(w => lower.includes(w))) category = 'WAGE_COMPLIANCE'
    else if (housingWords.some(w => lower.includes(w))) category = 'HOUSING_FACILITY'

    let urgency = 3
    let sentiment = 'NEUTRAL'
    const criticalTokens = ['immediate', 'danger', 'urgent', 'police', 'strike', 'hospital', 'cannot work', 'illegal']
    const frustratedTokens = ['again', 'repeatedly', 'complained', 'no action', 'angry', 'unfair', 'cheated', 'worst']

    if (criticalTokens.some(w => lower.includes(w))) {
      urgency += 5
      sentiment = 'ESCALATED'
    }
    if (frustratedTokens.some(w => lower.includes(w))) {
      urgency += 2
      if (sentiment === 'NEUTRAL') sentiment = 'FRUSTRATED'
    }
    if (category === 'WORKPLACE_SAFETY' || category === 'HARASSMENT') urgency += 2

    urgency = Math.min(10, Math.max(1, urgency))
    let urgencyLevel = 'LOW'
    if (urgency >= 8) {
      urgencyLevel = 'CRITICAL'
      sentiment = 'DISTRESSED'
    } else if (urgency >= 6) urgencyLevel = 'HIGH'
    else if (urgency >= 4) urgencyLevel = 'MEDIUM'

    let action = 'Review shift roster and re-align site allocation with supervisor.'
    let draftResponse = `Dear ${empName}, your feedback has been registered and is under review by your site coordinator.`

    if (category === 'WAGE_COMPLIANCE') {
      action = 'Audit employee payroll ledger against biometric muster roll and reconcile deduction with accounts.'
      draftResponse = `Dear ${empName}, your grievance regarding wage calculations has been escalated to HR Accounts for an immediate ledger audit. Any variance will be credited promptly.`
    } else if (category === 'WORKPLACE_SAFETY') {
      action = 'Dispatch Site Supervisor for immediate physical safety audit; replace faulty equipment within 24 hours.'
      draftResponse = `Dear ${empName}, safety is Shreeji Facility Services' top priority. A safety inspection at your site has been ordered immediately.`
    } else if (category === 'HARASSMENT') {
      action = 'HR Manager to conduct confidential 1-on-1 interview with both parties and document statements per compliance policy.'
      draftResponse = `Dear ${empName}, your complaint has been received by HR Management under strict confidentiality. An inquiry is in progress.`
    } else if (category === 'HOUSING_FACILITY') {
      action = 'Notify Facility Wardens to repair accommodation amenities / replace uniform stock within 48 hours.'
      draftResponse = `Dear ${empName}, facility maintenance has been instructed to inspect and resolve your accommodation/uniform concern.`
    }

    const words = lower.replace(/[^a-zA-Z0-9 ]/g, '').split(/\s+/)
    const stopWords = new Set(['about', 'there', 'which', 'their', 'could', 'would', 'please', 'should', 'because', 'having', 'after', 'before'])
    const keywords = []
    for (const w of words) {
      if (w.length > 4 && !stopWords.has(w) && !keywords.includes(w) && keywords.length < 5) {
        keywords.push(w)
      }
    }

    const result = {
      grievanceId: id,
      employeeName: empName,
      sentiment,
      urgencyScore: urgency,
      urgencyLevel,
      detectedCategory: category,
      keyKeywords: keywords,
      suggestedAction: action,
      draftResponse,
      analyzedBy: 'Lexical Rule Engine',
    }

    cacheService.set(cacheKey, result, aiConfig.cacheTTL.grievanceNLP)
    return result
  }
}

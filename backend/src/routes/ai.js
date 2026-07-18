import { Router } from 'express'
import {
  RiskScoringService,
  GrievanceNLPService,
  ExecutiveSummaryService,
  ReactAgent,
  isLLMConfigured,
  getLLMProviderConfig,
  toolRegistry,
} from '../ai/index.js'
import { query } from '../db.js'
import { authenticateJWT, requireRoles } from '../middleware/auth.js'

const router = Router()
router.use(authenticateJWT)

const ALL_HR = ['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF', 'ACCOUNTS', 'VIEWER']

// GET /api/ai/status - Telemetry on active AI engine & LLM configuration
router.get('/status', requireRoles(...ALL_HR), (req, res) => {
  const conf = getLLMProviderConfig()
  res.json({
    success: true,
    data: {
      llmConfigured: conf.configured,
      provider: conf.provider,
      providerType: conf.providerType,
      model: conf.model,
      geminiConfigured: conf.configured && conf.providerType === 'gemini',
      openaiConfigured: conf.configured && conf.providerType === 'openai',
      activeTools: Object.keys(toolRegistry),
      cacheEnabled: true,
    },
  })
})

// GET /api/ai/workforce-insights - Real DB workforce risk scoring with TTL caching
router.get('/workforce-insights', requireRoles(...ALL_HR), async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true'
    const insights = await RiskScoringService.analyzeWorkforce(forceRefresh)
    res.json({ success: true, message: 'Success', data: insights })
  } catch (err) {
    console.error('AI workforce insights error:', err)
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// POST /api/ai/executive-summary - On-demand generative AI operations briefing (Gemini 2.5 Flash via OpenRouter)
router.post('/executive-summary', requireRoles(...ALL_HR), async (req, res) => {
  try {
    const forceRefresh = req.body.force === true || req.query.refresh === 'true'
    const result = await ExecutiveSummaryService.generateSummary(forceRefresh)
    res.json({ success: true, message: 'Success', data: result })
  } catch (err) {
    console.error('AI executive summary error:', err)
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// POST /api/ai/simulate - What-If quantitative sandbox recalculation
router.post('/simulate', requireRoles(...ALL_HR), (req, res) => {
  try {
    const result = RiskScoringService.simulateRisk(req.body)
    res.json({ success: true, message: 'Success', data: result })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/ai/grievances/:id - NLP grievance analysis & sentiment triaging
router.get('/grievances/:id', requireRoles(...ALL_HR), async (req, res) => {
  try {
    const insights = await RiskScoringService.analyzeWorkforce()
    const target = insights.grievanceAnalyses.find(g => g.grievanceId === parseInt(req.params.id, 10))
    if (!target) {
      return res.status(404).json({ success: false, message: 'Grievance analysis not found', data: null })
    }
    res.json({ success: true, message: 'Success', data: target })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// POST /api/ai/grievances/:id/analyze-ai - Explicit user-triggered on-demand LLM analysis for a grievance
router.post('/grievances/:id/analyze-ai', requireRoles(...ALL_HR), async (req, res) => {
  try {
    const grievanceId = parseInt(req.params.id, 10)
    const dbRes = await query(
      `SELECT g.id, g.description, g.type, g.status, e.name as employee_name
       FROM grievances g
       JOIN employees e ON g.employee_id = e.id
       WHERE g.id = $1`,
      [grievanceId]
    )
    if (dbRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Grievance ticket not found', data: null })
    }
    const g = dbRes.rows[0]
    const result = await GrievanceNLPService.analyzeGrievance(
      g.id,
      g.employee_name || 'Facility Operative',
      g.description,
      g.type,
      true // forceLLM = true explicitly on demand
    )
    res.json({ success: true, message: 'Success', data: result })
  } catch (err) {
    console.error('AI Grievance analysis error:', err)
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// POST /api/ai/copilot/ask - Autonomous Re-Act Manager Decision Co-pilot
router.post('/copilot/ask', requireRoles(...ALL_HR), async (req, res) => {
  try {
    const question = req.body.question || req.body.query
    const history = req.body.history || []

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Question parameter is required', data: null })
    }

    const result = await ReactAgent.execute(question, history)
    res.json({ success: true, message: 'Success', data: result })
  } catch (err) {
    console.error('AI Copilot Re-Act execution error:', err)
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

export default router

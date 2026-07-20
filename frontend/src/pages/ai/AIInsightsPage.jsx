import { useState, useEffect, useRef } from 'react'
import { aiAPI } from '../../api/ai'
import PageHeader from '../../components/PageHeader'
import StatCard from '../../components/StatCard'
import LoadingSpinner from '../../components/LoadingSpinner'
import AIMarkdownMemo from '../../components/AIMarkdownMemo'
import {
  Brain,
  Sparkles,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Activity,
  ShieldAlert,
  Zap,
  Sliders,
  CheckCircle2,
  MessageSquareWarning,
  RefreshCw,
  Bot,
  Send,
  ChevronDown,
  ChevronRight,
  Terminal,
  FileText,
  User,
  RotateCcw
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function AIInsightsPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [activeTab, setActiveTab] = useState('copilot') // 1. Copilot in first position
  const [selectedEmp, setSelectedEmp] = useState(null)

  // Executive Operations Briefing State (On-Demand)
  const [aiSummary, setAiSummary] = useState(null)
  const [aiSummaryMeta, setAiSummaryMeta] = useState(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [briefingExpanded, setBriefingExpanded] = useState(true)

  // Simulator State
  const [simAttendance, setSimAttendance] = useState(20)
  const [simOvertime, setSimOvertime] = useState(38)
  const [simAdvance, setSimAdvance] = useState(4000)
  const [simWage, setSimWage] = useState(18000)
  const [simGrievances, setSimGrievances] = useState(1)
  const [simTenure, setSimTenure] = useState(4)
  const [simNightShift, setSimNightShift] = useState(false)
  const [simResult, setSimResult] = useState(null)
  const [simulating, setSimulating] = useState(false)

  // Multi-Turn Copilot Conversational Chat State
  const [chatMessages, setChatMessages] = useState([])
  const [copilotQuestion, setCopilotQuestion] = useState('')
  const [copilotLoading, setCopilotLoading] = useState(false)
  const [expandedTraces, setExpandedTraces] = useState({}) // Minimized by default
  const chatBottomRef = useRef(null)

  // On-demand Grievance AI Analysis State
  const [analyzingGrievance, setAnalyzingGrievance] = useState({})
  const [customGrievances, setCustomGrievances] = useState({})

  const scrollToChatBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (chatMessages.length > 0) {
      scrollToChatBottom()
    }
  }, [chatMessages, copilotLoading])

  const handleAskCopilot = async (qText) => {
    const questionToAsk = (qText || copilotQuestion || '').trim()
    if (!questionToAsk || copilotLoading) return

    const userMsgId = `user-${Date.now()}`
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const updatedMessages = [
      ...chatMessages,
      {
        id: userMsgId,
        role: 'user',
        content: questionToAsk,
        timestamp: nowTime,
      },
    ]

    setChatMessages(updatedMessages)
    setCopilotQuestion('')
    setCopilotLoading(true)

    try {
      const history = updatedMessages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }))

      const res = await aiAPI.askCopilot({ question: questionToAsk, history })
      const asstData = res.data?.data

      const asstMsgId = `asst-${Date.now()}`
      setChatMessages([
        ...updatedMessages,
        {
          id: asstMsgId,
          role: 'assistant',
          content: asstData?.answer || 'Analysis complete.',
          trace: asstData?.thoughtTrace || [],
          toolsUsed: asstData?.toolsUsed || [],
          suggestedFollowUps: asstData?.suggestedFollowUps || [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
      // Keep traces minimized by default per user request
      setExpandedTraces((prev) => ({ ...prev, [asstMsgId]: false }))
    } catch (err) {
      toast.error('Unable to retrieve decision briefing. Please try again.')
      setChatMessages([
        ...updatedMessages,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'An unexpected connection issue occurred while analyzing records. Please try resubmitting your query.',
          trace: [],
          toolsUsed: [],
          suggestedFollowUps: [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setCopilotLoading(false)
    }
  }

  const toggleTrace = (msgId) => {
    setExpandedTraces((prev) => ({ ...prev, [msgId]: !prev[msgId] }))
  }

  const resetChat = () => {
    setChatMessages([])
    setCopilotQuestion('')
    toast.success('Started a fresh consultation topic')
  }

  const handleGenerateAISummary = async (force = false) => {
    setLoadingSummary(true)
    try {
      const res = await aiAPI.generateExecutiveSummary(force)
      if (res.data?.data) {
        setAiSummary(res.data.data.summary)
        setAiSummaryMeta(res.data.data)
        setBriefingExpanded(true)
        toast.success('Executive Operations Briefing synthesized')
      }
    } catch (err) {
      toast.error('Failed to synthesize briefing. Please try again.')
    } finally {
      setLoadingSummary(false)
    }
  }

  const handleGenerateAIMemo = async (grievanceId) => {
    setAnalyzingGrievance((prev) => ({ ...prev, [grievanceId]: true }))
    try {
      const res = await aiAPI.analyzeGrievanceWithAI(grievanceId)
      if (res.data?.data) {
        setCustomGrievances((prev) => ({
          ...prev,
          [grievanceId]: res.data.data,
        }))
        toast.success(`Resolution Memo generated for ticket #${grievanceId}`)
      }
    } catch (err) {
      toast.error('Could not generate memo. Please try again.')
    } finally {
      setAnalyzingGrievance((prev) => ({ ...prev, [grievanceId]: false }))
    }
  }

  const fetchInsights = async (force = false) => {
    setLoading(true)
    try {
      const res = await aiAPI.getWorkforceInsights(force)
      setData(res.data.data)
      if (res.data.data?.topAtRiskEmployees?.length > 0) {
        setSelectedEmp(res.data.data.topAtRiskEmployees[0])
      }
    } catch (err) {
      toast.error('Failed to load workforce insights')
    } finally {
      setLoading(false)
    }
  }

  const runSimulation = async () => {
    setSimulating(true)
    try {
      const res = await aiAPI.simulateRisk({
        attendanceDays: parseInt(simAttendance, 10),
        totalWorkingDays: 26,
        overtimeHours: parseFloat(simOvertime),
        monthlyWage: parseFloat(simWage),
        advanceBalance: parseFloat(simAdvance),
        finesAmount: 0,
        openGrievances: parseInt(simGrievances, 10),
        tenureMonths: parseInt(simTenure, 10),
        isNightShift: simNightShift,
      })
      setSimResult(res.data.data)
    } catch (err) {
      toast.error('Simulation calculation failed')
    } finally {
      setSimulating(false)
    }
  }

  useEffect(() => {
    fetchInsights()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      runSimulation()
    }, 200)
    return () => clearTimeout(timer)
  }, [simAttendance, simOvertime, simAdvance, simWage, simGrievances, simTenure, simNightShift])

  if (loading) {
    return <LoadingSpinner message="Loading workforce analytics & predictive models..." />
  }

  const getRiskBadge = (level) => {
    switch (level) {
      case 'CRITICAL':
        return 'badge-red'
      case 'HIGH':
        return 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200'
      case 'MODERATE':
        return 'badge-yellow'
      default:
        return 'badge-green'
    }
  }

  const getRiskBarColor = (score) => {
    if (score >= 75) return 'bg-red-600'
    if (score >= 55) return 'bg-amber-500'
    if (score >= 35) return 'bg-brand-600'
    return 'bg-brand-900'
  }

  // Exact 4 tabs ordered per user request:
  // 1. Copilot (first)
  // 2. Grievance (second)
  // 3. Attrition Radar (third)
  // 4. What-If Simulator (last)
  const TABS = [
    { id: 'copilot', label: 'Decision Co-pilot', icon: Bot },
    { id: 'grievances', label: 'Grievance Intelligence', icon: MessageSquareWarning },
    { id: 'overview', label: 'Workforce Attrition Radar', icon: Brain },
    { id: 'simulator', label: 'What-If Simulator', icon: Sliders },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Insights"
        subtitle="Manager decision co-pilot, grievance intelligence, attrition radar, and policy simulator"
        action={
          <button
            onClick={() => fetchInsights(true)}
            className="btn-secondary"
          >
            <RefreshCw size={15} /> Recalculate Models
          </button>
        }
      />

      {/* Deterministic KPI Number Analytics (Kept Intact) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Personnel Monitored"
          value={data?.totalEmployeesAnalyzed || 0}
          icon={Activity}
          sub="Active site deployments"
        />
        <StatCard
          label="Avg Turnover Risk"
          value={`${data?.averageRiskScore || 0}%`}
          icon={data?.averageRiskScore > 50 ? TrendingUp : TrendingDown}
          sub="Weighted composite index"
        />
        <StatCard
          label="High / Critical Alert"
          value={(data?.criticalRiskCount || 0) + (data?.highRiskCount || 0)}
          icon={ShieldAlert}
          sub={`${data?.criticalRiskCount || 0} Critical, ${data?.highRiskCount || 0} High risk`}
        />
        <StatCard
          label="Operational Anomalies"
          value={data?.detectedAnomalies?.length || 0}
          icon={AlertTriangle}
          sub="Fatigue & payroll variances"
        />
      </div>

      {/* Executive Operations Briefing (On-Demand AI Synthesis with Collapse/Expand) */}
      <div className="card p-5 bg-gradient-to-r from-brand-50/70 via-white to-brand-50/40 border border-brand-200 shadow-sm transition-all">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-100 rounded text-brand-900 flex-shrink-0">
              <Zap size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-brand-900">
                  Executive Operations Briefing
                </h3>
                {aiSummary ? (
                  <span className="badge-green flex items-center gap-1 text-[11px]">
                    <Sparkles size={11} /> Briefing Active
                  </span>
                ) : (
                  <span className="badge-gray text-[11px]">
                    On-Demand Operations Summary
                  </span>
                )}
              </div>
              <p className="text-xs text-brand-500 mt-0.5">
                {aiSummary
                  ? `Synthesized operations briefing across ${data?.siteHealthSummaries?.length || 3} sites & ${data?.totalEmployeesAnalyzed || 5} staff`
                  : 'Synthesize workforce stability, supervisor attention points, and operational directives'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {aiSummary && (
              <button
                type="button"
                onClick={() => setBriefingExpanded(!briefingExpanded)}
                className="text-xs font-medium text-brand-600 hover:text-brand-900 flex items-center gap-1 px-2.5 py-1.5 rounded hover:bg-brand-50 transition-colors"
              >
                {briefingExpanded ? 'Minimize Briefing' : 'Expand Briefing'}
                {briefingExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            )}

            {aiSummary ? (
              <button
                type="button"
                onClick={() => handleGenerateAISummary(true)}
                disabled={loadingSummary}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <RefreshCw size={12} className={loadingSummary ? 'animate-spin' : ''} />
                {loadingSummary ? 'Refreshing...' : 'Regenerate Briefing'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleGenerateAISummary(false)}
                disabled={loadingSummary}
                className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-sm"
              >
                {loadingSummary ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    Synthesizing Briefing...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} className="text-amber-300" />
                    Generate Operations Briefing
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Briefing Content Body */}
        {loadingSummary ? (
          <div className="py-6 flex items-center justify-center gap-2.5 text-xs text-brand-700 bg-white/70 rounded-md border border-brand-100 mt-3">
            <RefreshCw size={16} className="animate-spin text-brand-900" />
            <span className="font-medium">
              Synthesizing live operational telemetry, fatigue anomalies, and grievance risks...
            </span>
          </div>
        ) : aiSummary && briefingExpanded ? (
          <div className="mt-3 bg-white p-4 rounded-md border border-brand-100 shadow-sm animate-fadeIn">
            <AIMarkdownMemo content={aiSummary} />
            <div className="text-[10px] text-brand-400 mt-3 pt-2.5 border-t border-brand-100 flex items-center justify-between flex-wrap gap-1">
              <span>Executive Operations Directives</span>
              <span>Generated: {aiSummaryMeta?.generatedAt ? new Date(aiSummaryMeta.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span>
            </div>
          </div>
        ) : !aiSummary ? (
          <div className="mt-3 text-xs text-brand-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/70 p-3.5 rounded border border-brand-100">
            <p className="leading-relaxed text-brand-700">
              Active workforce telemetry is ready ({data?.totalEmployeesAnalyzed || 5} deployed staff across {data?.siteHealthSummaries?.length || 3} sites, avg churn risk: {data?.averageRiskScore || 0}%). Click <strong className="text-brand-900 font-semibold">&ldquo;Generate Operations Briefing&rdquo;</strong> to synthesize an in-depth operations briefing highlighting personnel and sites requiring supervisor attention.
            </p>
          </div>
        ) : null}
      </div>

      {/* Streamlined Navigation Tabs (Copilot, Grievances, Radar, Simulator) */}
      <div className="border-b border-brand-100 flex gap-2 sm:gap-6 text-sm font-medium overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 py-3 px-2 border-b-2 text-sm transition-colors whitespace-nowrap',
                isActive
                  ? 'border-brand-900 text-brand-900 font-semibold'
                  : 'border-transparent text-brand-500 hover:text-brand-800 hover:border-brand-300'
              )}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* TAB 1: Decision Co-pilot (Multi-Turn Chat Experience) - First Position */}
      {activeTab === 'copilot' && (
        <div className="space-y-6">
          <div className="card p-6 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-2 pb-3 border-b border-brand-100">
              <div>
                <h3 className="text-sm font-semibold text-brand-900 flex items-center gap-2">
                  <Bot className="text-brand-900" size={18} />
                  Manager Decision Co-pilot
                </h3>
                <p className="text-xs text-brand-400 mt-1 max-w-2xl">
                  Ask policy questions regarding salary advances, fatigue rebalancing, or disputes. You can freely ask follow-up questions to explore counter-offers and roster adjustments in this conversation.
                </p>
              </div>
              {chatMessages.length > 0 && (
                <button
                  type="button"
                  onClick={resetChat}
                  className="btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1"
                >
                  <RotateCcw size={12} /> New Topic
                </button>
              )}
            </div>

            {/* Suggested Prompt Chips (Shown when chat is empty) */}
            {chatMessages.length === 0 && (
              <div className="py-2 space-y-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400">
                  Suggested Manager Inquiries
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    'Paresh has requested an additional Rs 4,000 advance. Should I approve it?',
                    'Which guards at Hazira Port are nearing burnout from overtime?',
                    'Summarize all open grievances across our sites and what actions we should take.',
                    'Show full performance, debt, and attendance evaluation for Suresh Bhai Varma.',
                  ].map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAskCopilot(q)}
                      disabled={copilotLoading}
                      className="text-xs p-3 bg-brand-50 hover:bg-brand-100 text-brand-800 rounded border border-brand-200 transition-colors text-left flex items-start gap-2"
                    >
                      <span className="text-brand-400 font-mono mt-0.5">&bull;</span>
                      <span>{q}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Conversation Thread / Message Stream */}
            {chatMessages.length > 0 && (
              <div className="space-y-5 max-h-[620px] overflow-y-auto pr-1">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="space-y-3">
                    {/* User Question Bubble */}
                    {msg.role === 'user' && (
                      <div className="flex items-start gap-3 justify-end">
                        <div className="bg-brand-900 text-white p-3.5 rounded-lg rounded-tr-none max-w-2xl text-xs sm:text-sm shadow-sm leading-relaxed">
                          <p>{msg.content}</p>
                          <p className="text-[10px] text-brand-300 text-right mt-1.5 font-mono">
                            {msg.timestamp}
                          </p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-brand-200 text-brand-900 flex items-center justify-center font-semibold text-xs flex-shrink-0">
                          <User size={14} />
                        </div>
                      </div>
                    )}

                    {/* Assistant Response Card */}
                    {msg.role === 'assistant' && (
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-900 flex items-center justify-center font-semibold text-xs flex-shrink-0 mt-0.5">
                          <Bot size={16} />
                        </div>
                        <div className="flex-1 min-w-0 space-y-3">
                          {/* Minimized Verification Steps (Default Collapsed!) */}
                          {msg.trace && msg.trace.length > 0 && (
                            <div className="card p-3 border border-brand-200 bg-brand-50/50">
                              <div
                                className="flex items-center justify-between cursor-pointer"
                                onClick={() => toggleTrace(msg.id)}
                              >
                                <div className="flex items-center gap-2 text-xs font-medium text-brand-800">
                                  <Terminal size={14} className="text-brand-700" />
                                  <span>Data Verification & Audit Steps ({msg.trace.length} verified checks)</span>
                                </div>
                                <button
                                  type="button"
                                  className="text-xs font-medium text-brand-600 hover:text-brand-900 flex items-center gap-1"
                                >
                                  {expandedTraces[msg.id] ? 'Hide Steps' : 'View Verification Steps'}
                                  {expandedTraces[msg.id] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                </button>
                              </div>

                              {expandedTraces[msg.id] && (
                                <div className="mt-3 space-y-2.5 pt-2.5 border-t border-brand-200/60">
                                  {msg.trace.map((step) => (
                                    <div key={step.step} className="p-2.5 bg-white rounded border border-brand-100 text-xs space-y-1">
                                      <div className="flex items-center justify-between">
                                        <span className="font-semibold text-brand-900">Step {step.step}: Telemetry Check</span>
                                        <span className="font-mono text-[11px] px-1.5 py-0.5 bg-brand-50 rounded text-brand-700">
                                          Checked {step.action?.split('(')[0]?.replace(/_/g, ' ')}
                                        </span>
                                      </div>
                                      <p className="text-brand-600 font-mono text-[11px] bg-brand-50/50 p-1.5 rounded overflow-x-auto">
                                        {typeof step.observation === 'object' ? JSON.stringify(step.observation) : step.observation}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Beautifully Rendered Decision Memo */}
                          <div className="card p-5 bg-white border border-brand-200 shadow-sm space-y-3">
                            <AIMarkdownMemo content={msg.content} />
                          </div>

                          {/* Suggested Follow-Up Prompt Chips */}
                          {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                            <div className="pt-1">
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400 mb-1.5">
                                Recommended Follow-Up Inquiries
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {msg.suggestedFollowUps.map((f, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => handleAskCopilot(f)}
                                    disabled={copilotLoading}
                                    className="text-xs px-2.5 py-1 bg-white hover:bg-brand-50 text-brand-800 rounded border border-brand-200 transition-colors shadow-2xs"
                                  >
                                    &rarr; {f}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading / Thinking Indicator in Chat Stream */}
                {copilotLoading && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-900 flex items-center justify-center font-semibold text-xs flex-shrink-0 mt-0.5">
                      <Bot size={16} />
                    </div>
                    <div className="p-3.5 bg-brand-50/70 border border-brand-200 rounded-lg flex items-center gap-2.5 text-xs text-brand-700">
                      <RefreshCw size={14} className="animate-spin text-brand-900" />
                      <span>Auditing workforce records and synthesizing decision memo...</span>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>
            )}

            {/* Sticky/Fixed Message Input Form at Bottom */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleAskCopilot()
              }}
              className="flex gap-2 pt-2 border-t border-brand-100"
            >
              <input
                type="text"
                className="input flex-1"
                placeholder={
                  chatMessages.length > 0
                    ? 'Ask a follow-up question or test an alternate decision...'
                    : "Ask any workforce decision question (e.g., 'Can we approve loan for Paresh?', 'Fatigue at Hazira')..."
                }
                value={copilotQuestion}
                onChange={(e) => setCopilotQuestion(e.target.value)}
                disabled={copilotLoading}
              />
              <button
                type="submit"
                disabled={copilotLoading || !copilotQuestion.trim()}
                className="btn-primary flex items-center gap-1.5"
              >
                {copilotLoading ? (
                  <>
                    <RefreshCw className="animate-spin" size={14} />
                    Consulting...
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    Send
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: Grievance Intelligence Desk - Second Position */}
      {activeTab === 'grievances' && (
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-semibold text-brand-900 flex items-center gap-2">
                  <MessageSquareWarning className="text-brand-700" size={18} />
                  Grievance Intelligence & Triage Desk
                </h3>
                <p className="text-xs text-brand-400 mt-0.5 max-w-2xl">
                  Real-time sentiment and urgency triaging computed instantaneously on load. Click &ldquo;Generate Resolution Memo&rdquo; on any ticket to formulate an official empathetic response and site compliance directive on demand.
                </p>
              </div>
              <span className="badge-gray">On-Demand AI Resolution Memos</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {data?.grievanceAnalyses?.map((baseG) => {
              const g = customGrievances[baseG.grievanceId] || baseG
              const isAnalyzing = analyzingGrievance[g.grievanceId]
              const isCustomMemo = g.isLLMGenerated || customGrievances[g.grievanceId]

              return (
                <div key={g.grievanceId} className="card p-5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-brand-900 font-mono">
                        TICKET #{g.grievanceId} &bull; {g.employeeName}
                      </span>
                      <span className={clsx(g.urgencyLevel === 'CRITICAL' ? 'badge-red' : 'badge-yellow')}>
                        URGENCY: {g.urgencyScore}/10 ({g.urgencyLevel})
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-0.5 bg-brand-50 text-brand-800 font-medium rounded border border-brand-200">
                        Category: {g.detectedCategory.replace(/_/g, ' ')}
                      </span>
                      <span className="px-2 py-0.5 bg-brand-50 text-brand-600 font-medium rounded border border-brand-200">
                        Sentiment: {g.sentiment}
                      </span>
                      {isCustomMemo ? (
                        <span className="px-2 py-0.5 bg-green-50 text-green-800 font-medium rounded border border-green-200 flex items-center gap-1">
                          <Sparkles size={11} /> Resolution Memo Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-gray-50 text-gray-600 font-medium rounded border border-gray-200">
                          Initial Triage
                        </span>
                      )}
                    </div>

                    {/* Suggested HR Action */}
                    <div className="bg-brand-50 p-3 rounded border border-brand-100 text-xs text-brand-800 space-y-1">
                      <p className="font-semibold flex items-center gap-1 text-brand-900">
                        <Zap size={13} className="text-brand-700" /> Recommended HR Resolution:
                      </p>
                      <p className="text-brand-700 leading-relaxed">{g.suggestedAction}</p>
                    </div>

                    {/* Official Drafted Memo */}
                    <div className="bg-white p-3 rounded border border-brand-200 text-xs text-brand-700 space-y-1">
                      <p className="font-semibold text-brand-900 flex items-center gap-1">
                        <FileText size={13} className="text-brand-700" /> Official Resolution Memo:
                      </p>
                      <p className="italic leading-relaxed text-brand-800">&ldquo;{g.draftResponse}&rdquo;</p>
                      <p className="text-[10px] text-brand-400 pt-1">
                        Status: Official Communication Draft
                      </p>
                    </div>
                  </div>

                  {/* Explicit Button to Trigger AI Memo */}
                  <div className="pt-2 border-t border-brand-100">
                    <button
                      type="button"
                      onClick={() => handleGenerateAIMemo(g.grievanceId)}
                      disabled={isAnalyzing}
                      className={clsx(
                        'w-full text-xs font-medium py-2 px-3 rounded flex items-center justify-center gap-1.5 transition-colors',
                        isCustomMemo
                          ? 'bg-brand-50 text-brand-900 hover:bg-brand-100 border border-brand-200'
                          : 'btn-primary'
                      )}
                    >
                      {isAnalyzing ? (
                        <>
                          <RefreshCw className="animate-spin" size={13} />
                          Formulating Resolution Memo...
                        </>
                      ) : isCustomMemo ? (
                        <>
                          <Sparkles size={13} />
                          Regenerate Resolution Memo
                        </>
                      ) : (
                        <>
                          <Sparkles size={13} />
                          Generate Resolution Memo (On-Demand)
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Workforce Attrition Radar (XAI) - Third Position */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Employee Roster with Risk Meter */}
            <div className="lg:col-span-2 card overflow-hidden">
              <div className="px-5 py-4 border-b border-brand-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-brand-900">Personnel Attrition & Burnout Radar</h3>
                  <p className="text-xs text-brand-400 mt-0.5">Calculated via 5-factor weighted ensemble model</p>
                </div>
                <span className="text-xs text-brand-500 font-mono">Active Deployment Telemetry</span>
              </div>

              <div className="divide-y divide-brand-50 max-h-[560px] overflow-y-auto">
                {data?.topAtRiskEmployees?.map((emp) => (
                  <div
                    key={emp.employeeId}
                    onClick={() => setSelectedEmp(emp)}
                    className={clsx(
                      'p-4 flex items-center justify-between hover:bg-brand-50 cursor-pointer transition-colors',
                      selectedEmp?.employeeId === emp.employeeId ? 'bg-brand-50 border-l-4 border-brand-900' : ''
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-800 font-semibold flex items-center justify-center text-xs flex-shrink-0">
                        {emp.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-brand-900 text-sm truncate">{emp.name}</p>
                        <p className="text-xs text-brand-400 truncate">
                          {emp.designation} &bull; <span className="font-mono">{emp.employeeCode}</span>
                        </p>
                        <p className="text-xs text-brand-600 truncate mt-0.5">
                          {emp.siteName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-brand-500">Fatigue: {emp.monthlyOvertimeHours}h OT</p>
                        <p className="text-xs text-brand-400">Attendance: {emp.attendanceRate}%</p>
                      </div>
                      <div className="w-24 text-right">
                        <span className={clsx('inline-block mb-1.5', getRiskBadge(emp.riskLevel))}>
                          {emp.riskScore}% {emp.riskLevel}
                        </span>
                        <div className="w-full bg-brand-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={clsx('h-full rounded-full transition-all', getRiskBarColor(emp.riskScore))}
                            style={{ width: `${Math.min(100, emp.riskScore)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Explainable Factor Breakdown */}
            <div className="card p-5 space-y-4">
              {selectedEmp ? (
                <>
                  <div className="border-b border-brand-100 pb-3">
                    <span className={clsx('uppercase', getRiskBadge(selectedEmp.riskLevel))}>
                      {selectedEmp.riskLevel} CHURN RISK ({selectedEmp.riskScore}%)
                    </span>
                    <h3 className="font-semibold text-brand-900 text-base mt-2">{selectedEmp.name}</h3>
                    <p className="text-xs text-brand-400">
                      {selectedEmp.designation} at <span className="font-medium text-brand-700">{selectedEmp.siteName}</span>
                    </p>
                  </div>

                  {/* Primary Drivers */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-brand-400 mb-2">
                      Primary Risk Drivers
                    </p>
                    <div className="space-y-1.5">
                      {selectedEmp.primaryDrivers.map((driver, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs bg-brand-50 p-2.5 rounded border border-brand-100 text-brand-800">
                          <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                          <span>{driver}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Factor Contribution Sliders */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-brand-400 mb-2">
                      Risk Factor Weight Breakdown
                    </p>
                    <div className="space-y-3">
                      {selectedEmp.factors?.map((f, i) => (
                        <div key={i} className="text-xs">
                          <div className="flex justify-between text-brand-700 font-medium mb-1">
                            <span>{f.name} <span className="text-brand-400 font-normal">({(f.weight * 100).toFixed(0)}% weight)</span></span>
                            <span className="font-semibold text-brand-900">{f.impactScore}/100</span>
                          </div>
                          <div className="w-full bg-brand-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={clsx('h-full rounded-full', getRiskBarColor(f.impactScore))}
                              style={{ width: `${f.impactScore}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-brand-400 mt-0.5">{f.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Prescriptive HR Action */}
                  <div className="p-3.5 bg-brand-50 border border-brand-200 rounded">
                    <p className="text-xs font-semibold text-brand-900 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-brand-700" /> Recommended Action Plan
                    </p>
                    <p className="text-xs text-brand-700 mt-1.5 leading-relaxed">
                      {selectedEmp.recommendedAction}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-brand-400 text-center py-10 text-sm">Select an employee to view risk factor breakdown</p>
              )}
            </div>
          </div>

          {/* Integrated Operational Fatigue & Payroll Anomalies */}
          <div className="card p-5">
            <div className="flex items-center justify-between pb-3 border-b border-brand-100 mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle size={17} className="text-amber-600" />
                <h4 className="text-sm font-semibold text-brand-900">
                  Operational Fatigue & Payroll Anomalies ({data?.detectedAnomalies?.length || 0})
                </h4>
              </div>
              <span className="text-xs text-brand-400 font-mono">Automated Muster Scanner</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data?.detectedAnomalies?.map((ano) => (
                <div
                  key={ano.id}
                  className={clsx(
                    'p-4 rounded border flex flex-col justify-between gap-3',
                    ano.severity === 'CRITICAL'
                      ? 'bg-red-50/40 border-red-200'
                      : 'bg-amber-50/30 border-amber-200'
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={ano.severity === 'CRITICAL' ? 'badge-red' : 'badge-yellow'}>
                        {ano.severity}
                      </span>
                      <span className="text-xs font-mono text-brand-400">{ano.id}</span>
                      <span className="text-xs font-semibold text-brand-800">{ano.type.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-sm font-medium text-brand-900">{ano.employeeName} ({ano.siteName})</p>
                    <p className="text-xs text-brand-600">{ano.description}</p>
                  </div>

                  <div className="bg-white p-2.5 rounded border border-brand-200 text-xs">
                    <p className="font-semibold text-brand-900 flex items-center gap-1">
                      <Zap size={12} className="text-brand-700" /> Action: <span className="font-normal text-brand-700">{ano.action}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: What-If Simulation Sandbox - Last Position */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 card p-6 space-y-6">
            <div className="border-b border-brand-100 pb-3">
              <h3 className="text-sm font-semibold text-brand-900 flex items-center gap-2">
                <Sliders className="text-brand-700" size={18} />
                Workforce Risk Scenario Simulator
              </h3>
              <p className="text-xs text-brand-400 mt-0.5">
                Simulate hypothetical staffing parameters live. Adjust sliders to observe how the predictive risk engine dynamically recalculates turnover probability.
              </p>
            </div>

            <div className="space-y-4">
              {/* Attendance */}
              <div>
                <div className="flex justify-between text-xs font-medium text-brand-800 mb-1.5">
                  <span>Monthly Attendance: <strong className="text-brand-900">{simAttendance} / 26 days</strong> ({((simAttendance / 26) * 100).toFixed(0)}%)</span>
                  <span className="text-brand-400">Weight: 28%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="26"
                  value={simAttendance}
                  onChange={(e) => setSimAttendance(e.target.value)}
                  className="w-full h-1.5 bg-brand-200 rounded appearance-none cursor-pointer accent-brand-900"
                />
              </div>

              {/* Overtime */}
              <div>
                <div className="flex justify-between text-xs font-medium text-brand-800 mb-1.5">
                  <span>Overtime Fatigue: <strong className="text-brand-900">{simOvertime} Hours/Month</strong></span>
                  <span className="text-brand-400">Weight: 24%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="70"
                  value={simOvertime}
                  onChange={(e) => setSimOvertime(e.target.value)}
                  className="w-full h-1.5 bg-brand-200 rounded appearance-none cursor-pointer accent-brand-900"
                />
                <p className="text-[11px] text-brand-400 mt-1">Exceeding 40 hours triggers severe physical fatigue threshold under standard labor norms.</p>
              </div>

              {/* Advance Loan vs Monthly Wage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Unrecovered Advance (₹)</label>
                  <input
                    type="number"
                    value={simAdvance}
                    onChange={(e) => setSimAdvance(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Monthly Wage (₹)</label>
                  <input
                    type="number"
                    value={simWage}
                    onChange={(e) => setSimWage(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              {/* Grievances & Tenure */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Open Grievances Count</label>
                  <select
                    value={simGrievances}
                    onChange={(e) => setSimGrievances(e.target.value)}
                    className="input"
                  >
                    <option value="0">0 Grievances</option>
                    <option value="1">1 Grievance</option>
                    <option value="2">2 Grievances</option>
                    <option value="3">3+ Grievances</option>
                  </select>
                </div>
                <div>
                  <label className="label">Tenure at Site (Months)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={simTenure}
                    onChange={(e) => setSimTenure(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              {/* Night Shift Toggle */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="nightShift"
                  checked={simNightShift}
                  onChange={(e) => setSimNightShift(e.target.checked)}
                  className="rounded text-brand-900 focus:ring-brand-900 w-4 h-4 border-brand-300"
                />
                <label htmlFor="nightShift" className="text-xs font-medium text-brand-700 cursor-pointer">
                  Assigned to Continuous Night Security Vigil (Circadian stress penalty)
                </label>
              </div>
            </div>
          </div>

          {/* Real-time Simulator Output */}
          <div className="lg:col-span-5 card p-6 space-y-6 bg-white border border-brand-200">
            <div className="flex items-center justify-between border-b border-brand-100 pb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-brand-600 flex items-center gap-1.5 font-medium">
                <Sparkles size={14} className="text-brand-900" /> Dynamic Risk Modeling
              </span>
              <span className="text-xs font-mono text-brand-400">Instantaneous Evaluation</span>
            </div>

            {/* Score Meter */}
            <div className="text-center py-4 bg-brand-50/50 rounded border border-brand-100">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-400">Predicted Turnover Risk</p>
              <div className="flex items-baseline justify-center gap-1 mt-2">
                <span className="text-5xl font-bold tracking-tight text-brand-900">
                  {simResult?.predictedRiskScore ?? 0}%
                </span>
              </div>
              <div className="mt-3">
                <span className={clsx('uppercase', getRiskBadge(simResult?.riskLevel))}>
                  {simResult?.riskLevel} RISK LEVEL
                </span>
              </div>
            </div>

            {/* Playbook Output */}
            <div className="bg-brand-50 p-4 rounded border border-brand-100 space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-900">
                Prescriptive Mitigation Playbook
              </p>
              <ul className="space-y-2 text-xs text-brand-700">
                {simResult?.retentionAdvice?.map((advice, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-brand-900 mt-0.5 flex-shrink-0" />
                    <span>{advice}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Active Driver Flags */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-400 mb-2">Active Contributing Factors</p>
              <div className="flex flex-wrap gap-1.5">
                {simResult?.primaryDrivers?.map((d, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 bg-brand-50 rounded border border-brand-100 text-brand-800">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

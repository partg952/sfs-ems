import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  File04, ChevronRight, Download01, Calendar, AlertTriangle, Clock, UserX01, TrendUp01,
} from '@untitledui/icons'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart,
} from 'recharts'
import PageHeader from '../../components/PageHeader'
import StatCard from '../../components/StatCard'
import LoadingSpinner from '../../components/LoadingSpinner'
import { getInsights } from '../../api/attendanceReports'
import { MONTHS } from '../../utils/format'

const REPORTS = [
  {
    to: '/attendance-reports/ethnic',
    icon: File04,
    title: 'Ethnic Attendance Report',
    description: 'Housekeeping staff punch data - dual 8-hour / 9-hour shift duty calculation, site-wise summaries, Excel and PDF billing exports.',
  },
  {
    to: '/attendance-reports/product',
    icon: File04,
    title: 'Haldiram Product - Daily Work Report',
    description: 'Daily punch log, duty status and overtime summary across sites with a consolidated cross-site view, Excel and PDF billing exports.',
  },
  {
    to: '/attendance-reports/product-shift',
    icon: File04,
    title: 'Haldiram Product - Shift Attendance Report',
    description: '8-hour / 9-hour dual shift duty calculation with Karol Bagh night-shift handling, consolidated PDF and one PDF per site.',
  },
  {
    to: '/attendance-reports/muster-roll',
    icon: Calendar,
    title: 'Muster Roll',
    description: 'Calendar-grid attendance sheet (P / H / A / M / WO per day) per site with weekly-off handling, matching the original muster roll layout.',
  },
]

function AnomalyInsights() {
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    getInsights(6).then((r) => setInsights(r.data?.data ?? null)).finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner message="Aggregating workforce anomaly signals..." />
  if (!insights) return null

  const { summary, lowAttendance, overtimeViolations, recentAutoLeft, monthlyTrend } = insights
  const hasAnyData = monthlyTrend.length > 0

  if (!hasAnyData) return null // no punch data uploaded yet - nothing to show

  const chartData = monthlyTrend.map((m) => ({
    period: `${MONTHS[m.month - 1].slice(0, 3)} ${m.year}`,
    'Avg Attendance Days': m.avgAttendanceDays,
    'Total OT Hours': m.totalOvertimeHours,
  }))

  const cards = [
    {
      key: 'lowAttendance', label: 'Low Attendance', value: summary.lowAttendanceCount, icon: AlertTriangle, tone: 'yellow',
      sub: '< 75% of working days', items: lowAttendance,
      render: (i) => `${i.name} (${i.employeeCode}) — ${i.days} days in ${MONTHS[i.month - 1]} ${i.year}`,
    },
    {
      key: 'overtimeViolations', label: 'Overtime Violations', value: summary.overtimeViolationCount, icon: Clock, tone: 'red',
      sub: '> 40h statutory limit', items: overtimeViolations,
      render: (i) => `${i.name} (${i.employeeCode}) — ${i.hours}h in ${MONTHS[i.month - 1]} ${i.year}`,
    },
    {
      key: 'halfDay', label: 'Half-Day Occurrences', value: summary.halfDayCount, icon: TrendUp01, tone: 'blue',
      sub: 'across all synced periods', items: null,
    },
    {
      key: 'autoLeft', label: 'Auto-Flagged Departures', value: summary.autoLeftCount, icon: UserX01, tone: 'gray',
      sub: 'last 6 months, reversible', items: recentAutoLeft,
      render: (i) => `${i.name} (${i.employeeCode}) — ${new Date(i.changedAt).toLocaleDateString()}`,
    },
  ]

  return (
    <div className="mb-8">
      <p className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-3">Workforce Anomaly Insights</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {cards.map((c) => (
          <button
            key={c.key}
            onClick={() => c.items && setExpanded(expanded === c.key ? null : c.key)}
            className={`text-left ${c.items && c.items.length > 0 ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <StatCard label={c.label} value={c.value} icon={c.icon} tone={c.tone} sub={c.sub} />
          </button>
        ))}
      </div>

      {expanded && cards.find((c) => c.key === expanded)?.items?.length > 0 && (
        <div className="card p-4 mb-4 text-sm">
          <p className="font-medium text-brand-900 mb-2">{cards.find((c) => c.key === expanded).label} — detail</p>
          <ul className="list-disc list-inside space-y-1 text-brand-600">
            {cards.find((c) => c.key === expanded).items.map((i, idx) => (
              <li key={idx}>{cards.find((c) => c.key === expanded).render(i)}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card p-5">
        <p className="text-sm font-medium text-brand-900 mb-3">Attendance &amp; Overtime Trend</p>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
            <XAxis dataKey="period" tick={{ fontSize: 12, fill: '#525252' }} />
            <YAxis tick={{ fontSize: 12, fill: '#525252' }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Avg Attendance Days" fill="#111111" barSize={28} />
            <Line dataKey="Total OT Hours" stroke="#a8a8a8" strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default function AttendanceReportsPage() {
  return (
    <div>
      <PageHeader
        title="Attendance Report Generator"
        subtitle="Upload raw biometric punch exports to automate large attendance sheets into billing-ready summaries"
        action={
          <Link to="/attendance-reports/downloads" className="btn-primary text-sm">
            <Download01 size={15} /> Downloads
          </Link>
        }
      />

      <AnomalyInsights />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORTS.map((r) => (
          <Link key={r.to} to={r.to} className="card p-5 hover:bg-brand-50 transition-colors flex items-start gap-4">
            <div className="p-2.5 rounded bg-brand-50 border border-brand-100">
              <r.icon size={20} className="text-brand-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-brand-900">{r.title}</p>
              <p className="text-sm text-brand-400 mt-1">{r.description}</p>
            </div>
            <ChevronRight size={18} className="text-brand-300 mt-1" />
          </Link>
        ))}
      </div>
    </div>
  )
}

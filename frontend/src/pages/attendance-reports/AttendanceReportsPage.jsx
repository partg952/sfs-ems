import { Link } from 'react-router-dom'
import { File04, ChevronRight, Download01, Calendar } from '@untitledui/icons'
import PageHeader from '../../components/PageHeader'

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

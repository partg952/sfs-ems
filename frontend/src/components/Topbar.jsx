import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { roleBadge } from '../utils/format'

// Static label map for known path segments. Dynamic segments (ids) are
// skipped here - deep pages that need a real entity name in the trail
// (e.g. an employee's name) render their own <Breadcrumbs items={...} />
// inside the page body instead of relying on this generic topbar trail.
const SEGMENT_LABELS = {
  employees: 'Employees',
  new: 'New',
  edit: 'Edit',
  payroll: 'Payroll',
  attendance: 'Attendance',
  ledger: 'Ledger',
  advances: 'Advances',
  fines: 'Fines',
  assets: 'Assets',
  clients: 'Clients',
  leave: 'Leave',
  grievances: 'Grievances',
  shifts: 'Shifts',
  reports: 'Reports',
  slip: 'Slip',
  admin: 'Admin',
  self: 'Self Service',
  payslips: 'Payslips',
  'ai-insights': 'AI Insights',
  'attendance-reports': 'Attendance Reports',
  ethnic: 'Ethnic',
  product: 'Product',
  'product-shift': 'Product Shift',
  'muster-roll': 'Muster Roll',
  downloads: 'Downloads',
}

function isDynamicSegment(seg) {
  // Numeric ids or month/year path params - not worth a static label
  return /^\d+$/.test(seg)
}

export default function Topbar() {
  const { user } = useAuth()
  const location = useLocation()

  const segments = location.pathname.split('/').filter(Boolean)
  const crumbs = []
  let path = ''
  for (const seg of segments) {
    path += `/${seg}`
    if (isDynamicSegment(seg)) continue
    crumbs.push({ label: SEGMENT_LABELS[seg] || seg, to: path })
  }

  const initials = (user?.fullName || user?.username || '?')
    .split(' ')
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="flex items-center justify-between px-12 sm:px-14 py-3 border-b border-brand-100 flex-shrink-0">
      <nav className="flex items-center gap-1.5 text-[13px] text-brand-400 min-w-0 overflow-hidden">
        <Link to="/" className="hover:text-brand-700 transition-colors flex-shrink-0">Home</Link>
        {crumbs.map((c, i) => (
          <span key={c.to} className="flex items-center gap-1.5 min-w-0">
            <span className="text-brand-200">/</span>
            {i === crumbs.length - 1 ? (
              <span className="text-brand-700 font-medium truncate">{c.label}</span>
            ) : (
              <Link to={c.to} className="hover:text-brand-700 transition-colors truncate">{c.label}</Link>
            )}
          </span>
        ))}
      </nav>

      <div className="flex items-center gap-2.5 flex-shrink-0">
        <span className={roleBadge(user?.role)}>{user?.role?.replace(/_/g, ' ')}</span>
        <div
          title={user?.fullName}
          className="w-8 h-8 rounded-full bg-brand-900 text-white font-semibold flex items-center justify-center text-[11px] ring-2 ring-white shadow-sm flex-shrink-0"
        >
          {initials}
        </div>
      </div>
    </div>
  )
}

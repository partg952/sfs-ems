import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Users, LayoutGrid, Wallet, BookText,
  Building, Shield, FileBarChart, LogOut,
  PanelLeftClose, PanelLeftOpen, Briefcase,
  CalendarDays, MessageSquareWarning, Clock,
  FileText, Brain
} from 'lucide-react'
import clsx from 'clsx'

// roles:null means "any authenticated role" — every entry here must
// explicitly exclude EMPLOYEE (self-service accounts use selfNavItems
// instead), since these routes expose the full employee roster/HR tools.
const ALL_HR_ROLES = ['SUPER_ADMIN','HR_MANAGER','HR_STAFF','ACCOUNTS','VIEWER']

const navItems = [
  { to: '/',           label: 'Dashboard',   icon: LayoutGrid,          roles: ALL_HR_ROLES },
  { to: '/ai-insights',label: 'Insights',    icon: Brain,               roles: ALL_HR_ROLES },
  { to: '/employees',  label: 'Employees',   icon: Users,               roles: ALL_HR_ROLES },
  { to: '/payroll',    label: 'Payroll',     icon: Wallet,              roles: ['SUPER_ADMIN','HR_MANAGER','HR_STAFF','ACCOUNTS'] },
  { to: '/ledger',     label: 'Ledger',      icon: BookText,            roles: ['SUPER_ADMIN','HR_MANAGER','HR_STAFF'] },
  { to: '/assets',     label: 'Assets',      icon: Building,            roles: ['SUPER_ADMIN','HR_MANAGER','HR_STAFF'] },
  { to: '/clients',    label: 'Clients',     icon: Briefcase,           roles: ALL_HR_ROLES },
  { to: '/leave',      label: 'Leave',       icon: CalendarDays,        roles: ['SUPER_ADMIN','HR_MANAGER','HR_STAFF'] },
  { to: '/grievances', label: 'Grievances',  icon: MessageSquareWarning,roles: ['SUPER_ADMIN','HR_MANAGER','HR_STAFF'] },
  { to: '/shifts',     label: 'Shifts',      icon: Clock,               roles: ['SUPER_ADMIN','HR_MANAGER','HR_STAFF','ACCOUNTS'] },
  { to: '/reports',    label: 'Reports',     icon: FileBarChart,        roles: ['SUPER_ADMIN','HR_MANAGER','ACCOUNTS'] },
  { to: '/admin',      label: 'Admin',       icon: Shield,              roles: ['SUPER_ADMIN'] },
]

const selfNavItems = [
  { to: '/',               label: 'My Dashboard',  icon: LayoutGrid },
  { to: '/self/payslips',  label: 'My Payslips',   icon: FileText },
  { to: '/self/leave',     label: 'My Leave',      icon: CalendarDays },
  { to: '/self/grievances',label: 'My Grievances', icon: MessageSquareWarning },
]

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth()
  const items = user?.role === 'EMPLOYEE' ? selfNavItems : navItems

  return (
    <aside
      className={clsx(
        'min-h-screen bg-brand-900 flex flex-col transition-all duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-3 py-4 border-b border-brand-800">
        <img src="/favicon.png" alt="Logo" className="w-8 h-8 flex-shrink-0 rounded" />
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm leading-tight truncate">Shreeji Facility</p>
            <p className="text-brand-400 text-[10px] uppercase tracking-wider">Services</p>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <div className="px-3 py-2 border-b border-brand-800">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center p-1.5 rounded text-brand-400 hover:text-white hover:bg-brand-800 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {items.map(({ to, label, icon: Icon, roles }) => {
          if (roles && !roles.includes(user?.role)) return null
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-2.5 py-2 rounded text-sm font-medium transition-colors',
                  collapsed && 'justify-center',
                  isActive
                    ? 'bg-white text-brand-900'
                    : 'text-brand-300 hover:bg-brand-800 hover:text-white'
                )
              }
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-2 py-3 border-t border-brand-800">
        {!collapsed && (
          <div className="px-2.5 mb-2">
            <p className="text-white text-sm font-medium truncate">{user?.fullName}</p>
            <p className="text-brand-400 text-xs">{user?.role?.replace(/_/g, ' ')}</p>
          </div>
        )}
        <button
          onClick={logout}
          title="Sign out"
          className={clsx(
            'flex items-center gap-2 w-full px-2.5 py-2 rounded text-sm text-brand-300 hover:bg-brand-800 hover:text-white transition-colors',
            collapsed && 'justify-center'
          )}
        >
          <LogOut size={16} className="flex-shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  )
}

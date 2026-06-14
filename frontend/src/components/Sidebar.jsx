import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Users01, Grid01, Wallet01, BookOpen01,
  Building07, Shield01, BarChart01, LogOut01,
  LayoutLeft, Briefcase01,
  Calendar, MessageChatCircle, Clock,
  File02, Stars01, File04
} from '@untitledui/icons'
import clsx from 'clsx'

// roles:null means "any authenticated role" — every entry here must
// explicitly exclude EMPLOYEE (self-service accounts use selfNavItems
// instead), since these routes expose the full employee roster/HR tools.
const ALL_HR_ROLES = ['SUPER_ADMIN','HR_MANAGER','HR_STAFF','ACCOUNTS','VIEWER']

const navItems = [
  { to: '/',           label: 'Dashboard',   icon: Grid01,              roles: ALL_HR_ROLES },
  { to: '/ai-insights',label: 'Insights',    icon: Stars01,             roles: ALL_HR_ROLES },
  { to: '/employees',  label: 'Employees',   icon: Users01,             roles: ALL_HR_ROLES },
  { to: '/payroll',    label: 'Payroll',     icon: Wallet01,            roles: ['SUPER_ADMIN','HR_MANAGER','HR_STAFF','ACCOUNTS'] },
  { to: '/attendance-reports', label: 'Attendance Reports', icon: File04, roles: ['SUPER_ADMIN','HR_MANAGER','HR_STAFF','ACCOUNTS'] },
  { to: '/ledger',     label: 'Ledger',      icon: BookOpen01,          roles: ['SUPER_ADMIN','HR_MANAGER','HR_STAFF'] },
  { to: '/assets',     label: 'Assets',      icon: Building07,          roles: ['SUPER_ADMIN','HR_MANAGER','HR_STAFF'] },
  { to: '/clients',    label: 'Clients',     icon: Briefcase01,         roles: ALL_HR_ROLES },
  { to: '/leave',      label: 'Leave',       icon: Calendar,            roles: ['SUPER_ADMIN','HR_MANAGER','HR_STAFF'] },
  { to: '/grievances', label: 'Grievances',  icon: MessageChatCircle,   roles: ['SUPER_ADMIN','HR_MANAGER','HR_STAFF'] },
  { to: '/shifts',     label: 'Shifts',      icon: Clock,               roles: ['SUPER_ADMIN','HR_MANAGER','HR_STAFF','ACCOUNTS'] },
  { to: '/reports',    label: 'Reports',     icon: BarChart01,          roles: ['SUPER_ADMIN','HR_MANAGER','ACCOUNTS'] },
  { to: '/admin',      label: 'Admin',       icon: Shield01,            roles: ['SUPER_ADMIN'] },
]

const selfNavItems = [
  { to: '/',               label: 'My Dashboard',  icon: Grid01 },
  { to: '/self/payslips',  label: 'My Payslips',   icon: File02 },
  { to: '/self/leave',     label: 'My Leave',      icon: Calendar },
  { to: '/self/grievances',label: 'My Grievances', icon: MessageChatCircle },
]

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth()
  const items = user?.role === 'EMPLOYEE' ? selfNavItems : navItems

  return (
    <aside
      className={clsx(
        'min-h-[calc(100vh-1.5rem)] bg-brand-900 rounded-2xl flex flex-col transition-all duration-200 flex-shrink-0 shadow-sm',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo / Brand - click to expand when collapsed; collapse button shown when expanded */}
      <div className={clsx('flex items-center gap-2 px-4 py-5', collapsed && 'justify-center px-2')}>
        <button
          onClick={collapsed ? onToggle : undefined}
          title={collapsed ? 'Expand sidebar' : undefined}
          className={clsx(
            'flex items-center gap-3 min-w-0 rounded-lg',
            collapsed ? 'p-1 hover:bg-white/[0.08] transition-colors' : 'flex-1 cursor-default'
          )}
        >
          <img src="/favicon.png" alt="Logo" className="w-8 h-8 flex-shrink-0 rounded-lg" />
          {!collapsed && (
            <div className="min-w-0 text-left">
              <p className="text-white font-semibold text-sm leading-tight truncate">Shreeji Facility</p>
              <p className="text-brand-400 text-[10px] uppercase tracking-wider">Services</p>
            </div>
          )}
        </button>
        {!collapsed && (
          <button
            onClick={onToggle}
            title="Collapse sidebar"
            className="flex items-center justify-center w-8 h-8 rounded-full text-brand-400 hover:text-white hover:bg-white/[0.08] transition-colors flex-shrink-0"
          >
            <LayoutLeft className="size-[17px]" strokeWidth={1.75} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className={clsx('flex-1 py-2 space-y-0.5 overflow-y-auto', collapsed ? 'px-2' : 'px-3')}>
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
                  'group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-150',
                  collapsed && 'justify-center px-0',
                  isActive
                    ? 'bg-white text-brand-900 shadow-[0_1px_2px_rgba(0,0,0,0.15)]'
                    : 'text-brand-300 hover:bg-white/[0.07] hover:text-white'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={clsx('size-[19px] flex-shrink-0', isActive ? 'text-brand-900' : 'text-brand-400 group-hover:text-white')}
                    strokeWidth={isActive ? 2 : 1.75}
                  />
                  {!collapsed && <span className="truncate">{label}</span>}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* User footer */}
      <div className={clsx('pt-2 pb-4 border-t border-white/[0.08] mt-2', collapsed ? 'px-2' : 'px-3')}>
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-3.5 py-3">
            <div className="w-8 h-8 rounded-full bg-white/10 text-white font-semibold flex items-center justify-center text-[11px] flex-shrink-0 ring-2 ring-white/10">
              {(user?.fullName || user?.username || '?').split(' ').map((p) => p.charAt(0)).slice(0, 2).join('').toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.fullName}</p>
              <p className="text-brand-400 text-[11px] mt-0.5">{user?.role?.replace(/_/g, ' ')}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          title="Sign out"
          className={clsx(
            'group flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-[13.5px] font-medium text-brand-300 hover:bg-white/[0.07] hover:text-white transition-all duration-150',
            collapsed && 'justify-center px-0'
          )}
        >
          <LogOut01 className="size-[18px] flex-shrink-0 text-brand-400 group-hover:text-white" strokeWidth={1.75} />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, UserCheck, UserX, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getEmployees } from '../api/employees'
import StatCard from '../components/StatCard'
import PageHeader from '../components/PageHeader'
import LoadingSpinner from '../components/LoadingSpinner'
import { formatDate, statusBadge } from '../utils/format'
import SelfDashboard from './self/SelfDashboard'

export default function Dashboard() {
  const { user } = useAuth()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.role === 'EMPLOYEE') { setLoading(false); return }
    getEmployees().then(r => setEmployees(r.data?.data ?? [])).finally(() => setLoading(false))
  }, [user?.role])

  if (user?.role === 'EMPLOYEE') return <SelfDashboard />

  const active   = employees.filter(e => e.status === 'ACTIVE').length
  const left     = employees.filter(e => e.status === 'LEFT').length
  const rejoined = employees.filter(e => e.status === 'REJOINED').length
  const recent   = [...employees].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.fullName}`}
        subtitle={new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Employees" value={employees.length} icon={Users} />
        <StatCard label="Active"          value={active}           icon={UserCheck} />
        <StatCard label="Left"            value={left}             icon={UserX} />
        <StatCard label="Rejoined"        value={rejoined}         icon={UserCheck} />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link to="/employees/new" className="card p-4 flex items-center justify-between hover:bg-brand-50 transition-colors">
          <span className="text-sm font-medium text-brand-900">Add Employee</span>
          <ArrowRight size={16} className="text-brand-400" />
        </Link>
        <Link to="/payroll" className="card p-4 flex items-center justify-between hover:bg-brand-50 transition-colors">
          <span className="text-sm font-medium text-brand-900">Process Payroll</span>
          <ArrowRight size={16} className="text-brand-400" />
        </Link>
        <Link to="/ledger" className="card p-4 flex items-center justify-between hover:bg-brand-50 transition-colors">
          <span className="text-sm font-medium text-brand-900">Record Transaction</span>
          <ArrowRight size={16} className="text-brand-400" />
        </Link>
      </div>

      {/* Recent employees */}
      <div className="card">
        <div className="px-5 py-4 border-b border-brand-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-brand-900">Recently Added</h2>
          <Link to="/employees" className="text-brand-500 text-xs font-medium hover:text-brand-900 transition-colors">
            View all
          </Link>
        </div>
        <div className="divide-y divide-brand-50">
          {recent.map(emp => (
            <Link key={emp.id} to={`/employees/${emp.id}`}
              className="flex items-center gap-4 px-5 py-3 hover:bg-brand-50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-semibold flex items-center justify-center text-xs flex-shrink-0">
                {emp.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-brand-900 truncate">{emp.name}</p>
                <p className="text-xs text-brand-400">{emp.designation} - {emp.siteName}</p>
              </div>
              <div className="text-right">
                <span className={statusBadge(emp.status)}>{emp.status}</span>
                <p className="text-xs text-brand-300 mt-0.5">{formatDate(emp.joiningDate)}</p>
              </div>
            </Link>
          ))}
          {recent.length === 0 && (
            <p className="text-center text-brand-400 py-8 text-sm">No employees yet</p>
          )}
        </div>
      </div>
    </div>
  )
}

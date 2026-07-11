import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, CalendarDays, MessageSquareWarning, ArrowRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getMyProfile, getMyLeaveBalances } from '../../api/self'
import PageHeader from '../../components/PageHeader'
import LoadingSpinner from '../../components/LoadingSpinner'
import { statusBadge } from '../../utils/format'

export default function SelfDashboard() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [balances, setBalances] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getMyProfile(), getMyLeaveBalances()])
      .then(([pR, bR]) => {
        setProfile(pR.data?.data)
        setBalances(bR.data?.data ?? [])
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.fullName}`}
        subtitle={new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      />

      {profile && (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-brand-900">{profile.name}</p>
              <p className="text-sm text-brand-400">{profile.employeeCode} - {profile.designation} - {profile.siteName}</p>
            </div>
            <span className={statusBadge(profile.status)}>{profile.status}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link to="/self/payslips" className="card p-4 flex items-center justify-between hover:bg-brand-50 transition-colors">
          <span className="text-sm font-medium text-brand-900 flex items-center gap-2"><FileText size={16}/> My Payslips</span>
          <ArrowRight size={16} className="text-brand-400" />
        </Link>
        <Link to="/self/leave" className="card p-4 flex items-center justify-between hover:bg-brand-50 transition-colors">
          <span className="text-sm font-medium text-brand-900 flex items-center gap-2"><CalendarDays size={16}/> My Leave</span>
          <ArrowRight size={16} className="text-brand-400" />
        </Link>
        <Link to="/self/grievances" className="card p-4 flex items-center justify-between hover:bg-brand-50 transition-colors">
          <span className="text-sm font-medium text-brand-900 flex items-center gap-2"><MessageSquareWarning size={16}/> My Grievances</span>
          <ArrowRight size={16} className="text-brand-400" />
        </Link>
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-brand-100">
          <h2 className="text-sm font-semibold text-brand-900">Leave Balances</h2>
        </div>
        <div className="divide-y divide-brand-50">
          {balances.length === 0 && <p className="text-center text-brand-400 py-8 text-sm">No leave balances recorded yet</p>}
          {balances.map(b => (
            <div key={b.id} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-brand-700">{b.leaveTypeName}</span>
              <span className="text-sm font-medium text-brand-900">{b.remaining} / {b.allocated} days remaining</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

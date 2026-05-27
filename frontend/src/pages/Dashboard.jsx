import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import { Users, Building, ShieldCheck } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.fullName || 'User'}`}
        description="Overview of Shreeji Facility Services operations and workforce metrics."
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Active Guards" value="--" icon={Users} color="blue" />
        <StatCard title="Client Sites" value="--" icon={Building} color="green" />
        <StatCard title="Duty Compliance" value="100%" icon={ShieldCheck} color="purple" />
      </div>
    </div>
  )
}

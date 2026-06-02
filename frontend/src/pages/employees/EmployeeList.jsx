import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { getEmployees } from '../../api/employees'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/PageHeader'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import { formatDate, statusBadge } from '../../utils/format'

const STATUSES = ['ALL', 'ACTIVE', 'LEFT', 'REJOINED']

export default function EmployeeList() {
  const { canWrite } = useAuth()
  const [employees, setEmployees] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [filter,    setFilter]    = useState('ALL')

  useEffect(() => {
    setLoading(true)
    getEmployees()
      .then(r => setEmployees(r.data?.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = employees.filter(e => {
    const matchStatus = filter === 'ALL' || e.status === filter
    const q = search.toLowerCase()
    const matchSearch = !q || e.name.toLowerCase().includes(q) ||
      e.employeeCode.toLowerCase().includes(q) ||
      e.designation?.toLowerCase().includes(q) ||
      e.siteName?.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle={`${filtered.length} employee${filtered.length !== 1 ? 's' : ''} found`}
        action={canWrite() && (
          <Link to="/employees/new" className="btn-primary">
            <Plus size={16} /> Add Employee
          </Link>
        )}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
          <input
            className="input pl-9"
            placeholder="Search by name, code, designation, site..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                filter === s
                  ? 'bg-brand-900 text-white'
                  : 'bg-white text-brand-600 border border-brand-200 hover:bg-brand-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <EmptyState
          title="No employees found"
          message="Try adjusting your search or filters"
          action={canWrite() && (
            <Link to="/employees/new" className="btn-primary mt-2">
              <Plus size={16} /> Add First Employee
            </Link>
          )}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3 text-left">Employee</th>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Designation</th>
                  <th className="px-4 py-3 text-left">Site</th>
                  <th className="px-4 py-3 text-left">Joined</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {filtered.map(emp => (
                  <tr key={emp.id} className="hover:bg-brand-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-semibold flex items-center justify-center text-xs flex-shrink-0">
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-brand-900">{emp.name}</p>
                          <p className="text-xs text-brand-400">{emp.mobileNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-brand-500">{emp.employeeCode}</td>
                    <td className="px-4 py-3 text-brand-700">{emp.designation}</td>
                    <td className="px-4 py-3 text-brand-700">{emp.siteName}</td>
                    <td className="px-4 py-3 text-brand-500">{formatDate(emp.joiningDate)}</td>
                    <td className="px-4 py-3">
                      <span className={statusBadge(emp.status)}>{emp.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/employees/${emp.id}`} className="text-brand-900 hover:underline text-xs font-medium">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchMd } from '@untitledui/icons'
import { getEmployees } from '../../api/employees'
import { saveAttendance, getPayrollByMonth, getAttendancePrefill } from '../../api/payroll'
import PageHeader from '../../components/PageHeader'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { MONTHS } from '../../utils/format'

export default function AttendancePage() {
  const navigate   = useNavigate()
  const now        = new Date()
  const [month,    setMonth]    = useState(now.getMonth() + 1)
  const [year,     setYear]     = useState(now.getFullYear())
  const [employees,setEmployees]= useState([])
  const [existing, setExisting] = useState({})
  const [synced,   setSynced]   = useState({})
  const [inputs,   setInputs]   = useState({})
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getEmployees({ status: 'ACTIVE' }),
      getPayrollByMonth(month, year),
      getAttendancePrefill(month, year),
    ]).then(([eR, pR, sR]) => {
      const emps = eR.data?.data ?? []
      setEmployees(emps.filter(e => e.status === 'ACTIVE'))
      const syncedMap = sR.data?.data ?? {}
      setSynced(syncedMap)

      const payrollMap = {}
      const inputMap   = {}
      for (const p of (pR.data?.data ?? [])) {
        payrollMap[p.employeeId] = p.attendanceDays
        inputMap[p.employeeId]   = p.attendanceDays ?? ''
      }
      // Pre-fill from punch-file auto-sync for employees not yet saved to
      // payroll - manual/saved payroll values always take precedence and
      // are never overwritten by the sync.
      for (const [employeeId, info] of Object.entries(syncedMap)) {
        if (payrollMap[employeeId] == null) {
          inputMap[employeeId] = info.days
        }
      }
      setExisting(payrollMap)
      setInputs(inputMap)
    }).finally(() => setLoading(false))
  }, [month, year])

  const handleChange = (empId, val) => {
    setInputs(prev => ({ ...prev, [empId]: val }))
  }

  const handleSaveAll = async () => {
    setSaving(true)
    const entries = employees
      .filter(emp => inputs[emp.id] !== '' && inputs[emp.id] != null)
      .map(emp => ({ employeeId: emp.id, days: Number(inputs[emp.id]) }))

    if (entries.length === 0) { setSaving(false); return }

    try {
      await saveAttendance({ entries, month, year })
      toast.success(`Saved attendance for ${entries.length} employee(s)`)
    } catch {
      toast.error('Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  const filteredEmployees = employees.filter(emp => {
    const q = search.toLowerCase()
    return !q ||
      emp.name.toLowerCase().includes(q) ||
      emp.employeeCode.toLowerCase().includes(q) ||
      emp.siteName?.toLowerCase().includes(q)
  })

  return (
    <div>
      <PageHeader
        title="Enter Attendance"
        subtitle="Input payable attendance days for each active employee"
      />

      <div className="flex gap-3 mb-5">
        <select value={month} onChange={e => setMonth(+e.target.value)} className="input w-40">
          {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(+e.target.value)} className="input w-28">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div className="relative flex-1 max-w-xs">
          <SearchMd size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
          <input
            className="input pl-9 w-full"
            placeholder="Search by name, code, site..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button onClick={handleSaveAll} disabled={saving || loading} className="btn-primary ml-auto">
          {saving ? 'Saving...' : 'Save All Attendance'}
        </button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Site</th>
                <th className="px-4 py-3 text-center w-32">Payable Days</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {filteredEmployees.map(emp => {
                const saved = existing[emp.id] != null
                const autoSynced = !saved && synced[emp.id] != null
                return (
                  <tr key={emp.id} className="hover:bg-brand-50">
                    <td className="px-4 py-3 font-medium text-brand-900">{emp.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-brand-500">{emp.employeeCode}</td>
                    <td className="px-4 py-3 text-brand-600">{emp.siteName}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number" min="0" max="31" step="0.5"
                        value={inputs[emp.id] ?? ''}
                        onChange={e => handleChange(emp.id, e.target.value)}
                        className="input text-center"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {saved
                        ? <span className="badge-green">Saved</span>
                        : autoSynced
                          ? <span className="badge-blue" title={`Auto-synced from ${synced[emp.id]?.reportType || 'punch import'} - review and Save to confirm`}>Auto-synced</span>
                          : <span className="badge-yellow">Pending</span>
                      }
                    </td>
                  </tr>
                )
              })}
              {employees.length === 0 && (
                <tr><td colSpan={5} className="text-center py-10 text-brand-400">{search ? 'No employees match your search' : 'No active employees'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

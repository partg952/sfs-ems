import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getEmployees } from '../../api/employees'
import { saveAttendance, getPayrollByMonth } from '../../api/payroll'
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
  const [inputs,   setInputs]   = useState({})
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getEmployees({ status: 'ACTIVE' }),
      getPayrollByMonth(month, year),
    ]).then(([eR, pR]) => {
      const emps = eR.data?.data ?? []
      setEmployees(emps.filter(e => e.status === 'ACTIVE'))
      const payrollMap = {}
      const inputMap   = {}
      for (const p of (pR.data?.data ?? [])) {
        payrollMap[p.employeeId] = p.attendanceDays
        inputMap[p.employeeId]   = p.attendanceDays ?? ''
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
    let success = 0, failed = 0
    for (const emp of employees) {
      const days = inputs[emp.id]
      if (days === '' || days == null) continue
      try {
        await saveAttendance({
          employeeId: emp.id,
          month, year,
          attendanceDays: Number(days),
          totalWorkingDays: 26,
        })
        success++
      } catch { failed++ }
    }
    setSaving(false)
    if (success) toast.success(`Saved attendance for ${success} employee(s)`)
    if (failed)  toast.error(`Failed to save ${failed} record(s)`)
  }

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

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
              {employees.map(emp => {
                const saved = existing[emp.id] != null
                return (
                  <tr key={emp.id} className="hover:bg-brand-50">
                    <td className="px-4 py-3 font-medium text-brand-900">{emp.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-brand-500">{emp.employeeCode}</td>
                    <td className="px-4 py-3 text-brand-600">{emp.siteName}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number" min="0" max="31"
                        value={inputs[emp.id] ?? ''}
                        onChange={e => handleChange(emp.id, e.target.value)}
                        className="input text-center"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {saved
                        ? <span className="badge-green">Saved</span>
                        : <span className="badge-yellow">Pending</span>
                      }
                    </td>
                  </tr>
                )
              })}
              {employees.length === 0 && (
                <tr><td colSpan={5} className="text-center py-10 text-brand-400">No active employees</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

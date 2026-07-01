import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Play, FileText, ClipboardList } from 'lucide-react'
import { getPayrollByMonth, processPayroll } from '../../api/payroll'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/PageHeader'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import { formatCurrency, payrollStatusBadge, MONTHS } from '../../utils/format'
import toast from 'react-hot-toast'

export default function PayrollPage() {
  const { canWrite } = useAuth()
  const now  = new Date()
  const [month,    setMonth]    = useState(now.getMonth() + 1)
  const [year,     setYear]     = useState(now.getFullYear())
  const [records,  setRecords]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [processing, setProcessing] = useState(false)

  const load = () => {
    setLoading(true)
    getPayrollByMonth(month, year)
      .then(r => setRecords(r.data?.data ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [month, year])

  const handleProcess = async () => {
    setProcessing(true)
    try {
      const r = await processPayroll({ month, year })
      toast.success(`Processed payroll for ${r.data?.data?.length ?? 0} employees`)
      load()
    } catch {/* handled */} finally { setProcessing(false) }
  }

  const totalNet   = records.reduce((s, r) => s + (r.netSalary   ?? 0), 0)
  const totalGross = records.reduce((s, r) => s + (r.grossSalary ?? 0), 0)
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  return (
    <div>
      <PageHeader
        title="Payroll"
        subtitle={`${MONTHS[month - 1]} ${year}`}
        action={
          <div className="flex gap-2">
            {canWrite() && (
              <Link to="/payroll/attendance" className="btn-secondary">
                <ClipboardList size={16} /> Enter Attendance
              </Link>
            )}
            {canWrite() && (
              <button onClick={handleProcess} disabled={processing} className="btn-primary">
                <Play size={16} /> {processing ? 'Processing...' : 'Process Payroll'}
              </button>
            )}
          </div>
        }
      />

      {/* Period selector */}
      <div className="flex gap-3 mb-5">
        <select value={month} onChange={e => setMonth(+e.target.value)} className="input w-40">
          {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(+e.target.value)} className="input w-28">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Summary bar */}
      {records.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[
            { label: 'Employees',  value: records.length },
            { label: 'Total Gross',value: formatCurrency(totalGross) },
            { label: 'Total Net',  value: formatCurrency(totalNet) },
          ].map(({ label, value }) => (
            <div key={label} className="card px-5 py-4">
              <p className="text-xs text-brand-400 font-medium">{label}</p>
              <p className="text-xl font-semibold text-brand-900 mt-1">{value}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? <LoadingSpinner /> : records.length === 0 ? (
        <EmptyState
          title="No payroll records"
          message="Enter attendance first, then click Process Payroll"
          action={canWrite() && (
            <Link to="/payroll/attendance" className="btn-primary mt-2">
              <ClipboardList size={16}/> Enter Attendance
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
                  <th className="px-4 py-3 text-center">Days</th>
                  <th className="px-4 py-3 text-right">Gross</th>
                  <th className="px-4 py-3 text-right">Overtime</th>
                  <th className="px-4 py-3 text-right">ESIC</th>
                  <th className="px-4 py-3 text-right">EPF</th>
                  <th className="px-4 py-3 text-right">Advance</th>
                  <th className="px-4 py-3 text-right">Fines</th>
                  <th className="px-4 py-3 text-right">Rent</th>
                  <th className="px-4 py-3 text-right font-semibold">Net Pay</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Slip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {records.map(r => (
                  <tr key={r.id} className="hover:bg-brand-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-brand-900">{r.employeeName}</p>
                      <p className="text-xs text-brand-400">{r.employeeCode}</p>
                    </td>
                    <td className="px-4 py-3 text-center">{r.attendanceDays ?? '—'}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(r.grossSalary)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(r.overtimeEarning)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatCurrency(r.esicDeduction)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatCurrency(r.epfDeduction)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatCurrency(r.advanceDeduction)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatCurrency(r.fineDeduction)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatCurrency(r.rentDeduction)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-brand-900">{formatCurrency(r.netSalary)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={payrollStatusBadge(r.status)}>{r.status}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        to={`/reports/slip/${r.employeeId}/${r.payrollMonth}/${r.payrollYear}`}
                        className="text-brand-600 hover:text-brand-900 text-xs"
                      >
                        <FileText size={14} />
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

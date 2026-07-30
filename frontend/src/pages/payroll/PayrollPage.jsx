import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Play, File02, Clipboard, CheckCircle, RefreshCcw01 } from '@untitledui/icons'
import { getPayrollByMonth, processPayroll, markPayrollPaid, recalculatePayroll } from '../../api/payroll'
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
      toast.success(r.data?.message ?? 'Payroll processed successfully')
      load()
    } catch {/* handled */} finally { setProcessing(false) }
  }

  const [markingPaidId, setMarkingPaidId] = useState(null)
  const handleMarkPaid = async (id) => {
    setMarkingPaidId(id)
    try {
      await markPayrollPaid(id)
      toast.success('Marked as paid')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark as paid')
    } finally {
      setMarkingPaidId(null)
    }
  }

  const [recalculatingId, setRecalculatingId] = useState(null)
  const handleRecalculate = async (id) => {
    setRecalculatingId(id)
    try {
      await recalculatePayroll(id)
      toast.success('Gross pay recalculated from current wage')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to recalculate')
    } finally {
      setRecalculatingId(null)
    }
  }

  const totalNet   = records.reduce((s, r) => s + (r.netSalary   ?? 0), 0)
  const totalGross = records.reduce((s, r) => s + (r.grossSalary ?? 0), 0)
  const unsetWageCount = records.filter(r => r.grossSalary === 0 && r.attendanceDays > 0).length
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
                <Clipboard size={16} /> Enter Attendance
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

      {unsetWageCount > 0 && (
        <div className="card p-3 mb-5 border-l-4 border-l-amber-500 text-sm text-amber-800 bg-amber-50">
          {unsetWageCount} employee(s) show ₹0.00 gross pay. This happens when Daily/Monthly Wage is still 0 on their
          profile, or was set <em>after</em> this payroll record was already created (e.g. auto-created from a punch-file
          import). If you've since set their wage in Employee Hub, click <strong>Recalculate</strong> on that row below
          (visible for DRAFT/PROCESSED records) to pull in the current wage - it won't affect already-PAID records.
        </div>
      )}

      {loading ? <LoadingSpinner /> : records.length === 0 ? (
        <EmptyState
          title="No payroll records"
          message="Enter attendance first, then click Process Payroll"
          action={canWrite() && (
            <Link to="/payroll/attendance" className="btn-primary mt-2">
              <Clipboard size={16}/> Enter Attendance
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
              <tbody className="divide-y divide-brand-50 table-row-zebra">
                {records.map(r => (
                  <tr key={r.id} className="hover:bg-brand-50">
                    <td className="px-4 py-3">
                      <Link to={`/employees/${r.employeeId}`} className="font-medium text-brand-900 hover:underline">{r.employeeName}</Link>
                      <p className="text-xs text-brand-400">{r.employeeCode}</p>
                    </td>
                    <td className="px-4 py-3 text-center">{r.attendanceDays ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(r.grossSalary)}
                      {r.grossSalary === 0 && r.attendanceDays > 0 && (
                        <span
                          className="block text-[10px] text-amber-600 font-normal"
                          title="Gross pay is ₹0 - either Daily/Monthly Wage is unset, or was set after this record was created. If the employee's wage is now set, use Recalculate."
                        >
                          Wage not set
                        </span>
                      )}
                      {r.grossSalary === 0 && r.attendanceDays > 0 && r.status !== 'PAID' && canWrite() && (
                        <button
                          onClick={() => handleRecalculate(r.id)}
                          disabled={recalculatingId === r.id}
                          className="mt-1 flex items-center gap-1 justify-end text-[10px] text-brand-600 hover:text-brand-900 ml-auto"
                        >
                          <RefreshCcw01 size={10} /> {recalculatingId === r.id ? 'Recalculating...' : 'Recalculate'}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">{formatCurrency(r.overtimeEarning)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatCurrency(r.esicDeduction)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatCurrency(r.epfDeduction)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatCurrency(r.advanceDeduction)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatCurrency(r.fineDeduction)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatCurrency(r.rentDeduction)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-brand-900">{formatCurrency(r.netSalary)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={payrollStatusBadge(r.status)}>{r.status}</span>
                      {r.status === 'PROCESSED' && canWrite() && (
                        <button
                          onClick={() => handleMarkPaid(r.id)}
                          disabled={markingPaidId === r.id}
                          className="mt-1 flex items-center gap-1 justify-center text-xs text-brand-600 hover:text-brand-900 mx-auto"
                        >
                          <CheckCircle size={12} /> {markingPaidId === r.id ? 'Marking...' : 'Mark Paid'}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        to={`/reports/slip/${r.employeeId}/${r.payrollMonth}/${r.payrollYear}`}
                        className="text-brand-600 hover:text-brand-900 text-xs"
                      >
                        <File02 size={14} />
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

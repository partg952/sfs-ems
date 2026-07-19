import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { File02 } from '@untitledui/icons'
import { getPayrollByMonth } from '../../api/payroll'
import PageHeader from '../../components/PageHeader'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import { formatCurrency, payrollStatusBadge, MONTHS } from '../../utils/format'

export default function ReportsPage() {
  const now  = new Date()
  const [month,   setMonth]   = useState(now.getMonth() + 1)
  const [year,    setYear]    = useState(now.getFullYear())
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getPayrollByMonth(month, year)
      .then(r => setRecords(r.data?.data ?? []))
      .finally(() => setLoading(false))
  }, [month, year])

  const processed = records.filter(r => r.status !== 'DRAFT')
  const totalNet  = processed.reduce((s, r) => s + (r.netSalary ?? 0), 0)
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  return (
    <div>
      <PageHeader
        title="Reports and Salary Slips"
        subtitle="View and print salary slips for any payroll period"
      />

      <div className="flex gap-3 mb-5">
        <select value={month} onChange={e => setMonth(+e.target.value)} className="input w-40">
          {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(+e.target.value)} className="input w-28">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {processed.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="card px-5 py-4">
            <p className="text-xs text-brand-400">Total Slips</p>
            <p className="text-2xl font-semibold text-brand-900 mt-1">{processed.length}</p>
          </div>
          <div className="card px-5 py-4">
            <p className="text-xs text-brand-400">Total Net Payable</p>
            <p className="text-2xl font-semibold text-brand-900 mt-1">{formatCurrency(totalNet)}</p>
          </div>
          <div className="card px-5 py-4">
            <p className="text-xs text-brand-400">Period</p>
            <p className="text-2xl font-semibold text-brand-900 mt-1">{MONTHS[month-1]} {year}</p>
          </div>
        </div>
      )}

      {loading ? <LoadingSpinner /> : processed.length === 0 ? (
        <EmptyState
          title="No processed payroll records"
          message={`Process payroll for ${MONTHS[month-1]} ${year} first`}
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
                  <th className="px-4 py-3 text-right">Deductions</th>
                  <th className="px-4 py-3 text-right">Net Pay</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Slip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50 table-row-zebra">
                {processed.map(r => (
                  <tr key={r.id} className="hover:bg-brand-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-brand-900">{r.employeeName}</p>
                      <p className="text-xs text-brand-400">{r.employeeCode} - {r.designation}</p>
                    </td>
                    <td className="px-4 py-3 text-center">{r.attendanceDays}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(r.grossSalary)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatCurrency(r.totalDeductions)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-brand-900">{formatCurrency(r.netSalary)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={payrollStatusBadge(r.status)}>{r.status}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        to={`/reports/slip/${r.employeeId}/${r.payrollMonth}/${r.payrollYear}`}
                        className="btn-secondary text-xs py-1"
                      >
                        <File02 size={13}/> View Slip
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

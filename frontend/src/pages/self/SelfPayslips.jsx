import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { getMyPayslips } from '../../api/self'
import PageHeader from '../../components/PageHeader'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import { formatCurrency, payrollStatusBadge, MONTHS } from '../../utils/format'

export default function SelfPayslips() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyPayslips().then(r => setRecords(r.data?.data ?? [])).finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader title="My Payslips" subtitle="Your salary history, month by month" />

      {records.length === 0 ? (
        <EmptyState title="No payslips yet" message="Payslips appear here once HR processes payroll" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left">Period</th>
                <th className="px-4 py-3 text-center">Days</th>
                <th className="px-4 py-3 text-right">Gross</th>
                <th className="px-4 py-3 text-right">Net Pay</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Slip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {records.map(r => (
                <tr key={r.id} className="hover:bg-brand-50">
                  <td className="px-4 py-3 font-medium text-brand-900">{MONTHS[r.payrollMonth - 1]} {r.payrollYear}</td>
                  <td className="px-4 py-3 text-center">{r.attendanceDays ?? '—'}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(r.grossSalary)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-brand-900">{formatCurrency(r.netSalary)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={payrollStatusBadge(r.status)}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link to={`/self/payslips/slip/${r.payrollMonth}/${r.payrollYear}`} className="text-brand-600 hover:text-brand-900 text-xs">
                      <FileText size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

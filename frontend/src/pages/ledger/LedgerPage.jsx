import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { getAllTransactions } from '../../api/ledger'
import PageHeader from '../../components/PageHeader'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import { formatCurrency, formatDate } from '../../utils/format'

const cards = [
  {
    to: '/ledger/advances',
    title: 'Advances',
    desc: 'Record and manage cash advances given to employees. Track pending recoveries.',
  },
  {
    to: '/ledger/fines',
    title: 'Fines',
    desc: 'Record fines imposed on employees. Fines are auto-deducted during payroll processing.',
  },
]

const TYPE_LABELS = { ADVANCE: 'Advance', FINE: 'Fine', PAYROLL: 'Salary Payment' }
const TYPE_BADGES = { ADVANCE: 'badge-yellow', FINE: 'badge-red', PAYROLL: 'badge-green' }

export default function LedgerPage() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllTransactions()
      .then(r => setTransactions(r.data?.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <PageHeader
        title="Financial Ledger"
        subtitle="Manage all financial transactions outside of base salary"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {cards.map(({ to, title, desc }) => (
          <Link key={to} to={to} className="card p-6 hover:bg-brand-50 transition-colors flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-brand-900">{title}</h3>
              <p className="text-brand-400 text-sm mt-1">{desc}</p>
            </div>
            <ArrowRight size={18} className="text-brand-300 flex-shrink-0" />
          </Link>
        ))}
      </div>

      <h3 className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-3">Centralized Ledger</h3>
      {loading ? <LoadingSpinner /> : transactions.length === 0 ? (
        <EmptyState title="No transactions recorded" />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto max-h-[32rem] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Transaction ID</th>
                  <th className="px-4 py-3 text-left">Employee</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Remark</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {transactions.map(t => (
                  <tr key={t.transactionId} className="hover:bg-brand-50">
                    <td className="px-4 py-3">
                      <span className={TYPE_BADGES[t.type] || 'badge-gray'}>{TYPE_LABELS[t.type] || t.type}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-brand-400">{t.transactionId}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-brand-900">{t.employeeName}</p>
                      <p className="text-xs text-brand-400">{t.employeeCode}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-brand-800">{formatCurrency(t.amount)}</td>
                    <td className="px-4 py-3 text-brand-600">{formatDate(t.transactionDate)}</td>
                    <td className="px-4 py-3 text-brand-500">{t.remark || '—'}</td>
                    <td className="px-4 py-3 text-brand-500">{t.status || '—'}</td>
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

// Indian Rupee currency formatting with commas

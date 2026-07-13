import { useEffect, useState } from 'react'
import { Plus, CheckCircle } from '@untitledui/icons'
import { getAllAdvances, createAdvance, markAdvanceRecovered } from '../../api/ledger'
import { getEmployees } from '../../api/employees'
import { useAuth } from '../../context/AuthContext'
import { useForm } from 'react-hook-form'
import PageHeader from '../../components/PageHeader'
import Modal from '../../components/Modal'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import { formatCurrency, formatDate } from '../../utils/format'
import toast from 'react-hot-toast'

export default function AdvancePage() {
  const { canWrite } = useAuth()
  const [advances,  setAdvances]  = useState([])
  const [employees, setEmployees] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filter,    setFilter]    = useState('ALL')
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  const load = () => {
    setLoading(true)
    Promise.all([getAllAdvances(), getEmployees()])
      .then(([aR, eR]) => {
        setAdvances(aR.data?.data ?? [])
        setEmployees(eR.data?.data ?? [])
      }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const onSubmit = async (data) => {
    try {
      await createAdvance({ ...data, amount: Number(data.amount), employeeId: Number(data.employeeId) })
      toast.success('Advance recorded')
      reset()
      setShowModal(false)
      load()
    } catch {/* handled */}
  }

  const handleRecover = async (id) => {
    try {
      await markAdvanceRecovered(id)
      toast.success('Marked as recovered')
      load()
    } catch {/* handled */}
  }

  const filtered = advances.filter(a =>
    filter === 'ALL' ? true : filter === 'PENDING' ? !a.isRecovered : a.isRecovered
  )

  const pendingTotal = advances.filter(a => !a.isRecovered).reduce((s, a) => s + Number(a.amount), 0)

  return (
    <div>
      <PageHeader
        title="Advance Management"
        subtitle={`Pending: ${formatCurrency(pendingTotal)}`}
        action={canWrite() && (
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} /> Record Advance
          </button>
        )}
      />

      <div className="flex gap-1.5 mb-5">
        {['ALL','PENDING','RECOVERED'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              filter === f ? 'bg-brand-900 text-white' : 'bg-white border border-brand-200 text-brand-600 hover:bg-brand-50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <EmptyState
          title="No advance records"
          message="Advances issued to employees will appear here and get auto-deducted during payroll"
          action={canWrite() && (
            <button onClick={() => setShowModal(true)} className="btn-primary mt-2">
              <Plus size={16} /> Record Advance
            </button>
          )}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3 text-left">Transaction ID</th>
                  <th className="px-4 py-3 text-left">Employee</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Remark</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  {canWrite() && <th className="px-4 py-3 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50 table-row-zebra">
                {filtered.map(a => (
                  <tr key={a.id} className="hover:bg-brand-50">
                    <td className="px-4 py-3 font-mono text-xs text-brand-400">{a.transactionId}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-brand-900">{a.employeeName}</p>
                      <p className="text-xs text-brand-400">{a.employeeCode}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-brand-900">{formatCurrency(a.amount)}</td>
                    <td className="px-4 py-3 text-brand-600">{formatDate(a.advanceDate)}</td>
                    <td className="px-4 py-3 text-brand-500">{a.remark || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={a.isRecovered ? 'badge-green' : 'badge-yellow'}>
                        {a.isRecovered ? 'Recovered' : 'Pending'}
                      </span>
                    </td>
                    {canWrite() && (
                      <td className="px-4 py-3 text-center">
                        {!a.isRecovered && (
                          <button
                            onClick={() => handleRecover(a.id)}
                            className="text-brand-600 hover:text-brand-900 inline-flex items-center gap-1 text-xs font-medium"
                          >
                            <CheckCircle size={14} /> Recover
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <Modal title="Record Advance" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Employee *</label>
              <select {...register('employeeId', { required: true })} className="input">
                <option value="">Select employee</option>
                {employees.filter(e => e.status === 'ACTIVE').map(e => (
                  <option key={e.id} value={e.id}>{e.name} ({e.employeeCode})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Amount (Rs.) *</label>
              <input {...register('amount', { required: true, min: 1 })} type="number" step="0.01" className="input" placeholder="0.00" />
            </div>
            <div>
              <label className="label">Date *</label>
              <input {...register('advanceDate', { required: true })} type="date" className="input"
                defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
            <div>
              <label className="label">Remark</label>
              <input {...register('remark')} className="input" placeholder="Optional note" />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={isSubmitting} className="btn-primary">
                {isSubmitting ? 'Saving...' : 'Record Advance'}
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

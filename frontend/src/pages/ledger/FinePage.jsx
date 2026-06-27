import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { getAllFines, createFine } from '../../api/ledger'
import { getEmployees } from '../../api/employees'
import { useAuth } from '../../context/AuthContext'
import { useForm } from 'react-hook-form'
import PageHeader from '../../components/PageHeader'
import Modal from '../../components/Modal'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import { formatCurrency, formatDate } from '../../utils/format'
import toast from 'react-hot-toast'

export default function FinePage() {
  const { canWrite } = useAuth()
  const [fines,     setFines]     = useState([])
  const [employees, setEmployees] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  const load = () => {
    setLoading(true)
    Promise.all([getAllFines(), getEmployees()])
      .then(([fR, eR]) => {
        setFines(fR.data?.data ?? [])
        setEmployees(eR.data?.data ?? [])
      }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const onSubmit = async (data) => {
    try {
      await createFine({ ...data, amount: Number(data.amount), employeeId: Number(data.employeeId) })
      toast.success('Fine recorded')
      reset()
      setShowModal(false)
      load()
    } catch {/* handled */}
  }

  const totalFines = fines.reduce((s, f) => s + Number(f.amount), 0)

  return (
    <div>
      <PageHeader
        title="Fine Management"
        subtitle={`Total fines recorded: ${formatCurrency(totalFines)}`}
        action={canWrite() && (
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} /> Record Fine
          </button>
        )}
      />

      {loading ? <LoadingSpinner /> : fines.length === 0 ? (
        <EmptyState title="No fine records" message="Fines recorded here will be auto-deducted during payroll" />
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
                  <th className="px-4 py-3 text-left">Site</th>
                  <th className="px-4 py-3 text-left">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {fines.map(f => (
                  <tr key={f.id} className="hover:bg-brand-50">
                    <td className="px-4 py-3 font-mono text-xs text-brand-400">{f.transactionId}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-brand-900">{f.employeeName}</p>
                      <p className="text-xs text-brand-400">{f.employeeCode}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">{formatCurrency(f.amount)}</td>
                    <td className="px-4 py-3 text-brand-600">{formatDate(f.fineDate)}</td>
                    <td className="px-4 py-3 text-brand-500">{f.site || '—'}</td>
                    <td className="px-4 py-3 text-brand-700">{f.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <Modal title="Record Fine" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Employee *</label>
              <select {...register('employeeId', { required: true })} className="input">
                <option value="">Select employee</option>
                {employees.map(e => (
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
              <input {...register('fineDate', { required: true })} type="date" className="input"
                defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
            <div>
              <label className="label">Work Site</label>
              <input {...register('site')} className="input" placeholder="Site where incident occurred" />
            </div>
            <div>
              <label className="label">Reason *</label>
              <input {...register('reason', { required: 'Reason is required' })} className="input" placeholder="Reason for fine" />
              {errors.reason && <p className="text-red-600 text-xs mt-1">{errors.reason.message}</p>}
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={isSubmitting} className="btn-primary">
                {isSubmitting ? 'Saving...' : 'Record Fine'}
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// Disciplinary violation category presets

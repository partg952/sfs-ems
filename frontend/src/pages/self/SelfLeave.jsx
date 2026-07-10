import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { getMyLeaveBalances, getMyLeaveRequests, applyForLeave, getMyLeaveTypes } from '../../api/self'
import { useForm } from 'react-hook-form'
import PageHeader from '../../components/PageHeader'
import Modal from '../../components/Modal'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import { formatDate, leaveStatusBadge } from '../../utils/format'
import toast from 'react-hot-toast'

export default function SelfLeave() {
  const [balances, setBalances] = useState([])
  const [requests, setRequests] = useState([])
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  const load = () => {
    setLoading(true)
    Promise.all([getMyLeaveBalances(), getMyLeaveRequests(), getMyLeaveTypes()])
      .then(([bR, rR, tR]) => {
        setBalances(bR.data?.data ?? [])
        setRequests(rR.data?.data ?? [])
        setTypes(tR.data?.data ?? [])
      }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const onSubmit = async (data) => {
    try {
      await applyForLeave({ ...data, leaveTypeId: Number(data.leaveTypeId) })
      toast.success('Leave request submitted')
      reset()
      setShowModal(false)
      load()
    } catch {/* handled */}
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader
        title="My Leave"
        subtitle="View your leave balances and requests"
        action={
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} /> Apply for Leave
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {balances.map(b => (
          <div key={b.id} className="card p-4">
            <p className="text-xs text-brand-400">{b.leaveTypeName}</p>
            <p className="text-xl font-semibold text-brand-900 mt-1">{b.remaining} <span className="text-sm font-normal text-brand-400">/ {b.allocated} days</span></p>
          </div>
        ))}
        {balances.length === 0 && <p className="text-sm text-brand-400">No leave balances recorded yet</p>}
      </div>

      {requests.length === 0 ? (
        <EmptyState title="No leave requests yet" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Dates</th>
                <th className="px-4 py-3 text-center">Days</th>
                <th className="px-4 py-3 text-left">Reason</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {requests.map(r => (
                <tr key={r.id} className="hover:bg-brand-50">
                  <td className="px-4 py-3 text-brand-700">{r.leaveTypeName}</td>
                  <td className="px-4 py-3 text-brand-600">{formatDate(r.startDate)} - {formatDate(r.endDate)}</td>
                  <td className="px-4 py-3 text-center">{r.days}</td>
                  <td className="px-4 py-3 text-brand-500">{r.reason || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={leaveStatusBadge(r.status)}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title="Apply for Leave" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Leave Type *</label>
              <select {...register('leaveTypeId', { required: true })} className="input">
                <option value="">Select leave type</option>
                {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Start Date *</label>
                <input {...register('startDate', { required: true })} type="date" className="input" />
              </div>
              <div>
                <label className="label">End Date *</label>
                <input {...register('endDate', { required: true })} type="date" className="input" />
              </div>
            </div>
            <div>
              <label className="label">Reason</label>
              <input {...register('reason')} className="input" placeholder="Reason for leave" />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={isSubmitting} className="btn-primary">
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Plus, Check, X } from 'lucide-react'
import { getLeaveTypes, createLeaveType, getLeaveRequests, approveLeaveRequest, rejectLeaveRequest } from '../../api/leave'
import { useForm } from 'react-hook-form'
import PageHeader from '../../components/PageHeader'
import Modal from '../../components/Modal'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import { formatDate, leaveStatusBadge } from '../../utils/format'
import toast from 'react-hot-toast'

const STATUS_FILTERS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED']

export default function LeavePage() {
  const [requests, setRequests] = useState([])
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('PENDING')
  const [showTypeModal, setShowTypeModal] = useState(false)
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm()

  const load = () => {
    setLoading(true)
    Promise.all([getLeaveRequests(), getLeaveTypes()])
      .then(([rR, tR]) => {
        setRequests(rR.data?.data ?? [])
        setTypes(tR.data?.data ?? [])
      }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = requests.filter(r => filter === 'ALL' || r.status === filter)

  const onCreateType = async (data) => {
    try {
      await createLeaveType({ ...data, defaultAnnualDays: Number(data.defaultAnnualDays) })
      toast.success('Leave type created')
      reset()
      setShowTypeModal(false)
      load()
    } catch {/* handled */}
  }

  const handleApprove = async (id) => {
    try {
      await approveLeaveRequest(id)
      toast.success('Leave approved')
      load()
    } catch {/* handled */}
  }

  const handleReject = async (id) => {
    try {
      await rejectLeaveRequest(id)
      toast.success('Leave rejected')
      load()
    } catch {/* handled */}
  }

  return (
    <div>
      <PageHeader
        title="Leave Management"
        subtitle={`${types.length} leave type${types.length !== 1 ? 's' : ''} configured`}
        action={
          <button onClick={() => setShowTypeModal(true)} className="btn-secondary">
            <Plus size={16} /> Add Leave Type
          </button>
        }
      />

      <div className="flex gap-1.5 mb-5">
        {STATUS_FILTERS.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
              filter === s ? 'bg-brand-900 text-white' : 'bg-white text-brand-600 border border-brand-200 hover:bg-brand-50'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <EmptyState title="No leave requests found" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Dates</th>
                <th className="px-4 py-3 text-center">Days</th>
                <th className="px-4 py-3 text-left">Reason</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-brand-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-brand-900">{r.employeeName}</p>
                    <p className="text-xs text-brand-400">{r.employeeCode}</p>
                  </td>
                  <td className="px-4 py-3 text-brand-700">{r.leaveTypeName}</td>
                  <td className="px-4 py-3 text-brand-600">{formatDate(r.startDate)} - {formatDate(r.endDate)}</td>
                  <td className="px-4 py-3 text-center">{r.days}</td>
                  <td className="px-4 py-3 text-brand-500">{r.reason || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={leaveStatusBadge(r.status)}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.status === 'PENDING' && (
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => handleApprove(r.id)} className="text-green-600 hover:text-green-700" title="Approve">
                          <Check size={16} />
                        </button>
                        <button onClick={() => handleReject(r.id)} className="text-red-600 hover:text-red-700" title="Reject">
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showTypeModal && (
        <Modal title="Add Leave Type" onClose={() => setShowTypeModal(false)}>
          <form onSubmit={handleSubmit(onCreateType)} className="space-y-4">
            <div>
              <label className="label">Name *</label>
              <input {...register('name', { required: true })} className="input" placeholder="e.g. Casual Leave" />
            </div>
            <div>
              <label className="label">Default Annual Days *</label>
              <input {...register('defaultAnnualDays', { required: true })} type="number" min="0" className="input" placeholder="12" />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={isSubmitting} className="btn-primary">
                {isSubmitting ? 'Saving...' : 'Add Leave Type'}
              </button>
              <button type="button" onClick={() => setShowTypeModal(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

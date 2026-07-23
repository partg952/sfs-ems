import { useEffect, useState } from 'react'
import { Plus } from '@untitledui/icons'
import { getMyGrievances, raiseGrievance } from '../../api/self'
import { useForm } from 'react-hook-form'
import PageHeader from '../../components/PageHeader'
import Modal from '../../components/Modal'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import { formatDate, grievanceStatusBadge } from '../../utils/format'
import toast from 'react-hot-toast'

export default function SelfGrievances() {
  const [grievances, setGrievances] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  const load = () => {
    setLoading(true)
    getMyGrievances().then(r => setGrievances(r.data?.data ?? [])).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const onSubmit = async (data) => {
    try {
      await raiseGrievance(data.description)
      toast.success('Grievance submitted')
      reset()
      setShowModal(false)
      load()
    } catch {/* handled */}
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader
        title="My Grievances"
        subtitle="Raise a concern and track its resolution"
        action={
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} /> Raise Grievance
          </button>
        }
      />

      {grievances.length === 0 ? (
        <EmptyState
          title="No grievances raised"
          message="Raise a concern and track its resolution here"
          action={
            <button onClick={() => setShowModal(true)} className="btn-primary mt-2">
              <Plus size={16} /> Raise Grievance
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {grievances.map(g => (
            <div key={g.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={grievanceStatusBadge(g.status)}>{g.status.replace(/_/g, ' ')}</span>
                <span className="text-xs text-brand-400">{formatDate(g.createdAt)}</span>
              </div>
              <p className="text-sm text-brand-800">{g.description}</p>
              {g.actionTaken && (
                <p className="text-xs text-brand-500 mt-2"><strong>Action taken:</strong> {g.actionTaken}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="Raise Grievance" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Description *</label>
              <textarea
                {...register('description', { required: 'Description is required' })}
                className="input" rows={4} placeholder="Describe your concern"
              />
              {errors.description && <p className="text-red-600 text-xs mt-1">{errors.description.message}</p>}
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={isSubmitting} className="btn-primary">
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

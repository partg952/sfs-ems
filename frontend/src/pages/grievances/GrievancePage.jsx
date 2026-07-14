import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { getGrievances, createGrievance, updateGrievanceStatus } from '../../api/grievances'
import { getEmployees } from '../../api/employees'
import { useAuth } from '../../context/AuthContext'
import { useForm } from 'react-hook-form'
import PageHeader from '../../components/PageHeader'
import Modal from '../../components/Modal'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import { formatDate, grievanceStatusBadge } from '../../utils/format'
import toast from 'react-hot-toast'

const TYPES = ['CLIENT_COMPLAINT', 'EMPLOYEE_GRIEVANCE', 'DISCIPLINARY']
const STATUSES = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED']
const STATUS_FILTERS = ['ALL', ...STATUSES]

export default function GrievancePage() {
  const { user } = useAuth()
  const [grievances, setGrievances] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const createForm = useForm()
  const statusForm = useForm()

  const load = () => {
    setLoading(true)
    Promise.all([getGrievances(), getEmployees()])
      .then(([gR, eR]) => {
        setGrievances(gR.data?.data ?? [])
        setEmployees(eR.data?.data ?? [])
      }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = grievances.filter(g => filter === 'ALL' || g.status === filter)

  const onCreate = async (data) => {
    try {
      await createGrievance({ ...data, employeeId: Number(data.employeeId) })
      toast.success('Grievance recorded')
      createForm.reset()
      setShowModal(false)
      load()
    } catch {/* handled */}
  }

  const openStatusUpdate = (g) => {
    setEditing(g)
    statusForm.reset({ status: g.status, actionTaken: g.actionTaken || '' })
  }

  const onStatusSubmit = async (data) => {
    try {
      await updateGrievanceStatus(editing.id, { ...data, handledBy: user?.fullName })
      toast.success('Grievance updated')
      setEditing(null)
      load()
    } catch {/* handled */}
  }

  return (
    <div>
      <PageHeader
        title="Grievance & Disciplinary"
        subtitle="Client complaints, employee grievances, and disciplinary actions"
        action={
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} /> Record Grievance
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
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <EmptyState title="No grievances found" />
      ) : (
        <div className="space-y-3">
          {filtered.map(g => (
            <button key={g.id} onClick={() => openStatusUpdate(g)} className="card p-4 w-full text-left hover:bg-brand-50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="badge-gray mr-2">{g.type.replace(/_/g, ' ')}</span>
                  <span className={grievanceStatusBadge(g.status)}>{g.status.replace(/_/g, ' ')}</span>
                </div>
                <span className="text-xs text-brand-400">{formatDate(g.createdAt)}</span>
              </div>
              <p className="text-sm font-medium text-brand-900">{g.employeeName} <span className="text-xs text-brand-400 font-normal">({g.employeeCode})</span></p>
              <p className="text-sm text-brand-700 mt-1">{g.description}</p>
              {g.actionTaken && <p className="text-xs text-brand-500 mt-2"><strong>Action taken:</strong> {g.actionTaken}</p>}
            </button>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="Record Grievance" onClose={() => setShowModal(false)}>
          <form onSubmit={createForm.handleSubmit(onCreate)} className="space-y-4">
            <div>
              <label className="label">Employee *</label>
              <select {...createForm.register('employeeId', { required: true })} className="input">
                <option value="">Select employee</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.employeeCode})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Type *</label>
              <select {...createForm.register('type', { required: true })} className="input">
                <option value="">Select type</option>
                {TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Description *</label>
              <textarea {...createForm.register('description', { required: true })} className="input" rows={3} />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={createForm.formState.isSubmitting} className="btn-primary">
                {createForm.formState.isSubmitting ? 'Saving...' : 'Record Grievance'}
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal title="Update Grievance Status" onClose={() => setEditing(null)}>
          <form onSubmit={statusForm.handleSubmit(onStatusSubmit)} className="space-y-4">
            <div>
              <label className="label">Status</label>
              <select {...statusForm.register('status', { required: true })} className="input">
                {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Action Taken</label>
              <textarea {...statusForm.register('actionTaken')} className="input" rows={3} placeholder="Describe the action taken" />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={statusForm.formState.isSubmitting} className="btn-primary">
                {statusForm.formState.isSubmitting ? 'Saving...' : 'Update'}
              </button>
              <button type="button" onClick={() => setEditing(null)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

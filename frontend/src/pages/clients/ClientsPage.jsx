import { useEffect, useState } from 'react'
import { Plus, ChevronDown, ChevronUp, Toggle01Left, Toggle01Right } from '@untitledui/icons'
import { getClients, createClient, toggleClient, getSitesByClient, createSite, toggleSite } from '../../api/clients'
import { useAuth } from '../../context/AuthContext'
import { useForm } from 'react-hook-form'
import PageHeader from '../../components/PageHeader'
import Modal from '../../components/Modal'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import { formatCurrency } from '../../utils/format'
import toast from 'react-hot-toast'

function SitesPanel({ clientId, canWrite }) {
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm()

  const load = () => {
    setLoading(true)
    getSitesByClient(clientId).then(r => setSites(r.data?.data ?? [])).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [clientId])

  const onSubmit = async (data) => {
    try {
      await createSite(clientId, data)
      toast.success('Site added')
      reset()
      setShowModal(false)
      load()
    } catch {/* handled */}
  }

  const handleToggle = async (id) => {
    try {
      await toggleSite(id)
      load()
    } catch {/* handled */}
  }

  return (
    <div className="bg-brand-50 px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-brand-400 uppercase">Sites</p>
        {canWrite && (
          <button onClick={() => setShowModal(true)} className="btn-secondary text-xs py-1">
            <Plus size={13} /> Add Site
          </button>
        )}
      </div>
      {loading ? <LoadingSpinner /> : sites.length === 0 ? (
        <p className="text-sm text-brand-400">No sites yet for this client</p>
      ) : (
        <div className="space-y-2">
          {sites.map(s => (
            <div key={s.id} className="bg-white rounded p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-brand-900">{s.name}</p>
                <p className="text-xs text-brand-400">{s.address || '—'} {s.supervisorName && `- Supervisor: ${s.supervisorName}`}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={s.isActive ? 'badge-green' : 'badge-gray'}>{s.isActive ? 'Active' : 'Inactive'}</span>
                {canWrite && (
                  <button onClick={() => handleToggle(s.id)} className="text-brand-500 hover:text-brand-900">
                    {s.isActive ? <Toggle01Right size={16} /> : <Toggle01Left size={16} />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="Add Site" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Site Name *</label>
              <input {...register('name', { required: true })} className="input" placeholder="e.g. Corporate Tower, Sector 5" />
            </div>
            <div>
              <label className="label">Address</label>
              <input {...register('address')} className="input" placeholder="Full address" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Supervisor Name</label>
                <input {...register('supervisorName')} className="input" />
              </div>
              <div>
                <label className="label">Supervisor Phone</label>
                <input {...register('supervisorPhone')} className="input" />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={isSubmitting} className="btn-primary">
                {isSubmitting ? 'Saving...' : 'Add Site'}
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

export default function ClientsPage() {
  const { canWrite } = useAuth()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  const load = () => {
    setLoading(true)
    getClients().then(r => setClients(r.data?.data ?? [])).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const onSubmit = async (data) => {
    try {
      await createClient({ ...data, billingRate: data.billingRate ? Number(data.billingRate) : 0 })
      toast.success('Client created')
      reset()
      setShowModal(false)
      load()
    } catch {/* handled */}
  }

  const handleToggle = async (id) => {
    try {
      await toggleClient(id)
      toast.success('Client status changed')
      load()
    } catch {/* handled */}
  }

  return (
    <div>
      <PageHeader
        title="Clients & Sites"
        subtitle="Manage client contracts, billing rates, and deployment sites"
        action={canWrite() && (
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} /> Add Client
          </button>
        )}
      />

      {loading ? <LoadingSpinner /> : clients.length === 0 ? (
        <EmptyState
          title="No clients yet"
          message="Add your first client to start mapping deployment sites and billing rates"
          action={canWrite() && (
            <button onClick={() => setShowModal(true)} className="btn-primary mt-2">
              <Plus size={16} /> Add Client
            </button>
          )}
        />
      ) : (
        <div className="space-y-2">
          {clients.map(c => (
            <div key={c.id} className="card overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-brand-50 transition-colors"
              >
                <div className="text-left">
                  <p className="font-medium text-brand-900">{c.name}</p>
                  <p className="text-xs text-brand-400">
                    {c.contactPerson && `${c.contactPerson} - `}{c.contactPhone}
                    {c.billingRate > 0 && ` - Billing: ${formatCurrency(c.billingRate)}/employee`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={c.isActive ? 'badge-green' : 'badge-gray'}>{c.isActive ? 'Active' : 'Inactive'}</span>
                  {canWrite() && (
                    <span
                      role="button"
                      onClick={(e) => { e.stopPropagation(); handleToggle(c.id) }}
                      className="text-brand-500 hover:text-brand-900"
                    >
                      {c.isActive ? <Toggle01Right size={18} /> : <Toggle01Left size={18} />}
                    </span>
                  )}
                  {expanded === c.id ? <ChevronUp size={16} className="text-brand-400" /> : <ChevronDown size={16} className="text-brand-400" />}
                </div>
              </button>
              {expanded === c.id && <SitesPanel clientId={c.id} canWrite={canWrite()} />}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="Add Client" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Client Name *</label>
              <input {...register('name', { required: 'Name is required' })} className="input" placeholder="Company name" />
              {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Contact Person</label>
                <input {...register('contactPerson')} className="input" />
              </div>
              <div>
                <label className="label">Contact Phone</label>
                <input {...register('contactPhone')} className="input" />
              </div>
            </div>
            <div>
              <label className="label">Contact Email</label>
              <input {...register('contactEmail')} type="email" className="input" />
            </div>
            <div>
              <label className="label">Address</label>
              <input {...register('address')} className="input" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Contract Start</label>
                <input {...register('contractStartDate')} type="date" className="input" />
              </div>
              <div>
                <label className="label">Contract End</label>
                <input {...register('contractEndDate')} type="date" className="input" />
              </div>
              <div>
                <label className="label">Billing Rate (₹/employee)</label>
                <input {...register('billingRate')} type="number" step="0.01" className="input" />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={isSubmitting} className="btn-primary">
                {isSubmitting ? 'Saving...' : 'Add Client'}
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

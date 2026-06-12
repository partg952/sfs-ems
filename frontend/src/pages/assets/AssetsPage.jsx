import { useEffect, useState } from 'react'
import { Plus, X, Check } from 'lucide-react'
import { getAllActiveRooms, allotRoom, vacateRoom, setUniform, returnUniform, getAllUniforms } from '../../api/assets'
import { getEmployees } from '../../api/employees'
import { useAuth } from '../../context/AuthContext'
import { useForm } from 'react-hook-form'
import PageHeader from '../../components/PageHeader'
import Modal from '../../components/Modal'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import { formatCurrency, formatDate } from '../../utils/format'
import toast from 'react-hot-toast'

export default function AssetsPage() {
  const { canWrite } = useAuth()
  const [rooms,       setRooms]       = useState([])
  const [uniforms,    setUniforms]    = useState([])
  const [employees,   setEmployees]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState('rooms')
  const [showRoomModal, setShowRoomModal]       = useState(false)
  const [showUniformModal, setShowUniformModal] = useState(false)
  const roomForm    = useForm()
  const uniformForm = useForm()

  const load = () => {
    setLoading(true)
    Promise.all([getAllActiveRooms(), getEmployees(), getAllUniforms()])
      .then(([rR, eR, uR]) => {
        setRooms(rR.data?.data ?? [])
        setEmployees(eR.data?.data ?? [])
        setUniforms(uR.data?.data ?? [])
      }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const onRoomSubmit = async (data) => {
    try {
      await allotRoom({ ...data, employeeId: Number(data.employeeId), rentAmount: Number(data.rentAmount), sharingCount: Number(data.sharingCount) })
      toast.success('Room allotted')
      roomForm.reset()
      setShowRoomModal(false)
      load()
    } catch {/* handled */}
  }

  const onUniformSubmit = async (data) => {
    try {
      await setUniform(Number(data.employeeId), { isAllotted: true, details: data.details })
      toast.success('Uniform allotted')
      uniformForm.reset()
      setShowUniformModal(false)
      load()
    } catch {/* handled */}
  }

  const handleVacate = async (employeeId) => {
    try {
      await vacateRoom(employeeId)
      toast.success('Room vacated')
      load()
    } catch {/* handled */}
  }

  const handleReturnUniform = async (employeeId) => {
    try {
      await returnUniform(employeeId)
      toast.success('Uniform returned')
      load()
    } catch {/* handled */}
  }

  const empWithUniform = employees.filter(e => e.status === 'ACTIVE')
  const uniformByEmployeeId = Object.fromEntries(uniforms.map(u => [u.employeeId, u]))

  return (
    <div>
      <PageHeader
        title="Asset and Accommodation"
        subtitle="Manage room allotments and uniform tracking"
        action={canWrite() && (
          <div className="flex gap-2">
            <button onClick={() => setShowRoomModal(true)} className="btn-secondary">
              <Plus size={16} /> Allot Room
            </button>
            <button onClick={() => setShowUniformModal(true)} className="btn-primary">
              <Plus size={16} /> Allot Uniform
            </button>
          </div>
        )}
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border border-brand-200 p-1 rounded w-fit">
        {[{id:'rooms',label:'Rooms'},{id:'uniforms',label:'Uniforms'}].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-brand-900 text-white' : 'text-brand-600 hover:bg-brand-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : tab === 'rooms' ? (
        rooms.length === 0 ? (
          <EmptyState title="No active room allotments" />
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3 text-left">Employee</th>
                  <th className="px-4 py-3 text-left">Room</th>
                  <th className="px-4 py-3 text-right">Rent/Month</th>
                  <th className="px-4 py-3 text-center">Sharing</th>
                  <th className="px-4 py-3 text-left">From</th>
                  {canWrite() && <th className="px-4 py-3 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {rooms.map(r => (
                  <tr key={r.id} className="hover:bg-brand-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-brand-900">{r.employeeName}</p>
                      <p className="text-xs text-brand-400">{r.employeeCode}</p>
                    </td>
                    <td className="px-4 py-3 text-brand-700">{r.roomNumber || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(r.rentAmount)}</td>
                    <td className="px-4 py-3 text-center text-brand-600">{r.sharingCount ?? '—'}</td>
                    <td className="px-4 py-3 text-brand-500">{formatDate(r.allotmentDate)}</td>
                    {canWrite() && (
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleVacate(r.employeeId)}
                          className="text-red-600 hover:text-red-700 text-xs flex items-center gap-1 mx-auto"
                        >
                          <X size={14}/> Vacate
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Site</th>
                <th className="px-4 py-3 text-center">Allotted</th>
                {canWrite() && <th className="px-4 py-3 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {empWithUniform.map(e => {
                const u = uniformByEmployeeId[e.id]
                const statusLabel = !u || !u.isAllotted ? 'Not Allotted' : u.isReturned ? 'Returned' : 'Allotted'
                const statusBadgeClass = !u || !u.isAllotted ? 'badge-gray' : u.isReturned ? 'badge-gray' : 'badge-green'
                return (
                  <tr key={e.id} className="hover:bg-brand-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-brand-900">{e.name}</p>
                      <p className="text-xs text-brand-400">{e.employeeCode}</p>
                    </td>
                    <td className="px-4 py-3 text-brand-600">{e.siteName}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={statusBadgeClass}>{statusLabel}</span>
                    </td>
                    {canWrite() && (
                      <td className="px-4 py-3 text-center">
                        {u?.isAllotted && !u?.isReturned && (
                          <button
                            onClick={() => handleReturnUniform(e.id)}
                            className="text-brand-600 hover:text-brand-900 text-xs flex items-center gap-1 mx-auto"
                          >
                            <Check size={14}/> Mark Returned
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
              {empWithUniform.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-brand-400">No active employees</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showRoomModal && (
        <Modal title="Allot Room" onClose={() => setShowRoomModal(false)}>
          <form onSubmit={roomForm.handleSubmit(onRoomSubmit)} className="space-y-4">
            <div>
              <label className="label">Employee *</label>
              <select {...roomForm.register('employeeId', { required: true })} className="input">
                <option value="">Select employee</option>
                {employees.filter(e => e.status === 'ACTIVE').map(e => (
                  <option key={e.id} value={e.id}>{e.name} ({e.employeeCode})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Room Number</label>
                <input {...roomForm.register('roomNumber')} className="input" placeholder="e.g. A-101" />
              </div>
              <div>
                <label className="label">Sharing Count</label>
                <input {...roomForm.register('sharingCount')} type="number" min="1" className="input" placeholder="1" />
              </div>
            </div>
            <div>
              <label className="label">Rent Amount (Rs.)</label>
              <input {...roomForm.register('rentAmount')} type="number" step="0.01" className="input" placeholder="0.00" />
            </div>
            <div>
              <label className="label">Allotment Date</label>
              <input {...roomForm.register('allotmentDate')} type="date" className="input"
                defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={roomForm.formState.isSubmitting} className="btn-primary">
                {roomForm.formState.isSubmitting ? 'Saving...' : 'Allot Room'}
              </button>
              <button type="button" onClick={() => setShowRoomModal(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {showUniformModal && (
        <Modal title="Allot Uniform" onClose={() => setShowUniformModal(false)}>
          <form onSubmit={uniformForm.handleSubmit(onUniformSubmit)} className="space-y-4">
            <div>
              <label className="label">Employee *</label>
              <select {...uniformForm.register('employeeId', { required: true })} className="input">
                <option value="">Select employee</option>
                {employees.filter(e => e.status === 'ACTIVE').map(e => (
                  <option key={e.id} value={e.id}>{e.name} ({e.employeeCode})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Uniform Details</label>
              <input {...uniformForm.register('details')} className="input" placeholder="e.g. Blue shirt, size L" />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={uniformForm.formState.isSubmitting} className="btn-primary">
                {uniformForm.formState.isSubmitting ? 'Saving...' : 'Allot Uniform'}
              </button>
              <button type="button" onClick={() => setShowUniformModal(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// Room vacancy counter updated upon room checkout

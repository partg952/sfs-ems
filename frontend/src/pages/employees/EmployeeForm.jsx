import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { getEmployee, createEmployee, updateEmployee, uploadEmployeePhoto } from '../../api/employees'
import { getSites } from '../../api/clients'
import PageHeader from '../../components/PageHeader'
import toast from 'react-hot-toast'

const Field = ({ label, error, children }) => (
  <div>
    <label className="label">{label}</label>
    {children}
    {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
  </div>
)

export default function EmployeeForm() {
  const { id } = useParams()
  const isEdit  = Boolean(id)
  const navigate = useNavigate()
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [sites, setSites] = useState([])

  useEffect(() => {
    getSites().then(r => setSites(r.data?.data ?? []))
  }, [])

  useEffect(() => {
    if (isEdit) {
      getEmployee(id).then(r => {
        const e = r.data?.data
        reset({
          name: e.name, dateOfBirth: e.dateOfBirth, mobileNumber: e.mobileNumber,
          address: e.address, siteId: e.siteId, designation: e.designation,
          dailyWage: e.dailyWage, monthlyWage: e.monthlyWage,
          joiningDate: e.joiningDate, esicNumber: e.esicNumber, epfNumber: e.epfNumber,
        })
        setPhotoPreview(e.photoUrl || null)
      })
    }
  }, [id, isEdit, reset])

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const onSubmit = async (data) => {
    try {
      // Clean up empty/NaN values before sending to backend
      const payload = { ...data }
      if (isNaN(payload.dailyWage) || payload.dailyWage === '') payload.dailyWage = null
      if (isNaN(payload.monthlyWage) || payload.monthlyWage === '') payload.monthlyWage = null
      if (!payload.dateOfBirth) payload.dateOfBirth = null
      if (!payload.joiningDate) payload.joiningDate = null
      payload.siteId = payload.siteId ? Number(payload.siteId) : null

      let employeeId = id
      if (isEdit) {
        await updateEmployee(id, payload)
      } else {
        const r = await createEmployee(payload)
        employeeId = r.data.data.id
      }

      if (photoFile) {
        try {
          await uploadEmployeePhoto(employeeId, photoFile)
        } catch (photoErr) {
          toast.error(photoErr.response?.data?.message || 'Employee saved, but photo upload failed')
        }
      }

      toast.success(isEdit ? 'Employee updated' : 'Employee created')
      navigate(`/employees/${employeeId}`)
    } catch (err) {
      console.error('Employee submit error:', err.response?.data || err.message)
      toast.error(err.response?.data?.message || 'Failed to save employee')
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={isEdit ? 'Edit Employee' : 'Add New Employee'}
        subtitle={isEdit ? 'Update employee information' : 'Fill in the details to onboard a new employee'}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-6">
        {/* Personal */}
        <section>
          <h3 className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-4">Personal Details</h3>
          <div className="flex items-center gap-4 mb-4">
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center text-brand-400 text-xs">
                No Photo
              </div>
            )}
            <Field label="Photograph">
              <input type="file" accept="image/*" onChange={handlePhotoChange} className="input" />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name *" error={errors.name?.message}>
              <input {...register('name', { required: 'Name is required' })} className="input" placeholder="Full name" />
            </Field>
            <Field label="Date of Birth">
              <input {...register('dateOfBirth')} type="date" className="input" />
            </Field>
            <Field label="Mobile Number">
              <input {...register('mobileNumber')} className="input" placeholder="9876543210" />
            </Field>
            <Field label="Address">
              <input {...register('address')} className="input" placeholder="Full address" />
            </Field>
          </div>
        </section>

        {/* Employment */}
        <section>
          <h3 className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-4">Employment Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Site *" error={errors.siteId?.message}>
              <select {...register('siteId', { required: 'Site is required' })} className="input">
                <option value="">Select site</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.clientName})</option>
                ))}
              </select>
            </Field>
            <Field label="Designation *" error={errors.designation?.message}>
              <input {...register('designation', { required: 'Designation is required' })} className="input" placeholder="e.g. Technician" />
            </Field>
            <Field label="Daily Wage (₹)">
              <input {...register('dailyWage', { valueAsNumber: true })} type="number" step="0.01" className="input" placeholder="0.00" />
            </Field>
            <Field label="Monthly Wage (₹)">
              <input {...register('monthlyWage', { valueAsNumber: true })} type="number" step="0.01" className="input" placeholder="0.00" />
            </Field>
            <Field label="Joining Date">
              <input {...register('joiningDate')} type="date" className="input" />
            </Field>
          </div>
        </section>

        {/* Compliance */}
        <section>
          <h3 className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-4">Compliance</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="ESIC Number">
              <input {...register('esicNumber')} className="input" placeholder="ESIC account number" />
            </Field>
            <Field label="EPF Number">
              <input {...register('epfNumber')} className="input" placeholder="EPF account number" />
            </Field>
          </div>
        </section>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Saving...' : isEdit ? 'Update Employee' : 'Create Employee'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export const formatCurrency = (val) =>
  val == null ? '—' : `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

export const formatDate = (val) => {
  if (!val) return '—'
  const d = new Date(val)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

export const statusBadge = (status) => {
  switch (status) {
    case 'ACTIVE':   return 'badge-green'
    case 'LEFT':     return 'badge-red'
    case 'REJOINED': return 'badge-blue'
    default:         return 'badge-gray'
  }
}

export const payrollStatusBadge = (status) => {
  switch (status) {
    case 'DRAFT':     return 'badge-yellow'
    case 'PROCESSED': return 'badge-blue'
    case 'PAID':      return 'badge-green'
    default:          return 'badge-gray'
  }
}

export const roleBadge = (role) => {
  switch (role) {
    case 'SUPER_ADMIN': return 'badge-red'
    case 'HR_MANAGER':  return 'badge-blue'
    case 'HR_STAFF':    return 'badge-green'
    case 'ACCOUNTS':    return 'badge-yellow'
    case 'EMPLOYEE':    return 'badge-gray'
    default:            return 'badge-gray'
  }
}

export const leaveStatusBadge = (status) => {
  switch (status) {
    case 'PENDING':  return 'badge-yellow'
    case 'APPROVED': return 'badge-green'
    case 'REJECTED': return 'badge-red'
    default:         return 'badge-gray'
  }
}

export const grievanceStatusBadge = (status) => {
  switch (status) {
    case 'OPEN':      return 'badge-yellow'
    case 'IN_REVIEW': return 'badge-blue'
    case 'RESOLVED':  return 'badge-green'
    case 'CLOSED':    return 'badge-gray'
    default:          return 'badge-gray'
  }
}

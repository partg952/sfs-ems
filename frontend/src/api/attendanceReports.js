import api from './client'

// Attendance Report Generator module (Ethnic + Haldiram Product punch
// attendance automation, ported from the Java Apache POI desktop tools).
// Uploads are multipart/form-data; downloads stream back as blobs so the
// browser can trigger a file save without leaving the SPA.

function buildFormData(file, year, month, extra = {}) {
  const form = new FormData()
  form.append('file', file)
  form.append('year', year)
  form.append('month', month)
  for (const [key, value] of Object.entries(extra)) {
    form.append(key, value)
  }
  return form
}

// --- Ethnic report -----------------------------------------------------

export const previewEthnicReport = (file, year, month, selectedEmpIds) =>
  api.post(
    '/attendance-reports/ethnic/preview',
    buildFormData(file, year, month, selectedEmpIds ? { selectedEmpIds: JSON.stringify(selectedEmpIds) } : {}),
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )

export const downloadEthnicExcel = () =>
  api.get('/attendance-reports/ethnic/excel', { responseType: 'blob' })

export const downloadEthnicPdf = (shift = 8) =>
  api.get('/attendance-reports/ethnic/pdf', { params: { shift }, responseType: 'blob' })

// --- Product daily work report ------------------------------------------

export const previewProductReport = (file, year, month) =>
  api.post(
    '/attendance-reports/product/preview',
    buildFormData(file, year, month),
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )

export const downloadProductExcel = () =>
  api.get('/attendance-reports/product/excel', { responseType: 'blob' })

export const downloadProductPdf = () =>
  api.get('/attendance-reports/product/pdf', { responseType: 'blob' })

// --- Product shift report (8hr / 9hr, per-site) --------------------------

export const previewProductShiftReport = (file, year, month) =>
  api.post(
    '/attendance-reports/product-shift/preview',
    buildFormData(file, year, month),
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )

export const downloadProductShiftExcel = () =>
  api.get('/attendance-reports/product-shift/excel', { responseType: 'blob' })

export const downloadProductShiftPdf = (shift = 8, site) =>
  api.get('/attendance-reports/product-shift/pdf', { params: { shift, site }, responseType: 'blob' })

// --- Muster roll (calendar grid) -----------------------------------------

export const previewMusterRoll = (file, year, month) =>
  api.post(
    '/attendance-reports/muster-roll/preview',
    buildFormData(file, year, month),
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )

export const downloadMusterRollExcel = () =>
  api.get('/attendance-reports/muster-roll/excel', { responseType: 'blob' })

export const downloadMusterRollPdf = (site) =>
  api.get('/attendance-reports/muster-roll/pdf', { params: { site }, responseType: 'blob' })

// --- Unified downloads manifest -------------------------------------------

export const getDownloadsManifest = () =>
  api.get('/attendance-reports/downloads')

/** Fetch a relative attendance-reports href (as returned by the manifest) as a blob, reusing the authenticated client's baseURL + JWT interceptor. */
export const downloadByHref = (href) =>
  api.get(href, { responseType: 'blob' })

// --- Shared helper -------------------------------------------------------

/** Trigger a browser file-save for an axios blob response. */
export function saveBlobResponse(response, filename) {
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

/** Extract a filename from a Content-Disposition header, falling back to a default. */
export function filenameFromResponse(response, fallback) {
  const disposition = response.headers?.['content-disposition']
  if (disposition) {
    const match = /filename="?([^"]+)"?/.exec(disposition)
    if (match) return match[1]
  }
  return fallback
}

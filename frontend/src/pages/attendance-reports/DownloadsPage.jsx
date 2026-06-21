import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Download01, Folder, RefreshCw01 } from '@untitledui/icons'
import PageHeader from '../../components/PageHeader'
import Breadcrumbs from '../../components/Breadcrumbs'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import { getDownloadsManifest, downloadByHref, saveBlobResponse, filenameFromResponse } from '../../api/attendanceReports'

/** Derive a reasonable filename from the href + label when Content-Disposition isn't readable. */
function guessFilename(href, label) {
  const isExcel = href.includes('/excel')
  const ext = isExcel ? 'xlsx' : 'pdf'
  const safe = label.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  return `${safe}.${ext}`
}

export default function DownloadsPage() {
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState([])
  const [downloadingHref, setDownloadingHref] = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await getDownloadsManifest()
      setGroups(res.data?.data ?? [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load downloads')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleDownload(href, label) {
    setDownloadingHref(href)
    try {
      const res = await downloadByHref(href)
      const filename = filenameFromResponse(res, guessFilename(href, label))
      saveBlobResponse(res, filename)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Download failed')
    } finally {
      setDownloadingHref('')
    }
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Attendance Reports', to: '/attendance-reports' }, { label: 'Downloads' }]} />
      <PageHeader
        title="Downloads"
        subtitle="Every Excel workbook and PDF generated across the Attendance Report modules, in one place"
        action={
          <div className="flex gap-2">
            <button onClick={load} className="btn-secondary text-sm" disabled={loading}>
              <RefreshCw01 size={15} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <Link to="/attendance-reports" className="btn-secondary text-sm">
              <ArrowLeft size={15} /> Back
            </Link>
          </div>
        }
      />

      {loading && <LoadingSpinner message="Loading available downloads..." />}

      {!loading && groups.length === 0 && (
        <EmptyState
          title="Nothing generated yet"
          message="Generate an Ethnic, Product, Product Shift, or Muster Roll report first - every downloadable file will appear here automatically"
        />
      )}

      {!loading && groups.length > 0 && (
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.group} className="card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-brand-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded bg-brand-50 border border-brand-100">
                    <Folder size={16} className="text-brand-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-brand-900 text-sm">{group.group}</p>
                    <p className="text-xs text-brand-400">{group.monthTitle}</p>
                  </div>
                </div>
                <span className="badge-gray">{group.items.length} file{group.items.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="divide-y divide-brand-50">
                {group.items.map((item) => (
                  <div key={item.href} className="flex items-center justify-between px-5 py-3 hover:bg-brand-50">
                    <p className="text-sm text-brand-700">{item.label}</p>
                    <button
                      onClick={() => handleDownload(item.href, item.label)}
                      disabled={downloadingHref === item.href}
                      className="btn-secondary text-xs py-1"
                    >
                      <Download01 size={13} />
                      {downloadingHref === item.href ? 'Preparing...' : 'Download'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

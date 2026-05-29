// Attendance Report Generator module - Express routes.
//
// Ports the Java "Ethnic" and "Haldiram Product" punch-attendance report
// generators (Apache POI + Flying Saucer) into a web-driven flow:
//   1. HR uploads the raw biometric punch Excel export.
//   2. Backend runs the same calculation logic as the Java tools and
//      returns a JSON summary used to render charts/tables in the browser.
//   3. HR can download the finished Excel workbook or PDF report for
//      billing/client submission - identical output shape to the originals.
//
// Uploaded files are processed in-memory only (multer memoryStorage) and
// never written to disk, since they are transient inputs, not persisted
// employee records.

import { Router } from 'express'
import multer from 'multer'
import { authenticateJWT, requireRoles } from '../middleware/auth.js'
import { generateEthnicReport, sumTotals } from '../services/ethnicReportService.js'
import { generateProductReport } from '../services/productReportService.js'
import { generateProductShiftReport, sumSiteTotals } from '../services/productShiftReportService.js'
import { generateMusterRoll } from '../services/musterRollService.js'
import {
  buildEthnicWorkbook, buildProductWorkbook, buildProductShiftWorkbook, buildMusterRollWorkbook, workbookToBuffer,
} from '../services/attendanceExcelExport.js'
import {
  renderEthnicPdf, renderProductPdf, renderProductShiftPdf, renderMusterRollPdf, PDFDocument,
} from '../services/attendancePdfExport.js'

const router = Router()
router.use(authenticateJWT)

// Same access tier as Payroll/Reports: full HR chain can generate/download,
// ACCOUNTS gets read-only visibility for billing reconciliation.
const REPORT_ACCESS = ['SUPER_ADMIN', 'HR_MANAGER', 'HR_STAFF', 'ACCOUNTS']

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB - large punch exports
  fileFilter: (req, file, cb) => {
    const ok = /\.(xlsx|xls)$/i.test(file.originalname)
    cb(ok ? null : new Error('Only .xlsx/.xls punch export files are accepted'), ok)
  },
})

function parseYearMonth(req) {
  const year = parseInt(req.body.year ?? req.query.year, 10)
  const month = parseInt(req.body.month ?? req.query.month, 10)
  if (!year || !month || month < 1 || month > 12) {
    throw new Error('A valid year and month (1-12) are required')
  }
  return { year, month }
}

// In-memory cache of the last generated report per user+type, so the
// Excel/PDF download endpoints don't require re-uploading the file.
// Keyed by `${username}:${type}`. Cleared on server restart (acceptable -
// this mirrors the original tools being run fresh each time).
const reportCache = new Map()

function cacheKey(req, type) {
  return `${req.user.username}:${type}`
}

// ---------------------------------------------------------------------------
// ETHNIC REPORT
// ---------------------------------------------------------------------------

// POST /api/attendance-reports/ethnic/preview
// Uploads the punch workbook, runs the calculation, returns a JSON summary
// for the frontend charts + caches the full result for Excel/PDF download.
router.post('/ethnic/preview', requireRoles(...REPORT_ACCESS), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded', data: null })
    const { year, month } = parseYearMonth(req)
    const selectedEmpIds = req.body.selectedEmpIds ? JSON.parse(req.body.selectedEmpIds) : undefined

    const result = generateEthnicReport(req.file.buffer, year, month, selectedEmpIds)
    reportCache.set(cacheKey(req, 'ethnic'), result)

    const grand8 = sumTotals(result.sites, result.dataFor8Hour)
    const grand9 = sumTotals(result.sites, result.dataFor9Hour)

    const siteBreakdown = result.sites.map((site) => ({
      site,
      shift8: result.dataFor8Hour[site].totals,
      shift9: result.dataFor9Hour[site].totals,
      employeeCount: result.dataFor8Hour[site].employees.length,
    }))

    res.json({
      success: true,
      message: 'Ethnic attendance report generated successfully',
      data: {
        monthTitle: result.monthTitle,
        year, month,
        sites: result.sites,
        siteBreakdown,
        grandTotals: { shift8: grand8, shift9: grand9 },
        dataFor8Hour: result.dataFor8Hour,
        dataFor9Hour: result.dataFor9Hour,
      },
    })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/attendance-reports/ethnic/excel
router.get('/ethnic/excel', requireRoles(...REPORT_ACCESS), async (req, res) => {
  try {
    const result = reportCache.get(cacheKey(req, 'ethnic'))
    if (!result) return res.status(404).json({ success: false, message: 'Generate a preview first', data: null })

    const wb = buildEthnicWorkbook(result.monthTitle, result.sites, result.dataFor8Hour, result.dataFor9Hour)
    const buffer = workbookToBuffer(wb)

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="Ethnic_Attendance_${result.year}_${result.month}.xlsx"`)
    res.send(buffer)
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/attendance-reports/ethnic/pdf?shift=8|9
router.get('/ethnic/pdf', requireRoles(...REPORT_ACCESS), async (req, res) => {
  try {
    const result = reportCache.get(cacheKey(req, 'ethnic'))
    if (!result) return res.status(404).json({ success: false, message: 'Generate a preview first', data: null })

    const shift = req.query.shift === '9' ? '9' : '8'
    const shiftName = `${shift}-Hour Shift`
    const data = shift === '9' ? result.dataFor9Hour : result.dataFor8Hour

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="Ethnic_Attendance_${shiftName.replace(' ', '_')}_${result.year}_${result.month}.pdf"`)

    const doc = new PDFDocument({ margin: 36, size: 'A4', layout: 'landscape' })
    doc.pipe(res)
    renderEthnicPdf(doc, result.monthTitle, shiftName, result.sites, data)
    doc.end()
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// ---------------------------------------------------------------------------
// PRODUCT (HALDIRAM) REPORT
// ---------------------------------------------------------------------------

// POST /api/attendance-reports/product/preview
router.post('/product/preview', requireRoles(...REPORT_ACCESS), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded', data: null })
    const { year, month } = parseYearMonth(req)

    const result = generateProductReport(req.file.buffer, year, month)
    reportCache.set(cacheKey(req, 'product'), result)

    const siteBreakdown = result.sites.map((site) => {
      const siteData = result.allSitesCalculatedData[site]
      return {
        site,
        dailyEntryCount: siteData.dailyEntries.length,
        totalDuty: siteData.grandTotals.duty,
        totalOvertime: parseFloat(siteData.grandTotals.overtime),
        employeeCount: siteData.dutySummary.length,
      }
    })

    res.json({
      success: true,
      message: 'Product attendance report generated successfully',
      data: {
        monthTitle: result.monthTitle,
        year, month,
        sites: result.sites,
        siteBreakdown,
        consolidated: result.consolidated,
      },
    })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/attendance-reports/product/excel
router.get('/product/excel', requireRoles(...REPORT_ACCESS), async (req, res) => {
  try {
    const result = reportCache.get(cacheKey(req, 'product'))
    if (!result) return res.status(404).json({ success: false, message: 'Generate a preview first', data: null })

    const wb = buildProductWorkbook(result.monthTitle, result.sites, result.allSitesCalculatedData, result.consolidated)
    const buffer = workbookToBuffer(wb)

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="Product_Attendance_${result.year}_${result.month}.xlsx"`)
    res.send(buffer)
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/attendance-reports/product/pdf
router.get('/product/pdf', requireRoles(...REPORT_ACCESS), async (req, res) => {
  try {
    const result = reportCache.get(cacheKey(req, 'product'))
    if (!result) return res.status(404).json({ success: false, message: 'Generate a preview first', data: null })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="Product_Attendance_${result.year}_${result.month}.pdf"`)

    const doc = new PDFDocument({ margin: 36, size: 'A4', layout: 'landscape' })
    doc.pipe(res)
    renderProductPdf(doc, result.monthTitle, result.sites, result.allSitesCalculatedData, result.consolidated)
    doc.end()
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// ---------------------------------------------------------------------------
// PRODUCT SHIFT REPORT (8-Hour / 9-Hour dual view, per-site PDFs) -
// port of "AttendanceReportGenerator copy.java"
// ---------------------------------------------------------------------------

// POST /api/attendance-reports/product-shift/preview
router.post('/product-shift/preview', requireRoles(...REPORT_ACCESS), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded', data: null })
    const { year, month } = parseYearMonth(req)

    const result = generateProductShiftReport(req.file.buffer, year, month)
    reportCache.set(cacheKey(req, 'product-shift'), result)

    function summarize(shiftData) {
      const grand = sumSiteTotals(shiftData.sites, shiftData.siteTotals)
      const siteBreakdown = shiftData.sites.map((site) => ({
        site,
        totals: shiftData.siteTotals.get(site),
        employeeCount: shiftData.siteEmployeeData.get(site).length,
      }))
      return { grand, siteBreakdown }
    }

    const shift8Summary = summarize(result.shift8)
    const shift9Summary = summarize(result.shift9)

    res.json({
      success: true,
      message: 'Product shift attendance report generated successfully',
      data: {
        monthTitle: result.monthTitle,
        year, month,
        sites: result.shift8.sites,
        shift8: shift8Summary,
        shift9: shift9Summary,
      },
    })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/attendance-reports/product-shift/excel
router.get('/product-shift/excel', requireRoles(...REPORT_ACCESS), async (req, res) => {
  try {
    const result = reportCache.get(cacheKey(req, 'product-shift'))
    if (!result) return res.status(404).json({ success: false, message: 'Generate a preview first', data: null })

    const wb = buildProductShiftWorkbook(result.monthTitle, result.shift8, result.shift9)
    const buffer = workbookToBuffer(wb)

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="Product_Shift_Attendance_${result.year}_${result.month}.xlsx"`)
    res.send(buffer)
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/attendance-reports/product-shift/pdf?shift=8|9&site=<siteName optional>
router.get('/product-shift/pdf', requireRoles(...REPORT_ACCESS), async (req, res) => {
  try {
    const result = reportCache.get(cacheKey(req, 'product-shift'))
    if (!result) return res.status(404).json({ success: false, message: 'Generate a preview first', data: null })

    const shift = req.query.shift === '9' ? '9' : '8'
    const shiftName = `${shift}-Hour Shift`
    const shiftData = shift === '9' ? result.shift9 : result.shift8
    const onlySite = req.query.site || undefined
    const filenameSite = onlySite ? `_${onlySite.replace(/[^a-zA-Z0-9.-]/g, '_')}` : '_Consolidated'

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="Product_Shift_${shift}Hour${filenameSite}_${result.year}_${result.month}.pdf"`)

    const doc = new PDFDocument({ margin: 36, size: 'A4', layout: 'landscape' })
    doc.pipe(res)
    renderProductShiftPdf(doc, result.monthTitle, shiftName, shiftData, onlySite)
    doc.end()
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// ---------------------------------------------------------------------------
// MUSTER ROLL (calendar-grid) - port of MusterRollGenerator.java
// ---------------------------------------------------------------------------

// POST /api/attendance-reports/muster-roll/preview
router.post('/muster-roll/preview', requireRoles(...REPORT_ACCESS), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded', data: null })
    const { year, month } = parseYearMonth(req)

    const result = generateMusterRoll(req.file.buffer, year, month)
    reportCache.set(cacheKey(req, 'muster-roll'), result)

    const siteBreakdown = result.sites.map((site) => {
      const siteData = result.allSitesCalculatedData[site]
      return {
        site,
        employeeCount: siteData.employees.length,
        totalSiteAttendance: siteData.summary.totalSiteAttendance,
        totalHalfDays: siteData.summary.totalHalfDays,
        totalMissingPunches: siteData.summary.totalMissingPunches,
      }
    })

    res.json({
      success: true,
      message: 'Muster roll generated successfully',
      data: {
        monthTitle: result.monthTitle,
        year, month,
        sites: result.sites,
        daysInMonth: result.daysInMonth,
        siteBreakdown,
        allSitesCalculatedData: result.allSitesCalculatedData,
      },
    })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/attendance-reports/muster-roll/excel
router.get('/muster-roll/excel', requireRoles(...REPORT_ACCESS), async (req, res) => {
  try {
    const result = reportCache.get(cacheKey(req, 'muster-roll'))
    if (!result) return res.status(404).json({ success: false, message: 'Generate a preview first', data: null })

    const wb = buildMusterRollWorkbook(result.monthTitle, result.sites, result.allSitesCalculatedData, result.daysInMonth)
    const buffer = workbookToBuffer(wb)

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="Muster_Roll_${result.year}_${result.month}.xlsx"`)
    res.send(buffer)
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// GET /api/attendance-reports/muster-roll/pdf?site=<siteName optional>
router.get('/muster-roll/pdf', requireRoles(...REPORT_ACCESS), async (req, res) => {
  try {
    const result = reportCache.get(cacheKey(req, 'muster-roll'))
    if (!result) return res.status(404).json({ success: false, message: 'Generate a preview first', data: null })

    const onlySite = req.query.site || undefined
    const filenameSite = onlySite ? `_${onlySite.replace(/[^a-zA-Z0-9.-]/g, '_')}` : '_All_Sites'

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="Muster_Roll${filenameSite}_${result.year}_${result.month}.pdf"`)

    const doc = new PDFDocument({ margin: 24, size: 'A3', layout: 'landscape' })
    doc.pipe(res)
    renderMusterRollPdf(doc, result.monthTitle, result.sites, result.allSitesCalculatedData, result.daysInMonth, onlySite)
    doc.end()
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null })
  }
})

// ---------------------------------------------------------------------------
// UNIFIED DOWNLOADS MANIFEST
// ---------------------------------------------------------------------------

// GET /api/attendance-reports/downloads
// Lists every artifact currently available for download for the logged-in
// user, across all four report types, so the frontend can render a single
// "Downloads" page without re-deriving state from each report's preview call.
router.get('/downloads', requireRoles(...REPORT_ACCESS), async (req, res) => {
  const artifacts = []

  const ethnic = reportCache.get(cacheKey(req, 'ethnic'))
  if (ethnic) {
    artifacts.push({
      group: 'Ethnic Attendance Report',
      monthTitle: ethnic.monthTitle,
      items: [
        { label: 'Excel Workbook (8hr + 9hr sheets)', href: '/attendance-reports/ethnic/excel' },
        { label: 'Consolidated PDF - 8-Hour Shift', href: '/attendance-reports/ethnic/pdf?shift=8' },
        { label: 'Consolidated PDF - 9-Hour Shift', href: '/attendance-reports/ethnic/pdf?shift=9' },
      ],
    })
  }

  const product = reportCache.get(cacheKey(req, 'product'))
  if (product) {
    artifacts.push({
      group: 'Product Daily Work Report',
      monthTitle: product.monthTitle,
      items: [
        { label: 'Excel Workbook (Consolidated + per-site sheets)', href: '/attendance-reports/product/excel' },
        { label: 'Consolidated PDF (daily log + summary)', href: '/attendance-reports/product/pdf' },
      ],
    })
  }

  const productShift = reportCache.get(cacheKey(req, 'product-shift'))
  if (productShift) {
    const perSitePdfs8 = productShift.shift8.sites.map((site) => ({
      label: `Site PDF - ${site} (8-Hour Shift)`,
      href: `/attendance-reports/product-shift/pdf?shift=8&site=${encodeURIComponent(site)}`,
    }))
    const perSitePdfs9 = productShift.shift9.sites.map((site) => ({
      label: `Site PDF - ${site} (9-Hour Shift)`,
      href: `/attendance-reports/product-shift/pdf?shift=9&site=${encodeURIComponent(site)}`,
    }))
    artifacts.push({
      group: 'Product Shift Attendance Report',
      monthTitle: productShift.monthTitle,
      items: [
        { label: 'Excel Workbook (8hr + 9hr sheets)', href: '/attendance-reports/product-shift/excel' },
        { label: 'Consolidated PDF - 8-Hour Shift (all sites)', href: '/attendance-reports/product-shift/pdf?shift=8' },
        { label: 'Consolidated PDF - 9-Hour Shift (all sites)', href: '/attendance-reports/product-shift/pdf?shift=9' },
        ...perSitePdfs8,
        ...perSitePdfs9,
      ],
    })
  }

  const musterRoll = reportCache.get(cacheKey(req, 'muster-roll'))
  if (musterRoll) {
    const perSitePdfs = musterRoll.sites.map((site) => ({
      label: `Site PDF - ${site}`,
      href: `/attendance-reports/muster-roll/pdf?site=${encodeURIComponent(site)}`,
    }))
    artifacts.push({
      group: 'Muster Roll',
      monthTitle: musterRoll.monthTitle,
      items: [
        { label: 'Excel Workbook (one calendar sheet per site)', href: '/attendance-reports/muster-roll/excel' },
        { label: 'PDF - All Sites', href: '/attendance-reports/muster-roll/pdf' },
        ...perSitePdfs,
      ],
    })
  }

  res.json({ success: true, message: 'Success', data: artifacts })
})

export default router

// PDF export helpers for the Attendance Report Generator module.
// Ported from the Flying Saucer (HTML->PDF) renderers in the Java
// generators. PDFKit builds the document natively (no HTML/CSS engine
// available on the Node side) while preserving the same report structure:
// a title header, a site-wise/overall summary table, then one page per site
// with the full employee breakdown table and a highlighted totals row.

import PDFDocument from 'pdfkit'

const PAGE_MARGIN = 36
const HEADER_FILL = '#34495e'
const TOTAL_FILL = '#f1c40f'
const ALT_ROW_FILL = '#f8faff'

function drawHeader(doc, title, subtitle1, subtitle2) {
  doc.rect(PAGE_MARGIN, PAGE_MARGIN, doc.page.width - PAGE_MARGIN * 2, 60).fill('#2c3e50')
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(18).text(title, PAGE_MARGIN, PAGE_MARGIN + 10, {
    width: doc.page.width - PAGE_MARGIN * 2,
    align: 'center',
  })
  doc.font('Helvetica').fontSize(11).text(subtitle1, { align: 'center' })
  if (subtitle2) doc.fontSize(10).text(subtitle2, { align: 'center' })
  doc.fillColor('#000000')
  return PAGE_MARGIN + 75
}

/**
 * Draw a table starting at (x, y). `colWidths` sums should fit the page.
 * Returns the y position after the table. Highlights the last row if
 * `highlightLastRow` is set (mirrors the Java `tr.total` CSS rule).
 */
function drawTable(doc, x, y, headers, colWidths, dataRows, { highlightLastRow = false, rowHeight = 16 } = {}) {
  const tableWidth = colWidths.reduce((a, b) => a + b, 0)

  function ensureSpace(needed) {
    if (y + needed > doc.page.height - PAGE_MARGIN) {
      doc.addPage()
      y = PAGE_MARGIN
    }
  }

  ensureSpace(rowHeight)
  doc.rect(x, y, tableWidth, rowHeight).fill(HEADER_FILL)
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8)
  let cx = x
  headers.forEach((h, i) => {
    doc.text(String(h), cx + 3, y + 4, { width: colWidths[i] - 6, align: 'left' })
    cx += colWidths[i]
  })
  y += rowHeight
  doc.fillColor('#000000')

  dataRows.forEach((row, rIdx) => {
    ensureSpace(rowHeight)
    const isTotalRow = highlightLastRow && rIdx === dataRows.length - 1
    if (isTotalRow) {
      doc.rect(x, y, tableWidth, rowHeight).fill(TOTAL_FILL)
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(8)
    } else {
      if (rIdx % 2 === 1) {
        doc.rect(x, y, tableWidth, rowHeight).fill(ALT_ROW_FILL)
      }
      doc.fillColor('#000000').font('Helvetica').fontSize(8)
    }
    cx = x
    row.forEach((cell, i) => {
      doc.text(String(cell ?? ''), cx + 3, y + 4, { width: colWidths[i] - 6, align: 'left' })
      cx += colWidths[i]
    })
    doc.strokeColor('#e1e8f3').lineWidth(0.5)
    cx = x
    colWidths.forEach((w) => {
      doc.rect(cx, y, w, rowHeight).stroke()
      cx += w
    })
    y += rowHeight
  })

  return y + 10
}

const ETHNIC_HEADERS = ['EmpID', 'Name', 'Punches', 'Days', 'Hours', 'Full', 'Half', 'OT', 'Duty', 'Missing']
const ETHNIC_COL_WIDTHS = [50, 90, 45, 40, 45, 40, 40, 40, 40, 90]

/**
 * Render the consolidated Ethnic PDF for one shift view (8-Hour or 9-Hour),
 * mirroring generateConsolidatedPdfForShift() / generateHtmlForSummary() /
 * generateHtmlForSite() from EthnicReportGenerator_Final.java.
 */
export function renderEthnicPdf(doc, monthTitle, shiftName, sites, allSiteData) {
  let y = drawHeader(doc, 'Overall Site-wise Summary', monthTitle, `(${shiftName})`)

  const grand = { punches: 0, days: 0, hours: 0, full: 0, half: 0, ot: 0, dutyUnits: 0, missing: 0 }
  const summaryRows = sites.map((site) => {
    const t = allSiteData[site].totals
    grand.punches += t.punches; grand.days += t.days; grand.hours += t.hours
    grand.full += t.full; grand.half += t.half; grand.ot += t.ot
    grand.dutyUnits += t.dutyUnits; grand.missing += t.missing
    return [site, t.punches, t.days, t.hours.toFixed(2), t.full, t.half, t.ot.toFixed(2), t.dutyUnits.toFixed(2), t.missing]
  })
  summaryRows.push(['GRAND TOTAL', grand.punches, grand.days, grand.hours.toFixed(2), grand.full, grand.half,
    grand.ot.toFixed(2), grand.dutyUnits.toFixed(2), grand.missing])

  drawTable(doc, PAGE_MARGIN, y, ETHNIC_HEADERS, ETHNIC_COL_WIDTHS, summaryRows, { highlightLastRow: true })

  for (const site of sites) {
    doc.addPage()
    y = drawHeader(doc, 'Attendance Report', site, `${monthTitle} (${shiftName})`)
    const { employees, totals } = allSiteData[site]
    const empRows = employees.map((e) => [
      e.empId, e.name, e.punches, e.days, e.hours, e.fullDays, e.halfDays,
      e.overtimeHours, e.dutyUnits, e.missingPunchDays.length ? e.missingPunchDays.join(', ') : '-',
    ])
    empRows.push(['', 'Site Total', totals.punches, totals.days, totals.hours.toFixed(2),
      totals.full, totals.half, totals.ot.toFixed(2), totals.dutyUnits.toFixed(2), totals.missing])
    drawTable(doc, PAGE_MARGIN, y, ETHNIC_HEADERS, ETHNIC_COL_WIDTHS, empRows, { highlightLastRow: true })
  }
}

const PRODUCT_DAILY_HEADERS = ['ID No', 'Name', 'Site', 'Date', 'Punch In', 'Punch Out', 'Duration', 'Status', 'OT']
const PRODUCT_DAILY_WIDTHS = [45, 85, 70, 60, 65, 65, 45, 55, 35]

/**
 * Render the Product (Haldiram) consolidated PDF, mirroring
 * generateConsolidatedHtml() / getDailyEntriesHtml() / getSummaryTablesHtml()
 * from DailyWorkReportGenerator.java: combined daily log for all sites, then
 * an overall duty/overtime summary page.
 */
export function renderProductPdf(doc, monthTitle, sites, allSitesCalculatedData, consolidated) {
  let y = drawHeader(doc, 'Consolidated Work Report', monthTitle)
  doc.font('Helvetica-Bold').fontSize(11).text('Combined Daily Entries Log (All Sites)', PAGE_MARGIN, y)
  y += 18

  const dailyRows = consolidated.dailyEntries.map((e) => [
    e.idNo, e.name, e.site, e.date, e.punchIn, e.punchOut, e.duration, e.dutyStatus, e.otHours,
  ])
  y = drawTable(doc, PAGE_MARGIN, y, PRODUCT_DAILY_HEADERS, PRODUCT_DAILY_WIDTHS, dailyRows)

  doc.addPage()
  y = drawHeader(doc, 'Overall Summary', 'Across All Sites')

  doc.font('Helvetica-Bold').fontSize(11).text('Duty Summary', PAGE_MARGIN, y)
  y += 16
  const dutyRows = consolidated.dutySummary.map((s) => [s.idNo, s.name, s.totalDuty.toFixed(1)])
  dutyRows.push(['', 'Grand Total', consolidated.grandTotals.duty.toFixed(1)])
  y = drawTable(doc, PAGE_MARGIN, y, ['ID No', 'Name', 'Total Duty Days'], [80, 200, 100], dutyRows, { highlightLastRow: true })

  if (consolidated.overtimeSummary.length > 0) {
    doc.font('Helvetica-Bold').fontSize(11).text('Overtime Summary', PAGE_MARGIN, y)
    y += 16
    const otRows = consolidated.overtimeSummary.map((o) => [o.name, o.totalOvertime])
    otRows.push(['Grand Total OT', consolidated.grandTotals.overtime])
    drawTable(doc, PAGE_MARGIN, y, ['Name', 'Total OT (Hrs)'], [200, 120], otRows, { highlightLastRow: true })
  }
}

export { PDFDocument }

// ---------------------------------------------------------------------------
// PRODUCT SHIFT REPORT (AttendanceReportGenerator copy.java port)
// ---------------------------------------------------------------------------

/**
 * Render the consolidated Product-shift PDF for one shift view (8-Hour or
 * 9-Hour): an overall site-wise summary page followed by one page per site,
 * mirroring generateConsolidatedPdfForShift() / generateHtmlForSummary() /
 * generateHtmlForSite() from "AttendanceReportGenerator copy.java".
 *
 * If `onlySite` is provided, only that site's page is rendered (used for the
 * "download this site's PDF" links on the Downloads page) - still preceded
 * by the same-shaped summary table restricted to that one site, matching the
 * per-site PDF a user would expect to receive standalone.
 */
export function renderProductShiftPdf(doc, monthTitle, shiftName, shiftData, onlySite) {
  const { sites, siteEmployeeData, siteTotals } = shiftData
  const targetSites = onlySite ? sites.filter((s) => s === onlySite) : sites

  let y = drawHeader(doc, 'Overall Site-wise Summary', monthTitle, `(${shiftName})`)

  const grand = { punches: 0, days: 0, hours: 0, full: 0, half: 0, ot: 0, dutyUnits: 0, missing: 0 }
  const summaryRows = targetSites.map((site) => {
    const t = siteTotals.get(site)
    grand.punches += t.punches; grand.days += t.days; grand.hours += t.hours
    grand.full += t.full; grand.half += t.half; grand.ot += t.ot
    grand.dutyUnits += t.dutyUnits; grand.missing += t.missing
    return [site, t.punches, t.days, t.hours.toFixed(2), t.full, t.half, t.ot.toFixed(2), t.dutyUnits.toFixed(2), t.missing]
  })
  summaryRows.push(['GRAND TOTAL', grand.punches, grand.days, grand.hours.toFixed(2), grand.full, grand.half,
    grand.ot.toFixed(2), grand.dutyUnits.toFixed(2), grand.missing])

  drawTable(doc, PAGE_MARGIN, y, ETHNIC_HEADERS, ETHNIC_COL_WIDTHS, summaryRows, { highlightLastRow: true })

  for (const site of targetSites) {
    doc.addPage()
    y = drawHeader(doc, 'Attendance Report', site, `${monthTitle} (${shiftName})`)
    const employeeList = siteEmployeeData.get(site)
    const totals = siteTotals.get(site)
    const empRows = employeeList.map((e) => [
      e.empId, e.name, e.punches, e.days, e.hours, e.fullDays, e.halfDays,
      e.overtimeHours, e.dutyUnits, e.missingPunchDays.length ? e.missingPunchDays.join(', ') : '-',
    ])
    empRows.push(['', 'Site Total', totals.punches, totals.days, totals.hours.toFixed(2),
      totals.full, totals.half, totals.ot.toFixed(2), totals.dutyUnits.toFixed(2), totals.missing])
    drawTable(doc, PAGE_MARGIN, y, ETHNIC_HEADERS, ETHNIC_COL_WIDTHS, empRows, { highlightLastRow: true })
  }
}

// ---------------------------------------------------------------------------
// MUSTER ROLL (MusterRollGenerator.java port)
// ---------------------------------------------------------------------------

const STATUS_COLORS = { P: '#d4efdf', H: '#fdebd0', A: '#fadbd8', M: '#d6eaf8', WO: '#e5e7e9' }

/**
 * Render a calendar-grid muster roll PDF (one page per site, or a single
 * site's page if `onlySite` is provided), mirroring the day-by-day status
 * grid produced by generateMusterRollSheet() in MusterRollGenerator.java.
 * Uses a landscape page and shrinks the day-column width to fit up to 31
 * columns plus Sr.No/Name/Total.
 */
export function renderMusterRollPdf(doc, monthTitle, sites, allSitesCalculatedData, daysInMonthCount, onlySite) {
  const targetSites = onlySite ? sites.filter((s) => s === onlySite) : sites
  const usableWidth = doc.page.width - PAGE_MARGIN * 2
  const srWidth = 28
  const nameWidth = 100
  const totalWidth = 45
  const dayWidth = Math.max(14, (usableWidth - srWidth - nameWidth - totalWidth) / daysInMonthCount)

  targetSites.forEach((site, idx) => {
    if (idx > 0) doc.addPage()
    let y = drawHeader(doc, 'Muster Roll', site, monthTitle)

    const headers = ['Sr.', 'Name']
    const colWidths = [srWidth, nameWidth]
    for (let d = 1; d <= daysInMonthCount; d++) {
      headers.push(String(d))
      colWidths.push(dayWidth)
    }
    headers.push('Total')
    colWidths.push(totalWidth)

    const siteData = allSitesCalculatedData[site]
    const dataRows = siteData.employees.map((emp, i) => [i + 1, emp.name, ...emp.dailyStatus, emp.totalAttendance])

    y = drawMusterTable(doc, PAGE_MARGIN, y, headers, colWidths, dataRows)

    doc.font('Helvetica-Bold').fontSize(9).text(
      `Total Site Attendance: ${siteData.summary.totalSiteAttendance}   |   Total Half Days: ${siteData.summary.totalHalfDays}   |   Total Missing: ${siteData.summary.totalMissingPunches}`,
      PAGE_MARGIN, y
    )
    y += 16
    doc.font('Helvetica-Oblique').fontSize(8).text(
      "Note: 'M' (Missing Punch) and 'A' (Absent) days are not included in 'Total Attd.'. 'WO' stands for Weekly Off.",
      PAGE_MARGIN, y
    )
  })
}

/** Table renderer specialized for the muster roll grid: color-codes P/H/A/M/WO cells. */
function drawMusterTable(doc, x, y, headers, colWidths, dataRows, rowHeight = 14) {
  const tableWidth = colWidths.reduce((a, b) => a + b, 0)

  function ensureSpace(needed) {
    if (y + needed > doc.page.height - PAGE_MARGIN - 40) {
      doc.addPage()
      y = PAGE_MARGIN
    }
  }

  ensureSpace(rowHeight)
  doc.rect(x, y, tableWidth, rowHeight).fill(HEADER_FILL)
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(6)
  let cx = x
  headers.forEach((h, i) => {
    doc.text(String(h), cx + 1, y + 3, { width: colWidths[i] - 2, align: 'center' })
    cx += colWidths[i]
  })
  y += rowHeight
  doc.fillColor('#000000')

  dataRows.forEach((row) => {
    ensureSpace(rowHeight)
    cx = x
    row.forEach((cell, i) => {
      const isStatusCol = i >= 2 && i < headers.length - 1
      const fill = isStatusCol ? STATUS_COLORS[cell] : null
      if (fill) {
        doc.rect(cx, y, colWidths[i], rowHeight).fill(fill)
        doc.fillColor('#000000')
      }
      doc.font(isStatusCol ? 'Helvetica-Bold' : 'Helvetica').fontSize(6.5)
      doc.text(String(cell ?? ''), cx + 1, y + 3, { width: colWidths[i] - 2, align: 'center' })
      cx += colWidths[i]
    })
    doc.strokeColor('#e1e8f3').lineWidth(0.4)
    cx = x
    colWidths.forEach((w) => {
      doc.rect(cx, y, w, rowHeight).stroke()
      cx += w
    })
    y += rowHeight
  })

  return y + 10
}

// Excel (.xlsx) export helpers for the Attendance Report Generator module.
// Ported from the POI-based sheet builders in the Java generators, using
// SheetJS (xlsx) on the Node side. Cell styling APIs differ between POI and
// SheetJS community edition (no native fill/font styling in the free xlsx
// writer) so column layout, headers, section titles and totals rows are
// preserved 1:1; visual cell coloring is approximated with plain text
// section markers instead of colored fills, which does not affect the data.

import XLSX from 'xlsx'

const ETHNIC_HEADERS = ['EmpID', 'Name', 'Punches', 'Days', 'Hours', 'Full', 'Half', 'OT', 'Duty', 'Missing']
const ETHNIC_SUMMARY_HEADERS = ['Site', 'Punches', 'Days', 'Hours', 'Full', 'Half', 'OT', 'Duty', 'Missing']

/**
 * Build the Ethnic report workbook: one sheet per shift ("Summary (8-Hour
 * Shift)" / "Summary (9-Hour Shift)"), each with per-site employee tables +
 * a site-wise grand summary, mirroring generateEnhancedExcel() /
 * generateReportSheet() from EthnicReportGenerator_Final.java.
 */
export function buildEthnicWorkbook(monthTitle, sites, dataFor8Hour, dataFor9Hour) {
  const wb = XLSX.utils.book_new()
  appendEthnicSheet(wb, 'Summary (8-Hour Shift)', monthTitle, sites, dataFor8Hour)
  appendEthnicSheet(wb, 'Summary (9-Hour Shift)', monthTitle, sites, dataFor9Hour)
  return wb
}

function appendEthnicSheet(wb, sheetName, monthTitle, sites, allSiteData) {
  const rows = []
  rows.push([`Final Attendance Summary for ${monthTitle} (${sheetName})`])
  rows.push([])

  const grand = { punches: 0, days: 0, hours: 0, full: 0, half: 0, ot: 0, dutyUnits: 0, missing: 0 }

  for (const site of sites) {
    rows.push([`Site: ${site}`])
    rows.push(ETHNIC_HEADERS)
    const { employees, totals } = allSiteData[site]
    for (const e of employees) {
      rows.push([
        e.empId, e.name, e.punches, e.days, e.hours, e.fullDays, e.halfDays,
        e.overtimeHours, e.dutyUnits, e.missingPunchDays.length ? e.missingPunchDays.join(', ') : '-',
      ])
    }
    rows.push(['', 'Site Total', totals.punches, totals.days, totals.hours.toFixed(2),
      totals.full, totals.half, totals.ot.toFixed(2), totals.dutyUnits.toFixed(2), totals.missing])
    rows.push([])
  }

  rows.push([])
  rows.push(['Site-wise Summary'])
  rows.push(ETHNIC_SUMMARY_HEADERS)
  for (const site of sites) {
    const t = allSiteData[site].totals
    rows.push([site, t.punches, t.days, t.hours.toFixed(2), t.full, t.half, t.ot.toFixed(2), t.dutyUnits.toFixed(2), t.missing])
    grand.punches += t.punches; grand.days += t.days; grand.hours += t.hours
    grand.full += t.full; grand.half += t.half; grand.ot += t.ot
    grand.dutyUnits += t.dutyUnits; grand.missing += t.missing
  }
  rows.push(['GRAND TOTAL', grand.punches, grand.days, grand.hours.toFixed(2), grand.full, grand.half,
    grand.ot.toFixed(2), grand.dutyUnits.toFixed(2), grand.missing])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = ETHNIC_HEADERS.map(() => ({ wch: 14 }))
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31))
}

const PRODUCT_DAILY_HEADERS = ['DeviceName', 'IDNo', 'Name', 'Department', 'Date', 'Punch In', 'Punch Out', 'Duration (Hrs)', 'Duty Status', 'OT (Hrs)']

/**
 * Build the Product (Haldiram) report workbook: a "Consolidated View" sheet
 * plus one sheet per site, mirroring generateEnhancedExcel() /
 * appendDataToSheet() from DailyWorkReportGenerator.java.
 */
export function buildProductWorkbook(monthTitle, sites, allSitesCalculatedData, consolidated) {
  const wb = XLSX.utils.book_new()
  appendProductSheet(wb, 'Consolidated View', `Consolidated Report for All Sites - ${monthTitle}`, consolidated)
  for (const site of sites) {
    appendProductSheet(wb, site.substring(0, 31), `Report for Site: ${site} - ${monthTitle}`, allSitesCalculatedData[site])
  }
  return wb
}

function appendProductSheet(wb, sheetName, title, data) {
  const rows = []
  rows.push([title])
  rows.push(PRODUCT_DAILY_HEADERS)

  for (const entry of data.dailyEntries) {
    rows.push([
      entry.site, entry.idNo, entry.name, entry.department, entry.date,
      entry.punchIn, entry.punchOut, parseFloat(entry.duration), entry.dutyStatus, parseFloat(entry.otHours),
    ])
  }

  rows.push([])
  rows.push(['', 'IDNo', 'Name', 'Sum of Total Duty'])
  for (const s of data.dutySummary) {
    rows.push(['', s.idNo, s.name, s.totalDuty])
  }
  rows.push(['', '', 'Grand Total', data.grandTotals.duty])

  rows.push([])
  rows.push(['', 'Name', 'Sum of OT (Hrs)'])
  for (const ot of data.overtimeSummary) {
    rows.push(['', ot.name, parseFloat(ot.totalOvertime)])
  }
  rows.push(['', 'Grand Total OT', parseFloat(data.grandTotals.overtime)])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = PRODUCT_DAILY_HEADERS.map(() => ({ wch: 14 }))
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
}

export function workbookToBuffer(wb) {
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

// ---------------------------------------------------------------------------
// PRODUCT SHIFT REPORT (AttendanceReportGenerator copy.java port)
// ---------------------------------------------------------------------------

/**
 * Build the Product Shift report workbook: one sheet per shift ("Summary
 * (8-Hour Shift)" / "Summary (9-Hour Shift)"), each with per-site employee
 * tables + a site-wise grand summary - identical layout to the Ethnic
 * workbook but driven by productShiftReportService's per-site Maps.
 */
export function buildProductShiftWorkbook(monthTitle, shift8, shift9) {
  const wb = XLSX.utils.book_new()
  appendProductShiftSheet(wb, 'Summary (8-Hour Shift)', monthTitle, shift8)
  appendProductShiftSheet(wb, 'Summary (9-Hour Shift)', monthTitle, shift9)
  return wb
}

function appendProductShiftSheet(wb, sheetName, monthTitle, shiftData) {
  const { sites, siteEmployeeData, siteTotals } = shiftData
  const rows = []
  rows.push([`Final Attendance Summary for ${monthTitle} (${sheetName})`])
  rows.push([])

  const grand = { punches: 0, days: 0, hours: 0, full: 0, half: 0, ot: 0, dutyUnits: 0, missing: 0 }

  for (const site of sites) {
    rows.push([`Site: ${site}`])
    rows.push(ETHNIC_HEADERS)
    const employeeList = siteEmployeeData.get(site)
    const totals = siteTotals.get(site)
    for (const e of employeeList) {
      rows.push([
        e.empId, e.name, e.punches, e.days, e.hours, e.fullDays, e.halfDays,
        e.overtimeHours, e.dutyUnits, e.missingPunchDays.length ? e.missingPunchDays.join(', ') : '-',
      ])
    }
    rows.push(['', 'Site Total', totals.punches, totals.days, totals.hours.toFixed(2),
      totals.full, totals.half, totals.ot.toFixed(2), totals.dutyUnits.toFixed(2), totals.missing])
    rows.push([])
  }

  rows.push([])
  rows.push(['Site-wise Summary'])
  rows.push(ETHNIC_SUMMARY_HEADERS)
  for (const site of sites) {
    const t = siteTotals.get(site)
    rows.push([site, t.punches, t.days, t.hours.toFixed(2), t.full, t.half, t.ot.toFixed(2), t.dutyUnits.toFixed(2), t.missing])
    grand.punches += t.punches; grand.days += t.days; grand.hours += t.hours
    grand.full += t.full; grand.half += t.half; grand.ot += t.ot
    grand.dutyUnits += t.dutyUnits; grand.missing += t.missing
  }
  rows.push(['GRAND TOTAL', grand.punches, grand.days, grand.hours.toFixed(2), grand.full, grand.half,
    grand.ot.toFixed(2), grand.dutyUnits.toFixed(2), grand.missing])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = ETHNIC_HEADERS.map(() => ({ wch: 14 }))
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31))
}

// ---------------------------------------------------------------------------
// MUSTER ROLL (MusterRollGenerator.java port)
// ---------------------------------------------------------------------------

const STATUS_NOTE = "Note: 'M' (Missing Punch) and 'A' (Absent) days are not included in 'Total Attd.'. 'WO' stands for Weekly Off."

/**
 * Build the Muster Roll workbook: one calendar-grid sheet per site,
 * mirroring generateMusterRollSheet() / createCompanyHeader() / createFooter().
 */
export function buildMusterRollWorkbook(monthTitle, sites, allSitesCalculatedData, daysInMonthCount) {
  const wb = XLSX.utils.book_new()
  for (const site of sites) {
    appendMusterRollSheet(wb, site, monthTitle, allSitesCalculatedData[site], daysInMonthCount)
  }
  return wb
}

function appendMusterRollSheet(wb, site, monthTitle, siteData, daysInMonthCount) {
  const rows = []
  rows.push(['Shree Ji Facility Services'])
  rows.push(['Email: contact@shreefacilities.in | Website: shreefacilities.in | Mobile: 9560411801'])
  rows.push([`Monthly Attendance Report for Haldiram's - ${monthTitle}`])
  rows.push([])
  rows.push([`MUSTER ROLL SHEET - ${site.toUpperCase()}`])
  rows.push([])

  const header = ['Sr. No.', 'NAME']
  for (let d = 1; d <= daysInMonthCount; d++) header.push(String(d))
  header.push('Total Attd.')
  rows.push(header)

  siteData.employees.forEach((emp, idx) => {
    rows.push([idx + 1, emp.name, ...emp.dailyStatus, emp.totalAttendance])
  })

  rows.push([])
  rows.push(['', '', `Total Site Attendance: ${siteData.summary.totalSiteAttendance}`])
  rows.push(['', '', `Total Half Days: ${siteData.summary.totalHalfDays} | Total Missing: ${siteData.summary.totalMissingPunches}`])
  rows.push([])
  rows.push([STATUS_NOTE])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 8 }, { wch: 22 }, ...Array.from({ length: daysInMonthCount }, () => ({ wch: 4 })), { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, ws, site.substring(0, 31))
}


// Node port of EthnicReportGenerator_Final.java
//
// Business logic preserved exactly:
//  - Only rows whose Department is "housekeeping staff services" or
//    "houshkeeping staff services" (note the original misspelling is kept
//    intentionally - same allow-list as the Java ALLOWED_DEPARTMENTS set).
//  - Night shift cutoff at 4 AM, duplicate punch window 60 minutes.
//  - OT_THRESHOLD = 9.0, HALF_SHIFT_MIN_HOURS = 5.0.
//  - Calculates BOTH an 8-hour-shift view and a 9-hour-shift view of the
//    same punch data (fullShiftHours = 8.0 and 9.0 respectively).
//  - dutyUnits = full + (half / 2.0) + (ot / fullShiftHours)  <-- Ethnic-only
//    formula (Product/Muster generators do not add the ot/fullShiftHours term).

import {
  readWorkbookRows,
  cellToString,
  cellToDate,
  logicalDateFor,
  formatDateKey,
  dedupPunches,
  disambiguateDuplicateNames,
  fmt2,
  MONTH_NAMES,
} from './attendanceReportEngine.js'

const OT_THRESHOLD = 9.0
const HALF_SHIFT_MIN_HOURS = 5.0
const NIGHT_CUTOFF = 4
const DUPLICATE_PUNCH_WINDOW_MINUTES = 60

const ALLOWED_DEPARTMENTS = new Set(['housekeeping staff services', 'houshkeeping staff services'])

/**
 * Scan the workbook and group DeviceName (site) -> employees found at that
 * site, mirroring getSiteEmployeeMap(). Used to drive the frontend's
 * site/employee inclusion-exclusion selection step (interactive CLI prompt
 * in Java -> a checklist in the web UI).
 */
export function getSiteEmployeeMap(buffer) {
  const rows = readWorkbookRows(buffer)
  const map = new Map() // site -> Map(compositeKey -> name)

  for (const row of rows) {
    const site = cellToString(row.devicename)
    const id = cellToString(row.empno)
    const name = cellToString(row.name)
    if (!site || !id) continue
    const compositeKey = `${id}::${name}`
    if (!map.has(site)) map.set(site, new Map())
    map.get(site).set(compositeKey, name)
  }

  const sortedSites = [...map.keys()].sort()
  return sortedSites.map((site) => ({
    site,
    employees: [...map.get(site).entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([compositeKey, name]) => ({
        empId: compositeKey.split('::')[0],
        name,
      })),
  }))
}

/**
 * Read + group punches by site -> employee -> logical date, applying the
 * department allow-list, month/year filter and duplicate-name disambiguation.
 * Mirrors readAndGroup(). `selectedIds` (Set<string> of empId) mirrors the
 * `selectedMap.containsKey(id)` gate; pass null/undefined to include all.
 */
function readAndGroup(buffer, year, month, selectedIds) {
  const rows = readWorkbookRows(buffer)
  const siteMap = new Map() // site -> Map(empKey -> Map(dateKey -> punches[]))
  const nameToIds = new Map() // name -> Set(id)

  for (const row of rows) {
    const id = cellToString(row.empno)
    if (selectedIds && selectedIds.size > 0 && !selectedIds.has(id)) continue

    const dept = cellToString(row.department)
    if (!ALLOWED_DEPARTMENTS.has(dept.toLowerCase())) continue

    const pt = cellToDate(row.punchtime)
    if (!pt) continue

    const logical = logicalDateFor(pt, NIGHT_CUTOFF)
    if (logical.getMonth() === month - 1 && logical.getFullYear() === year) {
      const site = cellToString(row.devicename)
      let name = cellToString(row.name)
      if (!name || name === id || /^\d+$/.test(name)) name = id

      if (!nameToIds.has(name)) nameToIds.set(name, new Set())
      nameToIds.get(name).add(id)

      const dateKey = formatDateKey(logical)
      const empKey = `${id}::${name}`

      if (!siteMap.has(site)) siteMap.set(site, new Map())
      const empData = siteMap.get(site)
      if (!empData.has(empKey)) empData.set(empKey, new Map())
      const dateData = empData.get(empKey)
      if (!dateData.has(dateKey)) dateData.set(dateKey, [])
      dateData.get(dateKey).push({ site, idNo: id, name, dept, time: pt })
    }
  }

  // Disambiguate duplicate names across all sites (same name, different id)
  for (const [site, empData] of siteMap.entries()) {
    const renamed = disambiguateDuplicateNames(empData, nameToIds, (bucket, newName) => {
      for (const punches of bucket.values()) {
        for (const p of punches) p.name = newName
      }
    })
    siteMap.set(site, renamed)
  }

  return siteMap
}

function newTotals() {
  return { punches: 0, days: 0, full: 0, half: 0, missing: 0, hours: 0, ot: 0, dutyUnits: 0 }
}

/**
 * Compute per-employee + site-total work data for a given shift length.
 * Mirrors calculateWorkData().
 */
function calculateWorkData(empData, fullShiftHours) {
  const employeeList = []
  const siteTotal = newTotals()

  const empKeys = [...empData.keys()].sort()
  for (const empKey of empKeys) {
    const datePunches = empData.get(empKey)
    let punches = 0, full = 0, half = 0
    let hours = 0, ot = 0
    const missingDates = []

    const dateKeys = [...datePunches.keys()].sort()
    for (const date of dateKeys) {
      const punchesOnDay = datePunches.get(date)
      const cleaned = dedupPunches(punchesOnDay, DUPLICATE_PUNCH_WINDOW_MINUTES)

      punches += cleaned.length
      if (cleaned.length < 2) {
        missingDates.push(date.substring(8))
        continue
      }

      const duration = (cleaned[cleaned.length - 1].time.getTime() - cleaned[0].time.getTime()) / 3_600_000.0
      hours += duration

      if (duration >= fullShiftHours) {
        full++
        if (duration > OT_THRESHOLD) ot += duration - OT_THRESHOLD
      } else if (duration >= HALF_SHIFT_MIN_HOURS) {
        half++
      }
    }

    const [empId, name] = empKey.split('::')
    const dutyUnits = full + half / 2.0 + ot / fullShiftHours
    employeeList.push({
      empId,
      name,
      punches,
      days: datePunches.size,
      hours: fmt2(hours),
      fullDays: full,
      halfDays: half,
      overtimeHours: fmt2(ot),
      dutyUnits: fmt2(dutyUnits),
      missingPunchDays: missingDates,
    })

    siteTotal.punches += punches
    siteTotal.days += datePunches.size
    siteTotal.hours += hours
    siteTotal.full += full
    siteTotal.half += half
    siteTotal.ot += ot
    siteTotal.dutyUnits += dutyUnits
    siteTotal.missing += missingDates.length
  }

  return { employees: employeeList, totals: siteTotal }
}

/**
 * Top-level entry point mirroring generate(): computes both the 8-hour and
 * 9-hour shift views for every site found in the workbook.
 *
 * @param {Buffer} buffer   raw uploaded .xlsx file
 * @param {number} year
 * @param {number} month    1-12
 * @param {string[]} [selectedEmpIds]  optional inclusion filter (empId list); omit/[] = include all
 */
export function generateEthnicReport(buffer, year, month, selectedEmpIds) {
  const selectedIds = selectedEmpIds && selectedEmpIds.length > 0 ? new Set(selectedEmpIds) : null
  const siteData = readAndGroup(buffer, year, month, selectedIds)
  if (siteData.size === 0) {
    throw new Error('No data selected for processing. Check the department filter, selected employees, and month/year.')
  }

  const monthTitle = `${MONTH_NAMES[month - 1]} ${year}`

  const dataFor8Hour = {}
  const dataFor9Hour = {}
  const sites = [...siteData.keys()].sort()
  for (const site of sites) {
    dataFor8Hour[site] = calculateWorkData(siteData.get(site), 8.0)
    dataFor9Hour[site] = calculateWorkData(siteData.get(site), 9.0)
  }

  return { monthTitle, year, month, sites, dataFor8Hour, dataFor9Hour }
}

/** Sum a list of site Totals objects into a single grand-total Totals object. */
export function sumTotals(sites, dataByShift) {
  const grand = newTotals()
  for (const site of sites) {
    const t = dataByShift[site].totals
    grand.punches += t.punches
    grand.days += t.days
    grand.hours += t.hours
    grand.full += t.full
    grand.half += t.half
    grand.ot += t.ot
    grand.dutyUnits += t.dutyUnits
    grand.missing += t.missing
  }
  return grand
}

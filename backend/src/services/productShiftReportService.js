// Node port of "AttendanceReportGenerator copy.java" (Haldiram Product -
// dual 8-Hour/9-Hour shift attendance report).
//
// Business logic preserved exactly:
//  - No department filter.
//  - OVERTIME_THRESHOLD = 9.0, HALF_SHIFT_MIN_HOURS = 5.0.
//  - DEFAULT_NIGHT_SHIFT_CUTOFF = 4 AM, DUPLICATE_PUNCH_WINDOW_MINUTES = 30.
//  - Special case: for site "Karol Bagh" (case-insensitive) AND employee id
//    in KAROL_BAGH_NIGHT_SHIFT_IDS ({88023, 87140}), the night-shift cutoff
//    is 16 (4 PM) instead of the default 4 AM.
//  - dutyUnits = full + (half / 2.0)  <-- NOTE: unlike the Ethnic report,
//    this generator does NOT add an ot/fullShiftHours term.
//  - Calculates BOTH an 8-hour-shift view and a 9-hour-shift view of the
//    same punch data, each with per-site employee tables + site totals.

import {
  readWorkbookRows,
  cellToString,
  cellToDate,
  dedupPunches,
  fmt2,
  MONTH_NAMES,
} from './attendanceReportEngine.js'

const OVERTIME_THRESHOLD = 9.0
const HALF_SHIFT_MIN_HOURS = 5.0
const DEFAULT_NIGHT_SHIFT_CUTOFF = 4
const DUPLICATE_PUNCH_WINDOW_MINUTES = 30
const KAROL_BAGH_NIGHT_SHIFT_IDS = new Set(['88023', '87140'])
const KAROL_BAGH_NIGHT_SHIFT_CUTOFF = 16 // 4 PM

/** Read all valid punches (site, empKey, punchTime), mirroring readPunchesFromFile(). */
function readPunchesFromFile(buffer) {
  const rows = readWorkbookRows(buffer)
  const allPunches = []
  for (const row of rows) {
    const site = cellToString(row.devicename)
    const empId = cellToString(row.empno ?? row.idno)
    const name = cellToString(row.name)
    const punchTime = cellToDate(row.punchtime)
    if (punchTime && site && empId && name) {
      allPunches.push({ site, empKey: `${empId}::${name}`, punchTime })
    }
  }
  return allPunches
}

/**
 * Group punches by site -> empKey -> logical date -> punch times[],
 * applying the Karol Bagh night-shift special case, mirroring
 * groupPunchesByLogicalDay().
 */
function groupPunchesByLogicalDay(allPunches, reportYear, reportCalendarMonth) {
  const siteData = new Map()

  for (const punch of allPunches) {
    const cal = new Date(punch.punchTime.getTime())
    const empId = punch.empKey.split('::')[0]

    if (punch.site.toLowerCase() === 'karol bagh' && KAROL_BAGH_NIGHT_SHIFT_IDS.has(empId)) {
      if (cal.getHours() < KAROL_BAGH_NIGHT_SHIFT_CUTOFF) cal.setDate(cal.getDate() - 1)
    } else {
      if (cal.getHours() < DEFAULT_NIGHT_SHIFT_CUTOFF) cal.setDate(cal.getDate() - 1)
    }

    if (cal.getMonth() === reportCalendarMonth && cal.getFullYear() === reportYear) {
      const y = cal.getFullYear()
      const m = String(cal.getMonth() + 1).padStart(2, '0')
      const d = String(cal.getDate()).padStart(2, '0')
      const punchDate = `${y}-${m}-${d}`

      if (!siteData.has(punch.site)) siteData.set(punch.site, new Map())
      const empMap = siteData.get(punch.site)
      if (!empMap.has(punch.empKey)) empMap.set(punch.empKey, new Map())
      const dateMap = empMap.get(punch.empKey)
      if (!dateMap.has(punchDate)) dateMap.set(punchDate, [])
      dateMap.get(punchDate).push(punch.punchTime)
    }
  }

  return siteData
}

function newTotals() {
  return { punches: 0, days: 0, full: 0, half: 0, missing: 0, hours: 0, ot: 0, dutyUnits: 0 }
}

/**
 * Compute per-site employee lists + site totals for a given shift length,
 * mirroring calculateAttendanceData().
 */
function calculateAttendanceData(siteData, fullShiftHours) {
  const siteEmployeeData = new Map() // site -> employeeList[]
  const siteTotals = new Map() // site -> Totals

  const sites = [...siteData.keys()].sort()
  for (const site of sites) {
    const empMap = siteData.get(site)
    const employeeList = []
    const currentSiteTotal = newTotals()

    const empKeys = [...empMap.keys()].sort()
    for (const empKey of empKeys) {
      const datePunches = empMap.get(empKey)
      let punches = 0, full = 0, half = 0
      let hours = 0, ot = 0
      const missingDates = []

      const dateKeys = [...datePunches.keys()].sort()
      for (const date of dateKeys) {
        const punchesOnDay = datePunches.get(date).map((time) => ({ time }))
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
          if (duration > OVERTIME_THRESHOLD) ot += duration - OVERTIME_THRESHOLD
        } else if (duration >= HALF_SHIFT_MIN_HOURS) {
          half++
        }
      }

      const [empId, name] = empKey.split('::')
      const dutyUnits = full + half / 2.0
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

      currentSiteTotal.punches += punches
      currentSiteTotal.days += datePunches.size
      currentSiteTotal.hours += hours
      currentSiteTotal.full += full
      currentSiteTotal.half += half
      currentSiteTotal.ot += ot
      currentSiteTotal.dutyUnits += dutyUnits
      currentSiteTotal.missing += missingDates.length
    }

    siteEmployeeData.set(site, employeeList)
    siteTotals.set(site, currentSiteTotal)
  }

  return { sites, siteEmployeeData, siteTotals }
}

/**
 * Top-level entry point mirroring generate(): computes both the 8-hour and
 * 9-hour shift views across all sites found in the workbook.
 *
 * @param {Buffer} buffer  raw uploaded .xlsx file
 * @param {number} year
 * @param {number} month  1-12
 */
export function generateProductShiftReport(buffer, year, month) {
  const allPunches = readPunchesFromFile(buffer)
  if (allPunches.length === 0) {
    throw new Error('No valid punch data was found in the source file.')
  }

  const siteData = groupPunchesByLogicalDay(allPunches, year, month - 1)
  if (siteData.size === 0) {
    throw new Error('No valid data found for the specified month and year.')
  }

  const monthTitle = `${MONTH_NAMES[month - 1]} ${year}`
  const shift8 = calculateAttendanceData(siteData, 8.0)
  const shift9 = calculateAttendanceData(siteData, 9.0)

  return { monthTitle, year, month, shift8, shift9 }
}

export function sumSiteTotals(sites, siteTotals) {
  const grand = newTotals()
  for (const site of sites) {
    const t = siteTotals.get(site)
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

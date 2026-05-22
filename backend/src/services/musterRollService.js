// Node port of MusterRollGenerator.java (Haldiram Product - monthly muster
// roll calendar-grid report).
//
// Business logic preserved exactly:
//  - No department filter.
//  - FULL_SHIFT_HOURS = 8.0, HALF_SHIFT_MIN_HOURS = 5.0.
//  - DEFAULT_NIGHT_SHIFT_CUTOFF = 4 AM, DUPLICATE_PUNCH_WINDOW_MINUTES = 30.
//  - Same Karol Bagh special case as the shift report: for site "Karol Bagh"
//    (case-insensitive) AND employee id in KAROL_BAGH_NIGHT_SHIFT_IDS
//    ({88023, 87140}), cutoff is 16 (4 PM) instead of the default 4 AM.
//  - Per employee, per calendar day of the month:
//      P  = full duty   (duration >= 8h)          -> +1.0 attendance
//      H  = half duty   (5h <= duration < 8h)      -> +0.5 attendance
//      M  = missing punch (<2 punches OR duration < 5h)
//      A  = absent (no punch data that day at all)
//      WO = weekly off - overrides "A" only, on Sundays
//  - One "sheet" of data per site: a calendar grid of daily status letters
//    per employee, plus a site summary (total attendance / half days /
//    missing punches).

import {
  readWorkbookRows,
  cellToString,
  cellToDate,
  dedupPunches,
  MONTH_NAMES,
} from './attendanceReportEngine.js'

const FULL_SHIFT_HOURS = 8.0
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
    if (site && empId && name && punchTime) {
      allPunches.push({ site, empKey: `${empId}::${name}`, punchTime })
    }
  }
  return allPunches
}

/** Mirrors groupPunchesByLogicalDay() including the Karol Bagh cutoff override. */
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

    if (cal.getMonth() !== reportCalendarMonth || cal.getFullYear() !== reportYear) continue

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

  return siteData
}

function daysInMonth(year, month1to12) {
  return new Date(year, month1to12, 0).getDate()
}

/** Set of day-of-month numbers that fall on a Sunday, mirroring getSundaysForMonth(). */
function getSundaysForMonth(year, month1to12) {
  const sundays = new Set()
  const total = daysInMonth(year, month1to12)
  for (let day = 1; day <= total; day++) {
    const d = new Date(year, month1to12 - 1, day)
    if (d.getDay() === 0) sundays.add(day)
  }
  return sundays
}

/**
 * Compute the calendar-grid muster roll data for a single site,
 * mirroring calculateMusterRollData().
 */
function calculateMusterRollData(empData, year, month1to12) {
  const employeeResults = []
  let siteTotalAttendance = 0
  let siteTotalHalfDays = 0
  let siteTotalMissing = 0

  const total = daysInMonth(year, month1to12)
  const weeklyOffDays = getSundaysForMonth(year, month1to12)

  const empKeys = [...empData.keys()].sort()
  for (const empKey of empKeys) {
    const [empId, name] = empKey.split('::')
    let empTotalAttendance = 0
    const dailyStatusList = []
    const datePunches = empData.get(empKey)

    for (let day = 1; day <= total; day++) {
      const y = year
      const m = String(month1to12).padStart(2, '0')
      const d = String(day).padStart(2, '0')
      const dateStr = `${y}-${m}-${d}`
      let status = 'A' // default absent

      if (datePunches.has(dateStr)) {
        const punchesOnDay = datePunches.get(dateStr).map((time) => ({ time }))
        const cleaned = dedupPunches(punchesOnDay, DUPLICATE_PUNCH_WINDOW_MINUTES)

        if (cleaned.length < 2) {
          status = 'M'
          siteTotalMissing++
        } else {
          const duration = (cleaned[cleaned.length - 1].time.getTime() - cleaned[0].time.getTime()) / 3_600_000.0
          if (duration >= FULL_SHIFT_HOURS) {
            status = 'P'
            empTotalAttendance += 1.0
          } else if (duration >= HALF_SHIFT_MIN_HOURS) {
            status = 'H'
            empTotalAttendance += 0.5
            siteTotalHalfDays++
          } else {
            status = 'M'
            siteTotalMissing++
          }
        }
      }

      if (weeklyOffDays.has(day) && status === 'A') {
        status = 'WO'
      }
      dailyStatusList.push(status)
    }

    employeeResults.push({ empId, name, totalAttendance: empTotalAttendance, dailyStatus: dailyStatusList })
    siteTotalAttendance += empTotalAttendance
  }

  return {
    employees: employeeResults,
    summary: {
      totalSiteAttendance: siteTotalAttendance,
      totalHalfDays: siteTotalHalfDays,
      totalMissingPunches: siteTotalMissing,
    },
  }
}

/**
 * Top-level entry point mirroring generateReport(): computes the muster
 * roll calendar grid for every site found in the workbook.
 *
 * @param {Buffer} buffer  raw uploaded .xlsx file
 * @param {number} year
 * @param {number} month  1-12
 */
export function generateMusterRoll(buffer, year, month) {
  const allPunches = readPunchesFromFile(buffer)
  if (allPunches.length === 0) {
    throw new Error('Could not read any valid punch data from the file.')
  }

  const siteData = groupPunchesByLogicalDay(allPunches, year, month - 1)
  if (siteData.size === 0) {
    throw new Error('No valid data found for the specified month and year.')
  }

  const monthTitle = `${MONTH_NAMES[month - 1]} ${year}`
  const sites = [...siteData.keys()].sort()
  const allSitesCalculatedData = {}
  for (const site of sites) {
    allSitesCalculatedData[site] = calculateMusterRollData(siteData.get(site), year, month)
  }

  return { monthTitle, year, month, sites, allSitesCalculatedData, daysInMonth: daysInMonth(year, month) }
}

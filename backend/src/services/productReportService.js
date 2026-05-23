// Node port of DailyWorkReportGenerator.java (Haldiram "Product" report)
//
// Business logic preserved exactly:
//  - No department filter (unlike the Ethnic generator).
//  - FULL_DUTY_THRESHOLD_HOURS = 8.0, HALF_DUTY_THRESHOLD_HOURS = 4.0 (note:
//    half-duty uses "> 4.0", not ">=" - ported literally below).
//  - OVERTIME_THRESHOLD_HOURS = 9.0, night shift cutoff 4 AM.
//  - No duplicate-punch dedup window in this generator (first/last punch of
//    the day are used directly, matching the Java source).
//  - Single punch on a day => "Missing Punch" duty status with 0 duration
//    (this generator does NOT auto-credit a full day for a single punch -
//    that special case only existed in EthnicDailyWorkReportGenerator3).
//  - Per-site sheets + one "Consolidated View" sheet aggregating all sites.
//  - dutySummary only lists employees with totalDuty > 0; overtimeSummary
//    only lists employees with totalOvertime > 0.01.

import {
  readWorkbookRows,
  cellToString,
  cellToDate,
  logicalDateFor,
  formatDateKey,
  formatDateTime,
  fmt2,
  MONTH_NAMES,
} from './attendanceReportEngine.js'

const FULL_DUTY_THRESHOLD_HOURS = 8.0
const HALF_DUTY_THRESHOLD_HOURS = 4.0
const OVERTIME_THRESHOLD_HOURS = 9.0
const NIGHT_CUTOFF = 4

/**
 * Read all valid punches from the workbook and group by site -> empKey ->
 * logicalDate -> punches[]. Mirrors readAndGroupPunches(). A row is only
 * included if site, empId, name and punchTime are all present (matches the
 * Java `if (punchTime != null && !site.isEmpty() && !idNo.isEmpty() && !name.isEmpty())` guard).
 */
function readAndGroupPunches(buffer, reportYear, reportMonth) {
  const rows = readWorkbookRows(buffer)
  const calendarMonth = reportMonth - 1

  const allPunches = []
  for (const row of rows) {
    const site = cellToString(row.devicename)
    const name = cellToString(row.name)
    const idNo = cellToString(row.empno ?? row.idno)
    const punchTime = cellToDate(row.punchtime)
    const department = cellToString(row.department)

    if (punchTime && site && idNo && name) {
      allPunches.push({ site, idNo, name, department, punchTime })
    }
  }

  if (allPunches.length === 0) return new Map()

  const siteData = new Map() // site -> Map(empKey -> Map(dateKey -> punches[]))
  for (const punch of allPunches) {
    const logical = logicalDateFor(punch.punchTime, NIGHT_CUTOFF)
    if (logical.getMonth() === calendarMonth && logical.getFullYear() === reportYear) {
      const dateKey = formatDateKey(logical)
      const empKey = `${punch.idNo}::${punch.name}`

      if (!siteData.has(punch.site)) siteData.set(punch.site, new Map())
      const empMap = siteData.get(punch.site)
      if (!empMap.has(empKey)) empMap.set(empKey, new Map())
      const dateMap = empMap.get(empKey)
      if (!dateMap.has(dateKey)) dateMap.set(dateKey, [])
      dateMap.get(dateKey).push(punch)
    }
  }

  return siteData
}

function newEmployeeTotals(idNo, name) {
  return { idNo, name, fullDutyDays: 0, halfDutyDays: 0, totalOvertime: 0 }
}

/**
 * Compute dailyEntries + dutySummary + overtimeSummary + grandTotals for a
 * single site's employee/date punch map. Mirrors calculateWorkData().
 */
function calculateWorkData(empData) {
  const dailyEntries = []
  const finalTotalsMap = new Map() // empKey -> EmployeeTotals

  const empKeys = [...empData.keys()]
  for (const empKey of empKeys) {
    const dailyPunches = empData.get(empKey)
    const dateKeys = [...dailyPunches.keys()].sort()

    for (const date of dateKeys) {
      const punchesOnDay = [...dailyPunches.get(date)].sort((a, b) => a.punchTime.getTime() - b.punchTime.getTime())
      const firstRecord = punchesOnDay[0]

      const entry = {
        site: firstRecord.site,
        idNo: firstRecord.idNo,
        name: firstRecord.name,
        department: firstRecord.department,
        date,
      }

      let dutyStatus = 'Missing Punch'
      let durationInHours = 0
      let otHours = 0

      if (!finalTotalsMap.has(empKey)) finalTotalsMap.set(empKey, newEmployeeTotals(firstRecord.idNo, firstRecord.name))
      const totals = finalTotalsMap.get(empKey)

      if (punchesOnDay.length >= 2) {
        const firstPunchTime = punchesOnDay[0].punchTime
        const lastPunchTime = punchesOnDay[punchesOnDay.length - 1].punchTime
        entry.punchIn = formatDateTime(firstPunchTime)
        entry.punchOut = formatDateTime(lastPunchTime)
        durationInHours = (lastPunchTime.getTime() - firstPunchTime.getTime()) / (1000.0 * 60 * 60)

        if (durationInHours >= FULL_DUTY_THRESHOLD_HOURS) {
          dutyStatus = '1'
          totals.fullDutyDays++
          if (durationInHours > OVERTIME_THRESHOLD_HOURS) {
            otHours = durationInHours - OVERTIME_THRESHOLD_HOURS
          }
        } else if (durationInHours > HALF_DUTY_THRESHOLD_HOURS) {
          dutyStatus = 'Half Duty'
          totals.halfDutyDays++
        } else {
          dutyStatus = 'No Duty'
        }
      } else {
        entry.punchIn = formatDateTime(punchesOnDay[0].punchTime)
        entry.punchOut = ''
      }

      totals.totalOvertime += otHours
      entry.duration = fmt2(durationInHours)
      entry.dutyStatus = dutyStatus
      entry.otHours = fmt2(otHours)
      dailyEntries.push(entry)
    }
  }

  const dutySummary = []
  const overtimeSummary = []
  let grandTotalDuty = 0
  let grandTotalOT = 0

  for (const t of finalTotalsMap.values()) {
    const employeeTotalDuty = t.fullDutyDays + t.halfDutyDays * 0.5
    if (employeeTotalDuty > 0) {
      dutySummary.push({ idNo: t.idNo, name: t.name, totalDuty: employeeTotalDuty })
      grandTotalDuty += employeeTotalDuty
    }
    if (t.totalOvertime > 0.01) {
      overtimeSummary.push({ name: t.name, totalOvertime: fmt2(t.totalOvertime) })
      grandTotalOT += t.totalOvertime
    }
  }

  return {
    dailyEntries,
    dutySummary,
    overtimeSummary,
    grandTotals: { duty: grandTotalDuty, overtime: fmt2(grandTotalOT) },
  }
}

/**
 * Merge all per-site calculated data into one consolidated view, matching
 * createConsolidatedSummary(): re-derives duty/OT summaries across the union
 * of all sites' daily entries (recomputing from raw entries, not by naive
 * summation, exactly as the Java implementation does).
 */
function createConsolidatedSummary(allSitesCalculatedData) {
  const consolidatedDailyEntries = []
  const finalTotalsMap = new Map()

  for (const siteData of Object.values(allSitesCalculatedData)) {
    consolidatedDailyEntries.push(...siteData.dailyEntries)
    for (const summary of siteData.dutySummary) {
      const empKey = `${summary.idNo}::${summary.name}`
      if (!finalTotalsMap.has(empKey)) finalTotalsMap.set(empKey, newEmployeeTotals(summary.idNo, summary.name))
    }
  }

  for (const entry of consolidatedDailyEntries) {
    const empKey = `${entry.idNo}::${entry.name}`
    const totals = finalTotalsMap.get(empKey)
    if (totals) {
      const duration = parseFloat(entry.duration)
      if (duration >= FULL_DUTY_THRESHOLD_HOURS) {
        totals.fullDutyDays++
      } else if (duration > HALF_DUTY_THRESHOLD_HOURS) {
        totals.halfDutyDays++
      }
      totals.totalOvertime += parseFloat(entry.otHours)
    }
  }

  const finalDutySummary = []
  const finalOvertimeSummary = []
  let grandTotalDuty = 0
  let grandTotalOT = 0

  const sortedKeys = [...finalTotalsMap.keys()].sort()
  for (const key of sortedKeys) {
    const t = finalTotalsMap.get(key)
    const employeeTotalDuty = t.fullDutyDays + t.halfDutyDays * 0.5
    if (employeeTotalDuty > 0) {
      finalDutySummary.push({ idNo: t.idNo, name: t.name, totalDuty: employeeTotalDuty })
      grandTotalDuty += employeeTotalDuty
    }
    if (t.totalOvertime > 0.01) {
      finalOvertimeSummary.push({ name: t.name, totalOvertime: fmt2(t.totalOvertime) })
      grandTotalOT += t.totalOvertime
    }
  }

  return {
    dailyEntries: consolidatedDailyEntries,
    dutySummary: finalDutySummary,
    overtimeSummary: finalOvertimeSummary,
    grandTotals: { duty: grandTotalDuty, overtime: fmt2(grandTotalOT) },
  }
}

/**
 * Top-level entry point mirroring generate(): computes per-site data plus a
 * consolidated cross-site view.
 *
 * @param {Buffer} buffer  raw uploaded .xlsx file
 * @param {number} year
 * @param {number} month  1-12
 */
export function generateProductReport(buffer, year, month) {
  const siteData = readAndGroupPunches(buffer, year, month)
  if (siteData.size === 0) {
    throw new Error('No valid data found for the specified month and year.')
  }

  const monthTitle = `${MONTH_NAMES[month - 1]} ${year}`
  const allSitesCalculatedData = {}
  const sites = [...siteData.keys()].sort()
  for (const site of sites) {
    allSitesCalculatedData[site] = calculateWorkData(siteData.get(site))
  }

  const consolidated = createConsolidatedSummary(allSitesCalculatedData)

  return { monthTitle, year, month, sites, allSitesCalculatedData, consolidated }
}

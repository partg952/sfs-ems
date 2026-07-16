// Employee Sync Service
//
// Bridges the stateless Attendance Report Generator module (Ethnic/Product/
// Product-Shift/Muster Roll punch-file uploads) with the real EMS records
// (employees, sites, attendance_days) - so uploading a biometric punch
// export automatically:
//   1. Matches each punch-file employee (site + punch id + name) to an
//      existing EMS employee, via the punch_device_ids mapping table first,
//      then by (site, name) as a fallback, backfilling the mapping.
//   2. Auto-creates a new site (and, if needed, a placeholder client to hold
//      it) when the punch file references a site/device name that doesn't
//      exist yet in the EMS.
//   3. Auto-creates a new employee (with a dynamically-generated next
//      SFS-XXXX code) when no existing employee matches - using the
//      Department column from the punch file as the initial designation
//      (falling back to "Unassigned" only if the file has no Department
//      column for that row), and logs a status_history audit entry so the
//      auto-creation is traceable.
//   4. Upserts the computed attendance-days figure for the report's
//      month/year into the `attendance_days` staging table, so the Payroll
//      "Monthly Attendance Input" screen can read it as a pre-fill without
//      ever silently overwriting a manually-entered payroll_records row.
//   5. Marks punch-import-linked employees as LEFT (soft-delete, preserving
//      all payroll/statutory history) when they were previously seen at a
//      site via punch_device_ids but no longer appear in that site's
//      current punch-file upload - never touches manually-created
//      employees that aren't punch-mapped, and never hard-deletes anything.
//
// Nothing here is hardcoded to any specific site/employee/count - every
// value (site names, punch ids, employee names, departments, attendance
// figures) is derived dynamically from whatever the uploaded punch file
// contains.

import { query, pool } from '../db.js'
import { readWorkbookRows, cellToString } from './attendanceReportEngine.js'

const PLACEHOLDER_CLIENT_NAME = 'Punch Import - Unassigned Client'
const EMPLOYEE_CODE_PREFIX = 'SFS-'
const EMPLOYEE_CODE_PAD = 4

/**
 * Compute the next dynamic employee_code (e.g. "SFS-0001", "SFS-0042") by
 * inspecting the numeric suffix of every existing employee_code that
 * matches the SFS-XXXX pattern and incrementing the highest one found.
 * Never hardcoded - always derived from current DB state.
 */
async function getNextEmployeeCode(client) {
  const res = await client.query(
    `SELECT employee_code FROM employees WHERE employee_code ~ '^SFS-[0-9]+$'`
  )
  let maxNum = 0
  for (const row of res.rows) {
    const num = parseInt(row.employee_code.slice(EMPLOYEE_CODE_PREFIX.length), 10)
    if (!isNaN(num) && num > maxNum) maxNum = num
  }
  const next = maxNum + 1
  return `${EMPLOYEE_CODE_PREFIX}${String(next).padStart(EMPLOYEE_CODE_PAD, '0')}`
}

/** Find an existing site by case-insensitive name match. */
async function findSiteByName(client, siteName) {
  const res = await client.query(
    `SELECT id, name FROM sites WHERE LOWER(name) = LOWER($1) LIMIT 1`,
    [siteName]
  )
  return res.rows[0] || null
}

/** Get (or lazily create) the placeholder client used to hold auto-created sites. */
async function getOrCreatePlaceholderClient(client) {
  const existing = await client.query(
    `SELECT id FROM clients WHERE name = $1 LIMIT 1`,
    [PLACEHOLDER_CLIENT_NAME]
  )
  if (existing.rows.length > 0) return existing.rows[0].id

  const created = await client.query(
    `INSERT INTO clients (name, contact_person, is_active)
     VALUES ($1, 'Auto-generated from punch import', true)
     RETURNING id`,
    [PLACEHOLDER_CLIENT_NAME]
  )
  return created.rows[0].id
}

/** Auto-create a new site under the placeholder client when a punch file references an unknown site name. */
async function createSite(client, siteName) {
  const clientId = await getOrCreatePlaceholderClient(client)
  const res = await client.query(
    `INSERT INTO sites (client_id, name, is_active) VALUES ($1, $2, true) RETURNING id, name`,
    [clientId, siteName]
  )
  return res.rows[0]
}

/** Look up a mapped employee for a given (punchId, siteName) pair. */
async function findMappedEmployee(client, punchId, siteName) {
  const res = await client.query(
    `SELECT employee_id FROM punch_device_ids WHERE punch_id = $1 AND site_name = $2 LIMIT 1`,
    [punchId, siteName]
  )
  return res.rows[0]?.employee_id || null
}

/** Fallback match: an existing employee with the same name (case-insensitive) at the same site. */
async function findEmployeeByNameAndSite(client, name, siteId) {
  const res = await client.query(
    `SELECT id FROM employees WHERE LOWER(name) = LOWER($1) AND site_id = $2 LIMIT 1`,
    [name, siteId]
  )
  return res.rows[0]?.id || null
}

/** Persist the punch id -> employee mapping so future uploads resolve instantly. */
async function saveMapping(client, punchId, siteName, employeeId) {
  await client.query(
    `INSERT INTO punch_device_ids (punch_id, site_name, employee_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (punch_id, site_name) DO UPDATE SET employee_id = EXCLUDED.employee_id`,
    [punchId, siteName, employeeId]
  )
}

/** Auto-create a new employee with dynamically-derived designation, dynamically-generated employee_code. */
async function createEmployee(client, { name, siteId, designation, actor }) {
  const employeeCode = await getNextEmployeeCode(client)
  const finalDesignation = designation && designation.trim() ? designation.trim() : 'Unassigned'
  const res = await client.query(
    `INSERT INTO employees (
       employee_code, name, site_id, designation, daily_wage, monthly_wage,
       status, joining_date
     ) VALUES ($1, $2, $3, $4, 0, 0, 'ACTIVE', CURRENT_DATE)
     RETURNING id, employee_code`,
    [employeeCode, name, siteId, finalDesignation]
  )
  const employee = res.rows[0]

  await client.query(
    `INSERT INTO status_history (employee_id, old_status, new_status, remark, changed_by)
     VALUES ($1, NULL, 'ACTIVE', $2, $3)`,
    [employee.id, `Auto-created from attendance punch-file import (designation from Department column: "${finalDesignation}"; wage pending HR review)`, actor || 'SYSTEM']
  )

  return employee
}

/**
 * Resolve every unique (site, punchId, name) tuple found in a punch file
 * against the real EMS, auto-creating sites/employees as needed, and
 * return a lookup map of `${punchId}::${name}` -> employeeId plus a summary
 * of what happened (for the API response / frontend banner).
 *
 * @param {Array<{site: string, empId: string, name: string, department?: string}>} entries
 *   Deduplicated list of employees found in the uploaded punch file.
 * @param {string} actor  username performing the upload, for audit trails.
 */
export async function resolveEmployeesFromPunchEntries(entries, actor) {
  const summary = { matched: 0, autoCreated: 0, newSites: 0, autoCreatedEmployees: [], newSiteNames: [], designationUpdated: [] }
  const empKeyToEmployeeId = new Map()

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const siteCache = new Map() // siteName(lower) -> {id, name}

    for (const entry of entries) {
      const siteName = entry.site.trim()
      const punchId = entry.empId.trim()
      const name = entry.name.trim()
      if (!siteName || !punchId || !name) continue

      const empKey = `${punchId}::${name}`
      if (empKeyToEmployeeId.has(empKey)) continue

      // Resolve site (cached within this run to avoid duplicate creation)
      let site = siteCache.get(siteName.toLowerCase())
      if (!site) {
        site = await findSiteByName(client, siteName)
        if (!site) {
          site = await createSite(client, siteName)
          summary.newSites++
          summary.newSiteNames.push(site.name)
        }
        siteCache.set(siteName.toLowerCase(), site)
      }

      // 1. Try existing punch-id mapping
      let employeeId = await findMappedEmployee(client, punchId, siteName)

      // 2. Fallback: match by name + site, then backfill the mapping
      if (!employeeId) {
        employeeId = await findEmployeeByNameAndSite(client, name, site.id)
        if (employeeId) {
          await saveMapping(client, punchId, siteName, employeeId)
        }
      }

      // 3. Auto-create a brand-new employee
      if (!employeeId) {
        const created = await createEmployee(client, { name, siteId: site.id, designation: entry.department, actor })
        employeeId = created.id
        await saveMapping(client, punchId, siteName, employeeId)
        summary.autoCreated++
        summary.autoCreatedEmployees.push({
          employeeId, employeeCode: created.employee_code, name, site: siteName,
          designation: (entry.department && entry.department.trim()) || 'Unassigned',
        })
      } else {
        summary.matched++
        // Always keep designation in sync with the punch file's Department
        // column when it provides a real value - the attendance report is
        // treated as the live source of truth for designation (an
        // employee's actual on-ground duty), overriding whatever was set
        // before (including a prior manual edit), since HR re-uploads the
        // punch file precisely because ground-truth roles change.
        if (entry.department && entry.department.trim()) {
          const newDesignation = entry.department.trim()
          const curRes = await client.query('SELECT employee_code, designation FROM employees WHERE id = $1', [employeeId])
          const oldDesignation = curRes.rows[0]?.designation
          const employeeCode = curRes.rows[0]?.employee_code
          if (oldDesignation !== newDesignation) {
            await client.query(
              `UPDATE employees SET designation = $1, updated_at = NOW() WHERE id = $2`,
              [newDesignation, employeeId]
            )
            await client.query(
              `INSERT INTO employment_history (employee_id, old_designation, new_designation, changed_by)
               VALUES ($1, $2, $3, $4)`,
              [employeeId, oldDesignation, newDesignation, actor || 'SYSTEM']
            )
            summary.designationUpdated.push({
              employeeId, employeeCode, name, site: siteName,
              oldDesignation: oldDesignation || 'Unassigned', newDesignation,
            })
          }
        }
      }

      empKeyToEmployeeId.set(empKey, employeeId)
    }

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }

  return { empKeyToEmployeeId, summary }
}

/**
 * Upsert computed attendance-days figures into both the attendance_days
 * staging table (for traceability/reporting) AND directly into
 * payroll_records as a DRAFT - so the Payroll "Monthly Attendance Input"
 * screen shows the days as already "Saved" immediately after a punch-file
 * upload, with no separate manual Save step required. HR can still freely
 * edit the days (or gross/net figures via the normal payroll flow) and
 * re-save at any time - this only ever writes a DRAFT record, and never
 * overwrites a payroll_records row that has already been finalized via
 * "Process Payroll" (status = 'PROCESSED'), protecting finalized statutory
 * calculations from being silently clobbered by a later punch upload.
 *
 * @param {Map<number, number>} employeeIdToDays
 * @param {number} month
 * @param {number} year
 * @param {string} reportType  e.g. 'muster-roll', 'ethnic', 'product', 'product-shift'
 * @param {string} actor
 */
export async function syncAttendanceDays(employeeIdToDays, month, year, reportType, actor) {
  for (const [employeeId, days] of employeeIdToDays.entries()) {
    await query(
      `INSERT INTO attendance_days (employee_id, month, year, days, source, report_type, synced_by)
       VALUES ($1, $2, $3, $4, 'PUNCH_IMPORT', $5, $6)
       ON CONFLICT (employee_id, month, year) DO UPDATE SET
         days = EXCLUDED.days,
         report_type = EXCLUDED.report_type,
         synced_by = EXCLUDED.synced_by,
         updated_at = NOW()`,
      [employeeId, month, year, days, reportType, actor]
    )

    const empRes = await query('SELECT daily_wage, monthly_wage FROM employees WHERE id = $1', [employeeId])
    if (empRes.rows.length === 0) continue

    const dailyWageRaw = parseFloat(empRes.rows[0].daily_wage) || 0
    const monthlyWageRaw = parseFloat(empRes.rows[0].monthly_wage) || 0
    // Same fallback as the manual attendance-save route: if only Monthly
    // Wage was set (common for salaried staff), derive an effective daily
    // rate from monthly_wage / 26 instead of computing a 0 gross salary.
    const dailyWage = dailyWageRaw > 0 ? dailyWageRaw : (monthlyWageRaw > 0 ? monthlyWageRaw / 26 : 0)
    const gross = dailyWage * days
    const txId = `PAY-${year}-${month}-${employeeId}`

    await query(
      `INSERT INTO payroll_records (
         transaction_id, employee_id, payroll_month, payroll_year,
         attendance_days, total_working_days, gross_salary, net_salary, status, processed_by
       ) VALUES ($1, $2, $3, $4, $5, 26, $6, $6, 'DRAFT', $7)
       ON CONFLICT (employee_id, payroll_month, payroll_year) DO UPDATE SET
         attendance_days = EXCLUDED.attendance_days,
         gross_salary = EXCLUDED.gross_salary,
         net_salary = EXCLUDED.gross_salary,
         updated_at = NOW()
       WHERE payroll_records.status = 'DRAFT'`,
      [txId, employeeId, month, year, days, gross, actor]
    )
  }
}

// ---------------------------------------------------------------------------
// Report-shape adapters
//
// Each attendance report service returns a slightly different per-employee
// shape (empId/idNo field name, attendance metric field name, plain-object
// vs Map site containers). These adapters normalize any of the four report
// results into a flat list of { site, empId, name, days } tuples, which is
// all resolveEmployeesFromPunchEntries / syncAttendanceDays need - keeping
// the sync logic itself completely report-agnostic and driven only by
// whatever data the uploaded file actually contains.
// ---------------------------------------------------------------------------

/**
 * Build a (empId::site) -> department lookup by re-reading the raw punch
 * workbook rows directly (bypassing each report service's own business
 * logic/filtering, which varies per report type and is intentionally left
 * untouched). Uses the first non-empty Department value seen for a given
 * employee+site combination. Returns an empty map (safe no-op) if the
 * workbook has no Department column at all.
 */
export function buildDepartmentLookup(buffer) {
  const lookup = new Map()
  try {
    const rows = readWorkbookRows(buffer)
    for (const row of rows) {
      const site = cellToString(row.devicename)
      const empId = cellToString(row.empno ?? row.idno)
      const dept = cellToString(row.department)
      if (!site || !empId || !dept) continue
      const key = `${empId}::${site}`
      if (!lookup.has(key)) lookup.set(key, dept)
    }
  } catch {
    // Malformed workbook / no department column - sync still proceeds
    // without designation enrichment, falling back to 'Unassigned'.
  }
  return lookup
}

/** Attach a `department` field to each extracted entry using the department lookup, when available. */
function withDepartments(entries, departmentLookup) {
  return entries.map((e) => ({
    ...e,
    department: departmentLookup.get(`${e.empId}::${e.site}`) || '',
  }))
}

/** Muster Roll: result.allSitesCalculatedData[site].employees -> [{empId, name, totalAttendance}] */
export function extractFromMusterRoll(result) {
  const out = []
  for (const site of result.sites) {
    const siteData = result.allSitesCalculatedData[site]
    for (const emp of siteData.employees) {
      out.push({ site, empId: emp.empId, name: emp.name, days: emp.totalAttendance })
    }
  }
  return out
}

/** Ethnic: result.dataFor8Hour[site].employees -> [{empId, name, dutyUnits, overtimeHours}] (8-hour view used as canonical attendance) */
export function extractFromEthnic(result) {
  const out = []
  for (const site of result.sites) {
    const siteData = result.dataFor8Hour[site]
    for (const emp of siteData.employees) {
      out.push({ site, empId: emp.empId, name: emp.name, days: parseFloat(emp.dutyUnits) || 0, overtimeHours: parseFloat(emp.overtimeHours) || 0 })
    }
  }
  return out
}

/** Product: result.allSitesCalculatedData[site].dutySummary -> [{idNo, name, totalDuty}], overtimeSummary -> [{name, totalOvertime}] joined by name */
export function extractFromProduct(result) {
  const out = []
  for (const site of result.sites) {
    const siteData = result.allSitesCalculatedData[site]
    const overtimeByName = new Map(siteData.overtimeSummary.map((o) => [o.name, parseFloat(o.totalOvertime) || 0]))
    for (const emp of siteData.dutySummary) {
      out.push({
        site, empId: emp.idNo, name: emp.name,
        days: parseFloat(emp.totalDuty) || 0,
        overtimeHours: overtimeByName.get(emp.name) || 0,
      })
    }
  }
  return out
}

/** Product-Shift: result.shift8.siteEmployeeData is a Map(site -> [{empId, name, dutyUnits, overtimeHours}]) */
export function extractFromProductShift(result) {
  const out = []
  for (const site of result.shift8.sites) {
    const employeeList = result.shift8.siteEmployeeData.get(site) || []
    for (const emp of employeeList) {
      out.push({ site, empId: emp.empId, name: emp.name, days: parseFloat(emp.dutyUnits) || 0, overtimeHours: parseFloat(emp.overtimeHours) || 0 })
    }
  }
  return out
}

/**
 * Mark punch-import-linked employees as LEFT when they were previously seen
 * at a site (i.e. have a punch_device_ids mapping for that site) but do not
 * appear in the current upload's set of punch ids for that same site.
 * Never touches employees without a punch_device_ids mapping (manually
 * created / non-punch staff are left completely alone), and never
 * hard-deletes - only flips status to LEFT via the same status_history
 * audit trail the rest of the app already uses, so it's fully reversible
 * (HR can REJOINED them later, same as any other status change).
 *
 * SAFETY GUARD: only acts on a site if this upload's employee coverage for
 * that site is at least MIN_COVERAGE_RATIO of the previously-known
 * punch-mapped headcount there. This prevents a partial/test/subset punch
 * file (e.g. covering only a few employees, or a single new hire) from
 * being misread as "everyone else quit" and mass-marking a whole site's
 * roster as LEFT. Sites that don't meet the threshold are skipped entirely
 * for this pass and returned separately as `skippedLowCoverage` so HR can
 * see why no one was auto-marked there.
 *
 * @param {Map<string, Set<string>>} siteToCurrentPunchIds  site name -> Set of punch ids seen in this upload
 * @param {string} actor
 * @returns {Promise<{markedLeft: Array, skippedLowCoverage: Array}>}
 */
const MIN_COVERAGE_RATIO = 0.7

async function markMissingPunchEmployeesAsLeft(siteToCurrentPunchIds, actor) {
  const markedLeft = []
  const skippedLowCoverage = []

  for (const [siteName, currentPunchIds] of siteToCurrentPunchIds.entries()) {
    const mapped = await query(
      `SELECT pd.punch_id, pd.employee_id, e.employee_code, e.name, e.status
       FROM punch_device_ids pd
       JOIN employees e ON e.id = pd.employee_id
       WHERE pd.site_name = $1`,
      [siteName]
    )

    // Group by employee_id (not by punch_id row) since one employee can
    // have more than one punch_device_ids mapping at the same site (e.g.
    // a re-issued biometric device id) - the employee should only be
    // considered "missing" if NONE of their known punch ids appear in this
    // upload, not just one specific id.
    const employeesById = new Map() // employeeId -> { employeeId, employeeCode, name, status, punchIds: Set }
    for (const row of mapped.rows) {
      if (!employeesById.has(row.employee_id)) {
        employeesById.set(row.employee_id, {
          employeeId: row.employee_id, employeeCode: row.employee_code, name: row.name,
          status: row.status, punchIds: new Set(),
        })
      }
      employeesById.get(row.employee_id).punchIds.add(row.punch_id)
    }

    const activeKnown = [...employeesById.values()].filter((e) => e.status === 'ACTIVE')
    if (activeKnown.length === 0) continue // nothing previously known at this site - nothing to compare against

    const presentCount = activeKnown.filter((e) => [...e.punchIds].some((pid) => currentPunchIds.has(pid))).length
    const coverageRatio = presentCount / activeKnown.length

    if (coverageRatio < MIN_COVERAGE_RATIO) {
      // This upload only covers a small slice of the known roster for this
      // site (e.g. a partial/test file or a single new-hire punch record) -
      // skip auto-marking entirely rather than risk mass-firing the rest of
      // a real roster that simply wasn't included in this particular file.
      skippedLowCoverage.push({
        site: siteName,
        knownActive: activeKnown.length,
        presentInUpload: presentCount,
        coverageRatio: Math.round(coverageRatio * 100) / 100,
      })
      continue
    }

    for (const emp of activeKnown) {
      const stillPresent = [...emp.punchIds].some((pid) => currentPunchIds.has(pid))
      if (stillPresent) continue // still present this upload (under at least one of their known punch ids)

      await query(
        `UPDATE employees SET status = 'LEFT', leaving_date = CURRENT_DATE, updated_at = NOW() WHERE id = $1`,
        [emp.employeeId]
      )
      await query(
        `INSERT INTO status_history (employee_id, old_status, new_status, remark, changed_by)
         VALUES ($1, 'ACTIVE', 'LEFT', $2, $3)`,
        [emp.employeeId, `Auto-marked LEFT: not present in latest attendance punch-file upload for site "${siteName}"`, actor || 'SYSTEM']
      )

      markedLeft.push({ employeeId: emp.employeeId, employeeCode: emp.employeeCode, name: emp.name, site: siteName })
    }
  }

  return { markedLeft, skippedLowCoverage }
}

/**
 * Upsert computed overtime hours (from Ethnic/Product/Product-Shift punch
 * calculations) into overtime_records for the given month/year. Never
 * fabricates an hourly rate (the punch file has no wage-rate data) - if an
 * overtime_records row already exists with an HR-set rate, the hours are
 * updated and amount recalculated using that existing rate; if no row
 * exists yet, one is created with hours staged and rate/amount left at 0
 * for HR to fill in via the normal Overtime screen. Muster Roll uploads
 * don't produce an overtime figure (calendar/attendance-only report) so
 * this is a no-op for that report type - entirely driven by whether the
 * uploaded file's report type actually computes OT hours.
 *
 * @param {Map<number, number>} employeeIdToOvertimeHours
 * @param {number} month
 * @param {number} year
 */
export async function syncOvertimeHours(employeeIdToOvertimeHours, month, year) {
  for (const [employeeId, hours] of employeeIdToOvertimeHours.entries()) {
    if (!hours || hours <= 0) continue

    const existing = await query(
      'SELECT rate FROM overtime_records WHERE employee_id = $1 AND month = $2 AND year = $3',
      [employeeId, month, year]
    )
    const rate = existing.rows[0]?.rate != null ? parseFloat(existing.rows[0].rate) : 0
    const amount = Math.round(hours * rate * 100) / 100

    await query(
      `INSERT INTO overtime_records (employee_id, month, year, hours, rate, amount)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (employee_id, month, year) DO UPDATE SET
         hours = EXCLUDED.hours,
         amount = EXCLUDED.hours * overtime_records.rate,
         updated_at = NOW()`,
      [employeeId, month, year, hours, rate, amount]
    )
  }
}

/**
 * Full pipeline: given a normalized entries list (from one of the
 * extractFrom* adapters above) and the raw uploaded workbook buffer,
 * resolve/auto-create employees+sites (using the Department column for
 * designation), upsert their attendance days and overtime hours for the
 * report's month/year, and mark any previously punch-mapped employees at
 * the uploaded sites who are no longer present in this upload as LEFT.
 * Returns the `summary` object suitable for embedding directly in an API
 * response.
 */
export async function syncPunchEntriesToEms(entries, month, year, reportType, actor, buffer) {
  if (entries.length === 0) {
    return { matched: 0, autoCreated: 0, newSites: 0, autoCreatedEmployees: [], newSiteNames: [], markedLeft: [], designationUpdated: [] }
  }

  const departmentLookup = buffer ? buildDepartmentLookup(buffer) : new Map()
  const enrichedEntries = withDepartments(entries, departmentLookup)

  const { empKeyToEmployeeId, summary } = await resolveEmployeesFromPunchEntries(enrichedEntries, actor)

  // Aggregate days + overtime hours per employee (in case of duplicate
  // empKey entries across the same report, take the max figure found).
  const employeeIdToDays = new Map()
  const employeeIdToOvertimeHours = new Map()
  const siteToCurrentPunchIds = new Map() // site -> Set(punchId) seen in this upload
  for (const entry of enrichedEntries) {
    const punchId = entry.empId.trim()
    const siteName = entry.site.trim()
    const empKey = `${punchId}::${entry.name.trim()}`
    const employeeId = empKeyToEmployeeId.get(empKey)

    if (!siteToCurrentPunchIds.has(siteName)) siteToCurrentPunchIds.set(siteName, new Set())
    siteToCurrentPunchIds.get(siteName).add(punchId)

    if (!employeeId) continue
    const prevDays = employeeIdToDays.get(employeeId) || 0
    employeeIdToDays.set(employeeId, Math.max(prevDays, entry.days || 0))

    if (entry.overtimeHours != null) {
      const prevOt = employeeIdToOvertimeHours.get(employeeId) || 0
      employeeIdToOvertimeHours.set(employeeId, Math.max(prevOt, entry.overtimeHours))
    }
  }

  await syncAttendanceDays(employeeIdToDays, month, year, reportType, actor)
  await syncOvertimeHours(employeeIdToOvertimeHours, month, year)

  const { markedLeft, skippedLowCoverage } = await markMissingPunchEmployeesAsLeft(siteToCurrentPunchIds, actor)
  summary.markedLeft = markedLeft
  summary.skippedLowCoverage = skippedLowCoverage

  return summary
}

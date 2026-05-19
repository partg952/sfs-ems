// Shared punch-processing engine for the Attendance Report Generator module.
//
// This is a 1:1 JavaScript port of the shared logic found across the Java
// Apache-POI based generators (EthnicReportGenerator_Final.java,
// EthnicDailyWorkReportGenerator3.java, DailyWorkReportGenerator.java,
// AttendanceReportGenerator copy.java). No business rule has been altered -
// only the language/runtime changed (Java -> Node.js) per project instructions.
//
// Core rules preserved from the Java sources:
//  - Night shift cutoff: punches before 4 AM are logically attributed to the
//    previous calendar day ("logical date").
//  - Duplicate punch dedup: punches within a configurable window (60 min for
//    Ethnic, 30 min for Product/Muster) of the previous accepted punch are
//    treated as the same physical punch and dropped.
//  - Duty status thresholds: full duty >= 8hrs (or 9hrs variant), half duty
//    between half-threshold and full-threshold, overtime = duration - 9hrs
//    (only once duration crosses the full-duty threshold).
//  - Duplicate employee names sharing different employee codes are
//    disambiguated by appending "(EmpNo)" to the display name.

import XLSX from 'xlsx'

export const NIGHT_SHIFT_CUTOFF_HOUR = 4 // 4 AM - punches before this roll back to previous day

/**
 * Normalize a raw header string the same way the Java `mapHeaders` /
 * `mapHeaderColumns` methods did: lowercase + strip spaces.
 */
function normalizeHeader(h) {
  return String(h ?? '').trim().toLowerCase().replace(/\s+/g, '')
}

/**
 * Read the first sheet of an uploaded workbook (buffer) into an array of
 * plain row objects keyed by normalized header name, matching the column
 * lookup behaviour of the original Java `mapHeaders` methods
 * (devicename, empno/idno, name, department, punchtime).
 */
export function readWorkbookRows(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) throw new Error('The uploaded workbook has no readable sheet.')

  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true })
  if (rawRows.length === 0) throw new Error('The uploaded workbook has no data rows.')

  // Build normalized-header -> original-header map from the first row's keys
  const firstRow = rawRows[0]
  const headerMap = {}
  for (const key of Object.keys(firstRow)) {
    headerMap[normalizeHeader(key)] = key
  }

  return rawRows.map((row) => {
    const out = {}
    for (const [norm, orig] of Object.entries(headerMap)) {
      out[norm] = row[orig]
    }
    return out
  })
}

/** Coerce a cell value to a trimmed string the way Java's getVal() did. */
export function cellToString(value) {
  if (value == null) return ''
  if (value instanceof Date) return String(value)
  if (typeof value === 'number') return String(Math.trunc(value))
  return String(value).trim()
}

/**
 * Coerce a punch time cell to a JS Date. xlsx with cellDates:true already
 * converts Excel date-formatted cells to JS Date objects (matching
 * DateUtil.isCellDateFormatted + getDateCellValue in the Java code). Falls
 * back to parsing common string formats ("dd/MM/yy HH:mm", "M/d/yy H:mm")
 * used as fallbacks in the Product/Muster Java generators.
 */
export function cellToDate(value) {
  if (value == null || value === '') return null
  if (value instanceof Date && !isNaN(value.getTime())) return value

  const str = String(value).trim()
  // dd/MM/yy HH:mm or dd/MM/yyyy HH:mm
  let m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})$/)
  if (m) {
    let [, d, mo, y, h, mi] = m
    const year = y.length === 2 ? 2000 + parseInt(y, 10) : parseInt(y, 10)
    const dt = new Date(year, parseInt(mo, 10) - 1, parseInt(d, 10), parseInt(h, 10), parseInt(mi, 10))
    return isNaN(dt.getTime()) ? null : dt
  }
  return null
}

/**
 * Compute the "logical date" (yyyy-MM-dd) for a punch, rolling back to the
 * previous day if the punch hour is before the night-shift cutoff. Mirrors:
 *   if (cal.get(Calendar.HOUR_OF_DAY) < NIGHT_CUTOFF) cal.add(Calendar.DATE, -1);
 */
export function logicalDateFor(punchTime, cutoffHour = NIGHT_SHIFT_CUTOFF_HOUR) {
  const cal = new Date(punchTime.getTime())
  if (cal.getHours() < cutoffHour) {
    cal.setDate(cal.getDate() - 1)
  }
  return cal
}

export function formatDateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatDateTime(date) {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yy = String(date.getFullYear()).slice(-2)
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yy} ${hh}:${min}`
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/**
 * Remove duplicate punches that occur within `windowMinutes` of the
 * previously accepted punch on the same logical day - ported from the
 * "cleaned" punch list logic in EthnicReportGenerator_Final /
 * AttendanceReportGenerator.
 */
export function dedupPunches(punchesOnDay, windowMinutes) {
  const sorted = [...punchesOnDay].sort((a, b) => a.time.getTime() - b.time.getTime())
  const cleaned = []
  for (const p of sorted) {
    if (cleaned.length === 0) {
      cleaned.push(p)
    } else if (p.time.getTime() - cleaned[cleaned.length - 1].time.getTime() > windowMinutes * 60 * 1000) {
      cleaned.push(p)
    }
  }
  return cleaned
}

/**
 * Rename duplicate employee names (same name, different employee codes) to
 * "NAME (EmpNo)" - ported from the nameToIds disambiguation block present in
 * every Java generator's readAndGroup method.
 *
 * `empMap` is a Map of empKey ("id::name") -> arbitrary per-employee bucket.
 * `nameToIds` is a Map of name -> Set of ids collected while reading rows.
 * Returns a new Map with renamed keys where collisions existed, and mutates
 * any `namesField` object references so consumers referring to punch.name
 * stay in sync (matches the Java behaviour of mutating Punch.name in place).
 */
export function disambiguateDuplicateNames(empMap, nameToIds, renameCallback) {
  const result = new Map(empMap)
  for (const [name, ids] of nameToIds.entries()) {
    if (ids.size > 1) {
      for (const id of ids) {
        const oldKey = `${id}::${name}`
        if (result.has(oldKey)) {
          const newName = `${name} (${id})`
          const newKey = `${id}::${newName}`
          const bucket = result.get(oldKey)
          result.delete(oldKey)
          if (renameCallback) renameCallback(bucket, newName)
          result.set(newKey, bucket)
        }
      }
    }
  }
  return result
}

export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function fmt2(n) {
  return round2(n).toFixed(2)
}

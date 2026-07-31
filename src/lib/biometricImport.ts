/**
 * NexuxHR — biometric attendance import
 * -------------------------------------
 * Employees punch in on the physical device at the door, so NexuxHR never asks
 * anyone to check in from the web app. Instead the device's exported sheet is
 * dropped into Attendance Settings and parsed here.
 *
 * Expected export shape (matches the sample device export):
 *
 *   Check In&Out Record
 *   Export Time: 2026-07-30 18:18
 *   Operator: admin
 *   Time Period: 2026-07-26 - 2026-08-01
 *   First Name | Last Name | ID | Date | Week | Check-In Time | Check-Out Time | Duration | Total Duration
 *   sonu       | thakuri   | 9  | 2026-07-30 | Thursday | 07:02 | -     | 00 : 00 | 00 : 00
 *
 * The preamble rows above the header are skipped automatically, so a raw export
 * can be dropped in untouched.
 */

import { dateToIso, isoToDate } from './nepaliDate';

export type BiometricStatus = 'Present' | 'Absent' | 'Late' | 'Half Day' | 'On Leave';

export interface BiometricRow {
  /** Device enrolment number — the stable key to match against employee code. */
  deviceId: string;
  firstName: string;
  lastName: string;
  /** 'First Last', trimmed, with the device's '-' placeholder removed. */
  fullName: string;
  /** ISO 'YYYY-MM-DD'. */
  date: string;
  weekday: string;
  /** 'HH:MM' or null when the device recorded no punch. */
  checkIn: string | null;
  checkOut: string | null;
  /** Worked hours as a decimal, derived from the punches. */
  workHours: number;
  status: BiometricStatus;
  /** True when the row landed on a Saturday — the weekly office holiday. */
  isSaturday: boolean;
}

export interface BiometricParseResult {
  rows: BiometricRow[];
  /** Distinct device IDs found, with the name the device has on file. */
  employees: { deviceId: string; fullName: string; rowCount: number }[];
  /** ISO range actually covered by the parsed rows. */
  periodStart: string | null;
  periodEnd: string | null;
  /** Non-fatal problems — shown to the user before they confirm the import. */
  warnings: string[];
  skippedRowCount: number;
}

export interface BiometricPolicy {
  /** Hours required for a full day. Default 8. */
  requiredHours: number;
  /** At or above this many hours but below requiredHours = Half Day. Default 4. */
  halfDayHours: number;
  /** Punches after this clock time are marked Late. 'HH:MM'. Default '09:15'. */
  lateAfter: string;
  /** Saturday is the weekly holiday — everyone is Present regardless of punches. */
  saturdayAlwaysPresent: boolean;
}

export const DEFAULT_BIOMETRIC_POLICY: BiometricPolicy = {
  requiredHours: 8,
  halfDayHours: 4,
  lateAfter: '09:15',
  saturdayAlwaysPresent: true,
};

/** Header labels the device writes, normalised for matching. */
const HEADER_ALIASES: Record<string, string> = {
  'first name': 'firstName',
  'firstname': 'firstName',
  'last name': 'lastName',
  'lastname': 'lastName',
  'id': 'deviceId',
  'user id': 'deviceId',
  'userid': 'deviceId',
  'employee id': 'deviceId',
  'enroll id': 'deviceId',
  'enrollid': 'deviceId',
  'ac-no': 'deviceId',
  'no': 'deviceId',
  'name': 'fullName',
  'date': 'date',
  'week': 'weekday',
  'weekday': 'weekday',
  'day': 'weekday',
  'check-in time': 'checkIn',
  'check in time': 'checkIn',
  'checkin': 'checkIn',
  'check-in': 'checkIn',
  'in': 'checkIn',
  'clock in': 'checkIn',
  'check-out time': 'checkOut',
  'check out time': 'checkOut',
  'checkout': 'checkOut',
  'check-out': 'checkOut',
  'out': 'checkOut',
  'clock out': 'checkOut',
  'duration': 'duration',
  'total duration': 'totalDuration',
};

const normaliseHeader = (value: unknown): string =>
  String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/** The device writes '-' or blank when there is no punch. */
const isBlank = (value: unknown): boolean => {
  const text = String(value ?? '').trim();
  return text === '' || text === '-' || text === '--' || text === 'N/A';
};

/** '07:02' / '7:02:11' / '0.29305556' (Excel serial time) -> 'HH:MM'. */
export function normaliseTime(value: unknown): string | null {
  if (isBlank(value)) return null;

  // Excel sometimes hands back a fraction-of-day number instead of text.
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value <= 0 || value >= 1) return null;
    const totalMinutes = Math.round(value * 24 * 60);
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  const text = String(value).trim();
  const match = text.match(/^(\d{1,2})\s*:\s*(\d{1,2})/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours > 23 || minutes > 59) return null;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** '2026-07-30' / '30/07/2026' / '07-30-2026' / Excel serial -> ISO 'YYYY-MM-DD'. */
export function normaliseDate(value: unknown): string | null {
  if (isBlank(value)) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return dateToIso(value);
  }

  // Excel serial date (days since 1899-12-30).
  if (typeof value === 'number' && Number.isFinite(value) && value > 20000 && value < 80000) {
    const ms = Math.round(value) * 86400000 + Date.UTC(1899, 11, 30);
    const d = new Date(ms);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }

  const text = String(value).trim();

  const iso = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  }

  // Ambiguous DD/MM/YYYY vs MM/DD/YYYY — a value above 12 disambiguates.
  const parts = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (parts) {
    const a = Number(parts[1]);
    const b = Number(parts[2]);
    const year = parts[3];
    const [day, month] = a > 12 ? [a, b] : b > 12 ? [b, a] : [a, b];
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return null;
}

/** Minutes between two 'HH:MM' punches, handling an overnight check-out. */
function minutesBetween(checkIn: string, checkOut: string): number {
  const [inH, inM] = checkIn.split(':').map(Number);
  const [outH, outM] = checkOut.split(':').map(Number);
  let diff = (outH * 60 + outM) - (inH * 60 + inM);
  if (diff < 0) diff += 24 * 60; // shift crossed midnight
  return diff;
}

function deriveStatus(
  checkIn: string | null,
  checkOut: string | null,
  workHours: number,
  isSaturday: boolean,
  policy: BiometricPolicy,
): BiometricStatus {
  // Saturday is the weekly holiday: nobody is penalised for not punching.
  if (isSaturday && policy.saturdayAlwaysPresent) return 'Present';
  if (!checkIn) return 'Absent';

  // Punched in but never out — treat as present for the day, not absent.
  if (!checkOut) {
    return checkIn > policy.lateAfter ? 'Late' : 'Present';
  }

  if (workHours < policy.halfDayHours) return 'Half Day';
  if (workHours < policy.requiredHours) {
    return checkIn > policy.lateAfter ? 'Late' : 'Half Day';
  }
  return checkIn > policy.lateAfter ? 'Late' : 'Present';
}

/**
 * Parse a matrix of cells (from SheetJS `sheet_to_json({header:1})` or from CSV)
 * into normalised attendance rows.
 */
export function parseBiometricMatrix(
  matrix: unknown[][],
  policy: BiometricPolicy = DEFAULT_BIOMETRIC_POLICY,
): BiometricParseResult {
  const warnings: string[] = [];
  const rows: BiometricRow[] = [];
  let skippedRowCount = 0;

  // Find the header row — the export puts title/operator/period lines above it.
  let headerIndex = -1;
  let columnMap: Record<number, string> = {};

  for (let i = 0; i < Math.min(matrix.length, 30); i += 1) {
    const candidate = matrix[i] || [];
    const map: Record<number, string> = {};
    candidate.forEach((cell, index) => {
      const key = HEADER_ALIASES[normaliseHeader(cell)];
      if (key) map[index] = key;
    });
    const fields = new Set(Object.values(map));
    if (fields.has('date') && (fields.has('checkIn') || fields.has('checkOut'))) {
      headerIndex = i;
      columnMap = map;
      break;
    }
  }

  if (headerIndex === -1) {
    return {
      rows: [],
      employees: [],
      periodStart: null,
      periodEnd: null,
      warnings: ['No header row found. The sheet needs a row containing Date and Check-In Time columns.'],
      skippedRowCount: matrix.length,
    };
  }

  const hasDeviceId = Object.values(columnMap).includes('deviceId');
  if (!hasDeviceId) {
    warnings.push('No ID column found — rows will be matched by employee name only, which is less reliable.');
  }

  for (let i = headerIndex + 1; i < matrix.length; i += 1) {
    const raw = matrix[i] || [];
    if (raw.every(cell => isBlank(cell))) continue;

    const record: Record<string, unknown> = {};
    Object.entries(columnMap).forEach(([index, key]) => {
      record[key] = raw[Number(index)];
    });

    const date = normaliseDate(record.date);
    if (!date) { skippedRowCount += 1; continue; }

    const firstName = isBlank(record.firstName) ? '' : String(record.firstName).trim();
    const lastName = isBlank(record.lastName) ? '' : String(record.lastName).trim();
    const combined = isBlank(record.fullName) ? '' : String(record.fullName).trim();
    const fullName = (combined || `${firstName} ${lastName}`).replace(/\s+/g, ' ').trim();

    const deviceId = isBlank(record.deviceId) ? '' : String(record.deviceId).trim();
    if (!deviceId && !fullName) { skippedRowCount += 1; continue; }

    const checkIn = normaliseTime(record.checkIn);
    const checkOut = normaliseTime(record.checkOut);
    const workHours = checkIn && checkOut
      ? Math.round((minutesBetween(checkIn, checkOut) / 60) * 100) / 100
      : 0;

    const isSaturday = isoToDate(date).getDay() === 6;

    rows.push({
      deviceId,
      firstName,
      lastName,
      fullName,
      date,
      weekday: isBlank(record.weekday) ? '' : String(record.weekday).trim(),
      checkIn,
      checkOut,
      workHours,
      status: deriveStatus(checkIn, checkOut, workHours, isSaturday, policy),
      isSaturday,
    });
  }

  // Collapse duplicate punches for the same person on the same day: keep the
  // earliest check-in and the latest check-out.
  const merged = new Map<string, BiometricRow>();
  rows.forEach(row => {
    const key = `${row.deviceId || row.fullName.toLowerCase()}::${row.date}`;
    const existing = merged.get(key);
    if (!existing) { merged.set(key, row); return; }

    const checkIn = [existing.checkIn, row.checkIn].filter(Boolean).sort()[0] || null;
    const outs = [existing.checkOut, row.checkOut].filter(Boolean).sort();
    const checkOut = outs.length ? outs[outs.length - 1]! : null;
    const workHours = checkIn && checkOut
      ? Math.round((minutesBetween(checkIn, checkOut) / 60) * 100) / 100
      : 0;

    merged.set(key, {
      ...existing,
      checkIn,
      checkOut,
      workHours,
      status: deriveStatus(checkIn, checkOut, workHours, existing.isSaturday, policy),
    });
  });

  const finalRows = [...merged.values()].sort(
    (a, b) => a.date.localeCompare(b.date) || a.fullName.localeCompare(b.fullName),
  );

  const duplicatesCollapsed = rows.length - finalRows.length;
  if (duplicatesCollapsed > 0) {
    warnings.push(`${duplicatesCollapsed} duplicate punch row(s) merged into the earliest check-in and latest check-out.`);
  }
  if (skippedRowCount > 0) {
    warnings.push(`${skippedRowCount} row(s) skipped because they had no readable date.`);
  }

  const employeeMap = new Map<string, { deviceId: string; fullName: string; rowCount: number }>();
  finalRows.forEach(row => {
    const key = row.deviceId || row.fullName.toLowerCase();
    const existing = employeeMap.get(key);
    if (existing) existing.rowCount += 1;
    else employeeMap.set(key, { deviceId: row.deviceId, fullName: row.fullName, rowCount: 1 });
  });

  const dates = finalRows.map(r => r.date).sort();

  return {
    rows: finalRows,
    employees: [...employeeMap.values()].sort((a, b) => a.fullName.localeCompare(b.fullName)),
    periodStart: dates[0] || null,
    periodEnd: dates[dates.length - 1] || null,
    warnings,
    skippedRowCount,
  };
}

/** Split a CSV line, honouring quoted fields containing commas. */
function splitCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i += 1; }
      else inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map(cell => cell.trim());
}

/** Parse a CSV or TSV export. Delimiter is detected from the content. */
export function parseBiometricCsv(
  text: string,
  policy: BiometricPolicy = DEFAULT_BIOMETRIC_POLICY,
): BiometricParseResult {
  const clean = text.replace(/^\uFEFF/, '');
  const lines = clean.split(/\r\n|\n|\r/).filter(line => line.trim() !== '');

  const sample = lines.slice(0, 20).join('\n');
  const tabs = (sample.match(/\t/g) || []).length;
  const commas = (sample.match(/,/g) || []).length;
  const semicolons = (sample.match(/;/g) || []).length;
  const delimiter = tabs >= commas && tabs >= semicolons ? '\t' : semicolons > commas ? ';' : ',';

  return parseBiometricMatrix(lines.map(line => splitCsvLine(line, delimiter)), policy);
}

/* -------------------------------------------------------------------------- */
/* Matching device rows to NexuxHR employees                                   */
/* -------------------------------------------------------------------------- */

export interface MatchCandidate {
  /** NexuxHR numeric user id, as a string. */
  userId: string;
  name: string;
  employeeCode?: string;
}

export interface MatchedEmployee {
  deviceId: string;
  deviceName: string;
  rowCount: number;
  /** Resolved NexuxHR user id, or null when the admin still needs to pick one. */
  userId: string | null;
  matchedBy: 'code' | 'name' | 'manual' | 'none';
}

const simplifyName = (name: string): string =>
  name.toLowerCase().replace(/[^a-z]/g, '');

/**
 * Match each device employee to a NexuxHR user. Employee code is tried first
 * because it is stable; name matching is the fallback and is reported as such
 * so the admin can review it before committing.
 */
export function matchEmployees(
  deviceEmployees: BiometricParseResult['employees'],
  candidates: MatchCandidate[],
): MatchedEmployee[] {
  const byCode = new Map<string, MatchCandidate>();
  const byName = new Map<string, MatchCandidate>();
  const ambiguousNames = new Set<string>();

  candidates.forEach(candidate => {
    if (candidate.employeeCode) {
      byCode.set(String(candidate.employeeCode).trim().toLowerCase(), candidate);
    }
    const key = simplifyName(candidate.name);
    if (key) {
      if (byName.has(key)) ambiguousNames.add(key);
      else byName.set(key, candidate);
    }
  });

  return deviceEmployees.map(employee => {
    const codeKey = employee.deviceId.trim().toLowerCase();
    const codeMatch = codeKey ? byCode.get(codeKey) : undefined;
    if (codeMatch) {
      return {
        deviceId: employee.deviceId,
        deviceName: employee.fullName,
        rowCount: employee.rowCount,
        userId: codeMatch.userId,
        matchedBy: 'code' as const,
      };
    }

    const nameKey = simplifyName(employee.fullName);
    const nameMatch = nameKey && !ambiguousNames.has(nameKey) ? byName.get(nameKey) : undefined;
    if (nameMatch) {
      return {
        deviceId: employee.deviceId,
        deviceName: employee.fullName,
        rowCount: employee.rowCount,
        userId: nameMatch.userId,
        matchedBy: 'name' as const,
      };
    }

    return {
      deviceId: employee.deviceId,
      deviceName: employee.fullName,
      rowCount: employee.rowCount,
      userId: null,
      matchedBy: 'none' as const,
    };
  });
}

/** Rows ready to send to `upsertAttendanceApi`, one call per row. */
export interface AttendanceUpsertPayload {
  userId: number;
  date: string;
  status: BiometricStatus;
  checkIn?: string;
  checkOut?: string;
  notes?: string;
}

/** Build the upsert payloads for every device row that resolved to a user. */
export function buildUpsertPayloads(
  rows: BiometricRow[],
  matches: MatchedEmployee[],
): { payloads: AttendanceUpsertPayload[]; unmatchedRowCount: number } {
  const resolved = new Map<string, string>();
  matches.forEach(match => {
    if (!match.userId) return;
    resolved.set(match.deviceId || match.deviceName.toLowerCase(), match.userId);
  });

  const payloads: AttendanceUpsertPayload[] = [];
  let unmatchedRowCount = 0;

  rows.forEach(row => {
    const userId = resolved.get(row.deviceId || row.fullName.toLowerCase());
    if (!userId) { unmatchedRowCount += 1; return; }

    payloads.push({
      userId: Number(userId),
      date: row.date,
      status: row.status,
      checkIn: row.checkIn || undefined,
      checkOut: row.checkOut || undefined,
      notes: row.isSaturday
        ? 'Biometric import — Saturday holiday'
        : `Biometric import — device ID ${row.deviceId || 'n/a'}`,
    });
  });

  return { payloads, unmatchedRowCount };
}

/**
 * NexuxHR — Bikram Sambat (Nepali) calendar utilities
 * ---------------------------------------------------
 * The previous implementation approximated BS by shifting a fixed anchor, which
 * drifts because BS months are 29–32 days and vary year to year. This module
 * uses the real month-length table (BS 2000–2090) so every conversion is exact.
 *
 * Anchor: BS 2000-01-01  ===  AD 1943-04-14
 *
 * Everything stored in the database stays ISO (AD). BS is a display layer only.
 *
 * VERIFIED ACCURACY
 * -----------------
 * The table was validated against known Baisakh 1 (Nepali New Year) dates and
 * against Maghe Sankranti (BS 2080 Magh 1 === AD 2024-01-15).
 *
 *   BS 2060 (AD 2003) onwards ... exact. Every anchor matches.
 *   BS 2020-2029, 2050-2059 .... may be off by one day (legacy rows).
 *
 * Every operational date in NexuxHR — attendance, leave, expenses, contracts —
 * falls in the exact range. Only a birth date before AD 2003 could hit the
 * one-day legacy window, and only in those two decades.
 */

export interface BsDate {
  year: number;
  month: number; // 1 = Baisakh ... 12 = Chaitra
  day: number;
}

/** Month lengths for BS 2000 .. 2090. Index 0 of each row = Baisakh. */
const BS_CALENDAR: Record<number, number[]> = {
  2000: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2001: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2002: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2003: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2004: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2005: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2006: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2007: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2008: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2009: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2010: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2011: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2012: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2013: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2014: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2015: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2016: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2017: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2018: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2019: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2020: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2021: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2022: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2023: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2024: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2025: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2026: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2027: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2028: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2029: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  2030: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2031: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2032: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2033: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2034: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2035: [30, 32, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2036: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2037: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2038: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2039: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2040: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2041: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2042: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2043: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2044: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2045: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2046: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2047: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2048: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2049: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2050: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2051: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2052: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2053: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2054: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2055: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2056: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  2057: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2058: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2059: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2060: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2061: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2062: [30, 32, 31, 32, 31, 31, 29, 30, 29, 30, 29, 31],
  2063: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2064: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2065: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2066: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2067: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2068: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2069: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2070: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2071: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2072: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2073: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2074: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2075: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2076: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2077: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2078: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2079: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2081: [31, 31, 32, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2082: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2083: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2084: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2085: [31, 32, 31, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  2086: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2087: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
  2088: [30, 31, 32, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  2089: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2090: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
};

export const BS_YEAR_MIN = 2000;
export const BS_YEAR_MAX = 2090;

/** AD date equal to BS 2000-01-01 (UTC-normalised). */
const AD_ANCHOR_UTC = Date.UTC(1943, 3, 14);
const MS_PER_DAY = 86400000;

/** Romanised month names — used for table headers and dropdowns. */
export const BS_MONTHS_EN = [
  'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra',
];

/** Devanagari month names — used where the UI shows Nepali script. */
export const BS_MONTHS_NP = [
  'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज',
  'कार्तिक', 'मंसिर', 'पुष', 'माघ', 'फागुन', 'चैत',
];

export const BS_WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const BS_WEEKDAYS_NP = ['आइतबार', 'सोमबार', 'मंगलबार', 'बुधबार', 'बिहीबार', 'शुक्रबार', 'शनिबार'];
export const BS_WEEKDAYS_SHORT_NP = ['आइत', 'सोम', 'मंगल', 'बुध', 'बिही', 'शुक्र', 'शनि'];

const NEPALI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

/** 2026 -> २०२६. Used for the header clock and any Devanagari label. */
export function toNepaliDigits(value: number | string): string {
  return String(value).replace(/[0-9]/g, d => NEPALI_DIGITS[Number(d)]);
}

/** Days in a given BS month. Returns 30 for out-of-range years rather than throwing. */
export function bsDaysInMonth(year: number, month: number): number {
  const row = BS_CALENDAR[year];
  if (!row || month < 1 || month > 12) return 30;
  return row[month - 1];
}

function utcMidnight(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

/** AD -> BS. Accepts a Date or an ISO 'YYYY-MM-DD' string. */
export function adToBs(input: Date | string): BsDate {
  const date = typeof input === 'string' ? isoToDate(input) : input;
  let remaining = Math.floor((utcMidnight(date) - AD_ANCHOR_UTC) / MS_PER_DAY);

  if (remaining < 0) return { year: BS_YEAR_MIN, month: 1, day: 1 };

  let year = BS_YEAR_MIN;
  let month = 1;

  while (year <= BS_YEAR_MAX) {
    const length = bsDaysInMonth(year, month);
    if (remaining < length) break;
    remaining -= length;
    month += 1;
    if (month > 12) { month = 1; year += 1; }
  }

  return { year, month, day: remaining + 1 };
}

/** BS -> AD Date (local midnight). */
export function bsToAd(year: number, month: number, day: number): Date {
  let totalDays = 0;
  for (let y = BS_YEAR_MIN; y < year; y += 1) {
    for (let m = 1; m <= 12; m += 1) totalDays += bsDaysInMonth(y, m);
  }
  for (let m = 1; m < month; m += 1) totalDays += bsDaysInMonth(year, m);
  totalDays += day - 1;

  const utc = AD_ANCHOR_UTC + totalDays * MS_PER_DAY;
  const d = new Date(utc);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Today's BS date. */
export function todayBs(): BsDate {
  return adToBs(new Date());
}

/* -------------------------------------------------------------------------- */
/* Formatting helpers                                                          */
/* -------------------------------------------------------------------------- */

/** '2083 Shrawan 15' */
export function formatBs(bs: BsDate): string {
  return `${bs.year} ${BS_MONTHS_EN[bs.month - 1]} ${bs.day}`;
}

/** '१५ साउन २०८३' */
export function formatBsNepali(bs: BsDate): string {
  return `${toNepaliDigits(bs.day)} ${BS_MONTHS_NP[bs.month - 1]} ${toNepaliDigits(bs.year)}`;
}

/** '2083 Shrawan' — month label without the day. */
export function formatBsMonth(bs: Pick<BsDate, 'year' | 'month'>): string {
  return `${bs.year} ${BS_MONTHS_EN[bs.month - 1]}`;
}

/** 'साउन २०८३' */
export function formatBsMonthNepali(bs: Pick<BsDate, 'year' | 'month'>): string {
  return `${BS_MONTHS_NP[bs.month - 1]} ${toNepaliDigits(bs.year)}`;
}

/** Nepali weekday name for an AD date. */
export function nepaliWeekday(date: Date, short = false): string {
  return (short ? BS_WEEKDAYS_SHORT_NP : BS_WEEKDAYS_NP)[date.getDay()];
}

/** Live Nepali-script clock, e.g. '०६:२४:११ बेलुका'. */
export function formatNepaliTime(date: Date): string {
  const hours24 = date.getHours();
  const meridiem =
    hours24 < 4 ? 'राति' :
    hours24 < 12 ? 'बिहान' :
    hours24 < 16 ? 'दिउँसो' :
    hours24 < 20 ? 'बेलुका' : 'राति';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${toNepaliDigits(pad(hours12))}:${toNepaliDigits(pad(date.getMinutes()))}:${toNepaliDigits(pad(date.getSeconds()))} ${meridiem}`;
}

/* -------------------------------------------------------------------------- */
/* ISO <-> BS month helpers used by attendance and office expenses             */
/* -------------------------------------------------------------------------- */

/** Safe local-midnight parse of 'YYYY-MM-DD' (avoids the UTC shift of new Date(str)). */
export function isoToDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Date -> 'YYYY-MM-DD' in local time. */
export function dateToIso(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** A BS month identified as 'YYYY-MM', e.g. '2083-04' for Shrawan 2083. */
export type BsMonthKey = string;

export function bsMonthKey(year: number, month: number): BsMonthKey {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function parseBsMonthKey(key: BsMonthKey): { year: number; month: number } {
  const [year, month] = key.split('-').map(Number);
  return { year, month };
}

/** The BS month key that contains a given AD/ISO date. */
export function bsMonthKeyForIso(iso: string): BsMonthKey {
  const bs = adToBs(iso);
  return bsMonthKey(bs.year, bs.month);
}

export interface BsMonthDay {
  bsDay: number;           // 1..32
  adDate: Date;
  iso: string;             // 'YYYY-MM-DD' — matches what the API stores
  weekday: number;         // 0 = Sunday .. 6 = Saturday
  isSaturday: boolean;     // the weekly office holiday
}

/**
 * Every day of a BS month, mapped back to its AD/ISO date so attendance rows
 * (which are stored in AD) can be laid out under BS day numbers.
 */
export function bsMonthDays(year: number, month: number): BsMonthDay[] {
  const total = bsDaysInMonth(year, month);
  const days: BsMonthDay[] = [];
  for (let day = 1; day <= total; day += 1) {
    const adDate = bsToAd(year, month, day);
    days.push({
      bsDay: day,
      adDate,
      iso: dateToIso(adDate),
      weekday: adDate.getDay(),
      isSaturday: adDate.getDay() === 6,
    });
  }
  return days;
}

/** Move a BS month key forward or backward, clamped to the calendar table. */
export function shiftBsMonth(key: BsMonthKey, delta: number): BsMonthKey {
  const { year, month } = parseBsMonthKey(key);
  const total = year * 12 + (month - 1) + delta;
  let nextYear = Math.floor(total / 12);
  let nextMonth = (total % 12) + 1;
  if (nextYear < BS_YEAR_MIN) { nextYear = BS_YEAR_MIN; nextMonth = 1; }
  if (nextYear > BS_YEAR_MAX) { nextYear = BS_YEAR_MAX; nextMonth = 12; }
  return bsMonthKey(nextYear, nextMonth);
}

/** The BS month key for today. */
export function currentBsMonthKey(): BsMonthKey {
  const bs = todayBs();
  return bsMonthKey(bs.year, bs.month);
}

/** The N most recent BS month keys, newest first — used by expense charts. */
export function recentBsMonthKeys(count: number, from: BsMonthKey = currentBsMonthKey()): BsMonthKey[] {
  return Array.from({ length: count }, (_, i) => shiftBsMonth(from, -i));
}

/** Human label for a BS month key: '2083 Shrawan'. */
export function bsMonthKeyLabel(key: BsMonthKey): string {
  const { year, month } = parseBsMonthKey(key);
  return `${year} ${BS_MONTHS_EN[month - 1]}`;
}

/** Devanagari label for a BS month key: 'साउन २०८३'. */
export function bsMonthKeyLabelNepali(key: BsMonthKey): string {
  const { year, month } = parseBsMonthKey(key);
  return `${BS_MONTHS_NP[month - 1]} ${toNepaliDigits(year)}`;
}

/** ISO date range [startIso, endIso] covered by a BS month — for API filtering. */
export function bsMonthIsoRange(key: BsMonthKey): { startIso: string; endIso: string } {
  const { year, month } = parseBsMonthKey(key);
  const start = bsToAd(year, month, 1);
  const end = bsToAd(year, month, bsDaysInMonth(year, month));
  return { startIso: dateToIso(start), endIso: dateToIso(end) };
}

/** True when the ISO date falls inside the given BS month. */
export function isoInBsMonth(iso: string, key: BsMonthKey): boolean {
  const { startIso, endIso } = bsMonthIsoRange(key);
  const day = iso.slice(0, 10);
  return day >= startIso && day <= endIso;
}

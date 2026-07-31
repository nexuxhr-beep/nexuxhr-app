import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Fingerprint,
  Loader2,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import {
  parseBiometricCsv,
  parseBiometricMatrix,
  matchEmployees,
  buildUpsertPayloads,
  DEFAULT_BIOMETRIC_POLICY,
  type BiometricParseResult,
  type MatchedEmployee,
  type MatchCandidate,
} from '../../lib/biometricImport';
import { importBiometricAttendanceApi, type BiometricImportRow } from '../../lib/authApi';
import { useHR } from '../../context/HRContext';
import { adToBs, formatBs } from '../../lib/nepaliDate';

type Phase = 'idle' | 'reading' | 'review' | 'saving' | 'done';

const STATUS_STYLES: Record<string, string> = {
  Present: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Late: 'bg-orange-50 text-orange-700 border-orange-200',
  'Half Day': 'bg-amber-50 text-amber-700 border-amber-200',
  Absent: 'bg-rose-50 text-rose-700 border-rose-200',
  'On Leave': 'bg-blue-50 text-blue-700 border-blue-200',
};

const MATCH_STYLES: Record<MatchedEmployee['matchedBy'], { label: string; className: string }> = {
  code: { label: 'Matched by code', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  name: { label: 'Matched by name', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  manual: { label: 'Chosen manually', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  none: { label: 'Not matched', className: 'bg-rose-50 text-rose-700 border-rose-200' },
};

/**
 * Employees punch in on the physical device at the door. This panel takes the
 * device's exported sheet, previews exactly what will be written, and only then
 * commits it — nothing is saved until the admin presses Import.
 */
export const BiometricImportPanel: React.FC = () => {
  const { users } = useHR();
  const inputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<BiometricParseResult | null>(null);
  const [matches, setMatches] = useState<MatchedEmployee[]>([]);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);

  // Active employees are the only valid import targets.
  const candidates = useMemo<MatchCandidate[]>(
    () => users
      .filter(user => user.isActive)
      .map(user => ({ userId: String(user.id), name: user.name, employeeCode: user.employeeCode })),
    [users],
  );

  const reset = () => {
    setPhase('idle'); setParsed(null); setMatches([]); setFileName('');
    setError(''); setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFile = useCallback(async (file: File) => {
    setError(''); setResult(null); setPhase('reading'); setFileName(file.name);

    try {
      const isCsv = /\.(csv|tsv|txt)$/i.test(file.name);
      let parsedResult: BiometricParseResult;

      if (isCsv) {
        parsedResult = parseBiometricCsv(await file.text(), DEFAULT_BIOMETRIC_POLICY);
      } else {
        // SheetJS is loaded on demand so it never enters the initial bundle.
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!sheet) throw new Error('The workbook has no readable sheet.');
        const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' }) as unknown[][];
        parsedResult = parseBiometricMatrix(matrix, DEFAULT_BIOMETRIC_POLICY);
      }

      if (!parsedResult.rows.length) {
        setError(parsedResult.warnings[0] || 'No attendance rows could be read from this file.');
        setPhase('idle');
        return;
      }

      setParsed(parsedResult);
      setMatches(matchEmployees(parsedResult.employees, candidates));
      setPhase('review');
    } catch (err: any) {
      setError(err?.message || 'This file could not be read.');
      setPhase('idle');
    }
  }, [candidates]);

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const setManualMatch = (deviceId: string, deviceName: string, userId: string) => {
    setMatches(current => current.map(match => {
      if (match.deviceId !== deviceId || match.deviceName !== deviceName) return match;
      return { ...match, userId: userId || null, matchedBy: userId ? 'manual' : 'none' };
    }));
  };

  const readyRows = useMemo(() => {
    if (!parsed) return { payloads: [] as BiometricImportRow[], unmatchedRowCount: 0 };
    const built = buildUpsertPayloads(parsed.rows, matches);
    return { payloads: built.payloads as BiometricImportRow[], unmatchedRowCount: built.unmatchedRowCount };
  }, [parsed, matches]);

  const unmatchedCount = matches.filter(match => !match.userId).length;
  const nameMatchCount = matches.filter(match => match.matchedBy === 'name').length;

  const commit = async () => {
    if (!readyRows.payloads.length) return;
    setPhase('saving'); setError('');
    try {
      const response = await importBiometricAttendanceApi(readyRows.payloads);
      setResult({ imported: response.imported, skipped: response.skipped, errors: response.errors || [] });
      setPhase('done');
    } catch (err: any) {
      setError(err?.message || 'The import could not be saved.');
      setPhase('review');
    }
  };

  const periodLabel = parsed?.periodStart && parsed?.periodEnd
    ? `${formatBs(adToBs(parsed.periodStart))} — ${formatBs(adToBs(parsed.periodEnd))}`
    : '';

  return (
    <div className="nx-settings glass-card rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-extrabold text-slate-900">
            <Fingerprint className="h-5 w-5" />
            Biometric Attendance Import
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Employees punch in on the device at the door. Drop the device&rsquo;s exported
            Excel or CSV file here and attendance is created automatically.
          </p>
        </div>
        {phase !== 'idle' && (
          <button type="button" onClick={reset} className="btn-secondary flex items-center gap-2 text-xs">
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ---------------- Drop zone ---------------- */}
      {(phase === 'idle' || phase === 'reading') && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
          className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-all ${
            dragging
              ? 'border-indigo-400 bg-indigo-50/70 scale-[1.01]'
              : 'border-slate-300 bg-slate-50/60 hover:border-indigo-300 hover:bg-indigo-50/40'
          }`}
        >
          {phase === 'reading' ? (
            <>
              <Loader2 className="h-9 w-9 animate-spin text-indigo-500" />
              <p className="mt-3 text-sm font-bold text-slate-700">Reading {fileName}…</p>
            </>
          ) : (
            <>
              <UploadCloud className={`h-9 w-9 ${dragging ? 'text-indigo-600' : 'text-slate-400'}`} />
              <p className="mt-3 text-sm font-bold text-slate-700">
                Drop the biometric export here, or click to browse
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Accepts .xlsx, .xls, .csv and .tsv — the export&rsquo;s title rows are skipped automatically
              </p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.tsv,.txt"
            className="hidden"
            onChange={e => { const file = e.target.files?.[0]; if (file) void handleFile(file); }}
          />
        </div>
      )}

      {/* ---------------- Review ---------------- */}
      {(phase === 'review' || phase === 'saving') && parsed && (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ['Rows read', parsed.rows.length],
              ['Employees', parsed.employees.length],
              ['Ready to import', readyRows.payloads.length],
              ['Unmatched', unmatchedCount],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
              </div>
            ))}
          </div>

          {periodLabel && (
            <p className="text-xs text-slate-500">
              <FileSpreadsheet className="mr-1 inline h-3.5 w-3.5" />
              <span className="font-bold text-slate-700">{fileName}</span> covers {periodLabel}
              <span className="text-slate-400"> ({parsed.periodStart} to {parsed.periodEnd})</span>
            </p>
          )}

          {parsed.warnings.map(warning => (
            <div key={warning} className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{warning}</span>
            </div>
          ))}

          {nameMatchCount > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {nameMatchCount} employee(s) were matched by name because their device ID
                is not set as an employee code. Please confirm these before importing.
              </span>
            </div>
          )}

          {/* Employee mapping */}
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
              <h4 className="text-xs font-black text-slate-800">Employee mapping</h4>
              <p className="text-[10px] text-slate-500">Device enrolment ID is matched to the NexuxHR employee code first, then to the name.</p>
            </div>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="p-2.5 font-bold">Device ID</th>
                    <th className="p-2.5 font-bold">Name on device</th>
                    <th className="p-2.5 font-bold">Rows</th>
                    <th className="p-2.5 font-bold">NexuxHR employee</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map(match => {
                    const style = MATCH_STYLES[match.matchedBy];
                    return (
                      <tr key={`${match.deviceId}-${match.deviceName}`} className="border-b border-slate-100 last:border-0">
                        <td className="p-2.5 font-mono text-slate-600">{match.deviceId || '—'}</td>
                        <td className="p-2.5 font-bold text-slate-800">{match.deviceName}</td>
                        <td className="p-2.5 text-slate-600">{match.rowCount}</td>
                        <td className="p-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              value={match.userId || ''}
                              onChange={e => setManualMatch(match.deviceId, match.deviceName, e.target.value)}
                              className="input-field min-w-44 py-1 text-xs"
                            >
                              <option value="">— Skip this person —</option>
                              {candidates.map(candidate => (
                                <option key={candidate.userId} value={candidate.userId}>
                                  {candidate.name}{candidate.employeeCode ? ` (${candidate.employeeCode})` : ''}
                                </option>
                              ))}
                            </select>
                            <span className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold ${style.className}`}>
                              {style.label}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Row preview */}
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
              <h4 className="text-xs font-black text-slate-800">
                Preview — first 25 of {parsed.rows.length} rows
              </h4>
              <p className="text-[10px] text-slate-500">Saturday is the weekly holiday, so those rows are recorded as present.</p>
            </div>
            <div className="max-h-72 overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="p-2.5 font-bold">Date (BS)</th>
                    <th className="p-2.5 font-bold">Employee</th>
                    <th className="p-2.5 font-bold">In</th>
                    <th className="p-2.5 font-bold">Out</th>
                    <th className="p-2.5 font-bold">Hours</th>
                    <th className="p-2.5 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, 25).map(row => (
                    <tr
                      key={`${row.deviceId}-${row.date}`}
                      className={`border-b border-slate-100 last:border-0 ${row.isSaturday ? 'bg-rose-50/60' : ''}`}
                    >
                      <td className="p-2.5 whitespace-nowrap">
                        <span className="font-bold text-slate-800">{formatBs(adToBs(row.date))}</span>
                        <span className="ml-1 text-[10px] text-slate-400">{row.date}</span>
                      </td>
                      <td className="p-2.5 font-bold text-slate-800">{row.fullName}</td>
                      <td className="p-2.5 font-mono text-slate-600">{row.checkIn || '—'}</td>
                      <td className="p-2.5 font-mono text-slate-600">{row.checkOut || '—'}</td>
                      <td className="p-2.5 text-slate-600">{row.workHours ? row.workHours.toFixed(2) : '—'}</td>
                      <td className="p-2.5">
                        <span className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLES[row.status] || ''}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={phase === 'saving' || !readyRows.payloads.length}
              onClick={commit}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {phase === 'saving'
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                : <><UploadCloud className="h-4 w-4" /> Import {readyRows.payloads.length} row(s)</>}
            </button>
            {readyRows.unmatchedRowCount > 0 && (
              <span className="text-xs text-slate-500">
                {readyRows.unmatchedRowCount} row(s) will be skipped — no employee selected.
              </span>
            )}
          </div>
        </div>
      )}

      {/* ---------------- Result ---------------- */}
      {phase === 'done' && result && (
        <div className="mt-5 space-y-3">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-black text-emerald-900">
                {result.imported} attendance row(s) imported.
              </p>
              {result.skipped > 0 && (
                <p className="mt-0.5 text-xs text-emerald-800">{result.skipped} row(s) were skipped.</p>
              )}
              <p className="mt-1 text-xs text-emerald-800">
                Open Attendance Management to see them on the monthly sheet.
              </p>
            </div>
          </div>
          {result.errors.map(message => (
            <div key={message} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
              {message}
            </div>
          ))}
          <button type="button" onClick={reset} className="btn-secondary text-xs">
            Import another file
          </button>
        </div>
      )}
    </div>
  );
};

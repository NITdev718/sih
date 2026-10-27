'use client';
import { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileUp, Loader2, Upload } from 'lucide-react';
import { api, downloadText } from '@/lib/client';
import { buildSampleCsv } from '@/lib/sample';
import { useToast } from './Providers';
import { StatusBadge } from './ui';

const MAX_BYTES = 1_000_000;

export default function UploadPanel({ onImported }) {
  const toast = useToast();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState(null);
  const [drag, setDrag] = useState(false);

  async function pick(f) {
    if (!f) return;
    if (f.size > MAX_BYTES) return toast.error('File is larger than 1 MB. Split it into smaller uploads.');
    if (!/\.csv$|\.txt$/i.test(f.name) && f.type && !f.type.includes('csv') && !f.type.includes('text')) return toast.error('Please choose a .csv file.');
    setFile(f);
    setText(await f.text());
    setReport(null);
  }

  async function run() {
    setBusy(true);
    try {
      const data = await api('/api/institution/upload', { method: 'POST', body: { csv: text } });
      setReport(data);
      const { inserted, rejected } = data.summary;
      if (inserted && !rejected) toast.success(`Imported ${inserted} students.`);
      else if (inserted) toast.info(`Imported ${inserted} students; ${rejected} rows need fixing.`);
      else toast.error('No rows were imported - see the report below.');
      onImported?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  const errors = report?.results.filter((r) => r.status === 'error') ?? [];

  return (
    <section className="card" aria-labelledby="upload-h">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="upload-h" className="text-xl font-bold text-heading">Bulk upload</h2>
          <p className="mt-1 text-sm text-muted">
            Columns: <code className="font-mono text-xs">apaar_id, name, dob, gender, course, year</code>. Valid rows are imported; problems come back row by row.
          </p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => downloadText('apaar-sample.csv', buildSampleCsv())}>
          <Download className="h-4 w-4" aria-hidden="true" /> Download sample CSV
        </button>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          pick(e.dataTransfer.files?.[0]);
        }}
        className={`mt-5 rounded-2xl border-2 border-dashed p-6 text-center transition ${drag ? 'border-accent bg-accent/5' : 'border-line'}`}
      >
        <FileUp className="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
        <p className="mt-2 text-sm">
          {file ? (
            <>
              <strong className="text-heading">{file.name}</strong> - {text.split(/\r?\n/).filter(Boolean).length - 1} data rows
            </>
          ) : (
            'Drag a CSV here, or'
          )}
        </p>
        <input ref={inputRef} id="csv-input" type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        <label htmlFor="csv-input" className="btn btn-ghost btn-sm mt-3 cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-accent">
          <Upload className="h-4 w-4" aria-hidden="true" /> {file ? 'Choose another file' : 'Choose file'}
        </label>
      </div>

      <div className="mt-4 flex justify-end">
        <button type="button" className="btn btn-primary" disabled={!text || busy} onClick={run}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Validate &amp; import
        </button>
      </div>

      {report && (
        <div className="mt-6 space-y-5" aria-live="polite">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Rows read', report.summary.total, 'text-heading'],
              ['Imported', report.summary.inserted, 'text-ok'],
              ['Rejected', report.summary.rejected, 'text-danger'],
              ['Possible duplicates', report.summary.duplicate_candidates, 'text-accent'],
            ].map(([l, v, c]) => (
              <div key={l} className="rounded-xl border border-line bg-soft p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{l}</p>
                <p className={`text-2xl font-extrabold ${c}`}>{v}</p>
              </div>
            ))}
          </div>

          {errors.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-2 font-bold text-danger">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" /> Row-level errors
              </h3>
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[480px]">
                  <thead className="bg-soft">
                    <tr>
                      <th className="th">Line</th>
                      <th className="th">APAAR ID</th>
                      <th className="th">Problems</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {errors.map((r) => (
                      <tr key={r.line}>
                        <td className="td font-mono">{r.line}</td>
                        <td className="td font-mono text-xs">{r.apaar_id || '(blank)'}</td>
                        <td className="td">
                          <ul className="space-y-0.5">
                            {r.errors.map((e, i) => (
                              <li key={i}>
                                <span className="badge badge-bad mr-1.5">{e.field}</span>
                                {e.message}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {report.duplicates.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-2 font-bold text-accent">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" /> Duplicate candidates (imported, flagged for review below)
              </h3>
              <ul className="space-y-2">
                {report.duplicates.map((d) => (
                  <li key={d.apaar_id} className="rounded-xl border border-line p-3 text-sm">
                    Line {d.line}: <strong>{d.name}</strong> resembles{' '}
                    {d.matches.map((m) => (
                      <span key={m.apaar_id} className="mr-2 inline-block">
                        <strong>{m.name}</strong> <span className="badge badge-warn">{m.similarity}% match</span>
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {errors.length === 0 && report.duplicates.length === 0 && (
            <p className="flex items-center gap-2 text-sm font-semibold text-ok">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> Clean file - nothing to fix.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

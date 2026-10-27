'use client';
import { useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Link2, Loader2, RotateCcw, ShieldAlert, ShieldCheck, Users, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, fmtDateTime, useFetch } from '@/lib/client';
import { useToast } from '@/components/Providers';
import { StatCard, ErrorState, SkeletonRows, Reveal } from '@/components/ui';
import { StackedColumns } from '@/components/Charts';

const SERIES = [
  { key: 'verified', label: 'Verified', color: '#2E8B3E' },
  { key: 'consent_required', label: 'Consent required', color: '#F37021' },
  { key: 'not_found', label: 'Not found', color: '#0070C0' },
  { key: 'invalid', label: 'Invalid ID', color: '#8793ad' },
  { key: 'tampered', label: 'Tampered', color: '#C62828' },
];
const SEV = { critical: 'badge-bad', high: 'badge-bad', medium: 'badge-warn', low: 'badge-info' };

export default function AdminPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const stats = useFetch('/api/admin/stats');
  const audit = useFetch(`/api/admin/audit?page=${page}&pageSize=10`);
  const [busy, setBusy] = useState(null);
  const [check, setCheck] = useState(null); // result of last "Verify chain integrity"
  const [tampered, setTampered] = useState(false);
  const broken = check && !check.ok ? check.brokenAt : audit.data?.chain && !audit.data.chain.ok ? audit.data.chain.brokenAt : null;

  async function run(kind) {
    setBusy(kind);
    try {
      if (kind === 'verify') {
        const r = await api('/api/admin/audit/verify', { method: 'POST' });
        setCheck(r);
        r.ok ? toast.success(`Chain intact: ${r.checked} records verified in ${r.ms} ms.`) : toast.error(`Chain broken at record #${r.brokenAt}.`);
      } else {
        const r = await api('/api/admin/tamper', { method: 'POST', body: { action: kind } });
        setTampered(kind === 'tamper');
        setCheck(null);
        toast[kind === 'tamper' ? 'info' : 'success'](kind === 'tamper' ? `Record #${r.tampered} was altered (demo). Now run the integrity check.` : `Record #${r.restored} restored.`);
      }
      audit.reload();
      stats.reload();
    } catch (e) {
      if (e.status === 409 && /already tampered/i.test(e.message)) setTampered(true);
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  }
  const t = stats.data?.totals;
  const chainBroken = stats.data && !stats.data.chain.ok;

  return (
    <div className="container-x space-y-8 py-10 sm:py-14">
      <header>
        <p className="text-sm font-semibold text-accent">Administrator</p>
        <h1 className="h-display mt-1 text-4xl sm:text-5xl">Audit &amp; analytics</h1>
      </header>

      {stats.error ? <ErrorState error={stats.error} onRetry={stats.reload} /> : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatCard icon={Users} label="Students" value={t?.students} loading={!t} tone="brand" />
            <StatCard icon={Building2} label="Institutions" value={t?.institutions} loading={!t} tone="navy" />
            <StatCard icon={ShieldCheck} label="Verifiers" value={t?.verifiers} loading={!t} tone="ok" />
            <StatCard icon={Activity} label="Lookups" value={t?.lookups} loading={!t} tone="accent" />
            <StatCard icon={Link2} label="Audit rows" value={t?.auditEntries} loading={!t} tone="navy" />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
            <Reveal><div className="card h-full">
              <h2 className="mb-4 text-lg font-bold text-heading">Verification usage - last 14 days</h2>
              {stats.data ? <StackedColumns data={stats.data.usage} series={SERIES} /> : <div className="skeleton h-56 w-full" />}
            </div></Reveal>
            <Reveal delay={0.08}><div className="card h-full">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-heading"><AlertTriangle className="h-5 w-5 text-accent" aria-hidden="true" /> Anomaly alerts</h2>
              {!stats.data ? <div className="skeleton h-40 w-full" /> : !stats.data.anomalies.length ? (
                <p className="flex items-center gap-2 text-sm text-ok"><CheckCircle2 className="h-5 w-5" aria-hidden="true" /> No anomalies detected.</p>
              ) : (
                <ul className="space-y-3">
                  {stats.data.anomalies.map((a, i) => (
                    <li key={i} className="rounded-xl border border-line p-3 text-sm">
                      <span className={`badge ${SEV[a.severity]} mb-1 uppercase`}>{a.severity}</span>
                      <p className="font-bold text-heading">{a.title}</p>
                      <p className="text-muted">{a.detail}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div></Reveal>
          </div>
        </>
      )}

      <section className="card !p-0" aria-labelledby="audit-h">
        <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
          <div>
            <h2 id="audit-h" className="text-xl font-bold text-heading">Audit log</h2>
            <p className="mt-1 max-w-xl text-sm text-muted">Each row's hash = SHA-256(prev_hash + action + payload + ts). Change any row and every link after it stops matching.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" disabled={!!busy} onClick={() => run('verify')}>
              {busy === 'verify' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />} Verify chain integrity
            </button>
            <button type="button" className="btn btn-danger" disabled={!!busy || tampered || chainBroken} onClick={() => run('tamper')}>
              {busy === 'tamper' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" aria-hidden="true" />} Tamper with a record
            </button>
            {(tampered || chainBroken) && (
              <button type="button" className="btn btn-ghost" disabled={!!busy} onClick={() => run('restore')}>
                {busy === 'restore' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" aria-hidden="true" />} Restore
              </button>
            )}
          </div>
        </div>

        {check && (
          <div className={`mx-5 mb-4 rounded-xl border-2 p-4 text-sm sm:mx-6 ${check.ok ? 'border-ok' : 'border-danger'}`} role="status">
            {check.ok ? (
              <p className="flex items-center gap-2 font-semibold text-ok"><CheckCircle2 className="h-5 w-5" aria-hidden="true" /> Chain intact - all {check.checked} records recomputed and matched.</p>
            ) : (
              <p className="text-danger"><strong className="flex items-center gap-2"><ShieldAlert className="h-5 w-5" aria-hidden="true" /> First broken link: record #{check.brokenAt}</strong><span className="mt-1 block text-ink">{check.reason} Verifiers are being refused until this is resolved.</span></p>
            )}
          </div>
        )}

        {audit.error ? <div className="p-5 pt-0"><ErrorState error={audit.error} onRetry={audit.reload} /></div> : !audit.data ? <SkeletonRows rows={6} /> : (
          <div className="overflow-x-auto border-t border-line">
            <table className="w-full min-w-[760px]">
              <thead className="bg-soft"><tr><th className="th">#</th><th className="th">Time</th><th className="th">Action</th><th className="th">Payload</th><th className="th">Hash</th></tr></thead>
              <tbody className="divide-y divide-line">
                {audit.data.rows.map((r) => (
                  <tr key={r.id} className={r.id === broken ? 'bg-danger/10' : ''}>
                    <td className="td font-mono">{r.id}{r.id === broken && <span className="badge badge-bad ml-2">broken</span>}</td>
                    <td className="td whitespace-nowrap text-xs">{fmtDateTime(r.ts)}</td>
                    <td className="td"><span className="badge badge-info">{r.action}</span></td>
                    <td className="td max-w-[260px] truncate font-mono text-xs" title={r.payload}>{r.payload}</td>
                    <td className="td font-mono text-xs text-muted" title={r.hash}>{r.hash.slice(0, 10)}...<span className="block text-[10px]">prev {r.prev_hash.slice(0, 8)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {audit.data && (
          <div className="flex items-center justify-between border-t border-line p-4 text-sm">
            <span className="text-muted">Newest first - page {audit.data.page} of {audit.data.pages}</span>
            <div className="flex gap-2">
              <button type="button" className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /> Prev</button>
              <button type="button" className="btn btn-ghost btn-sm" disabled={page >= audit.data.pages} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

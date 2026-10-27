'use client';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BadgeCheck, Loader2, Lock, Search, SearchX, Send, ShieldAlert } from 'lucide-react';
import { api, fmtDate, fmtDateTime, useFetch, GENDER_LABEL } from '@/lib/client';
import { CONSENT_FIELDS, formatApaarId, validateApaarId } from '@/lib/validation';
import { FIELD_LABEL } from '@/lib/constants';
import { useToast } from '@/components/Providers';
import { StatusBadge, EmptyState } from '@/components/ui';

const pop = { initial: { opacity: 0, y: 16, scale: 0.97 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -8 }, transition: { type: 'spring', stiffness: 260, damping: 22 } };

function show(field, v) {
  if (field === 'gender') return GENDER_LABEL[v] || v;
  if (field === 'dob') return fmtDate(v);
  return String(v);
}

function RequestPanel({ id, pending, onSent }) {
  const toast = useToast();
  const [sel, setSel] = useState(['name', 'course', 'year', 'status']);
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true);
    try {
      await api('/api/consents', { method: 'POST', body: { action: 'request', apaar_id: id, fields: sel } });
      toast.success('Request sent to the student.');
      onSent();
    } catch (e) {
      toast.error(e.message);
      if (e.status === 409) onSent();
    } finally {
      setBusy(false);
    }
  }
  if (pending) {
    return (
      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-soft p-4 text-sm">
        <StatusBadge status="pending" /> Waiting for the student to respond.
        <button type="button" className="btn btn-ghost btn-sm ml-auto" onClick={onSent}>Check again</button>
      </div>
    );
  }
  return (
    <div className="mt-5">
      <fieldset>
        <legend className="label">Fields to request</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {CONSENT_FIELDS.map((f) => (
            <label key={f} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line p-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-[#F37021]" checked={sel.includes(f)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, f] : s.filter((x) => x !== f)))} />
              {FIELD_LABEL[f]}
            </label>
          ))}
        </div>
      </fieldset>
      <button type="button" className="btn btn-accent mt-4" disabled={busy || !sel.length} onClick={send}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" aria-hidden="true" />} Request access
      </button>
    </div>
  );
}

function Result({ r, onRecheck }) {
  if (r.status === 'verified') {
    return (
      <motion.div key="v" {...pop} className="card border-2 !border-ok" role="status">
        <div className="flex items-center gap-3">
          <motion.span initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.1 }} className="grid h-14 w-14 place-items-center rounded-2xl bg-ok text-white">
            <BadgeCheck className="h-8 w-8" aria-hidden="true" />
          </motion.span>
          <div>
            <h2 className="text-2xl font-extrabold text-ok">Verified</h2>
            <p className="font-mono text-sm text-muted">{formatApaarId(r.apaar_id)}</p>
          </div>
        </div>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          {Object.entries(r.fields).map(([k, v], i) => (
            <motion.div key={k} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.06 }} className="rounded-xl border border-line bg-soft p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{FIELD_LABEL[k]}</dt>
              <dd className="mt-0.5 font-bold capitalize text-heading">{show(k, v)}</dd>
            </motion.div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-muted">Only the {Object.keys(r.fields).length} field(s) the student consented to are shown. Consent expires {fmtDate(r.consent.expires_at)}. Checked {fmtDateTime(r.verified_at)}.</p>
      </motion.div>
    );
  }
  if (r.status === 'not_found') {
    return (
      <motion.div key="n" {...pop} className="card border-2" role="status">
        <div className="flex items-center gap-3">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-soft text-muted"><SearchX className="h-8 w-8" aria-hidden="true" /></span>
          <div><h2 className="text-2xl font-extrabold text-heading">Not found</h2><p className="text-sm text-muted">{r.message}</p></div>
        </div>
      </motion.div>
    );
  }
  if (r.status === 'consent_required') {
    return (
      <motion.div key="c" {...pop} className="card border-2 !border-accent" role="status">
        <div className="flex items-center gap-3">
          <motion.span animate={{ rotate: [0, -8, 8, -4, 0] }} transition={{ duration: 0.6, delay: 0.2 }} className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-white"><Lock className="h-7 w-7" aria-hidden="true" /></motion.span>
          <div><h2 className="text-2xl font-extrabold text-accent">Consent required</h2><p className="text-sm text-muted">{r.message}</p></div>
        </div>
        <RequestPanel id={r.apaar_id} pending={r.pending} onSent={onRecheck} />
      </motion.div>
    );
  }
  return (
    <motion.div key="t" {...pop} className="card border-2 !border-danger" role="alert">
      <div className="flex items-center gap-3">
        <motion.span animate={{ scale: [1, 1.12, 1] }} transition={{ repeat: Infinity, duration: 1.4 }} className="grid h-14 w-14 place-items-center rounded-2xl bg-danger text-white"><ShieldAlert className="h-8 w-8" aria-hidden="true" /></motion.span>
        <div><h2 className="text-2xl font-extrabold text-danger">Tampered</h2><p className="text-sm">{r.message}</p></div>
      </div>
    </motion.div>
  );
}

export default function VerifyPage() {
  const toast = useToast();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [demo, setDemo] = useState(null);
  const reqs = useFetch('/api/consents');

  useEffect(() => {
    api('/api/verify').then((d) => setDemo(d.demo)).catch(() => {});
  }, []);

  async function lookup(raw = value) {
    const v = validateApaarId(raw);
    if (!v.ok) {
      setError(v.error);
      setResult(null);
      return;
    }
    setError('');
    setBusy(true);
    try {
      setResult(await api('/api/verify', { method: 'POST', body: { apaar_id: v.id } }));
      reqs.reload();
    } catch (e) {
      setResult(null);
      setError(e.message);
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  const chips = demo && [['Verified (consent given)', demo.verified], ['Consent needed', demo.student], ['Request pending', demo.pending], ['Not found', demo.notFound], ['Bad checksum', demo.badChecksum]];

  return (
    <div className="container-x py-10 sm:py-14">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold text-accent">Verifier</p>
        <h1 className="h-display mt-1 text-4xl sm:text-5xl">Verify an APAAR ID</h1>
        <p className="mt-3 text-muted">Enter a 12-digit ID. You will only see what the student has agreed to share.</p>
      </header>

      <form onSubmit={(e) => { e.preventDefault(); lookup(); }} className="mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row" noValidate>
        <div className="flex-1">
          <label htmlFor="apaar" className="sr-only">APAAR ID</label>
          <input id="apaar" inputMode="numeric" autoComplete="off" placeholder="0000 0000 0000" className="input !py-3.5 font-mono text-lg tracking-widest" value={value} onChange={(e) => { setValue(e.target.value); setError(''); }} aria-invalid={!!error} aria-describedby={error ? 'apaar-err' : undefined} />
        </div>
        <button type="submit" className="btn btn-primary !py-3.5 px-7" disabled={busy || !value.trim()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />} Verify
        </button>
      </form>
      {error && <p id="apaar-err" className="mt-2 text-sm font-medium text-danger" role="alert">{error}</p>}

      {chips && (
        <div className="mt-4 flex max-w-3xl flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-muted">Demo shortcuts:</span>
          {chips.map(([label, id]) => (
            <button key={label} type="button" className="badge badge-mute hover:border-accent" onClick={() => { setValue(id); lookup(id); }}>{label}</button>
          ))}
        </div>
      )}

      <div className="mt-8 max-w-2xl" aria-live="polite">
        <AnimatePresence mode="wait">{result && <Result key={result.status + result.apaar_id} r={result} onRecheck={() => lookup(result.apaar_id)} />}</AnimatePresence>
      </div>

      <section className="card mt-12 max-w-3xl !p-0" aria-labelledby="req-h">
        <div className="p-5 sm:p-6"><h2 id="req-h" className="text-lg font-bold text-heading">Your access requests</h2></div>
        {!reqs.data ? <div className="p-5 pt-0"><div className="skeleton h-10 w-full" /></div> : !reqs.data.consents.length ? (
          <EmptyState title="No requests yet">Look up a student and choose Request access.</EmptyState>
        ) : (
          <div className="overflow-x-auto border-t border-line">
            <table className="w-full min-w-[420px]">
              <thead className="bg-soft"><tr><th className="th">Student ID</th><th className="th">Fields</th><th className="th">Status</th></tr></thead>
              <tbody className="divide-y divide-line">
                {reqs.data.consents.map((c) => (
                  <tr key={c.id}><td className="td font-mono text-xs">{formatApaarId(c.apaar_id)}</td><td className="td text-xs">{c.fields.map((f) => FIELD_LABEL[f]).join(', ')}</td><td className="td"><StatusBadge status={c.status} /></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

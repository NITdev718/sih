'use client';
import { useState } from 'react';
import { Check, Clock, Loader2, ShieldOff, X } from 'lucide-react';
import { api, daysLeft, fmtDate } from '@/lib/client';
import { CONSENT_FIELDS } from '@/lib/validation';
import { FIELD_LABEL } from '@/lib/constants';
import { useToast } from './Providers';
import { EmptyState, StatusBadge } from './ui';

function Chips({ fields }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {fields.map((f) => (
        <span key={f} className="badge badge-info">{FIELD_LABEL[f] || f}</span>
      ))}
    </span>
  );
}

function PendingCard({ c, onChanged }) {
  const toast = useToast();
  const [sel, setSel] = useState(c.fields);
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState(null);

  async function act(action) {
    setBusy(action);
    try {
      await api('/api/consents', { method: 'POST', body: { action, id: c.id, ...(action === 'approve' ? { fields: sel, days: Number(days) } : {}) } });
      toast.success(action === 'approve' ? 'Access granted.' : 'Request denied.');
      onChanged();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  }
  return (
    <li className="rounded-2xl border-2 border-accent p-4">
      <p className="font-bold text-heading">{c.verifier.name}</p>
      <p className="text-sm text-muted">is asking to see:</p>
      <fieldset className="mt-3">
        <legend className="sr-only">Fields to share with {c.verifier.name}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {c.fields.map((f) => (
            <label key={f} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line p-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-[#0070C0]" checked={sel.includes(f)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, f] : s.filter((x) => x !== f)))} />
              {FIELD_LABEL[f] || f}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor={`d-${c.id}`} className="label">Share for</label>
          <select id={`d-${c.id}`} className="input !w-auto" value={days} onChange={(e) => setDays(e.target.value)}>
            <option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option>
          </select>
        </div>
        <button type="button" className="btn btn-primary" disabled={!!busy || !sel.length} onClick={() => act('approve')}>
          {busy === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" aria-hidden="true" />} Approve
        </button>
        <button type="button" className="btn btn-ghost" disabled={!!busy} onClick={() => act('deny')}>
          {busy === 'deny' ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" aria-hidden="true" />} Deny
        </button>
      </div>
    </li>
  );
}

function ActiveCard({ c, onChanged }) {
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  async function revoke() {
    setBusy(true);
    try {
      await api('/api/consents', { method: 'POST', body: { action: 'revoke', id: c.id } });
      toast.success('Access revoked. It takes effect immediately.');
      onChanged();
    } catch (e) {
      toast.error(e.message);
      setBusy(false);
    }
  }
  const left = daysLeft(c.expires_at);
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-line p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-2">
        <p className="font-bold text-heading">{c.verifier.name}</p>
        <Chips fields={c.fields} />
        <p className="flex items-center gap-1.5 text-xs text-muted"><Clock className="h-3.5 w-3.5" aria-hidden="true" /> {left != null ? `Expires ${fmtDate(c.expires_at)} (${left} day${left === 1 ? '' : 's'} left)` : 'No expiry'}</p>
      </div>
      {confirm ? (
        <div className="flex gap-2">
          <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={revoke}>{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Confirm revoke</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirm(false)}>Cancel</button>
        </div>
      ) : (
        <button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => setConfirm(true)}><ShieldOff className="h-3.5 w-3.5" aria-hidden="true" /> Revoke</button>
      )}
    </li>
  );
}

export default function ConsentManager({ consents, onChanged }) {
  const pending = consents.filter((c) => c.status === 'pending');
  const active = consents.filter((c) => c.status === 'approved');
  const past = consents.filter((c) => !['pending', 'approved'].includes(c.status));
  return (
    <section className="card" aria-labelledby="consent-h">
      <h2 id="consent-h" className="text-xl font-bold text-heading">Consent manager</h2>
      <p className="mt-1 text-sm text-muted">You decide who sees what. Verifiers only ever receive the fields you approve.</p>

      <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-muted">Waiting for you ({pending.length})</h3>
      {pending.length ? <ul className="mt-3 space-y-3">{pending.map((c) => <PendingCard key={c.id} c={c} onChanged={onChanged} />)}</ul> : <p className="mt-2 text-sm text-muted">No pending requests.</p>}

      <h3 className="mt-8 text-sm font-bold uppercase tracking-wide text-muted">Active access ({active.length})</h3>
      {active.length ? <ul className="mt-3 space-y-3">{active.map((c) => <ActiveCard key={c.id} c={c} onChanged={onChanged} />)}</ul> : <p className="mt-2 text-sm text-muted">Nobody currently has access to your data.</p>}

      <h3 className="mt-8 text-sm font-bold uppercase tracking-wide text-muted">History</h3>
      {past.length ? (
        <ul className="mt-3 divide-y divide-line rounded-2xl border border-line">
          {past.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <span className="font-semibold">{c.verifier.name}</span>
              <span className="flex items-center gap-3 text-muted">{fmtDate(c.decided_at || c.created_at)} <StatusBadge status={c.status} /></span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Nothing here yet" />
      )}
    </section>
  );
}

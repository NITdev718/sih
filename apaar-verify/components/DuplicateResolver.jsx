'use client';
import { useState } from 'react';
import { CheckCheck, GitMerge, Loader2, ThumbsUp, Trash2 } from 'lucide-react';
import { api } from '@/lib/client';
import { formatApaarId } from '@/lib/validation';
import { useToast } from './Providers';
import { EmptyState, ErrorState, Skeleton, StatusBadge } from './ui';

function Rec({ r, label }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-soft p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted">{label}</p>
      <p className="truncate font-bold text-heading">{r.name}</p>
      <p className="font-mono text-xs text-muted">{formatApaarId(r.apaar_id)}</p>
      <p className="mt-1 text-xs">DOB {r.dob}</p>
      <p className="truncate text-xs text-muted">{r.institution}</p>
      <div className="mt-1.5">
        <StatusBadge status={r.status} />
      </div>
    </div>
  );
}

export default function DuplicateResolver({ pairs, loading, error, onRetry, onResolved }) {
  const toast = useToast();
  const [busy, setBusy] = useState(null);

  async function resolve(p, action, survivor) {
    const key = `${p.a.apaar_id}-${p.b.apaar_id}`;
    setBusy(`${key}-${action}${survivor || ''}`);
    try {
      await api('/api/duplicates/resolve', { method: 'POST', body: { a: p.a.apaar_id, b: p.b.apaar_id, action, survivor } });
      toast.success({ merge: 'Records merged.', keep: 'Kept both records.', reject: 'Record rejected.' }[action]);
      onResolved?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="card" aria-labelledby="dup-h">
      <h2 id="dup-h" className="text-xl font-bold text-heading">Duplicate resolver</h2>
      <p className="mt-1 text-sm text-muted">Similarity = name 60% + date of birth 30% + institution 10%. Pairs at 85% or more are flagged.</p>
      <div className="mt-5 space-y-4">
        {loading && !pairs ? (
          <>
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </>
        ) : error ? (
          <ErrorState error={error} onRetry={onRetry} />
        ) : !pairs?.length ? (
          <EmptyState icon={CheckCheck} title="No duplicates to review">
            New uploads are compared against existing records automatically.
          </EmptyState>
        ) : (
          pairs.map((p) => {
            const key = `${p.a.apaar_id}-${p.b.apaar_id}`;
            const is = (s) => busy === `${key}-${s}`;
            return (
              <article key={key} className="rounded-2xl border border-line p-4">
                <div className="mb-3 flex items-center gap-3">
                  <span className={`badge ${p.similarity >= 95 ? 'badge-bad' : 'badge-warn'} text-sm`}>{p.similarity}% similar</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-soft">
                    <div className="h-full bg-accent" style={{ width: `${p.similarity}%` }} />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Rec r={p.a} label="Record A" />
                  <Rec r={p.b} label="Record B" />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" className="btn btn-navy btn-sm" disabled={!!busy} onClick={() => resolve(p, 'merge', p.a.apaar_id)}>
                    {is(`merge${p.a.apaar_id}`) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitMerge className="h-3.5 w-3.5" aria-hidden="true" />} Merge into A
                  </button>
                  <button type="button" className="btn btn-navy btn-sm" disabled={!!busy} onClick={() => resolve(p, 'merge', p.b.apaar_id)}>
                    {is(`merge${p.b.apaar_id}`) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitMerge className="h-3.5 w-3.5" aria-hidden="true" />} Merge into B
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => resolve(p, 'keep')}>
                    {is('keep') ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />} Keep both
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm text-danger" disabled={!!busy} onClick={() => resolve(p, 'reject')}>
                    {is('reject') ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />} Reject B
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

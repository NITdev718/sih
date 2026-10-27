'use client';
import { Eye, FileText, GraduationCap } from 'lucide-react';
import { useFetch, fmtDateTime, fmtDate } from '@/lib/client';
import IdCard from '@/components/IdCard';
import ConsentManager from '@/components/ConsentManager';
import { EmptyState, ErrorState, Skeleton, SkeletonRows, StatusBadge, Reveal } from '@/components/ui';

export default function StudentPage() {
  const me = useFetch('/api/student/me');
  const consents = useFetch('/api/consents');
  const s = me.data?.student;

  return (
    <div className="container-x space-y-8 py-10 sm:py-14">
      <header>
        <p className="text-sm font-semibold text-accent">Student</p>
        <h1 className="h-display mt-1 text-4xl sm:text-5xl">{s ? `Hello, ${s.name.split(' ')[0]}` : 'Your APAAR ID'}</h1>
      </header>

      {me.error ? (
        <ErrorState error={me.error} onRetry={me.reload} />
      ) : (
        <div className="grid items-start gap-8 lg:grid-cols-2">
          {s ? <IdCard student={s} /> : <Skeleton className="mx-auto aspect-[1.586/1] w-full max-w-md !rounded-2xl" />}
          <div className="space-y-5">
            <div className="card">
              <h2 className="flex items-center gap-2 text-lg font-bold text-heading"><GraduationCap className="h-5 w-5 text-brand" aria-hidden="true" /> Academic Bank of Credits <span className="badge badge-mute">mock</span></h2>
              {me.data ? (
                <>
                  <p className="mt-3 text-3xl font-extrabold text-heading">{me.data.services.credits.earned}<span className="text-base font-medium text-muted"> / {me.data.services.credits.required} credits</span></p>
                  <div className="mt-2 h-3 overflow-hidden rounded-full border border-line bg-soft"><div className="h-full bg-ok" style={{ width: `${Math.min(100, (me.data.services.credits.earned / me.data.services.credits.required) * 100)}%` }} /></div>
                </>
              ) : <Skeleton className="mt-3 h-12 w-full" />}
            </div>
            <div className="card">
              <h2 className="flex items-center gap-2 text-lg font-bold text-heading"><FileText className="h-5 w-5 text-brand" aria-hidden="true" /> DigiLocker documents <span className="badge badge-mute">mock</span></h2>
              {me.data ? (
                <ul className="mt-3 divide-y divide-line text-sm">
                  {me.data.services.documents.map((d) => (
                    <li key={d.uri} className="flex items-center justify-between gap-3 py-2"><span className="font-medium">{d.label}</span><span className="text-xs text-muted">{fmtDate(d.issued_on)}</span></li>
                  ))}
                </ul>
              ) : <Skeleton className="mt-3 h-20 w-full" />}
            </div>
          </div>
        </div>
      )}

      {consents.error ? <ErrorState error={consents.error} onRetry={consents.reload} /> : consents.data ? <ConsentManager consents={consents.data.consents} onChanged={() => { consents.reload(); me.reload(); }} /> : <div className="card"><SkeletonRows rows={3} /></div>}

      <Reveal>
        <section className="card !p-0" aria-labelledby="hist-h">
          <div className="p-5 sm:p-6">
            <h2 id="hist-h" className="text-xl font-bold text-heading">Access history</h2>
            <p className="mt-1 text-sm text-muted">Every time someone looked up your APAAR ID, and what they got.</p>
          </div>
          {!me.data ? <SkeletonRows rows={4} /> : !me.data.history.length ? (
            <EmptyState icon={Eye} title="No lookups yet">When a verifier searches your ID, it will appear here.</EmptyState>
          ) : (
            <div className="overflow-x-auto border-t border-line">
              <table className="w-full min-w-[480px]">
                <thead className="bg-soft"><tr><th className="th">When</th><th className="th">Verifier</th><th className="th">Result</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {me.data.history.map((h) => (
                    <tr key={h.id}><td className="td whitespace-nowrap">{fmtDateTime(h.ts)}</td><td className="td">{h.verifier}</td><td className="td"><StatusBadge status={h.result} /></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </Reveal>
    </div>
  );
}

'use client';
import { useState } from 'react';
import { AlertTriangle, Copy, GraduationCap, ShieldCheck } from 'lucide-react';
import { useFetch } from '@/lib/client';
import { useAuth } from '@/components/Providers';
import { StatCard, ErrorState, Reveal } from '@/components/ui';
import { BarList } from '@/components/Charts';
import UploadPanel from '@/components/UploadPanel';
import DuplicateResolver from '@/components/DuplicateResolver';
import StudentTable from '@/components/StudentTable';

export default function InstitutionPage() {
  const { user } = useAuth();
  const stats = useFetch('/api/institution/stats');
  const dups = useFetch('/api/duplicates/resolve');
  const [tick, setTick] = useState(0);
  const refreshAll = () => {
    stats.reload();
    dups.reload();
    setTick((t) => t + 1);
  };
  const s = stats.data;
  const isInst = user?.role === 'institution';

  return (
    <div className="container-x space-y-8 py-10 sm:py-14">
      <header>
        <p className="text-sm font-semibold text-accent">Institution dashboard</p>
        <h1 className="h-display mt-1 text-4xl sm:text-5xl">{s?.institution?.name || (stats.loading ? 'Loading...' : 'All institutions')}</h1>
        {s?.institution && <p className="mt-2 text-muted">{s.institution.city}, {s.institution.state} - UDISE+ {s.institution.udise_code} (mock)</p>}
      </header>

      {stats.error ? (
        <ErrorState error={stats.error} onRetry={stats.reload} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={GraduationCap} label="Students" value={s?.total} loading={!s} tone="brand" />
            <StatCard icon={ShieldCheck} label="Active" value={s?.active} loading={!s} tone="ok" />
            <StatCard icon={AlertTriangle} label="Invalid IDs" value={s?.invalid} loading={!s} tone="danger" hint="fail the checksum" />
            <StatCard icon={Copy} label="Duplicate pairs" value={s?.duplicates} loading={!s} tone="accent" hint="awaiting review" />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Reveal>
              <div className="card h-full">
                <h2 className="mb-4 text-lg font-bold text-heading">Students by course</h2>
                {s ? <BarList data={s.byCourse} /> : <div className="skeleton h-32 w-full" />}
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="card h-full">
                <h2 className="mb-4 text-lg font-bold text-heading">Students by year</h2>
                {s ? <BarList data={s.byYear} color="#F37021" /> : <div className="skeleton h-32 w-full" />}
              </div>
            </Reveal>
          </div>
        </>
      )}

      {isInst && <UploadPanel onImported={refreshAll} />}
      <DuplicateResolver pairs={dups.data?.pairs} loading={dups.loading} error={dups.error} onRetry={dups.reload} onResolved={refreshAll} />
      <StudentTable refreshKey={tick} canEdit={isInst} onChanged={() => { stats.reload(); dups.reload(); }} />
    </div>
  );
}

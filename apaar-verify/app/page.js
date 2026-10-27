'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Building2, FileUp, GraduationCap, KeyRound, Link2, Loader2, Plug, ScanLine, ShieldCheck, Users, Fingerprint, Copy, Hash, Search } from 'lucide-react';
import IdCard from '@/components/IdCard';
import { Reveal, StatCard } from '@/components/ui';
import { useAuth, useToast } from '@/components/Providers';
import { api } from '@/lib/client';
import { DEMO_LOGINS, DEMO_PASSWORD, ROLE_HOME } from '@/lib/constants';

const SAMPLE = { name: 'Aarav Sample', apaar_id: '412345678905', institution: 'Aryabhata Institute of Technology', course: 'B.Tech Computer Science', year: 2, dob: '2005-06-14', gender: 'M', status: 'active' };

const STEPS = [
  { icon: FileUp, title: 'Institutions upload', text: 'Registrars upload a CSV. Every row is checked: 12-digit APAAR ID with a Luhn checksum, DOB, required fields, exact and fuzzy duplicates.' },
  { icon: KeyRound, title: 'Students consent', text: 'Students see every verifier request and decide which fields to share, for how long. They can revoke at any time.' },
  { icon: ScanLine, title: 'Verifiers check instantly', text: 'A verifier enters an APAAR ID. The server answers with only the fields the student agreed to, and logs the access.' },
];

const FEATURES = [
  { icon: Hash, title: 'Checksum-validated IDs', text: 'Typos are caught at the door: every APAAR ID must be 12 digits and pass the Luhn test.' },
  { icon: Copy, title: 'Fuzzy duplicate detection', text: 'Name, DOB and institution similarity surfaces probable duplicates for merge, keep or reject.' },
  { icon: ShieldCheck, title: 'Consent-gated disclosure', text: 'Field-level projection happens on the server. The full record never reaches the verifier.' },
  { icon: Link2, title: 'Tamper-evident audit', text: 'Every state change is a SHA-256 hash-chained row. Alter one and the chain tells you exactly where.' },
  { icon: Plug, title: 'Adapter-ready', text: 'DigiLocker, ABC and UDISE+ sit behind mock adapters with the interface a live API Setu client would use.' },
  { icon: Users, title: 'Role-based access', text: 'Institution, student, verifier and admin each get their own pages, enforced by middleware and by every API route.' },
];

const ROLES = [
  { role: 'institution', icon: Building2, title: 'Institution', text: 'Upload and validate student data, resolve duplicates.' },
  { role: 'student', icon: GraduationCap, title: 'Student', text: 'Flip your ID card, manage consent, see who looked.' },
  { role: 'verifier', icon: Search, title: 'Verifier', text: 'Look up an APAAR ID and see only what was shared.' },
  { role: 'admin', icon: ShieldCheck, title: 'Admin', text: 'Audit chain, usage analytics and anomaly alerts.' },
];

export default function Landing() {
  const router = useRouter();
  const toast = useToast();
  const { refresh } = useAuth();
  const [stats, setStats] = useState(null);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    api('/api/public/stats').then(setStats).catch((e) => toast.error(`Could not load live numbers: ${e.message}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function demoLogin(role) {
    setBusy(role);
    try {
      await api('/api/auth/login', { method: 'POST', body: { email: DEMO_LOGINS[role], password: DEMO_PASSWORD } });
      await refresh();
      router.push(ROLE_HOME[role]);
    } catch (e) {
      toast.error(e.message);
      setBusy(null);
    }
  }

  return (
    <>
      {/* Hero */}
      <section className="container-x grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-5 inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-xs font-semibold text-muted">
            <Fingerprint className="h-3.5 w-3.5 text-accent" aria-hidden="true" /> SIH26263 prototype
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }} className="h-display text-5xl sm:text-6xl lg:text-7xl">
            One Student. One ID. <span className="text-accent">Instant Verification.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.6 }} className="mt-6 max-w-xl text-lg text-muted">
            Clean student data from institutions, consent controlled by students, and verification that discloses only what was agreed - with an audit trail nobody can quietly rewrite.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.6 }} className="mt-8 flex flex-wrap gap-3">
            <a href="#roles" className="btn btn-accent px-6 py-3 text-base">
              Try the live demo <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a href="#how" className="btn btn-ghost px-6 py-3 text-base">
              How it works
            </a>
          </motion.div>
        </div>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7 }}>
          <IdCard student={SAMPLE} />
        </motion.div>
      </section>

      {/* Counters */}
      <section className="container-x" aria-label="Live demo numbers">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={GraduationCap} label="Students" value={stats?.students} loading={!stats} tone="brand" hint="verifiable records" />
          <StatCard icon={Building2} label="Institutions" value={stats?.institutions} loading={!stats} tone="navy" />
          <StatCard icon={Search} label="Lookups logged" value={stats?.verifications} loading={!stats} tone="accent" />
          <StatCard icon={Link2} label="Audit entries" value={stats?.auditEntries} loading={!stats} tone="ok" hint="hash-chained" />
        </div>
      </section>

      {/* 3-step flow */}
      <section id="how" className="container-x scroll-mt-24 pt-24">
        <Reveal>
          <h2 className="h-display text-3xl sm:text-5xl">Three steps. No guesswork.</h2>
        </Reveal>
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.08} as="li">
              <div className="card card-hover h-full">
                <div className="flex items-center justify-between">
                  <span className="text-5xl font-extrabold text-accent/90" aria-hidden="true">0{i + 1}</span>
                  <s.icon className="h-7 w-7 text-brand" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-heading">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* Features */}
      <section className="container-x pt-24">
        <Reveal>
          <h2 className="h-display text-3xl sm:text-5xl">Built to be trusted.</h2>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.07}>
              <div className="card card-hover h-full">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-navy text-white">
                  <f.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-bold text-heading">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Role picker */}
      <section id="roles" className="container-x scroll-mt-24 pt-24">
        <Reveal>
          <h2 className="h-display text-3xl sm:text-5xl">Pick a role. Step inside.</h2>
          <p className="mt-3 max-w-2xl text-muted">One click signs you in with a demo account. Everything you see is fictional.</p>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((r, i) => (
            <Reveal key={r.role} delay={i * 0.06}>
              <div className="card card-hover flex h-full flex-col">
                <span className="grid h-12 w-12 place-items-center rounded-xl border-2 border-navy text-heading dark:border-line">
                  <r.icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-lg font-bold text-heading">{r.title}</h3>
                <p className="mt-1 flex-1 text-sm text-muted">{r.text}</p>
                <button type="button" onClick={() => demoLogin(r.role)} disabled={busy !== null} className="btn btn-primary mt-5 w-full">
                  {busy === r.role ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  Enter as {r.title}
                </button>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-5 text-sm text-muted">
          Prefer to type it? <a href="/login" className="font-semibold text-brand underline underline-offset-4">Go to the sign-in page</a> - demo password is <code className="rounded bg-soft px-1.5 py-0.5 font-mono text-xs">{DEMO_PASSWORD}</code>.
        </p>
      </section>
    </>
  );
}

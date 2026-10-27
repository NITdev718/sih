'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, LogIn } from 'lucide-react';
import { api } from '@/lib/client';
import { useAuth, useToast } from '@/components/Providers';
import { DEMO_LOGINS, DEMO_PASSWORD, PAGE_ROLES, ROLE_LABEL } from '@/lib/constants';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { home, user } = await api('/api/auth/login', { method: 'POST', body: { email, password } });
      await refresh();
      const next = params.get('next');
      const prefix = Object.keys(PAGE_ROLES).find((p) => next && (next === p || next.startsWith(`${p}/`)));
      router.push(prefix && PAGE_ROLES[prefix].includes(user.role) ? next : home);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="container-x grid gap-10 py-16 sm:py-24 lg:grid-cols-2">
      <div>
        <h1 className="h-display text-4xl sm:text-5xl">Sign in</h1>
        <p className="mt-3 text-muted">Use a demo account. All data is fictional.</p>
        {params.get('reason') === 'forbidden' && (
          <p className="mt-5 rounded-xl border border-accent bg-accent/10 p-3 text-sm" role="alert">
            Your current role cannot open that page. Sign in with a different account.
          </p>
        )}
        {!params.get('reason') && params.get('next') && <p className="mt-5 rounded-xl border border-line bg-soft p-3 text-sm">Please sign in to continue.</p>}
        <form onSubmit={submit} className="card mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input id="email" type="email" autoComplete="username" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="verifier@apaar.test" />
          </div>
          <div>
            <label htmlFor="password" className="label">Password</label>
            <input id="password" type="password" autoComplete="current-password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && (
            <p className="text-sm font-medium text-danger" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary w-full" disabled={busy || !email || !password}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LogIn className="h-4 w-4" aria-hidden="true" />} Sign in
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-lg font-bold text-heading">Demo accounts</h2>
        <p className="mt-1 text-sm text-muted">
          Password for all: <code className="rounded bg-soft px-1.5 py-0.5 font-mono text-xs">{DEMO_PASSWORD}</code>. Click one to fill the form.
        </p>
        <ul className="mt-4 space-y-3">
          {Object.entries(DEMO_LOGINS).map(([role, mail]) => (
            <li key={role}>
              <button
                type="button"
                onClick={() => {
                  setEmail(mail);
                  setPassword(DEMO_PASSWORD);
                  setError('');
                }}
                className="card card-hover flex w-full items-center justify-between gap-3 text-left"
              >
                <span>
                  <span className="block font-bold text-heading">{ROLE_LABEL[role]}</span>
                  <span className="block font-mono text-xs text-muted">{mail}</span>
                </span>
                <span className="badge badge-info">Use</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="container-x py-24 text-muted">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}

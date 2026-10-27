'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Fingerprint, LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import { useAuth } from './Providers';
import { ROLE_HOME, ROLE_LABEL } from '@/lib/constants';

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains('dark')), []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {
      /* storage unavailable */
    }
  };
  return (
    <button type="button" onClick={toggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} className="grid h-10 w-10 place-items-center rounded-xl border border-line text-ink transition hover:bg-soft">
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const links = [{ href: '/', label: 'Home' }];
  if (user) {
    if (user.role === 'admin') links.push({ href: '/admin', label: 'Admin' }, { href: '/institution', label: 'Institution' });
    else links.push({ href: ROLE_HOME[user.role], label: ROLE_LABEL[user.role] });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper">
      <nav className="container-x flex h-16 items-center justify-between gap-3" aria-label="Main">
        <Link href="/" className="flex items-center gap-2.5 font-extrabold tracking-tight text-heading">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-navy text-white">
            <Fingerprint className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-lg">
            APAAR<span className="text-accent">-Verify</span>
          </span>
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} aria-current={pathname === l.href ? 'page' : undefined} className={`rounded-lg px-3 py-2 text-sm font-semibold transition hover:bg-soft ${pathname === l.href ? 'text-brand' : 'text-ink'}`}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <>
              <span className="hidden max-w-[14rem] truncate text-sm text-muted lg:block" title={user.email}>
                {user.display_name || user.email}
              </span>
              <button type="button" onClick={logout} className="btn btn-ghost hidden sm:inline-flex">
                <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
              </button>
            </>
          ) : (
            <Link href="/login" className="btn btn-primary hidden sm:inline-flex">
              Sign in
            </Link>
          )}
          <button type="button" className="grid h-10 w-10 place-items-center rounded-xl border border-line md:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen((o) => !o)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div id="mobile-menu" className="border-t border-line bg-paper md:hidden">
          <ul className="container-x space-y-1 py-3">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="block rounded-lg px-3 py-2.5 font-semibold hover:bg-soft">
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              {user ? (
                <button type="button" onClick={logout} className="block w-full rounded-lg px-3 py-2.5 text-left font-semibold hover:bg-soft">
                  Sign out ({user.display_name || user.email})
                </button>
              ) : (
                <Link href="/login" className="block rounded-lg px-3 py-2.5 font-semibold text-brand hover:bg-soft">
                  Sign in
                </Link>
              )}
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}

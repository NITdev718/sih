'use client';
// Small shared UI pieces: scroll reveal, animated counter, skeletons, empty state, badges, modal, stat card.
import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

export function Reveal({ children, delay = 0, y = 24, className = '', as = 'div' }) {
  const reduce = useReducedMotion();
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </Tag>
  );
}

export function Counter({ value, suffix = '', duration = 1.2 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (reduce) return setN(value);
    let raf;
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / (duration * 1000));
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration, reduce]);
  return (
    <span ref={ref}>
      {n.toLocaleString('en-IN')}
      {suffix}
    </span>
  );
}

export function StatCard({ icon: Icon, label, value, loading, tone = 'brand', hint }) {
  const toneCls = { brand: 'text-brand', accent: 'text-accent', ok: 'text-ok', danger: 'text-danger', navy: 'text-heading' }[tone];
  return (
    <div className="card card-hover">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        {Icon && <Icon className={`h-5 w-5 ${toneCls}`} aria-hidden="true" />}
      </div>
      {loading ? (
        <div className="skeleton mt-3 h-9 w-20" />
      ) : (
        <p className="mt-2 text-4xl font-extrabold tracking-tight text-heading">
          <Counter value={value ?? 0} />
        </p>
      )}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function SkeletonRows({ rows = 5 }) {
  return (
    <div className="space-y-3 p-4" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {Icon && (
        <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-line bg-soft text-muted">
          <Icon className="h-7 w-7" aria-hidden="true" />
        </span>
      )}
      <h3 className="text-base font-bold text-heading">{title}</h3>
      {children && <p className="mt-1 max-w-sm text-sm text-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="card border-danger/40 text-sm" role="alert">
      <p className="font-semibold text-danger">Something went wrong</p>
      <p className="mt-1 text-muted">{error?.message || 'Unable to load data.'}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-ghost btn-sm mt-3">
          Try again
        </button>
      )}
    </div>
  );
}

const RESULT = {
  verified: ['badge-ok', 'Verified'],
  consent_required: ['badge-warn', 'Consent required'],
  not_found: ['badge-mute', 'Not found'],
  invalid: ['badge-mute', 'Invalid ID'],
  tampered: ['badge-bad', 'Tampered'],
  pending: ['badge-warn', 'Pending'],
  approved: ['badge-ok', 'Approved'],
  denied: ['badge-bad', 'Denied'],
  revoked: ['badge-bad', 'Revoked'],
  expired: ['badge-mute', 'Expired'],
  active: ['badge-ok', 'Active'],
  inactive: ['badge-mute', 'Inactive'],
};
export function StatusBadge({ status }) {
  const [cls, label] = RESULT[status] || ['badge-mute', status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function Modal({ open, onClose, title, children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    setTimeout(() => ref.current?.querySelector('input, select, button')?.focus(), 30);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-navy/70 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-card p-5 sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-heading">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-lg p-1.5 text-muted hover:bg-soft hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

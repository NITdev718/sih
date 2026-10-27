'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCw } from 'lucide-react';
import { formatApaarId } from '@/lib/validation';
import { GENDER_LABEL } from '@/lib/client';

// Decorative pseudo-QR: deterministic from the ID. It is NOT a scannable code - labelled as demo.
export function QrDemo({ value, size = 132 }) {
  const N = 25;
  let h = 2166136261;
  for (const ch of String(value)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const next = () => {
    h ^= h << 13;
    h >>>= 0;
    h ^= h >>> 17;
    h ^= h << 5;
    h >>>= 0;
    return h;
  };
  const finder = (x, y) => {
    for (const [ox, oy] of [[0, 0], [N - 7, 0], [0, N - 7]]) {
      const dx = x - ox;
      const dy = y - oy;
      if (dx >= 0 && dx < 7 && dy >= 0 && dy < 7) {
        const edge = dx === 0 || dx === 6 || dy === 0 || dy === 6;
        const core = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
        return edge || core ? 1 : 0;
      }
      if (dx >= -1 && dx <= 7 && dy >= -1 && dy <= 7) return 0;
    }
    return null;
  };
  const cells = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const f = finder(x, y);
    const on = f === null ? next() % 2 === 0 : f === 1;
    if (on) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
  }
  return (
    <svg width={size} height={size} viewBox={`-1 -1 ${N + 2} ${N + 2}`} shapeRendering="crispEdges" role="img" aria-label="Demo QR code (decorative, not scannable)" className="rounded-lg bg-white p-1">
      <rect x="-1" y="-1" width={N + 2} height={N + 2} fill="#fff" />
      <g fill="#1B2A5C">{cells}</g>
    </svg>
  );
}

const face = { backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' };

export default function IdCard({ student }) {
  const [flipped, setFlipped] = useState(false);
  const initials = student.name.split(' ').map((p) => p[0]).slice(0, 2).join('');
  const toggle = () => setFlipped((f) => !f);

  return (
    <div className="mx-auto w-full max-w-md" style={{ perspective: 1400 }}>
      <div
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        aria-label={`APAAR ID card for ${student.name}. Press to flip.`}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        }}
        className="relative aspect-[1.586/1] w-full cursor-pointer select-none rounded-2xl"
      >
        <motion.div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }} animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.65, ease: [0.2, 0.8, 0.2, 1] }}>
          {/* Front */}
          <div style={face} className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-2xl border-2 border-navy bg-navy p-5 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">APAAR</p>
                <p className="text-xs text-white/70">Academic identity - demo</p>
              </div>
              <span className="rounded bg-accent px-2 py-0.5 text-[10px] font-bold uppercase">Fictional</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-white text-2xl font-extrabold text-navy">{initials}</span>
              <div className="min-w-0">
                <p className="truncate text-xl font-extrabold leading-tight sm:text-2xl">{student.name}</p>
                <p className="truncate text-xs text-white/75">{student.institution}</p>
                <p className="truncate text-xs text-white/75">
                  {student.course} - Year {student.year}
                </p>
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/60">APAAR ID</p>
              <p className="font-mono text-lg font-bold tracking-[0.18em] sm:text-xl">{formatApaarId(student.apaar_id)}</p>
            </div>
          </div>
          {/* Back */}
          <div style={{ ...face, transform: 'rotateY(180deg)' }} className="absolute inset-0 flex items-center gap-4 overflow-hidden rounded-2xl border-2 border-navy bg-card p-5">
            <div className="shrink-0 text-center">
              <QrDemo value={student.apaar_id} size={128} />
              <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">Demo QR - not scannable</p>
            </div>
            <dl className="min-w-0 space-y-2 text-sm">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">Date of birth</dt>
                <dd className="font-bold text-heading">{student.dob}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">Gender</dt>
                <dd className="font-bold text-heading">{GENDER_LABEL[student.gender] || student.gender}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">Status</dt>
                <dd className="font-bold capitalize text-heading">{student.status}</dd>
              </div>
            </dl>
          </div>
        </motion.div>
      </div>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted">
        <RotateCw className="h-3.5 w-3.5" aria-hidden="true" /> Click or press Enter to flip
      </p>
    </div>
  );
}

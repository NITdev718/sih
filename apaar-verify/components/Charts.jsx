'use client';
import { motion } from 'framer-motion';

/** Horizontal bars in plain CSS. */
export function BarList({ data, color = '#0070C0', empty = 'No data yet' }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (!data.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="space-y-3.5">
      {data.map((d, i) => (
        <li key={d.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium">{d.label}</span>
            <span className="font-bold text-heading">{d.value}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full border border-line bg-soft">
            <motion.div
              className="h-full rounded-full"
              style={{ background: color }}
              initial={{ width: 0 }}
              whileInView={{ width: `${(d.value / max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.06, ease: [0.2, 0.8, 0.2, 1] }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Stacked columns in SVG. data: [{ day, ...seriesKeys }], series: [{ key, label, color }] */
export function StackedColumns({ data, series, height = 220 }) {
  const W = 640;
  const pad = { l: 34, r: 8, t: 10, b: 28 };
  const iw = W - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const max = Math.max(4, ...data.map((d) => series.reduce((n, s) => n + (d[s.key] || 0), 0)));
  const nice = Math.ceil(max / 4) * 4;
  const slot = iw / Math.max(1, data.length);
  const bw = Math.min(34, slot * 0.64);
  const ticks = [0, nice / 4, nice / 2, (nice * 3) / 4, nice];
  const y = (v) => pad.t + ih - (v / nice) * ih;

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-label="Daily lookups over the last 14 days, stacked by result" shapeRendering="crispEdges">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="rgb(var(--line))" strokeWidth="1" />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="rgb(var(--muted))">
              {Math.round(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = pad.l + i * slot + (slot - bw) / 2;
          let acc = 0;
          const total = series.reduce((n, s) => n + (d[s.key] || 0), 0);
          return (
            <g key={d.day}>
              <title>{`${d.day}: ${total} lookups\n${series.map((s) => `${s.label}: ${d[s.key] || 0}`).join('\n')}`}</title>
              {series.map((s) => {
                const v = d[s.key] || 0;
                if (!v) return null;
                const h = (v / nice) * ih;
                const yy = y(acc + v);
                acc += v;
                return (
                  <motion.rect key={s.key} x={x} width={bw} fill={s.color} initial={{ height: 0, y: pad.t + ih }} whileInView={{ height: h, y: yy }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.03 }} />
                );
              })}
              {(i % 2 === 0 || data.length < 8) && (
                <text x={x + bw / 2} y={height - 8} textAnchor="middle" fontSize="10.5" fill="rgb(var(--muted))">
                  {d.day.slice(5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: s.color }} /> {s.label}
          </span>
        ))}
      </figcaption>
      <table className="sr-only">
        <caption>Lookups per day by result</caption>
        <thead>
          <tr>
            <th>Day</th>
            {series.map((s) => (
              <th key={s.key}>{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.day}>
              <td>{d.day}</td>
              {series.map((s) => (
                <td key={s.key}>{d[s.key] || 0}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

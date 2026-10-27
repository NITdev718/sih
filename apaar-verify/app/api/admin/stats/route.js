import { getDb } from '@/lib/db';
import { handle, json, requireRole } from '@/lib/api';
import { checkChain } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const RESULTS = ['verified', 'consent_required', 'not_found', 'invalid', 'tampered'];

export const GET = handle(async () => {
  await requireRole(['admin']);
  const db = getDb();
  const one = (sql, ...a) => db.prepare(sql).get(...a).c;
  const now = Date.now();
  const iso = (t) => new Date(t).toISOString();

  // Usage: last 14 days, stacked by result
  const since = iso(now - 14 * 86_400_000);
  const rows = db.prepare('SELECT substr(ts, 1, 10) AS day, result, COUNT(*) AS n FROM access_log WHERE ts >= ? GROUP BY day, result').all(since);
  const days = [];
  for (let i = 13; i >= 0; i--) days.push(iso(now - i * 86_400_000).slice(0, 10));
  const usage = days.map((day) => {
    const seg = {};
    for (const r of RESULTS) seg[r] = 0;
    for (const row of rows) if (row.day === day && row.result in seg) seg[row.result] = row.n;
    return { day, ...seg, total: Object.values(seg).reduce((a, b) => a + b, 0) };
  });

  // Anomaly rules (simple, explainable)
  const anomalies = [];
  const chain = checkChain(db);
  if (!chain.ok) {
    anomalies.push({ severity: 'critical', title: 'Audit chain integrity failure', detail: `Record #${chain.brokenAt} no longer matches its hash. ${chain.reason}` });
  }
  const hour = db
    .prepare("SELECT a.verifier_id, COALESCE(u.display_name, u.email) AS name, COUNT(*) AS n, SUM(a.result = 'not_found') AS nf FROM access_log a JOIN users u ON u.id = a.verifier_id WHERE a.ts >= ? GROUP BY a.verifier_id")
    .all(iso(now - 3_600_000));
  for (const h of hour) {
    if (h.nf >= 10) anomalies.push({ severity: 'high', title: 'Possible ID enumeration', detail: `${h.name} made ${h.nf} lookups for non-existent IDs in the last hour.` });
    else if (h.n >= 25) anomalies.push({ severity: 'medium', title: 'High-volume lookups', detail: `${h.name} made ${h.n} lookups in the last hour.` });
  }
  const repeat = db
    .prepare("SELECT COALESCE(u.display_name, u.email) AS name, a.apaar_id, COUNT(*) AS n FROM access_log a JOIN users u ON u.id = a.verifier_id WHERE a.result = 'consent_required' AND a.ts >= ? GROUP BY a.verifier_id, a.apaar_id HAVING n >= 3")
    .all(iso(now - 86_400_000));
  for (const r of repeat) anomalies.push({ severity: 'medium', title: 'Repeated attempts without consent', detail: `${r.name} tried ${r.n} times in 24h on ID ending ${r.apaar_id.slice(-4)} without consent.` });
  const bad = one("SELECT COUNT(*) c FROM students WHERE status = 'invalid'");
  if (bad) anomalies.push({ severity: 'low', title: 'Records with invalid APAAR IDs', detail: `${bad} record(s) fail the checksum and are awaiting correction by their institution.` });
  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  anomalies.sort((a, b) => order[a.severity] - order[b.severity]);

  const byResult = Object.fromEntries(db.prepare('SELECT result, COUNT(*) AS n FROM access_log GROUP BY result').all().map((r) => [r.result, r.n]));
  const consents = Object.fromEntries(db.prepare('SELECT status, COUNT(*) AS n FROM consents GROUP BY status').all().map((r) => [r.status, r.n]));

  return json({
    totals: {
      students: one("SELECT COUNT(*) c FROM students WHERE status IN ('active','inactive')"),
      institutions: one('SELECT COUNT(*) c FROM institutions'),
      verifiers: one("SELECT COUNT(*) c FROM users WHERE role = 'verifier'"),
      lookups: one('SELECT COUNT(*) c FROM access_log'),
      auditEntries: one('SELECT COUNT(*) c FROM audit_log'),
    },
    byResult,
    consents,
    usage,
    anomalies,
    chain: { ok: chain.ok, brokenAt: chain.brokenAt },
  });
});

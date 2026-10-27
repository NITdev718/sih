'use client';
import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Loader2, Pencil, Search, Users } from 'lucide-react';
import { api } from '@/lib/client';
import { formatApaarId } from '@/lib/validation';
import { useToast } from './Providers';
import { EmptyState, ErrorState, Modal, SkeletonRows, StatusBadge } from './ui';

const COLS = [
  ['name', 'Name'],
  ['apaar_id', 'APAAR ID'],
  ['course', 'Course'],
  ['year', 'Year'],
  ['status', 'Status'],
];

function Field({ k, label, error, children }) {
  return (
    <div>
      <label htmlFor={`f-${k}`} className="label">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs font-medium text-danger" role="alert">{error}</p>}
    </div>
  );
}

function EditForm({ student, onSaved, onClose }) {
  const toast = useToast();
  const [f, setF] = useState({ name: student.name, dob: student.dob, gender: student.gender, course: student.course, year: student.year, status: student.status === 'invalid' ? 'active' : student.status, apaar_id: student.apaar_id });
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState({});
  const invalid = student.status === 'invalid';
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setErrs({});
    const body = { name: f.name, dob: f.dob, gender: f.gender, course: f.course, year: Number(f.year) };
    if (invalid) {
      if (f.apaar_id !== student.apaar_id) body.apaar_id = f.apaar_id;
    } else body.status = f.status;
    try {
      await api(`/api/students/${student.apaar_id}`, { method: 'PATCH', body });
      toast.success('Student updated.');
      onSaved();
    } catch (err) {
      setErrs(err.data?.fields || {});
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save} className="space-y-3" noValidate>
      {invalid && (
        <Field k="apaar_id" error={errs.apaar_id} label="Corrected APAAR ID (12 digits, valid checksum)">
          <input id="f-apaar_id" className="input font-mono" value={f.apaar_id} onChange={set('apaar_id')} inputMode="numeric" maxLength={14} />
        </Field>
      )}
      <Field k="name" error={errs.name} label="Full name"><input id="f-name" className="input" value={f.name} onChange={set('name')} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field k="dob" error={errs.dob} label="Date of birth"><input id="f-dob" type="date" className="input" value={f.dob} onChange={set('dob')} /></Field>
        <Field k="gender" error={errs.gender} label="Gender">
          <select id="f-gender" className="input" value={f.gender} onChange={set('gender')}>
            <option value="M">Male</option><option value="F">Female</option><option value="O">Other</option>
          </select>
        </Field>
      </div>
      <Field k="course" error={errs.course} label="Course"><input id="f-course" className="input" value={f.course} onChange={set('course')} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field k="year" error={errs.year} label="Year"><input id="f-year" type="number" min="1" max="6" className="input" value={f.year} onChange={set('year')} /></Field>
        {!invalid && (
          <Field k="status" error={errs.status} label="Status">
            <select id="f-status" className="input" value={f.status} onChange={set('status')}>
              <option value="active">Active</option><option value="inactive">Inactive</option>
            </select>
          </Field>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Save changes
        </button>
      </div>
    </form>
  );
}

export default function StudentTable({ refreshKey, canEdit, onChanged }) {
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const [sort, setSort] = useState('name');
  const [dir, setDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDq(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await api(`/api/students?q=${encodeURIComponent(dq)}&sort=${sort}&dir=${dir}&page=${page}&pageSize=10`);
      setState({ data, error: null, loading: false });
    } catch (error) {
      setState({ data: null, error, loading: false });
    }
  }, [dq, sort, dir, page]);
  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const toggleSort = (k) => {
    if (sort === k) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSort(k);
      setDir('asc');
    }
    setPage(1);
  };
  const { data, error, loading } = state;

  return (
    <section className="card !p-0" aria-labelledby="tbl-h">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
        <h2 id="tbl-h" className="text-xl font-bold text-heading">Student records {data && <span className="text-base font-medium text-muted">({data.total})</span>}</h2>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input type="search" aria-label="Search students" placeholder="Search name, ID or course" className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      {error ? (
        <div className="p-5 pt-0"><ErrorState error={error} onRetry={load} /></div>
      ) : loading && !data ? (
        <SkeletonRows rows={6} />
      ) : !data.rows.length ? (
        <EmptyState icon={Users} title="No students found">{dq ? `Nothing matches "${dq}".` : 'Upload a CSV to add students.'}</EmptyState>
      ) : (
        <div className={`overflow-x-auto border-t border-line transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <table className="w-full min-w-[720px]">
            <thead className="bg-soft">
              <tr>
                {COLS.map(([k, label]) => (
                  <th key={k} scope="col" className="th" aria-sort={sort === k ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    <button type="button" onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-ink">
                      {label}
                      {sort === k ? (dir === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />) : null}
                    </button>
                  </th>
                ))}
                {canEdit && <th className="th"><span className="sr-only">Actions</span></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.rows.map((r) => (
                <tr key={r.apaar_id} className="hover:bg-soft/60">
                  <td className="td font-semibold text-heading">{r.name}</td>
                  <td className="td font-mono text-xs">{formatApaarId(r.apaar_id)}</td>
                  <td className="td">{r.course}</td>
                  <td className="td">{r.year}</td>
                  <td className="td">{r.status === 'invalid' ? <span className="badge badge-bad">Invalid ID</span> : <StatusBadge status={r.status} />}</td>
                  {canEdit && (
                    <td className="td text-right">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(r)} aria-label={`Edit ${r.name}`}>
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between border-t border-line p-4 text-sm">
          <span className="text-muted">Page {data.page} of {data.pages}</span>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /> Prev</button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.status === 'invalid' ? 'Fix invalid record' : 'Edit student'}>
        {editing && (
          <EditForm
            student={editing}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              load();
              onChanged?.();
            }}
          />
        )}
      </Modal>
    </section>
  );
}

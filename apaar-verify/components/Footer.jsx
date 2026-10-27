import { Fingerprint } from 'lucide-react';

export function DemoBanner() {
  return (
    <div className="bg-navy px-4 py-1.5 text-center text-xs font-medium text-white" role="note">
      <span className="mr-1.5 rounded bg-accent px-1.5 py-0.5 font-bold uppercase tracking-wide">Demo data - fictional</span>
      Prototype for SIH26263. No real student records are used anywhere in this app.
    </div>
  );
}

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-soft">
      <div className="container-x flex flex-col gap-3 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 font-semibold text-heading">
          <Fingerprint className="h-4 w-4 text-accent" aria-hidden="true" /> APAAR-Verify
          <span className="font-normal text-muted">- prototype, not affiliated with any government body</span>
        </p>
        <p>SIH26263 - APAAR ID-Based Student Data Management and Verification Platform</p>
      </div>
    </footer>
  );
}

// MOCK adapter for DigiLocker (via API Setu). Method names and response shapes follow what a live adapter
// would expose, so replacing this file with a real HTTP client does not change the callers.
import { sha256 } from '../hash.js';

const DOC_TYPES = [
  { doctype: 'MRKSH', label: 'Semester Marksheet' },
  { doctype: 'ENRLC', label: 'Enrolment Certificate' },
  { doctype: 'BONFD', label: 'Bonafide Certificate' },
];

export const digilockerAdapter = {
  name: 'DigiLocker (mock)',

  /** Real API: GET /issued-documents for a DigiLocker account linked to the APAAR ID. */
  async listIssuedDocuments({ apaarId }) {
    const h = sha256(`digilocker:${apaarId}`);
    return DOC_TYPES.map((d, i) => ({
      uri: `in.demo.edu-${d.doctype.toLowerCase()}-${h.slice(i * 6, i * 6 + 8)}`,
      doctype: d.doctype,
      label: d.label,
      issuer: 'Fictional University Board (demo)',
      issued_on: `2026-0${(parseInt(h[i], 16) % 6) + 1}-1${(parseInt(h[i + 3], 16) % 9) + 1}`,
    }));
  },

  /** Real API: verify a document URI against the issuer's signature. */
  async verifyDocument({ uri }) {
    return { uri, valid: true, checked_at: new Date().toISOString(), note: 'mock response' };
  },
};

// MOCK adapter for the Academic Bank of Credits (ABC). Swap for an API Setu client in production.
import { sha256 } from '../hash.js';

export const abcAdapter = {
  name: 'Academic Bank of Credits (mock)',

  async getAccount({ apaarId }) {
    return { apaar_id: apaarId, abc_account: `ABC-${sha256(apaarId).slice(0, 10).toUpperCase()}`, status: 'ACTIVE' };
  },

  async getCreditSummary({ apaarId }) {
    const h = sha256(`abc:${apaarId}`);
    const semesters = Array.from({ length: 4 }, (_, i) => ({ semester: i + 1, credits: 16 + (parseInt(h[i], 16) % 7) }));
    return {
      apaar_id: apaarId,
      earned: semesters.reduce((n, s) => n + s.credits, 0),
      required: 160,
      semesters,
    };
  },
};

// MOCK adapter for UDISE+ (institution registry). Backed by the fictional seed institutions.
import { INSTITUTIONS } from '../seed-data.js';

export const udiseAdapter = {
  name: 'UDISE+ (mock)',

  async getInstitutionProfile({ udiseCode }) {
    const i = INSTITUTIONS.find((x) => x.udise === String(udiseCode));
    if (!i) return null;
    return { udise_code: i.udise, name: i.name, city: i.city, state: i.state, recognised: true };
  },

  async validateInstitution({ udiseCode }) {
    return { udise_code: String(udiseCode), valid: INSTITUTIONS.some((x) => x.udise === String(udiseCode)) };
  },
};

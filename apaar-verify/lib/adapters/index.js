// Adapter registry. ADAPTER_MODE=mock (default). To go live, implement the same methods in
// lib/adapters/live/*.js (HTTP clients for API Setu) and return them here when ADAPTER_MODE=live.
import { digilockerAdapter } from './digilocker.js';
import { abcAdapter } from './abc.js';
import { udiseAdapter } from './udise.js';

export function getAdapters() {
  if ((process.env.ADAPTER_MODE || 'mock') !== 'mock') {
    throw new Error('Live adapters are not implemented in this prototype. See README "Swapping the mock adapters".');
  }
  return { digilocker: digilockerAdapter, abc: abcAdapter, udise: udiseAdapter };
}

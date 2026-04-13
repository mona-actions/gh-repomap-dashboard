/**
 * Data processing Web Worker.
 *
 * Offloads JSON parsing, Zod validation, and Graphology graph construction
 * to a background thread so the main thread stays responsive.
 *
 * This is a thin Comlink wrapper — all logic lives in `../utils/dataProcessor.ts`
 * for testability.
 */
import { expose } from 'comlink';
import { processFile, mergeAndProcess } from '../utils/dataProcessor';

const api = {
  async processFile(jsonText: string) {
    return processFile(jsonText);
  },

  async mergeAndProcess(jsonTexts: string[]) {
    return mergeAndProcess(jsonTexts);
  },
};

expose(api);

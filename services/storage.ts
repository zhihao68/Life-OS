import type { LifeOSState } from '../types';
export interface LocalDatabase { load(): Promise<LifeOSState | null>; save(state: LifeOSState): Promise<void>; exportJSON(state: LifeOSState): Promise<string>; }
export const localDatabase: LocalDatabase = { async load() { return null; }, async save() {}, async exportJSON(state) { return JSON.stringify(state, null, 2); } };

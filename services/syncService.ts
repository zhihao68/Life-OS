import type { LifeOSState } from '../types';
export type SyncResult = { status: 'offline' | 'synced' | 'conflict'; changedAt?: string };
export interface SyncService { sync(state: LifeOSState): Promise<SyncResult>; resolveConflict(local: LifeOSState, remote: LifeOSState): Promise<LifeOSState>; }
export const syncService: SyncService = { async sync() { return { status: 'offline' }; }, async resolveConflict(local) { return local; } };

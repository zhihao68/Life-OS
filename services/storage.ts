import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LifeOSState } from '../types';

const STORAGE_KEY = 'lifeos-state-v1';

export interface LocalDatabase {
  load(): Promise<LifeOSState | null>;
  save(state: LifeOSState): Promise<void>;
  exportJSON(state: LifeOSState): Promise<string>;
}

function isValidState(value: unknown): value is LifeOSState {
  if (typeof value !== 'object' || value === null) return false;
  const state = value as LifeOSState;
  return Array.isArray(state.tasks)
    && Array.isArray(state.recurringTasks)
    && Array.isArray(state.notes)
    && Array.isArray(state.workouts)
    && Array.isArray(state.timelineEvents)
    && typeof state.workoutPlan === 'object' && state.workoutPlan !== null;
}

export const localDatabase: LocalDatabase = {
  async load() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      return isValidState(parsed) ? parsed : null;
    } catch (error) {
      console.warn('[storage] load failed, falling back to seed:', error);
      return null;
    }
  },
  async save(state) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('[storage] save failed:', error);
    }
  },
  async exportJSON(state) {
    return JSON.stringify(state, null, 2);
  },
};

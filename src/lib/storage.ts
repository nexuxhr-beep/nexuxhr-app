const LOCAL_STORAGE_KEY = 'NEXUXHR_PERSISTED_STATE_V3';
const PHASE_ONE_CLEANUP_KEY = 'NEXUXHR_PHASE1_CLEAN_START_2026_07';

/**
 * Phase 1 starts with a clean testing workspace. This runs once per browser
 * and removes only old locally persisted demo/app collections. The real auth
 * token is deliberately preserved so an existing signed-in session is not
 * destroyed.
 */
function runPhaseOneCleanupOnce(): void {
  if (typeof window === 'undefined') return;
  try {
    if (localStorage.getItem(PHASE_ONE_CLEANUP_KEY) === 'done') return;

    const keysToRemove: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && key.startsWith('NEXUXHR_PERSISTED_STATE_')) keysToRemove.push(key);
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    localStorage.setItem(PHASE_ONE_CLEANUP_KEY, 'done');
  } catch (error) {
    console.warn('Could not complete the Phase 1 local data cleanup.', error);
  }
}

runPhaseOneCleanupOnce();

export function getStoredData<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${key}`);
    if (raw) return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`Error reading ${key} from localStorage`, error);
  }
  return fallback;
}

export function saveStoredData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_${key}`, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('nexuxhr_state_updated', { detail: { key, data } }));
  } catch (error) {
    console.warn(`Error writing ${key} to localStorage`, error);
  }
}

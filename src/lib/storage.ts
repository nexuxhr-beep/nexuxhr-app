const LOCAL_STORAGE_KEY = 'NEXUXHR_PERSISTED_STATE_V3';

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

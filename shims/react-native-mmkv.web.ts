// Web-compatible MMKV replacement using IndexedDB with localStorage cache for sync access
import { useState, useCallback, useEffect } from 'react';

const DB_NAME = 'LNReaderMMKV';
const STORE_NAME = 'data';

let dbInstance: IDBDatabase | null = null;

// In-memory cache for synchronous access
const memoryCache = new Map<string, any>();

// Initialize memory cache from localStorage on module load (synchronous, from previous session)
if (typeof window !== 'undefined' && window.localStorage) {
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith('mmkv_')) {
      const cacheKey = key.substring(5); // Remove 'mmkv_' prefix
      const value = window.localStorage.getItem(key);
      if (value) {
        try {
          memoryCache.set(cacheKey, value);
        } catch (err) {
          console.warn('[MMKV] Failed to restore from localStorage:', err);
        }
      }
    }
  }
}

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });
};

class MMKVWeb {
  private listeners: Map<string, Set<(value: any) => void>> = new Map();

  private async getDB(): Promise<IDBDatabase> {
    return initDB();
  }

  set(key: string, value: string | number | boolean): void {
    const stringValue = String(value);
    
    // Skip storing very large values to prevent memory bloat
    const sizeInBytes = new Blob([stringValue]).size;
    const maxSize = 5 * 1024 * 1024; // 5MB limit per value
    
    if (sizeInBytes > maxSize) {
      console.warn(`[MMKV] Skipping storage of key "${key}" (${(sizeInBytes / 1024 / 1024).toFixed(2)}MB exceeds ${maxSize / 1024 / 1024}MB limit)`);
      return;
    }
    
    // Store in memory cache for synchronous access
    memoryCache.set(key, value);
    this.notifyListeners(key, value);
    
    // Limit memory cache size - if it grows too large, clear it
    // This prevents OOM errors during long-running operations
    if (memoryCache.size > 100) {
      console.warn('[MMKV] Memory cache size exceeded 100 keys, clearing old entries');
      // Keep only the most recent entries
      const entries = Array.from(memoryCache.entries());
      memoryCache.clear();
      entries.slice(-50).forEach(([k, v]) => memoryCache.set(k, v));
    }
    
    // Also store in localStorage for persistence across sessions
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(`mmkv_${key}`, stringValue);
      } catch (err) {
        console.warn('[MMKV] Failed to persist to localStorage:', err);
      }
    }
    
    // Persist to IndexedDB asynchronously
    this.persistToDB(key, stringValue).catch(err => {
      console.warn('[MMKV] Failed to persist to IndexedDB:', err);
    });
  }

  private async persistToDB(key: string, value: string | number | boolean): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ key, value });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  getString(key: string): string | undefined {
    // Try memory cache first
    const cached = memoryCache.get(key);
    if (cached !== undefined) {
      return String(cached);
    }
    // Fallback to localStorage for data from previous sessions
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(`mmkv_${key}`);
      if (stored) {
        memoryCache.set(key, stored);
        return stored;
      }
    }
    return undefined;
  }

  getNumber(key: string): number | undefined {
    const val = this.getString(key);
    return val !== undefined ? Number(val) : undefined;
  }

  getBoolean(key: string): boolean | undefined {
    const val = this.getString(key);
    if (val === undefined) return undefined;
    return val === 'true' || val === true;
  }

  delete(key: string): void {
    memoryCache.delete(key);
    this.notifyListeners(key, undefined);
    
    // Delete from IndexedDB asynchronously
    this.deleteFromDB(key).catch(err => {
      console.warn('[MMKV] Failed to delete from IndexedDB:', err);
    });
  }

  private async deleteFromDB(key: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  contains(key: string): boolean {
    return memoryCache.has(key);
  }

  getAllKeys(): string[] {
    return Array.from(memoryCache.keys());
  }

  async clearAll(): Promise<void> {
    memoryCache.clear();
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        this.listeners.clear();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  subscribe(key: string, callback: (value: any) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(key);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  addOnValueChangedListener(callback: (key: string) => void): { remove: () => void } {
    return {
      remove: () => {
        // Cleanup
      }
    };
  }

  private notifyListeners(key: string, value: any): void {
    const callbacks = this.listeners.get(key);
    if (callbacks) {
      callbacks.forEach(callback => callback(value));
    }
  }
}

export class MMKV extends MMKVWeb {}

// Create a singleton instance to ensure all hooks share the same storage
let defaultMMKV: MMKV | undefined;

function getDefaultMMKV(): MMKV {
  if (!defaultMMKV) {
    defaultMMKV = new MMKV();
  }
  return defaultMMKV;
}

export function useMMKVString(key: string, mmkv?: MMKV): [string | undefined, (value: string | undefined) => void] {
  const storage = mmkv || getDefaultMMKV();
  const [value, setValue] = useState<string | undefined>(() => storage.getString(key));

  useEffect(() => {
    const unsubscribe = storage.subscribe(key, (newValue) => {
      setValue(newValue);
    });
    return unsubscribe;
  }, [key, storage]);

  const updateValue = useCallback((newValue: string | undefined) => {
    if (newValue === undefined) {
      storage.delete(key);
    } else {
      storage.set(key, newValue);
    }
    setValue(newValue);
  }, [key, storage]);

  return [value, updateValue];
}

export function useMMKVNumber(key: string, mmkv?: MMKV): [number | undefined, (value: number | undefined) => void] {
  const storage = mmkv || getDefaultMMKV();
  const [value, setValue] = useState<number | undefined>(() => storage.getNumber(key));

  useEffect(() => {
    const unsubscribe = storage.subscribe(key, (newValue) => {
      setValue(newValue !== undefined ? Number(newValue) : undefined);
    });
    return unsubscribe;
  }, [key, storage]);

  const updateValue = useCallback((newValue: number | undefined) => {
    if (newValue === undefined) {
      storage.delete(key);
    } else {
      storage.set(key, newValue);
    }
    setValue(newValue);
  }, [key, storage]);

  return [value, updateValue];
}

export function useMMKVBoolean(key: string, mmkv?: MMKV): [boolean | undefined, (value: boolean | undefined) => void] {
  const storage = mmkv || getDefaultMMKV();
  const [value, setValue] = useState<boolean | undefined>(() => storage.getBoolean(key));

  useEffect(() => {
    const unsubscribe = storage.subscribe(key, (newValue) => {
      if (newValue === undefined) {
        setValue(undefined);
      } else {
        setValue(newValue === 'true' || newValue === true);
      }
    });
    return unsubscribe;
  }, [key, storage]);

  const updateValue = useCallback((newValue: boolean | undefined) => {
    if (newValue === undefined) {
      storage.delete(key);
    } else {
      storage.set(key, newValue);
    }
    setValue(newValue);
  }, [key, storage]);

  return [value, updateValue];
}

export function useMMKVObject<T>(key: string, mmkv?: MMKV): [T | undefined, (value: T | undefined) => void] {
  const storage = mmkv || getDefaultMMKV();
  const [value, setValue] = useState<T | undefined>(() => {
    const str = storage.getString(key);
    return str ? JSON.parse(str) : undefined;
  });

  useEffect(() => {
    const unsubscribe = storage.subscribe(key, (newValue) => {
      if (newValue === undefined) {
        setValue(undefined);
      } else {
        try {
          setValue(typeof newValue === 'string' ? JSON.parse(newValue) : newValue);
        } catch {
          setValue(undefined);
        }
      }
    });
    return unsubscribe;
  }, [key, storage]);

  const updateValue = useCallback((newValue: T | undefined) => {
    if (newValue === undefined) {
      storage.delete(key);
    } else {
      storage.set(key, JSON.stringify(newValue));
    }
    setValue(newValue);
  }, [key, storage]);

  return [value, updateValue];
}

export function getInstance(): MMKV {
  return getDefaultMMKV();
}

/**
 * Initialize MMKV by loading all data from IndexedDB into memory cache.
 * Call this once on app startup before accessing any MMKV data.
 */
export async function initializeMMKVAsync(): Promise<void> {
  try {
    const db = await initDB();
    const storage = getDefaultMMKV();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      const getAllRequest = objectStore.getAll();

      getAllRequest.onsuccess = () => {
        const results = getAllRequest.result as Array<{ key: string; value: any }>;
        results.forEach(({ key, value }) => {
          memoryCache.set(key, value);
        });
        resolve();
      };

      getAllRequest.onerror = () => {
        console.warn('[MMKV] Failed to initialize from IndexedDB, continuing with empty cache');
        resolve(); // Don't fail app startup even if IndexedDB fails
      };
    });
  } catch (err) {
    console.warn('[MMKV] Failed to initialize:', err);
    // Don't fail app startup even if initialization fails
  }
}

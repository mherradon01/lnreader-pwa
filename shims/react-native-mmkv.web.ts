// Web-compatible MMKV replacement using localStorage
import { useState, useCallback, useEffect } from 'react';

class MMKVWeb {
  private storage: Storage;
  private listeners: Map<string, Set<(value: any) => void>> = new Map();

  constructor() {
    this.storage = typeof window !== 'undefined' ? window.localStorage : ({} as Storage);
  }

  set(key: string, value: string | number | boolean): void {
    this.storage.setItem(key, String(value));
    this.notifyListeners(key, value);
  }

  getString(key: string): string | undefined {
    const value = this.storage.getItem(key);
    return value !== null ? value : undefined;
  }

  getNumber(key: string): number | undefined {
    const value = this.storage.getItem(key);
    return value !== null ? Number(value) : undefined;
  }

  getBoolean(key: string): boolean | undefined {
    const value = this.storage.getItem(key);
    if (value === null) return undefined;
    return value === 'true';
  }

  delete(key: string): void {
    this.storage.removeItem(key);
    this.notifyListeners(key, undefined);
  }

  contains(key: string): boolean {
    return this.storage.getItem(key) !== null;
  }

  getAllKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key) keys.push(key);
    }
    return keys;
  }

  clearAll(): void {
    this.storage.clear();
    this.listeners.clear();
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
        setValue(typeof newValue === 'string' ? JSON.parse(newValue) : newValue);
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

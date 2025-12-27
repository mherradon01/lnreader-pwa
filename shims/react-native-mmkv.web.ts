// Web-compatible MMKV replacement using localStorage
import { useState, useCallback } from 'react';

class MMKVWeb {
  private storage: Storage;

  constructor() {
    this.storage = typeof window !== 'undefined' ? window.localStorage : ({} as Storage);
  }

  set(key: string, value: string | number | boolean): void {
    this.storage.setItem(key, String(value));
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
  }
}

export class MMKV extends MMKVWeb {}

export function useMMKVString(key: string, mmkv?: MMKV): [string | undefined, (value: string | undefined) => void] {
  const storage = mmkv || new MMKV();
  const [value, setValue] = useState<string | undefined>(() => storage.getString(key));

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
  const storage = mmkv || new MMKV();
  const [value, setValue] = useState<number | undefined>(() => storage.getNumber(key));

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
  const storage = mmkv || new MMKV();
  const [value, setValue] = useState<boolean | undefined>(() => storage.getBoolean(key));

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
  const storage = mmkv || new MMKV();
  const [value, setValue] = useState<T | undefined>(() => {
    const str = storage.getString(key);
    return str ? JSON.parse(str) : undefined;
  });

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

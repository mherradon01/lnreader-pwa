import { MMKV, getInstance } from 'react-native-mmkv';

// Use the default singleton instance to ensure proper state synchronization across all storage access
// On native platforms, this is the default MMKV instance
// On web, this is the singleton we created in the shim
let _storage: MMKV | null = null;

function getMMKVInstance(): MMKV {
  if (!_storage) {
    // Try to use getInstance if available (web platform)
    if (typeof getInstance === 'function') {
      _storage = getInstance();
    } else {
      // Fallback for native platforms
      _storage = new MMKV();
    }
  }
  return _storage;
}

export const MMKVStorage = new Proxy({} as MMKV, {
  get: (target, prop) => {
    return getMMKVInstance()[prop as keyof MMKV];
  },
});

export function getMMKVObject<T>(key: string) {
  const data = getMMKVInstance().getString(key);
  if (data) {
    return JSON.parse(data) as T;
  }
  return undefined;
}

export function setMMKVObject<T>(key: string, obj: T) {
  getMMKVInstance().set(key, JSON.stringify(obj));
}

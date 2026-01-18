// Shim for expo-modules-core on web
// Minimal shim for core expo modules functionality

export class EventEmitter {
  listeners = new Map();

  addListener(eventName, listener) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName).push(listener);
    return { remove: () => {} };
  }

  removeAllListeners(eventName) {
    if (eventName) {
      this.listeners.delete(eventName);
    } else {
      this.listeners.clear();
    }
  }

  emit(eventName, ...args) {
    if (this.listeners.has(eventName)) {
      this.listeners.get(eventName).forEach(listener => listener(...args));
    }
  }
}

export class UnavailabilityError extends Error {
  constructor(moduleName, methodName) {
    super(`${moduleName}.${methodName} is not available`);
  }
}

export class CodedError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export const uuid = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r % 4) + 8;
    return v.toString(16);
  });
};

// Platform mock
export const Platform = {
  OS: 'web',
  select: obj => obj.web || obj.default,
};

// Native module mock
export const NativeModule = {};

// Registration function
export const registerWebModule = (_name, _module) => {
  // No-op on web
};

export type EventSubscription = { remove: () => void };

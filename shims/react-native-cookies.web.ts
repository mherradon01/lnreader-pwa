// Web shim for @react-native-cookies/cookies

const CookieManager = {
  clearAll: async () => {
    // Clear all cookies on web by setting them to expire in the past
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      if (name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    }
    return true;
  },

  get: async (url: string) => {
    console.warn('CookieManager.get is not fully supported on web');
    return {};
  },

  set: async (url: string, cookie: { name: string; value: string; [key: string]: any }) => {
    document.cookie = `${cookie.name}=${cookie.value}`;
    return true;
  },

  clearByName: async (url: string, name: string) => {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    return true;
  },

  flush: async () => {
    // No-op on web
    return true;
  },

  removeSessionCookies: async () => {
    // Session cookies are automatically removed when browser closes
    console.warn('removeSessionCookies is a no-op on web');
    return true;
  },

  setFromResponse: async () => {
    console.warn('setFromResponse is not supported on web');
    return true;
  },
};

export default CookieManager;

import { useState, useCallback } from 'react';
import { MMKVStorage } from '@utils/mmkv/mmkv';

const PROXY_URL_KEY = 'APP_PROXY_URL';
const PROXY_ENABLED_KEY = 'APP_PROXY_ENABLED';

export interface ProxySettings {
  proxyUrl: string;
  proxyEnabled: boolean;
}

export const useProxySettings = () => {
  const [proxyUrl, setProxyUrlState] = useState<string>(() => {
    return MMKVStorage.getString(PROXY_URL_KEY) || '';
  });

  const [proxyEnabled, setProxyEnabledState] = useState<boolean>(() => {
    const enabled = MMKVStorage.getString(PROXY_ENABLED_KEY);
    return enabled === 'true';
  });

  const setProxyUrl = useCallback((url: string) => {
    if (url && url.trim() !== '') {
      MMKVStorage.set(PROXY_URL_KEY, url.trim());
    } else {
      MMKVStorage.delete(PROXY_URL_KEY);
    }
    setProxyUrlState(url);
  }, []);

  const setProxyEnabled = useCallback((enabled: boolean) => {
    MMKVStorage.set(PROXY_ENABLED_KEY, enabled ? 'true' : 'false');
    setProxyEnabledState(enabled);
  }, []);

  return {
    proxyUrl,
    proxyEnabled,
    setProxyUrl,
    setProxyEnabled,
  };
};

// Non-hook functions for use outside of React components
export const getProxySettings = (): ProxySettings => {
  const proxyUrl = MMKVStorage.getString(PROXY_URL_KEY) || '';
  const proxyEnabled = MMKVStorage.getString(PROXY_ENABLED_KEY) === 'true';
  return { proxyUrl, proxyEnabled };
};

export const getEffectiveProxyUrl = (): string | null => {
  const { proxyUrl, proxyEnabled } = getProxySettings();
  if (proxyEnabled && proxyUrl && proxyUrl.trim() !== '') {
    return proxyUrl.trim();
  }
  return null;
};

import { reverse, uniqBy } from 'lodash-es';
import { newer } from '@utils/compareVersion';
import { proxyFetch } from '@utils/proxyFetch';

// packages for plugins
import {
  store,
  Storage,
  LocalStorage,
  SessionStorage,
} from './helpers/storage';
import { load } from 'cheerio';
import dayjs from 'dayjs';
import { NovelStatus, Plugin, PluginItem } from './types';
import { FilterTypes } from './types/filterTypes';
import { isUrlAbsolute } from './helpers/isAbsoluteUrl';
import { downloadFile, fetchApi, fetchProto, fetchText } from './helpers/fetch';
import { defaultCover } from './helpers/constants';
import { encode, decode } from 'urlencode';
import { Parser } from 'htmlparser2';
import { getRepositoriesFromDb } from '@database/queries/RepositoryQueries';
import { showToast } from '@utils/showToast';
import { PLUGIN_STORAGE } from '@utils/Storages';
import NativeFile from '@specs/NativeFile';
import { getUserAgent } from '@hooks/persisted/useUserAgent';

const packages: Record<string, any> = {
  'htmlparser2': { Parser },
  'cheerio': { load },
  'dayjs': dayjs,
  'urlencode': { encode, decode },
  '@libs/novelStatus': { NovelStatus },
  '@libs/fetch': { fetchApi, fetchText, fetchProto },
  '@libs/isAbsoluteUrl': { isUrlAbsolute },
  '@libs/filterInputs': { FilterTypes },
  '@libs/defaultCover': { defaultCover },
};

const initPlugin = (pluginId: string, rawCode: string) => {
  try {
    const _require = (packageName: string) => {
      if (packageName === '@libs/storage') {
        return {
          storage: new Storage(pluginId),
          localStorage: new LocalStorage(pluginId),
          sessionStorage: new SessionStorage(pluginId),
        };
      }
      return packages[packageName];
    };
    /* eslint no-new-func: "off", curly: "error" */
    const plugin: Plugin = Function(
      'require',
      'module',
      `const exports = module.exports = {}; 
      ${rawCode}; 
      return exports.default`,
    )(_require, {});

    if (!plugin.imageRequestInit) {
      plugin.imageRequestInit = {
        headers: { 'User-Agent': getUserAgent() },
      };
    } else {
      if (!plugin.imageRequestInit.headers) {
        plugin.imageRequestInit.headers = {};
      }

      const hasUserAgent = Object.keys(plugin.imageRequestInit.headers).some(
        header => header.toLowerCase() === 'user-agent',
      );

      if (!hasUserAgent) {
        plugin.imageRequestInit.headers['User-Agent'] = getUserAgent();
      }
    }

    return plugin;
  } catch {
    return undefined;
  }
};

const plugins: Record<string, Plugin | undefined> = {};

const installPlugin = async (
  _plugin: PluginItem,
): Promise<Plugin | undefined> => {
  const rawCode = await proxyFetch(_plugin.url, {
    headers: { 'pragma': 'no-cache', 'cache-control': 'no-cache' },
  }).then(res => res.text());
  const plugin = initPlugin(_plugin.id, rawCode);
  if (!plugin) {
    return undefined;
  }
  let currentPlugin = plugins[plugin.id];
  if (!currentPlugin || newer(plugin.version, currentPlugin.version)) {
    plugins[plugin.id] = plugin;
    currentPlugin = plugin;

    // save plugin code;
    const pluginDir = `${PLUGIN_STORAGE}/${plugin.id}`;
    NativeFile.mkdir(pluginDir);
    const pluginPath = pluginDir + '/index.js';
    const customJSPath = pluginDir + '/custom.js';
    const customCSSPath = pluginDir + '/custom.css';
    if (_plugin.customJS) {
      await downloadFile(_plugin.customJS, customJSPath);
    } else if (NativeFile.exists(customJSPath)) {
      NativeFile.unlink(customJSPath);
    }
    if (_plugin.customCSS) {
      await downloadFile(_plugin.customCSS, customCSSPath);
    } else if (NativeFile.exists(customCSSPath)) {
      NativeFile.unlink(customCSSPath);
    }
    await NativeFile.writeFile(pluginPath, rawCode);
  }
  return currentPlugin;
};

const uninstallPlugin = async (_plugin: PluginItem) => {
  plugins[_plugin.id] = undefined;
  store.getAllKeys().forEach(key => {
    if (key.startsWith(_plugin.id)) {
      store.delete(key);
    }
  });
  const pluginFilePath = `${PLUGIN_STORAGE}/${_plugin.id}/index.js`;
  if (NativeFile.exists(pluginFilePath)) {
    NativeFile.unlink(pluginFilePath);
  }
};

const updatePlugin = async (plugin: PluginItem) => {
  return installPlugin(plugin);
};

const fetchPlugins = async (): Promise<PluginItem[]> => {
  const allPlugins: PluginItem[] = [];
  const allRepositories = getRepositoriesFromDb();

  if (allRepositories.length === 0) {
    return [];
  }

  const repoPluginsRes = await Promise.allSettled(
    allRepositories.map(async ({ url }) => {
      const response = await proxyFetch(url);
      const contentType = response.headers.get('content-type') || '';
      
      // Get response text once
      const text = await response.text();
      
      // Check if it looks like HTML (error page)
      if (text.trim().startsWith('<!') || text.trim().startsWith('<html')) {
        console.error('[fetchPlugins] Received HTML instead of JSON:', {
          url,
          contentType,
          status: response.status,
          textPreview: text.substring(0, 200),
        });
        throw new Error(`Received HTML error page instead of JSON (status: ${response.status})`);
      }
      
      // Try to parse as JSON
      try {
        return JSON.parse(text);
      } catch (err) {
        console.error('[fetchPlugins] Failed to parse JSON:', {
          url,
          contentType,
          status: response.status,
          textPreview: text.substring(0, 200),
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        throw new Error(`Failed to parse repository response as JSON: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }),
  );

  repoPluginsRes.forEach((repoPlugins, index) => {
    if (repoPlugins.status === 'fulfilled') {
      try {
        // Handle multiple possible JSON structures:
        // 1. Direct array: [{id, name, ...}, ...]
        // 2. Object with plugins property: {plugins: [{id, name, ...}, ...]}
        // 3. Object with data property: {data: [{id, name, ...}, ...]}
        let plugins: any[] = [];
        
        if (Array.isArray(repoPlugins.value)) {
          plugins = repoPlugins.value;
        } else if (repoPlugins.value?.plugins && Array.isArray(repoPlugins.value.plugins)) {
          plugins = repoPlugins.value.plugins;
        } else if (repoPlugins.value?.data && Array.isArray(repoPlugins.value.data)) {
          plugins = repoPlugins.value.data;
        }
        
        if (plugins.length > 0) {
          allPlugins.push(...plugins);
        } else if (Object.keys(repoPlugins.value || {}).length > 0) {
          showToast(`Repository ${index + 1}: Invalid format, no plugins found`);
        }
      } catch (error) {
        showToast(`Repository ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      showToast(`Repository ${index + 1}: ${repoPlugins.reason?.message || repoPlugins.reason?.toString() || 'Unknown error'}`);
    }
  });

  return uniqBy(reverse(allPlugins), 'id');
};

const getPlugin = (pluginId: string) => {
  if (pluginId === LOCAL_PLUGIN_ID) {
    return undefined;
  }

  if (!plugins[pluginId]) {
    const filePath = `${PLUGIN_STORAGE}/${pluginId}/index.js`;
    try {
      // Use readFileSync on web, readFile on native
      let code: string;
      
      // Check if we're on web and if readFileSync exists
      if (typeof (NativeFile as any).readFileSync === 'function') {
        // console.log('[pluginManager.getPlugin] Using sync read for plugin:', pluginId);
        try {
          code = (NativeFile as any).readFileSync(filePath);
        } catch (syncErr) {
          // console.warn('[pluginManager.getPlugin] Plugin not in memory cache, trying async read:', pluginId);
          // Plugin file not in memory cache yet - this can happen on first access
          // Return undefined and let it be loaded asynchronously
          return undefined;
        }
      } else {
        // Fallback - this will fail on native, but on web it should use readFileSync
        // console.error('[pluginManager.getPlugin] readFileSync not available, plugin loading will fail:', pluginId);
        return undefined;
      }
      
      const plugin = initPlugin(pluginId, code);
      plugins[pluginId] = plugin;
    } catch (err) {
      // file doesnt exist or error reading
      // console.warn('[pluginManager.getPlugin] Failed to load plugin:', pluginId, err);
      return undefined;
    }
  }
  return plugins[pluginId];
};

const loadPlugin = async (pluginId: string) => {
  if (pluginId === LOCAL_PLUGIN_ID) {
    return undefined;
  }

  // Return cached plugin if available
  if (plugins[pluginId]) {
    // console.log('[pluginManager.loadPlugin] Using cached plugin:', pluginId);
    return plugins[pluginId];
  }

  const filePath = `${PLUGIN_STORAGE}/${pluginId}/index.js`;
  try {
    // console.log('[pluginManager.loadPlugin] Async loading plugin:', pluginId);
    // Use async readFile to load from IndexedDB
    const code = await (NativeFile as any).readFile(filePath);
    // console.log('[pluginManager.loadPlugin] Successfully loaded plugin code, initializing:', pluginId);
    
    const plugin = initPlugin(pluginId, code);
    plugins[pluginId] = plugin;
    // console.log('[pluginManager.loadPlugin] Plugin initialized successfully:', pluginId);
    return plugin;
  } catch (err) {
    // console.error('[pluginManager.loadPlugin] Failed to load plugin:', pluginId, err);
    return undefined;
  }
};

const preLoadInstalledPlugins = async (installedPluginIds: string[]) => {
  // console.log('[pluginManager.preLoadInstalledPlugins] Pre-loading installed plugins:', installedPluginIds);
  
  // Load all installed plugins in parallel
  const loadPromises = installedPluginIds
    .filter(id => id !== LOCAL_PLUGIN_ID)
    .map(pluginId => 
      loadPlugin(pluginId).catch(_err => {
        // console.warn('[pluginManager.preLoadInstalledPlugins] Failed to pre-load plugin:', pluginId, _err);
        return undefined;
      })
    );
  
  const results = await Promise.all(loadPromises);
  // const loaded = results.filter(p => p !== undefined).length;
  // console.log(`[pluginManager.preLoadInstalledPlugins] Pre-loaded ${loaded}/${installedPluginIds.length} plugins`);
  
  return results;
};

const LOCAL_PLUGIN_ID = 'local';

export {
  getPlugin,
  loadPlugin,
  preLoadInstalledPlugins,
  installPlugin,
  uninstallPlugin,
  updatePlugin,
  fetchPlugins,
  LOCAL_PLUGIN_ID,
};

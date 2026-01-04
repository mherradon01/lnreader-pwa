import { showToast } from '@utils/showToast';
import { getString } from '@strings/translations';
import ServiceManager, { BackgroundTaskMetadata } from '@services/ServiceManager';
import { MMKVStorage } from '@utils/mmkv/mmkv';
import { getAllNovels, _restoreNovelAndChapters } from '@database/queries/NovelQueries';
import { getNovelChapters } from '@database/queries/ChapterQueries';
import { getAllNovelCategories, getCategoriesFromDb, _restoreCategory } from '@database/queries/CategoryQueries';
import { getRepositoriesFromDb } from '@database/queries/RepositoryQueries';
import { BackupCategory, BackupNovel } from '@database/types';
import packageJson from '../../../../package.json';
import { SELF_HOST_BACKUP } from '@hooks/persisted/useSelfHost';
import { OLD_TRACKED_NOVEL_PREFIX } from '@hooks/persisted/migrations/trackerMigration';
import { LAST_UPDATE_TIME } from '@hooks/persisted/useUpdates';
import { db } from '@database/db';

// Web-specific backup: use browser APIs
export const createBackup = async (
  setMeta?: (
    transformer: (meta: BackgroundTaskMetadata) => BackgroundTaskMetadata,
  ) => void,
) => {
  try {
    setMeta?.(meta => ({
      ...meta,
      isRunning: true,
      progress: 0 / 4,
      progressText: getString('backupScreen.preparingData'),
    }));

    // Step 1: Export MMKV/settings data
    const excludeKeys = [
      ServiceManager.manager.STORE_KEY,
      OLD_TRACKED_NOVEL_PREFIX,
      SELF_HOST_BACKUP,
      LAST_UPDATE_TIME,
    ];
    const keys = MMKVStorage.getAllKeys().filter(
      key => !excludeKeys.includes(key),
    );
    const settingsData = {} as any;
    for (const key of keys) {
      let value: number | string | boolean | undefined = MMKVStorage.getString(key);
      if (!value) {
        value = MMKVStorage.getBoolean(key);
      }
      if (key && value) {
        settingsData[key] = value;
      }
    }

    setMeta?.(meta => ({
      ...meta,
      progress: 1 / 4,
      progressText: 'Exporting novels...',
    }));

    // Step 2: Export novels and chapters
    const novels = await getAllNovels();
    const novelsWithChapters: BackupNovel[] = [];
    for (const novel of novels) {
      const chapters = await getNovelChapters(novel.id);
      novelsWithChapters.push({
        ...novel,
        chapters,
      });
    }

    setMeta?.(meta => ({
      ...meta,
      progress: 2 / 4,
      progressText: 'Exporting categories...',
    }));

    // Step 3: Export categories
    const categories = await getCategoriesFromDb();
    const novelCategories = await getAllNovelCategories();
    const backupCategories: BackupCategory[] = categories.map(category => ({
      id: category.id,
      name: category.name,
      sort: category.sort,
      novelIds: novelCategories
        .filter(nc => nc.categoryId === category.id)
        .map(nc => nc.novelId),
    }));

    // Step 3.5: Export repositories
    const repositories = getRepositoriesFromDb();

    setMeta?.(meta => ({
      ...meta,
      progress: 3 / 4,
      progressText: getString('backupScreen.savingBackup'),
    }));

    // Step 4: Create backup file and download using browser API
    const backupData = {
      version: packageJson.version,
      date: new Date().toISOString(),
      settings: settingsData,
      novels: novelsWithChapters,
      categories: backupCategories,
      repositories: repositories,
    };

    // Create a downloadable file
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const datetime = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `lnreader_backup_${datetime}.json`;
    
    // Trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setMeta?.(meta => ({
      ...meta,
      progress: 4 / 4,
      isRunning: false,
    }));

    showToast(getString('backupScreen.backupCreated'));
  } catch (error: any) {
    setMeta?.(meta => ({
      ...meta,
      isRunning: false,
    }));
    showToast(error instanceof Error ? error.message : 'Backup failed');
  }
};

export const restoreBackup = async (
  setMeta?: (
    transformer: (meta: BackgroundTaskMetadata) => BackgroundTaskMetadata,
  ) => void,
) => {
  try {
    setMeta?.(meta => ({
      ...meta,
      isRunning: true,
      progress: 0 / 4,
      progressText: getString('backupScreen.downloadingData'),
    }));

    // Use browser file picker
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    
    const fileSelected = new Promise<File>((resolve, reject) => {
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          resolve(file);
        } else {
          reject(new Error('No file selected'));
        }
      };
      input.oncancel = () => {
        reject(new Error('File selection cancelled'));
      };
    });

    input.click();
    const file = await fileSelected;

    setMeta?.(meta => ({
      ...meta,
      progress: 1 / 4,
      progressText: 'Reading backup file...',
    }));

    // Read the file
    const text = await file.text();
    const backupData = JSON.parse(text) as {
      settings: Record<string, any>;
      novels: BackupNovel[];
      categories: BackupCategory[];
      repositories?: Array<{id: number; url: string}>;
    };

    setMeta?.(meta => ({
      ...meta,
      progress: 2 / 4,
      progressText: 'Restoring settings...',
    }));

    // Debug: Log all settings keys
    // eslint-disable-next-line no-console
    console.log('[Local Restore] All settings keys in backup:', Object.keys(backupData.settings || {}));
    // eslint-disable-next-line no-console
    console.log('[Local Restore] Checking for installed_plugins key...');
    
    // Extract installed plugins before restoring settings
    let pluginsToInstall: any[] = [];
    
    // Try different possible key names
    const possibleKeys = [
      'INSTALL_PLUGINS',
      'FILTERED_INSTALLED_PLUGINS',
      '@mmkv.installed_plugins',
      'installed_plugins',
      'INSTALLED_PLUGINS',
      '@installed_plugins'
    ];
    
    let foundKey: string | undefined;
    for (const key of possibleKeys) {
      if (backupData.settings?.[key]) {
        foundKey = key;
        // eslint-disable-next-line no-console
        console.log(`[Local Restore] Found plugins under key: ${key}`);
        break;
      }
    }
    
    if (foundKey) {
      try {
        const installedPlugins = backupData.settings[foundKey];
        // eslint-disable-next-line no-console
        console.log('[Local Restore] Raw installed plugins value:', typeof installedPlugins, installedPlugins);
        
        pluginsToInstall = typeof installedPlugins === 'string' 
          ? JSON.parse(installedPlugins) 
          : installedPlugins;
        
        // eslint-disable-next-line no-console
        console.log('[Local Restore] Parsed plugins:', pluginsToInstall);
        
        // Remove installed plugins from settings so they don't appear as installed yet
        delete backupData.settings[foundKey];
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[Local Restore] Failed to parse installed plugins:', error);
      }
    } else {
      // eslint-disable-next-line no-console
      console.log('[Local Restore] No installed plugins key found in settings');
    }

    // Restore settings (without installed plugins)
    if (backupData.settings) {
      for (const [key, value] of Object.entries(backupData.settings)) {
        if (typeof value === 'string' || typeof value === 'boolean') {
          MMKVStorage.set(key, value);
        }
      }
    }

    setMeta?.(meta => ({
      ...meta,
      progress: 3 / 4,
      progressText: 'Restoring novels and chapters...',
    }));

    // Restore novels and chapters
    if (backupData.novels) {
      for (const novel of backupData.novels) {
        await _restoreNovelAndChapters(novel);
      }
    }

    // Restore categories
    if (backupData.categories) {
      for (const category of backupData.categories) {
        // Handle old backup format where novelIds might be a string or null
        const novelIds = category.novelIds;
        const normalizedCategory = {
          ...category,
          novelIds: Array.isArray(novelIds)
            ? novelIds
            : typeof novelIds === 'string' && novelIds
            ? novelIds.split(',').map((id: string) => parseInt(id, 10))
            : [],
        };
        await _restoreCategory(normalizedCategory);
      }
    }

    // Restore repositories
    if (backupData.repositories && Array.isArray(backupData.repositories)) {
      for (const repo of backupData.repositories) {
        try {
          db.runSync('INSERT OR REPLACE INTO Repository (id, url) VALUES (?, ?)', [repo.id, repo.url]);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Failed to restore repository:', repo, error);
        }
      }
    }

    setMeta?.(meta => ({
      ...meta,
      progress: 4 / 4,
      isRunning: false,
    }));

    showToast(getString('backupScreen.backupRestored'));
    
    // Re-install all plugins from their repositories immediately
    // eslint-disable-next-line no-console
    console.log('[Local Restore] Checking for plugins to install:', pluginsToInstall.length);
    
    if (Array.isArray(pluginsToInstall) && pluginsToInstall.length > 0) {
      // eslint-disable-next-line no-console
      console.log('[Local Restore] Starting plugin installation for:', pluginsToInstall.map(p => p.id));
      showToast(`Installing ${pluginsToInstall.length} plugins...`);
      
      // Run in background but start immediately
      (async () => {
        try {
          const { installPlugin } = await import('@plugins/pluginManager');
          // eslint-disable-next-line no-console
          console.log('[Local Restore] installPlugin imported successfully');
          
          let installed = 0;
          for (const plugin of pluginsToInstall) {
            try {
              // eslint-disable-next-line no-console
              console.log(`[Local Restore] Installing plugin: ${plugin.id}`);
              const installedPlugin = await installPlugin(plugin);
              if (installedPlugin) {
                installed++;
                // eslint-disable-next-line no-console
                console.log(`[Local Restore] Successfully installed: ${plugin.id}`);
              }
            } catch (error) {
              // eslint-disable-next-line no-console
              console.error('[Local Restore] Failed to install plugin:', plugin.id, error);
            }
          }
          
          // eslint-disable-next-line no-console
          console.log(`[Local Restore] Installation complete: ${installed}/${pluginsToInstall.length}`);
          
          if (installed > 0) {
            showToast(`Successfully installed ${installed}/${pluginsToInstall.length} plugins`);
            
            // Trigger library update to re-download covers
            // eslint-disable-next-line no-console
            console.log('[Local Restore] Starting library update to refresh covers...');
            showToast('Refreshing library covers...');
            
            try {
              // Temporarily enable refreshNovelMetadata to re-download covers
              const { MMKVStorage } = await import('@utils/mmkv/mmkv');
              const { APP_SETTINGS } = await import('@hooks/persisted/useSettings');
              const currentSettings = MMKVStorage.getString(APP_SETTINGS);
              const settings = currentSettings ? JSON.parse(currentSettings) : {};
              const originalRefreshMetadata = settings.refreshNovelMetadata;
              
              // Enable metadata refresh
              settings.refreshNovelMetadata = true;
              MMKVStorage.set(APP_SETTINGS, JSON.stringify(settings));
              
              const ServiceManager = (await import('../../ServiceManager')).default;
              await ServiceManager.manager.addTask({
                name: 'UPDATE_LIBRARY',
                data: {},
              });
              
              // Restore original setting after a delay (library update runs in background)
              setTimeout(() => {
                settings.refreshNovelMetadata = originalRefreshMetadata;
                MMKVStorage.set(APP_SETTINGS, JSON.stringify(settings));
              }, 5000);
              
              // eslint-disable-next-line no-console
              console.log('[Local Restore] Library update task added with metadata refresh enabled');
            } catch (error) {
              // eslint-disable-next-line no-console
              console.error('[Local Restore] Failed to start library update:', error);
            }
          } else if (pluginsToInstall.length > 0) {
            showToast('Failed to install plugins. Check console for details.');
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('[Local Restore] Failed during plugin installation:', error);
          showToast('Plugin installation failed. Check console for details.');
        }
      })();
    } else {
      // eslint-disable-next-line no-console
      console.log('[Local Restore] No plugins to install');
    }
  } catch (error: any) {
    setMeta?.(meta => ({
      ...meta,
      isRunning: false,
    }));
    
    // Handle user cancellation gracefully
    if (error.message === 'File selection cancelled') {
      showToast('Restore cancelled');
    } else {
      showToast(error instanceof Error ? error.message : 'Restore failed');
    }
  }
};

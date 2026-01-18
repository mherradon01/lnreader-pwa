import { DriveFile } from '@api/drive/types';
import { getString } from '@strings/translations';
import ServiceManager, {
  BackgroundTaskMetadata,
} from '@services/ServiceManager';
import { exists, createFile } from '@api/drive';
import { downloadFileJson } from '@api/drive/request';
import { MMKVStorage } from '@utils/mmkv/mmkv';
import {
  getAllNovels,
  _restoreNovelAndChapters,
} from '@database/queries/NovelQueries';
import { getNovelChapters } from '@database/queries/ChapterQueries';
import {
  getAllNovelCategories,
  getCategoriesFromDb,
  _restoreCategory,
} from '@database/queries/CategoryQueries';
import { getRepositoriesFromDb } from '@database/queries/RepositoryQueries';
import { BackupCategory, BackupNovel } from '@database/types';
import { showToast } from '@utils/showToast';
import packageJson from '../../../../package.json';
import { SELF_HOST_BACKUP } from '@hooks/persisted/useSelfHost';
import { OLD_TRACKED_NOVEL_PREFIX } from '@hooks/persisted/migrations/trackerMigration';
import { LAST_UPDATE_TIME } from '@hooks/persisted/useUpdates';
import { db } from '@database/db';

// Web-specific backup: export data as JSON files instead of zips
export const createDriveBackup = async (
  backupFolder: DriveFile,
  setMeta: (
    transformer: (meta: BackgroundTaskMetadata) => BackgroundTaskMetadata,
  ) => void,
) => {
  try {
    setMeta(meta => ({
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
      let value: number | string | boolean | undefined =
        MMKVStorage.getString(key);
      if (!value) {
        value = MMKVStorage.getBoolean(key);
      }
      if (key && value) {
        settingsData[key] = value;
      }
    }

    setMeta(meta => ({
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

    setMeta(meta => ({
      ...meta,
      progress: 2 / 4,
      progressText: 'Exporting categories...',
    }));

    // Step 3: Export categories
    const categories = await getCategoriesFromDb();
    const novelCategories = await getAllNovelCategories();
    const backupCategories: BackupCategory[] = categories.map(category => ({
      ...category,
      novelIds: novelCategories
        .filter(nc => nc.categoryId === category.id)
        .map(nc => nc.novelId),
    }));

    // Step 3.5: Export repositories
    const repositories = getRepositoriesFromDb();

    setMeta(meta => ({
      ...meta,
      progress: 3 / 4,
      progressText: getString('backupScreen.uploadingData'),
    }));

    // Step 4: Create backup files in Google Drive
    const backupData = {
      version: packageJson.version,
      date: new Date().toISOString(),
      settings: settingsData,
      novels: novelsWithChapters,
      categories: backupCategories,
      repositories: repositories,
    };

    // Upload as single JSON file
    const settingsFileName = 'backup.json';
    const existingFile = await exists(settingsFileName, false, backupFolder.id);

    if (existingFile) {
      // For now, just create a new file with timestamp
      // In the future, we could update the existing file
      const timestamp = new Date().getTime();
      await createFile(
        `backup-${timestamp}.json`,
        'application/json',
        JSON.stringify(backupData, null, 2),
        backupFolder.id,
      );
    } else {
      await createFile(
        settingsFileName,
        'application/json',
        JSON.stringify(backupData, null, 2),
        backupFolder.id,
      );
    }

    setMeta(meta => ({
      ...meta,
      progress: 4 / 4,
      isRunning: false,
    }));

    showToast(getString('backupScreen.backupComplete'));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Backup error:', error);
    showToast(
      `Backup failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
    setMeta(meta => ({
      ...meta,
      isRunning: false,
    }));
  }
};

export const driveRestore = async (
  backupFolder: DriveFile,
  setMeta: (
    transformer: (meta: BackgroundTaskMetadata) => BackgroundTaskMetadata,
  ) => void,
) => {
  try {
    // eslint-disable-next-line no-console
    console.log(
      '[Drive Restore] Starting restore process for folder:',
      backupFolder,
    );

    setMeta(meta => ({
      ...meta,
      isRunning: true,
      progress: 0 / 3,
      progressText: getString('backupScreen.downloadingData'),
    }));

    // Find the backup file
    // eslint-disable-next-line no-console
    console.log(
      '[Drive Restore] Searching for backup.json in folder:',
      backupFolder.id,
    );
    const backupFile = await exists('backup.json', false, backupFolder.id);

    // eslint-disable-next-line no-console
    console.log('[Drive Restore] Backup file found:', backupFile);

    if (!backupFile) {
      throw new Error('Backup file not found in the selected folder');
    }

    // Download and parse backup data
    // eslint-disable-next-line no-console
    console.log('[Drive Restore] Downloading backup file...');
    const backupData = await downloadFileJson<{
      settings: Record<string, any>;
      novels: BackupNovel[];
      categories: BackupCategory[];
      repositories?: Array<{ id: number; url: string }>;
    }>(backupFile);

    // eslint-disable-next-line no-console
    console.log('[Drive Restore] Backup data loaded:', {
      settingsCount: Object.keys(backupData.settings || {}).length,
      novelsCount: backupData.novels?.length || 0,
      categoriesCount: backupData.categories?.length || 0,
    });

    setMeta(meta => ({
      ...meta,
      progress: 1 / 3,
      progressText: 'Restoring settings...',
    }));

    // Debug: Log all settings keys
    // eslint-disable-next-line no-console
    console.log(
      '[Drive Restore] All settings keys in backup:',
      Object.keys(backupData.settings || {}),
    );
    // eslint-disable-next-line no-console
    console.log('[Drive Restore] Checking for installed_plugins key...');

    // Extract installed plugins before restoring settings
    let pluginsToInstall: any[] = [];

    // Try different possible key names
    const possibleKeys = [
      'INSTALL_PLUGINS',
      'FILTERED_INSTALLED_PLUGINS',
      '@mmkv.installed_plugins',
      'installed_plugins',
      'INSTALLED_PLUGINS',
      '@installed_plugins',
    ];

    let foundKey: string | undefined;
    for (const key of possibleKeys) {
      if (backupData.settings?.[key]) {
        foundKey = key;
        // eslint-disable-next-line no-console
        console.log(`[Drive Restore] Found plugins under key: ${key}`);
        break;
      }
    }

    if (foundKey) {
      try {
        const installedPlugins = backupData.settings[foundKey];
        // eslint-disable-next-line no-console
        console.log(
          '[Drive Restore] Raw installed plugins value:',
          typeof installedPlugins,
          installedPlugins,
        );

        pluginsToInstall =
          typeof installedPlugins === 'string'
            ? JSON.parse(installedPlugins)
            : installedPlugins;

        // eslint-disable-next-line no-console
        console.log(
          `[Drive Restore] Found ${pluginsToInstall.length} plugins to re-install`,
        );

        // Remove installed plugins from settings so they don't appear as installed yet
        delete backupData.settings[foundKey];
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(
          '[Drive Restore] Failed to parse installed plugins:',
          error,
        );
      }
    } else {
      // eslint-disable-next-line no-console
      console.log('[Drive Restore] No installed plugins key found in settings');
    }

    // Restore settings (without installed plugins)
    if (backupData.settings) {
      // eslint-disable-next-line no-console
      console.log('[Drive Restore] Restoring settings...');
      for (const [key, value] of Object.entries(backupData.settings)) {
        if (typeof value === 'string') {
          MMKVStorage.set(key, value);
        } else if (typeof value === 'boolean') {
          MMKVStorage.set(key, value);
        }
      }
      // eslint-disable-next-line no-console
      console.log('[Drive Restore] Settings restored');
    }

    setMeta(meta => ({
      ...meta,
      progress: 2 / 3,
      progressText: 'Restoring novels and chapters...',
    }));

    // Restore novels and chapters
    if (backupData.novels) {
      // eslint-disable-next-line no-console
      console.log(
        `[Drive Restore] Restoring ${backupData.novels.length} novels...`,
      );
      for (const novel of backupData.novels) {
        await _restoreNovelAndChapters(novel);
      }
      // eslint-disable-next-line no-console
      console.log('[Drive Restore] Novels restored');
    }

    // Restore categories
    if (backupData.categories) {
      // eslint-disable-next-line no-console
      console.log(
        `[Drive Restore] Restoring ${backupData.categories.length} categories...`,
      );
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
      // eslint-disable-next-line no-console
      console.log('[Drive Restore] Categories restored');
    }

    // Restore repositories
    if (backupData.repositories && Array.isArray(backupData.repositories)) {
      // eslint-disable-next-line no-console
      console.log(
        `[Drive Restore] Restoring ${backupData.repositories.length} repositories...`,
      );
      for (const repo of backupData.repositories) {
        try {
          db.runSync(
            'INSERT OR REPLACE INTO Repository (id, url) VALUES (?, ?)',
            [repo.id, repo.url],
          );
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Failed to restore repository:', repo, error);
        }
      }
      // eslint-disable-next-line no-console
      console.log('[Drive Restore] Repositories restored');
    }

    setMeta(meta => ({
      ...meta,
      progress: 3 / 3,
      isRunning: false,
    }));

    // eslint-disable-next-line no-console
    console.log('[Drive Restore] Restore complete!');
    showToast(getString('backupScreen.restoreComplete'));

    // Re-install all plugins from their repositories immediately
    // eslint-disable-next-line no-console
    console.log(
      '[Drive Restore] Checking for plugins to install:',
      pluginsToInstall.length,
    );

    if (Array.isArray(pluginsToInstall) && pluginsToInstall.length > 0) {
      // eslint-disable-next-line no-console
      console.log(
        '[Drive Restore] Starting plugin installation for:',
        pluginsToInstall.map(p => p.id),
      );
      showToast(`Installing ${pluginsToInstall.length} plugins...`);

      // Run in background but start immediately
      (async () => {
        try {
          const { installPlugin } = await import('@plugins/pluginManager');
          // eslint-disable-next-line no-console
          console.log('[Drive Restore] installPlugin imported successfully');

          let installed = 0;
          for (const plugin of pluginsToInstall) {
            try {
              // eslint-disable-next-line no-console
              console.log(`[Drive Restore] Installing plugin: ${plugin.id}`);
              const installedPlugin = await installPlugin(plugin);
              if (installedPlugin) {
                installed++;
                // eslint-disable-next-line no-console
                console.log(
                  `[Drive Restore] Successfully installed: ${plugin.id}`,
                );
              }
            } catch (error) {
              // eslint-disable-next-line no-console
              console.error(
                '[Drive Restore] Failed to install plugin:',
                plugin.id,
                error,
              );
            }
          }

          // eslint-disable-next-line no-console
          console.log(
            `[Drive Restore] Installation complete: ${installed}/${pluginsToInstall.length}`,
          );

          if (installed > 0) {
            showToast(
              `Successfully installed ${installed}/${pluginsToInstall.length} plugins`,
            );

            // Trigger library update to re-download covers
            // eslint-disable-next-line no-console
            console.log(
              '[Drive Restore] Starting library update to refresh covers...',
            );
            showToast('Refreshing library covers...');

            try {
              // Temporarily enable refreshNovelMetadata to re-download covers
              const { MMKVStorage: MMKVStorageModuleImport } = await import(
                '@utils/mmkv/mmkv'
              );
              const { APP_SETTINGS } = await import(
                '@hooks/persisted/useSettings'
              );
              const currentSettings =
                MMKVStorageModuleImport.getString(APP_SETTINGS);
              const settings = currentSettings
                ? JSON.parse(currentSettings)
                : {};
              const originalRefreshMetadata = settings.refreshNovelMetadata;

              // Enable metadata refresh
              settings.refreshNovelMetadata = true;
              MMKVStorageModuleImport.set(
                APP_SETTINGS,
                JSON.stringify(settings),
              );

              const ServiceManagerModuleImport = (
                await import('../../ServiceManager')
              ).default;
              await ServiceManagerModuleImport.manager.addTask({
                name: 'UPDATE_LIBRARY',
                data: {},
              });

              // Restore original setting after a delay (library update runs in background)
              setTimeout(() => {
                settings.refreshNovelMetadata = originalRefreshMetadata;
                MMKVStorageModuleImport.set(
                  APP_SETTINGS,
                  JSON.stringify(settings),
                );
              }, 5000);

              // eslint-disable-next-line no-console
              console.log(
                '[Drive Restore] Library update task added with metadata refresh enabled',
              );
            } catch (error) {
              // eslint-disable-next-line no-console
              console.error(
                '[Drive Restore] Failed to start library update:',
                error,
              );
            }
          } else if (pluginsToInstall.length > 0) {
            showToast('Failed to install plugins. Check console for details.');
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(
            '[Drive Restore] Failed during plugin installation:',
            error,
          );
          showToast('Plugin installation failed. Check console for details.');
        }
      })();
    } else {
      // eslint-disable-next-line no-console
      console.log('[Drive Restore] No plugins to install');
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Drive Restore] Restore error:', error);
    showToast(
      `Restore failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
    setMeta(meta => ({
      ...meta,
      isRunning: false,
    }));
  }
};

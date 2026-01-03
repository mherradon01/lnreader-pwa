import { DriveFile } from '@api/drive/types';
import { getString } from '@strings/translations';
import { BackgroundTaskMetadata } from '@services/ServiceManager';
import { exists, createFile } from '@api/drive';
import { downloadFileJson } from '@api/drive/request';
import { MMKVStorage } from '@utils/mmkv/mmkv';
import { getAllNovels, _restoreNovelAndChapters } from '@database/queries/NovelQueries';
import { getNovelChapters } from '@database/queries/ChapterQueries';
import { getAllNovelCategories, getCategoriesFromDb, _restoreCategory } from '@database/queries/CategoryQueries';
import { BackupCategory, BackupNovel } from '@database/types';
import { showToast } from '@utils/showToast';
import packageJson from '../../../../package.json';
import { SELF_HOST_BACKUP } from '@hooks/persisted/useSelfHost';
import { OLD_TRACKED_NOVEL_PREFIX } from '@hooks/persisted/migrations/trackerMigration';
import { LAST_UPDATE_TIME } from '@hooks/persisted/useUpdates';
import ServiceManager from '@services/ServiceManager';

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
      let value: number | string | boolean | undefined = MMKVStorage.getString(key);
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
      novels: novelCategories
        .filter(nc => nc.categoryId === category.id)
        .map(nc => nc.novelId),
    }));

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
    showToast(`Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    console.log('[Drive Restore] Starting restore process for folder:', backupFolder);
    
    setMeta(meta => ({
      ...meta,
      isRunning: true,
      progress: 0 / 3,
      progressText: getString('backupScreen.downloadingData'),
    }));

    // Find the backup file
    // eslint-disable-next-line no-console
    console.log('[Drive Restore] Searching for backup.json in folder:', backupFolder.id);
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

    // Restore settings
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
      console.log(`[Drive Restore] Restoring ${backupData.novels.length} novels...`);
      for (const novel of backupData.novels) {
        await _restoreNovelAndChapters(novel);
      }
      // eslint-disable-next-line no-console
      console.log('[Drive Restore] Novels restored');
    }

    // Restore categories
    if (backupData.categories) {
      // eslint-disable-next-line no-console
      console.log(`[Drive Restore] Restoring ${backupData.categories.length} categories...`);
      for (const category of backupData.categories) {
        await _restoreCategory(category);
      }
      // eslint-disable-next-line no-console
      console.log('[Drive Restore] Categories restored');
    }

    setMeta(meta => ({
      ...meta,
      progress: 3 / 3,
      isRunning: false,
    }));

    // eslint-disable-next-line no-console
    console.log('[Drive Restore] Restore complete!');
    showToast(getString('backupScreen.restoreComplete'));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Drive Restore] Restore error:', error);
    showToast(`Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    setMeta(meta => ({
      ...meta,
      isRunning: false,
    }));
  }
};

import { db } from '@database/db';
import { NovelInfo } from '@database/types';
import { MMKVStorage } from '@utils/mmkv/mmkv';
import { NOVEL_STORAGE } from '@utils/Storages';
import { TrackerName } from '@services/Trackers';
import NativeFile from '@specs/NativeFile';

// MMKV key prefixes (must match those in useNovel.ts and useTrackedNovel.ts)
const TRACKED_NOVEL_PREFIX = 'TRACKED_NOVEL_PREFIX';
const NOVEL_PAGE_INDEX_PREFIX = 'NOVEL_PAGE_INDEX_PREFIX';
const NOVEL_SETTINSG_PREFIX = 'NOVEL_SETTINGS';
const LAST_READ_PREFIX = 'LAST_READ_PREFIX';
const TRACKED_NOVEL_MIGRATION = 'TRACKED_NOVEL_MIGRATION_V1';

const TRACKER_NAMES: TrackerName[] = ['AniList', 'MyAnimeList', 'MangaUpdates'];

/**
 * Cleans up all MMKV entries associated with a specific novel.
 * Should be called when a novel is permanently removed from the library.
 */
export const cleanupNovelMMKVEntries = (novel: NovelInfo) => {
  const { id, pluginId, path } = novel;

  // Clean novel settings entries
  MMKVStorage.delete(`${NOVEL_PAGE_INDEX_PREFIX}_${pluginId}_${path}`);
  MMKVStorage.delete(`${NOVEL_SETTINSG_PREFIX}_${pluginId}_${path}`);
  MMKVStorage.delete(`${LAST_READ_PREFIX}_${pluginId}_${path}`);

  // Clean tracker data for all trackers
  TRACKER_NAMES.forEach(trackerName => {
    MMKVStorage.delete(`${TRACKED_NOVEL_PREFIX}_${id}_${trackerName}`);
  });

  // Clean old tracker format (pre-migration)
  MMKVStorage.delete(`${TRACKED_NOVEL_PREFIX}_${id}`);

  // Clean migration flag
  MMKVStorage.delete(`${TRACKED_NOVEL_MIGRATION}_${id}`);
};

/**
 * Cleans up downloaded files for a specific novel.
 */
export const cleanupNovelFiles = async (novel: NovelInfo) => {
  const { id, pluginId } = novel;
  const novelDir = `${NOVEL_STORAGE}/${pluginId}/${id}`;

  try {
    if (NativeFile.exists(novelDir)) {
      NativeFile.unlink(novelDir);
    }
  } catch (error) {
    // Log but don't throw - file cleanup failure shouldn't break the flow
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(
        '[MaintenanceQueries] Failed to delete novel directory:',
        error,
      );
    }
  }
};

/**
 * Full cleanup for a novel being removed from library.
 * Cleans MMKV entries and downloaded files.
 */
export const cleanupNovelData = async (novel: NovelInfo) => {
  cleanupNovelMMKVEntries(novel);
  await cleanupNovelFiles(novel);
};

/**
 * Cleans up orphaned MMKV entries that reference non-existent novels.
 * This finds and removes entries where the associated novel no longer exists in the database.
 */
export const cleanupOrphanedMMKVEntries = (): number => {
  const allKeys = MMKVStorage.getAllKeys();

  // Get all existing novel IDs and paths from database
  const novels = db.getAllSync<{ id: number; pluginId: string; path: string }>(
    'SELECT id, pluginId, path FROM Novel',
  );
  const novelIds = new Set(novels.map(n => n.id));
  const novelPaths = new Set(novels.map(n => `${n.pluginId}_${n.path}`));

  let cleanedCount = 0;

  for (const key of allKeys) {
    let shouldDelete = false;

    // Check tracker entries (format: TRACKED_NOVEL_PREFIX_<novelId>_<trackerName> or TRACKED_NOVEL_PREFIX_<novelId>)
    if (key.startsWith(TRACKED_NOVEL_PREFIX)) {
      const parts = key.replace(`${TRACKED_NOVEL_PREFIX}_`, '').split('_');
      const novelId = parseInt(parts[0], 10);
      if (!isNaN(novelId) && !novelIds.has(novelId)) {
        shouldDelete = true;
      }
    }

    // Check novel settings entries (format: PREFIX_<pluginId>_<path>)
    if (
      key.startsWith(NOVEL_SETTINSG_PREFIX) ||
      key.startsWith(LAST_READ_PREFIX) ||
      key.startsWith(NOVEL_PAGE_INDEX_PREFIX)
    ) {
      // Extract pluginId_path part after the prefix
      let pathPart = '';
      if (key.startsWith(NOVEL_SETTINSG_PREFIX)) {
        pathPart = key.replace(`${NOVEL_SETTINSG_PREFIX}_`, '');
      } else if (key.startsWith(LAST_READ_PREFIX)) {
        pathPart = key.replace(`${LAST_READ_PREFIX}_`, '');
      } else if (key.startsWith(NOVEL_PAGE_INDEX_PREFIX)) {
        pathPart = key.replace(`${NOVEL_PAGE_INDEX_PREFIX}_`, '');
      }

      // Trim whitespace/newlines that might be in the key
      pathPart = pathPart.trim();

      if (pathPart && !novelPaths.has(pathPart)) {
        shouldDelete = true;
      }
    }

    // Check migration flags
    if (key.startsWith(TRACKED_NOVEL_MIGRATION)) {
      const novelIdStr = key.replace(`${TRACKED_NOVEL_MIGRATION}_`, '');
      const novelId = parseInt(novelIdStr, 10);
      if (!isNaN(novelId) && !novelIds.has(novelId)) {
        shouldDelete = true;
      }
    }

    if (shouldDelete) {
      MMKVStorage.delete(key);
      cleanedCount++;
    }
  }

  return cleanedCount;
};

/**
 * Cleans up chapters with novelId that doesn't exist in Novel table (orphaned chapters).
 * This shouldn't happen due to CASCADE, but can occur from database inconsistencies.
 */
export const deleteOrphanedChapters = (): number => {
  const result = db.runSync(`
    DELETE FROM Chapter 
    WHERE novelId NOT IN (SELECT id FROM Novel)
  `);
  return result.changes;
};

/**
 * Cleans up NovelCategory entries for deleted novels or categories.
 * This shouldn't happen due to CASCADE, but can occur from database inconsistencies.
 */
export const deleteOrphanedNovelCategories = (): number => {
  const result = db.runSync(`
    DELETE FROM NovelCategory 
    WHERE novelId NOT IN (SELECT id FROM Novel)
       OR categoryId NOT IN (SELECT id FROM Category)
  `);
  return result.changes;
};

/**
 * Cleans up orphaned downloaded chapter files.
 * Finds files in NOVEL_STORAGE that don't correspond to existing novels.
 */
export const cleanupOrphanedFiles = async (): Promise<number> => {
  let cleanedCount = 0;

  try {
    // Get all existing novels
    const novels = db.getAllSync<{ id: number; pluginId: string }>(
      'SELECT id, pluginId FROM Novel',
    );
    const validPaths = new Set(
      novels.map(n => `${NOVEL_STORAGE}/${n.pluginId}/${n.id}`),
    );

    // Check if base storage exists
    if (!NativeFile.exists(NOVEL_STORAGE)) {
      return 0;
    }

    // Get all plugin directories
    const pluginDirs = NativeFile.readDir(NOVEL_STORAGE);

    for (const pluginDir of pluginDirs) {
      if (!pluginDir.isDirectory) {
        continue;
      }

      const pluginPath = pluginDir.path;

      try {
        const novelDirs = NativeFile.readDir(pluginPath);

        for (const novelDir of novelDirs) {
          if (!novelDir.isDirectory) {
            continue;
          }

          const novelPath = novelDir.path;
          if (!validPaths.has(novelPath) && NativeFile.exists(novelPath)) {
            try {
              NativeFile.unlink(novelPath);
              cleanedCount++;
            } catch (e) {
              // Continue even if single deletion fails
              if (__DEV__) {
                // eslint-disable-next-line no-console
                console.warn(
                  '[MaintenanceQueries] Failed to delete orphaned path:',
                  novelPath,
                  e,
                );
              }
            }
          }
        }
      } catch (e) {
        // Continue to next plugin directory
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn(
            '[MaintenanceQueries] Failed to list plugin directory:',
            pluginPath,
            e,
          );
        }
      }
    }
  } catch (error) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[MaintenanceQueries] cleanupOrphanedFiles error:', error);
    }
  }

  return cleanedCount;
};

/**
 * Runs SQLite VACUUM to reclaim space from deleted rows.
 * This can be slow on large databases.
 */
export const vacuumDatabase = () => {
  db.execSync('VACUUM');
};

/**
 * Analyzes tables and updates statistics for query optimization.
 */
export const analyzeDatabase = () => {
  db.execSync('ANALYZE');
};

/**
 * Runs SQLite integrity check to verify database health.
 */
export const checkDatabaseIntegrity = (): boolean => {
  const result = db.getFirstSync<{ integrity_check: string }>(
    'PRAGMA integrity_check',
  );
  return result?.integrity_check === 'ok';
};

/**
 * Full database maintenance routine.
 * Cleans orphaned data and optimizes the database.
 */
export const runDatabaseMaintenance = async (): Promise<{
  orphanedChapters: number;
  orphanedNovelCategories: number;
  orphanedMMKVEntries: number;
  orphanedFiles: number;
}> => {
  const results = {
    orphanedChapters: deleteOrphanedChapters(),
    orphanedNovelCategories: deleteOrphanedNovelCategories(),
    orphanedMMKVEntries: cleanupOrphanedMMKVEntries(),
    orphanedFiles: await cleanupOrphanedFiles(),
  };

  // Optimize database after cleanup
  analyzeDatabase();

  return results;
};

/**
 * Verifies downloaded chapters and fixes database inconsistencies.
 * Checks if chapters marked as downloaded in the DB actually have files.
 * If files are missing, updates the DB to mark them as not downloaded.
 */
export const verifyDownloadedChapters = async (): Promise<number> => {
  let fixedCount = 0;

  try {
    // Get all chapters marked as downloaded
    const downloadedChapters = db.getAllSync<{
      id: number;
      novelId: number;
      pluginId: string;
    }>(
      `SELECT Chapter.id, Chapter.novelId, Novel.pluginId 
       FROM Chapter 
       JOIN Novel ON Novel.id = Chapter.novelId 
       WHERE Chapter.isDownloaded = 1`,
    );

    for (const chapter of downloadedChapters) {
      const chapterFolder = `${NOVEL_STORAGE}/${chapter.pluginId}/${chapter.novelId}/${chapter.id}`;
      const indexPath = `${chapterFolder}/index.html`;

      // Check if the downloaded chapter files actually exist
      if (!NativeFile.exists(indexPath)) {
        // Files missing, update database to mark as not downloaded
        db.runSync('UPDATE Chapter SET isDownloaded = 0 WHERE id = ?', [
          chapter.id,
        ]);
        fixedCount++;
      }
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[verifyDownloadedChapters] Error:', error);
  }

  return fixedCount;
};

/**
 * Lightweight cleanup suitable for running on app startup.
 * Only cleans orphaned database entries, not files or MMKV.
 * Also verifies downloaded chapters and fixes inconsistencies.
 */
export const runStartupCleanup = async (): Promise<{
  orphanedChapters: number;
  orphanedNovelCategories: number;
  fixedDownloads: number;
}> => {
  const fixedDownloads = await verifyDownloadedChapters();

  return {
    orphanedChapters: deleteOrphanedChapters(),
    orphanedNovelCategories: deleteOrphanedNovelCategories(),
    fixedDownloads,
  };
};

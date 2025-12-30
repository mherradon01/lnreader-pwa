import { openDatabaseAsync } from 'expo-sqlite';
import {
  createCategoriesTableQuery,
  createCategoryDefaultQuery,
  createCategoryTriggerQuery,
} from './tables/CategoryTable';
import {
  createNovelIndexQuery,
  createNovelTableQuery,
  createNovelTriggerQueryDelete,
  createNovelTriggerQueryInsert,
  createNovelTriggerQueryUpdate,
  dropNovelIndexQuery,
} from './tables/NovelTable';
import { createNovelCategoryTableQuery } from './tables/NovelCategoryTable';
import {
  createChapterTableQuery,
  createChapterIndexQuery,
  dropChapterIndexQuery,
} from './tables/ChapterTable';

import { createRepositoryTableQuery } from './tables/RepositoryTable';
import { getErrorMessage } from '@utils/error';
import { showToast } from '@utils/showToast';
import { MigrationRunner } from './utils/migrationRunner';
import { migrations } from './migrations';

const dbName = 'lnreader.db';

// Database instance - will be initialized asynchronously
let dbInstance: Awaited<ReturnType<typeof openDatabaseAsync>> | null = null;

// Get the database instance (throws if not initialized)
export const getDb = () => {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initializeDatabaseAsync first.');
  }
  return dbInstance;
};

// Export db as a getter for compatibility
export const db = new Proxy({} as any, {
  get: (_, prop) => {
    const instance = getDb();
    const value = (instance as any)[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});

/**
 * Creates the initial database schema for fresh installations
 * Sets up all tables, indexes, triggers and sets version to 2
 */
const createInitialSchemaAsync = async () => {
  const database = getDb();
  
  await database.execAsync('PRAGMA journal_mode = WAL');
  await database.execAsync('PRAGMA synchronous = NORMAL');
  await database.execAsync('PRAGMA temp_store = MEMORY');

  await database.withTransactionAsync(async () => {
    await database.runAsync(createNovelTableQuery);
    await database.runAsync(createNovelIndexQuery);
    await database.runAsync(createCategoriesTableQuery);
    await database.runAsync(createCategoryDefaultQuery);
    await database.runAsync(createNovelCategoryTableQuery);
    await database.runAsync(createChapterTableQuery);
    await database.runAsync(createCategoryTriggerQuery);
    await database.runAsync(createChapterIndexQuery);
    await database.runAsync(createRepositoryTableQuery);
    await database.runAsync(createNovelTriggerQueryInsert);
    await database.runAsync(createNovelTriggerQueryUpdate);
    await database.runAsync(createNovelTriggerQueryDelete);

    await database.execAsync('PRAGMA user_version = 2');
  });
};

/**
 * Initializes the database with optimal settings and runs any pending migrations
 * Handles both fresh installations and existing databases
 */
export const initializeDatabaseAsync = async () => {
  // Open database asynchronously
  dbInstance = await openDatabaseAsync(dbName);
  const database = dbInstance;
  
  await database.execAsync('PRAGMA busy_timeout = 5000');
  await database.execAsync('PRAGMA cache_size = 10000');
  await database.execAsync('PRAGMA foreign_keys = ON');

  let userVersion = 0;
  try {
    const result = await database.getFirstAsync<{ user_version: number }>(
      'PRAGMA user_version',
    );
    userVersion = result?.user_version ?? 0;
  } catch (error) {
    // If PRAGMA query fails, assume fresh database
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(
        'Failed to get database version, assuming fresh install:',
        error,
      );
    }
    userVersion = 0;
  }

  if (userVersion === 0) {
    await createInitialSchemaAsync();
  }

  // Run migrations (needs to be made async-compatible)
  const migrationRunner = new MigrationRunner(migrations);
  // For now, run sync migrations after async init
  migrationRunner.runMigrations(database as any);
};

export const recreateDatabaseIndexesAsync = async () => {
  try {
    const database = getDb();
    
    await database.execAsync('PRAGMA analysis_limit=4000');
    await database.execAsync('PRAGMA optimize');

    await database.execAsync('PRAGMA journal_mode = WAL');
    await database.execAsync('PRAGMA foreign_keys = ON');
    await database.execAsync('PRAGMA synchronous = NORMAL');
    await database.execAsync('PRAGMA cache_size = 10000');
    await database.execAsync('PRAGMA temp_store = MEMORY');
    await database.execAsync('PRAGMA busy_timeout = 5000');

    await database.withTransactionAsync(async () => {
      await database.runAsync(dropNovelIndexQuery);
      await database.runAsync(dropChapterIndexQuery);
      await database.runAsync(createNovelIndexQuery);
      await database.runAsync(createChapterIndexQuery);
    });
  } catch (error: unknown) {
    showToast(getErrorMessage(error));
  }
};

// For compatibility - also export sync versions that work after init
export const initializeDatabase = () => {
  // This is a no-op on web - use initializeDatabaseAsync instead
  console.warn('[db.web] initializeDatabase called - use initializeDatabaseAsync on web');
};

export const recreateDatabaseIndexes = () => {
  recreateDatabaseIndexesAsync().catch(console.error);
};

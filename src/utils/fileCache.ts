/**
 * IndexedDB-based file cache for storing large blobs
 * Prevents storing massive files in MMKV which would cause memory issues
 */

const DB_NAME = 'LNReaderFileCache';
const STORE_NAME = 'files';

let dbInstance: IDBDatabase | null = null;

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = event => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });
};

/**
 * Store a large file blob in IndexedDB and return a cache key
 */
export async function cacheFile(blob: Blob, filename: string): Promise<string> {
  const cacheKey = `file_${Date.now()}_${Math.random()
    .toString(36)
    .substring(7)}`;

  try {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({
        key: cacheKey,
        blob,
        filename,
        timestamp: Date.now(),
      });

      request.onsuccess = () => {
        // console.log(`[FileCache] Cached file: ${filename} with key: ${cacheKey}`);
        resolve(cacheKey);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    // console.error('[FileCache] Failed to cache file:', error);
    throw error;
  }
}

/**
 * Retrieve a cached file blob by cache key
 */
export async function getCachedFile(cacheKey: string): Promise<Blob> {
  try {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(cacheKey);

      request.onsuccess = () => {
        if (request.result) {
          // console.log(`[FileCache] Retrieved cached file: ${cacheKey}`);
          resolve(request.result.blob);
        } else {
          reject(new Error(`File not found in cache: ${cacheKey}`));
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    // console.error('[FileCache] Failed to retrieve file:', error);
    throw error;
  }
}

/**
 * Clear a cached file
 */
export async function clearCachedFile(cacheKey: string): Promise<void> {
  try {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(cacheKey);

      request.onsuccess = () => {
        // console.log(`[FileCache] Cleared cached file: ${cacheKey}`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    // console.error('[FileCache] Failed to clear file:', error);
  }
}

/**
 * Clear all cached files (call when import completes)
 */
export async function clearAllCachedFiles(): Promise<void> {
  try {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        // console.log('[FileCache] Cleared all cached files');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    // console.error('[FileCache] Failed to clear all files:', error);
  }
}

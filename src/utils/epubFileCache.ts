/**
 * IndexedDB cache for large EPUB files during import
 * Stores blob data separately from task queue to avoid memory bloat
 */

const DB_NAME = 'LNReaderEPUBCache';
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

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

/**
 * Store a large file blob in IndexedDB and return a reference key
 * @param filename Original filename
 * @param blob File blob
 * @returns Reference key to retrieve the file later
 */
export async function cacheEPUBFile(filename: string, blob: Blob): Promise<string> {
  const db = await initDB();
  const id = `epub_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({
      id,
      filename,
      blob,
      createdAt: Date.now(),
    });

    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieve a cached EPUB file
 * @param id Reference key from cacheEPUBFile
 * @returns Blob data
 */
export async function getEPUBFile(id: string): Promise<Blob | null> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.blob : null);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete a cached EPUB file
 * @param id Reference key
 */
export async function deleteEPUBFile(id: string): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clean up old cached files (older than 24 hours)
 */
export async function cleanupOldEPUBFiles(): Promise<void> {
  const db = await initDB();
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const files = request.result as any[];
      files.forEach(file => {
        if (file.createdAt < oneDayAgo) {
          store.delete(file.id);
        }
      });
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

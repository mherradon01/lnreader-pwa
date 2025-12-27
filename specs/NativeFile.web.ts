// Web implementation of NativeFile using IndexedDB and File System API
const DB_NAME = 'LNReaderFileSystem';
const STORE_NAME = 'files';

let db: IDBDatabase | null = null;

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'path' });
      }
    };
  });
};

interface ReadDirResult {
  name: string;
  path: string;
  isDirectory: boolean;
}

const NativeFile = {
  writeFile: async (path: string, content: string): Promise<void> => {
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ path, content, isDirectory: false });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  readFile: async (path: string): Promise<string> => {
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(path);

      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result.content);
        } else {
          reject(new Error(`File not found: ${path}`));
        }
      };
      request.onerror = () => reject(request.error);
    });
  },

  copyFile: async (sourcePath: string, destPath: string): Promise<void> => {
    const content = await NativeFile.readFile(sourcePath);
    await NativeFile.writeFile(destPath, content);
  },

  moveFile: async (sourcePath: string, destPath: string): Promise<void> => {
    await NativeFile.copyFile(sourcePath, destPath);
    await NativeFile.unlink(sourcePath);
  },

  exists: async (filePath: string): Promise<boolean> => {
    const database = await initDB();
    return new Promise((resolve) => {
      const transaction = database.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(filePath);

      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => resolve(false);
    });
  },

  mkdir: async (filePath: string): Promise<void> => {
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ path: filePath, content: '', isDirectory: true });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  unlink: async (filePath: string): Promise<void> => {
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(filePath);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  readDir: async (dirPath: string): Promise<ReadDirResult[]> => {
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor();
      const results: ReadDirResult[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const path = cursor.value.path;
          if (path.startsWith(dirPath)) {
            const relativePath = path.substring(dirPath.length);
            const name = relativePath.split('/').filter(Boolean)[0];
            if (name) {
              results.push({
                name,
                path: `${dirPath}/${name}`,
                isDirectory: cursor.value.isDirectory || false,
              });
            }
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  },

  downloadFile: async (
    url: string,
    destPath: string,
    method: string,
    headers: { [key: string]: string } | Headers,
    body?: string,
  ): Promise<void> => {
    const response = await fetch(url, {
      method,
      headers: headers instanceof Headers ? headers : new Headers(headers),
      body,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const content = await response.text();
    await NativeFile.writeFile(destPath, content);
  },

  getConstants: () => ({
    ExternalDirectoryPath: '/storage/lnreader',
    ExternalCachesDirectoryPath: '/storage/cache',
  }),
};

export default NativeFile;

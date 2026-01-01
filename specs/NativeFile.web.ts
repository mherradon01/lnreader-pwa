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

interface FileEntry {
  path: string;
  content: string;
  isDirectory: boolean;
  isBase64?: boolean;
}

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
          const entry = request.result as FileEntry;
          // Return the content as-is
          // If it was stored as base64, it's still base64
          // The caller will handle decoding if needed
          resolve(entry.content);
        } else {
          reject(new Error(`File not found: ${path}`));
        }
      };
      request.onerror = () => reject(request.error);
    });
  },

  copyFile: async (sourcePath: string, destPath: string): Promise<void> => {
    console.log('[NativeFile.copyFile] Starting copy from:', sourcePath.substring(0, 50), 'to:', destPath);
    let content: string;
    let isBase64 = false;

    // Handle data URIs (base64 encoded)
    if (sourcePath.startsWith('data:')) {
      try {
        console.log('[NativeFile.copyFile] Processing data URI');
        // Extract base64 data from data URI
        const parts = sourcePath.split(',');
        if (parts.length === 2) {
          content = parts[1];
          isBase64 = true;
          console.log('[NativeFile.copyFile] Extracted base64, length:', content.length);
        } else {
          throw new Error('Invalid data URI format');
        }
      } catch (error) {
        console.error('[NativeFile.copyFile] Error parsing data URI:', error);
        throw new Error(`Failed to parse data URI: ${sourcePath}`);
      }
    }
    // Handle blob URLs (from file uploads)
    else if (sourcePath.startsWith('blob:')) {
      try {
        console.log('[NativeFile.copyFile] Fetching blob URL');
        const response = await fetch(sourcePath);
        const blob = await response.blob();
        console.log('[NativeFile.copyFile] Blob fetched, size:', blob.size);
        
        // For binary files (like EPUB), use base64 encoding
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            // Extract base64 data (remove data URI prefix)
            const base64 = result.split(',')[1];
            console.log('[NativeFile.copyFile] Blob converted to base64, length:', base64.length);
            resolve(base64);
          };
          reader.onerror = () => reject(reader.error);
        });

        content = await base64Promise;
        isBase64 = true;
      } catch (error) {
        console.error('[NativeFile.copyFile] Error reading blob:', error);
        throw new Error(`Failed to read blob: ${sourcePath}`);
      }
    } else {
      // Handle regular file paths
      console.log('[NativeFile.copyFile] Reading from file path');
      content = await NativeFile.readFile(sourcePath);
    }

    // Store file with base64 flag if needed
    console.log('[NativeFile.copyFile] Storing file in IndexedDB, size:', content.length, 'isBase64:', isBase64);
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ path: destPath, content, isDirectory: false, isBase64 });

      request.onsuccess = () => {
        console.log('[NativeFile.copyFile] File stored successfully at:', destPath);
        resolve();
      };
      request.onerror = () => {
        console.error('[NativeFile.copyFile] Error storing file:', request.error);
        reject(request.error);
      };
    });
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
    // Proxy GitHub raw URLs to bypass CORS on web
    let proxyUrl = url;
    if (url.includes('raw.githubusercontent.com')) {
      proxyUrl = url.replace('https://raw.githubusercontent.com', '/github-proxy');
    }

    const response = await fetch(proxyUrl, {
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

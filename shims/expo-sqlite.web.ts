/**
 * Web shim for expo-sqlite using sql.js
 * Provides full SQLite functionality in the browser using WebAssembly
 */

import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';

// Database instances cache
const databases: Map<string, WebSQLiteDatabase> = new Map();

// sql.js initialization promise
let sqlPromise: Promise<any> | null = null;
let SQL: any = null;

// Initialize sql.js
async function initSQL() {
  if (SQL) return SQL;
  if (!sqlPromise) {
    sqlPromise = initSqlJs({
      // Load sql.js wasm from local server or CDN fallback
      locateFile: (file: string) => {
        // Try local first, fall back to CDN
        if (typeof window !== 'undefined') {
          return `/${file}`;
        }
        return `https://sql.js.org/dist/${file}`;
      },
    });
  }
  SQL = await sqlPromise;
  return SQL;
}

// Storage key prefix for IndexedDB
const DB_STORAGE_KEY_PREFIX = 'lnreader_sqlite_';

// Save database to IndexedDB for persistence
async function saveToIndexedDB(name: string, data: Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('LNReaderDatabases', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('databases')) {
        db.createObjectStore('databases');
      }
    };
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['databases'], 'readwrite');
      const store = transaction.objectStore('databases');
      const putRequest = store.put(data, DB_STORAGE_KEY_PREFIX + name);
      
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
      
      transaction.oncomplete = () => db.close();
    };
  });
}

// Load database from IndexedDB
async function loadFromIndexedDB(name: string): Promise<Uint8Array | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('LNReaderDatabases', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('databases')) {
        db.createObjectStore('databases');
      }
    };
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['databases'], 'readonly');
      const store = transaction.objectStore('databases');
      const getRequest = store.get(DB_STORAGE_KEY_PREFIX + name);
      
      getRequest.onsuccess = () => resolve(getRequest.result || null);
      getRequest.onerror = () => reject(getRequest.error);
      
      transaction.oncomplete = () => db.close();
    };
  });
}

// Convert sql.js results to expo-sqlite format
function convertResults(results: any[]): any[] {
  if (!results || results.length === 0) return [];
  
  const result = results[0];
  if (!result || !result.columns || !result.values) return [];
  
  return result.values.map((row: any[]) => {
    const obj: any = {};
    result.columns.forEach((col: string, idx: number) => {
      obj[col] = row[idx];
    });
    return obj;
  });
}

// Web SQLite Database implementation using sql.js
class WebSQLiteDatabase {
  private db: SqlJsDatabase | null = null;
  private dbName: string;
  private initPromise: Promise<void> | null = null;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private isInitialized: boolean = false;
  private pendingOps: Array<() => void> = [];

  constructor(databaseName: string) {
    this.dbName = databaseName;
    // Start initialization immediately
    this.init();
  }

  // Initialize the database
  async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const SqlJs = await initSQL();
      
      // Try to load existing database from IndexedDB
      try {
        const savedData = await loadFromIndexedDB(this.dbName);
        if (savedData) {
          this.db = new SqlJs.Database(savedData);
          console.log(`[expo-sqlite-web] Loaded database "${this.dbName}" from IndexedDB`);
        } else {
          this.db = new SqlJs.Database();
          console.log(`[expo-sqlite-web] Created new database "${this.dbName}"`);
        }
      } catch (error) {
        console.warn(`[expo-sqlite-web] Could not load database from IndexedDB, creating new:`, error);
        this.db = new SqlJs.Database();
      }
      
      this.isInitialized = true;
      
      // Execute any pending operations
      while (this.pendingOps.length > 0) {
        const op = this.pendingOps.shift();
        if (op) op();
      }
    })();

    return this.initPromise;
  }

  // Wait for initialization (blocking-style for sync methods)
  private waitForInit(): void {
    if (this.isInitialized && this.db) return;
    
    // If not initialized, we need to wait
    // This is a workaround - we'll throw a more helpful error
    // and suggest the app should handle initialization properly
    if (!this.isInitialized) {
      // For sync operations when not yet initialized, we need to handle this
      // Since we can't truly block in JS, we'll create a temporary in-memory DB
      // that will be replaced once the real init completes
      console.warn('[expo-sqlite-web] Sync method called before init complete, using temporary database');
      
      if (!this.db && SQL) {
        this.db = new SQL.Database();
      } else if (!this.db) {
        // SQL not loaded yet - this is the problematic case
        // We need to do a synchronous init which isn't possible with WASM
        // Best we can do is throw a helpful error
        throw new Error(
          '[expo-sqlite-web] Database not ready. The app should wait for database initialization before using sync methods. Consider using async methods or ensuring openDatabaseAsync completes first.'
        );
      }
    }
  }

  // Schedule a save to IndexedDB (debounced)
  private scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.persistToStorage();
    }, 1000); // Save 1 second after last write
  }

  // Persist database to IndexedDB
  private async persistToStorage(): Promise<void> {
    if (!this.db) return;
    try {
      const data = this.db.export();
      await saveToIndexedDB(this.dbName, data);
    } catch (error) {
      console.error('[expo-sqlite-web] Failed to persist database:', error);
    }
  }

  // Sync methods
  execSync(source: string): void {
    this.waitForInit();
    try {
      this.db!.run(source);
      this.scheduleSave();
    } catch (error) {
      console.error('[expo-sqlite-web] execSync error:', error);
      throw error;
    }
  }

  runSync(source: string, ...args: any[]): { changes: number; lastInsertRowId: number } {
    this.waitForInit();
    try {
      // Handle both array params and variadic args (expo-sqlite uses variadic)
      const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      if (params && params.length > 0) {
        this.db!.run(source, params);
      } else {
        this.db!.run(source);
      }
      this.scheduleSave();
      
      // Get last insert rowid and changes
      const lastId = this.db!.exec('SELECT last_insert_rowid() as id');
      const changes = this.db!.exec('SELECT changes() as changes');
      
      return {
        lastInsertRowId: lastId[0]?.values[0]?.[0] as number || 0,
        changes: changes[0]?.values[0]?.[0] as number || 0,
      };
    } catch (error) {
      console.error('[expo-sqlite-web] runSync error:', error);
      throw error;
    }
  }

  getFirstSync<T = any>(source: string, ...args: any[]): T | null {
    this.waitForInit();
    try {
      // Handle both array params and variadic args (expo-sqlite uses variadic)
      const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      const stmt = this.db!.prepare(source);
      if (params && params.length > 0) {
        stmt.bind(params);
      }
      
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row as T;
      }
      stmt.free();
      return null;
    } catch (error) {
      console.error('[expo-sqlite-web] getFirstSync error:', error);
      throw error;
    }
  }

  getAllSync<T = any>(source: string, ...args: any[]): T[] {
    this.waitForInit();
    try {
      // Handle both array params and variadic args (expo-sqlite uses variadic)
      const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      let results;
      if (params && params.length > 0) {
        results = this.db!.exec(source, params);
      } else {
        results = this.db!.exec(source);
      }
      return convertResults(results) as T[];
    } catch (error) {
      console.error('[expo-sqlite-web] getAllSync error:', error);
      throw error;
    }
  }

  prepareSync(source: string): any {
    this.waitForInit();
    const stmt = this.db!.prepare(source);
    const self = this;
    
    return {
      executeSync: (params?: any[]) => {
        if (params && params.length > 0) {
          stmt.bind(params);
        }
        stmt.step();
        stmt.reset();
        self.scheduleSave();
        return { changes: 0, lastInsertRowId: 0 };
      },
      finalizeSync: () => {
        stmt.free();
      },
    };
  }

  withTransactionSync(callback: () => void): void {
    this.waitForInit();
    try {
      this.db!.run('BEGIN TRANSACTION');
      callback();
      this.db!.run('COMMIT');
      this.scheduleSave();
    } catch (error) {
      this.db!.run('ROLLBACK');
      throw error;
    }
  }

  // Async methods
  async execAsync(source: string): Promise<void> {
    await this.init();
    try {
      this.db!.run(source);
      this.scheduleSave();
    } catch (error) {
      console.error('[expo-sqlite-web] execAsync error:', error);
      throw error;
    }
  }

  async runAsync(source: string, ...params: any[]): Promise<{ changes: number; lastInsertRowId: number }> {
    await this.init();
    try {
      // Flatten params if first arg is an array
      const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
      
      if (flatParams && flatParams.length > 0) {
        this.db!.run(source, flatParams);
      } else {
        this.db!.run(source);
      }
      this.scheduleSave();
      
      const lastId = this.db!.exec('SELECT last_insert_rowid() as id');
      const changes = this.db!.exec('SELECT changes() as changes');
      
      return {
        lastInsertRowId: lastId[0]?.values[0]?.[0] as number || 0,
        changes: changes[0]?.values[0]?.[0] as number || 0,
      };
    } catch (error) {
      console.error('[expo-sqlite-web] runAsync error:', error);
      throw error;
    }
  }

  async getFirstAsync<T = any>(source: string, ...params: any[]): Promise<T | null> {
    await this.init();
    try {
      const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
      const stmt = this.db!.prepare(source);
      
      if (flatParams && flatParams.length > 0) {
        stmt.bind(flatParams);
      }
      
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row as T;
      }
      stmt.free();
      return null;
    } catch (error) {
      console.error('[expo-sqlite-web] getFirstAsync error:', error);
      throw error;
    }
  }

  async getAllAsync<T = any>(source: string, ...params: any[]): Promise<T[]> {
    await this.init();
    try {
      const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
      let results;
      
      if (flatParams && flatParams.length > 0) {
        results = this.db!.exec(source, flatParams);
      } else {
        results = this.db!.exec(source);
      }
      return convertResults(results) as T[];
    } catch (error) {
      console.error('[expo-sqlite-web] getAllAsync error:', error);
      throw error;
    }
  }

  async prepareAsync(source: string): Promise<any> {
    await this.init();
    const stmt = this.db!.prepare(source);
    const self = this;
    
    return {
      executeAsync: async (params?: any[]) => {
        if (params && params.length > 0) {
          stmt.bind(params);
        }
        stmt.step();
        stmt.reset();
        self.scheduleSave();
        return { changes: 0, lastInsertRowId: 0 };
      },
      finalizeAsync: async () => {
        stmt.free();
      },
    };
  }

  async withTransactionAsync(callback: () => Promise<void>): Promise<void> {
    await this.init();
    try {
      this.db!.run('BEGIN TRANSACTION');
      await callback();
      this.db!.run('COMMIT');
      this.scheduleSave();
    } catch (error) {
      this.db!.run('ROLLBACK');
      throw error;
    }
  }

  closeSync(): void {
    if (this.db) {
      // Persist before closing
      const data = this.db.export();
      saveToIndexedDB(this.dbName, data).catch(console.error);
      this.db.close();
      this.db = null;
    }
  }

  async closeAsync(): Promise<void> {
    if (this.db) {
      await this.persistToStorage();
      this.db.close();
      this.db = null;
    }
  }
}

// Factory functions
export function openDatabaseSync(databaseName: string): WebSQLiteDatabase {
  if (databases.has(databaseName)) {
    return databases.get(databaseName)!;
  }
  
  const db = new WebSQLiteDatabase(databaseName);
  databases.set(databaseName, db);
  
  // Initialize immediately in background
  (db as any).init().catch((err: Error) => {
    console.error('[expo-sqlite-web] Background init failed:', err);
  });
  
  return db;
}

export async function openDatabaseAsync(databaseName: string): Promise<WebSQLiteDatabase> {
  if (databases.has(databaseName)) {
    const db = databases.get(databaseName)!;
    await (db as any).init();
    return db;
  }
  
  const db = new WebSQLiteDatabase(databaseName);
  await (db as any).init();
  databases.set(databaseName, db);
  return db;
}

export function openDatabase(databaseName: string): WebSQLiteDatabase {
  return openDatabaseSync(databaseName);
}

// Export types
export type SQLiteDatabase = WebSQLiteDatabase;
export type SQLiteBindParams = any[];
export type SQLiteBindValue = any;
export type SQLiteRunResult = { changes: number; lastInsertRowId: number };

// Default export
export default {
  openDatabaseSync,
  openDatabaseAsync,
  openDatabase,
};

/**
 * Web shim for expo-sqlite
 * SQLite is not available in browsers, this provides stubs to prevent crashes
 * Real functionality would require using sql.js or IndexedDB
 */

// Stub database implementation
class WebSQLiteDatabase {
  constructor(databaseName: string) {
    console.warn(`SQLite not available on web. Database "${databaseName}" operations will be no-ops.`);
  }

  execSync(source: string): any {
    console.warn('SQLite execSync called on web (no-op):', source);
    return { rows: { _array: [] } };
  }

  runSync(source: string, params?: any[]): any {
    console.warn('SQLite runSync called on web (no-op):', source, params);
    return { changes: 0, lastInsertRowId: 0 };
  }

  getFirstSync(source: string, params?: any[]): any {
    console.warn('SQLite getFirstSync called on web (no-op):', source, params);
    return undefined;
  }

  getAllSync(source: string, params?: any[]): any[] {
    console.warn('SQLite getAllSync called on web (no-op):', source, params);
    return [];
  }

  prepareSync(source: string): any {
    console.warn('SQLite prepareSync called on web (no-op):', source);
    return {
      executeSync: (params?: any[]) => {
        console.warn('SQLite statement executeSync called on web (no-op):', params);
        return { rows: { _array: [] }, changes: 0, lastInsertRowId: 0 };
      },
      finalizeSync: () => {
        console.warn('SQLite statement finalizeSync called on web (no-op)');
      },
    };
  }

  withTransactionSync(callback: () => void): void {
    console.warn('SQLite withTransactionSync called on web (no-op)');
    try {
      callback();
    } catch (error) {
      console.warn('Transaction callback error (ignored on web):', error);
    }
  }

  async withTransactionAsync(callback: () => Promise<void>): Promise<void> {
    console.warn('SQLite withTransactionAsync called on web (no-op)');
    try {
      await callback();
    } catch (error) {
      console.warn('Transaction callback error (ignored on web):', error);
    }
  }

  // Async methods
  async execAsync(source: string): Promise<any> {
    console.warn('SQLite execAsync called on web (no-op):', source);
    return { rows: { _array: [] } };
  }

  async runAsync(source: string, ...params: any[]): Promise<any> {
    console.warn('SQLite runAsync called on web (no-op):', source, params);
    return { changes: 0, lastInsertRowId: 0 };
  }

  async getFirstAsync<T = any>(source: string, ...params: any[]): Promise<T | null> {
    console.warn('SQLite getFirstAsync called on web (no-op):', source, params);
    return null;
  }

  async getAllAsync<T = any>(source: string, ...params: any[]): Promise<T[]> {
    console.warn('SQLite getAllAsync called on web (no-op):', source, params);
    return [];
  }

  async prepareAsync(source: string): Promise<any> {
    console.warn('SQLite prepareAsync called on web (no-op):', source);
    return {
      executeAsync: async (params?: any[]) => {
        console.warn('SQLite statement executeAsync called on web (no-op):', params);
        return { rows: { _array: [] }, changes: 0, lastInsertRowId: 0 };
      },
      finalizeAsync: async () => {
        console.warn('SQLite statement finalizeAsync called on web (no-op)');
      },
    };
  }

  async closeAsync(): Promise<void> {
    console.warn('SQLite closeAsync called on web (no-op)');
  }

  closeSync(): void {
    console.warn('SQLite closeSync called on web (no-op)');
  }
}

export function openDatabaseSync(databaseName: string): WebSQLiteDatabase {
  return new WebSQLiteDatabase(databaseName);
}

export function openDatabase(databaseName: string): WebSQLiteDatabase {
  return new WebSQLiteDatabase(databaseName);
}

// Export other common SQLite functions as no-ops
export default {
  openDatabaseSync,
  openDatabase,
};

import { useEffect, useState, useCallback } from 'react';
import { initializeDatabaseAsync } from '@database/db';
import { runStartupCleanup } from '@database/queries/MaintenanceQueries';

interface UseDatabaseInitializationResult {
  isDbReady: boolean;
  dbError: Error | null;
  retryInitialization: () => void;
}

export const useDatabaseInitialization =
  (): UseDatabaseInitializationResult => {
    const [isDbReady, setIsDbReady] = useState(false);
    const [dbError, setDbError] = useState<Error | null>(null);

    const initDb = useCallback(async () => {
      try {
        setDbError(null);
        setIsDbReady(false);
        await initializeDatabaseAsync();

        // Run lightweight cleanup on startup to remove orphaned entries
        try {
          runStartupCleanup();
        } catch (cleanupError) {
          // Log but don't fail initialization if cleanup fails
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.warn('Startup cleanup warning:', cleanupError);
          }
        }

        setIsDbReady(true);
      } catch (error) {
        const dbInitError =
          error instanceof Error
            ? error
            : new Error('Database initialization failed');
        setDbError(dbInitError);
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.error('Database initialization error:', error);
        }
      }
    }, []);

    useEffect(() => {
      initDb();
    }, [initDb]);

    return {
      isDbReady,
      dbError,
      retryInitialization: initDb,
    };
  };

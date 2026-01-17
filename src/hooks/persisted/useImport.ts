import { useLibraryContext } from '@components/Context/LibraryContext';
import ServiceManager, { BackgroundTask } from '@services/ServiceManager';
import { DocumentPickerResult } from 'expo-document-picker';
import { useCallback, useEffect, useMemo } from 'react';
import { useMMKVObject } from 'react-native-mmkv';
import { cacheFile } from '@utils/fileCache';

export default function useImport() {
  const { refetchLibrary } = useLibraryContext();
  const [queue] = useMMKVObject<BackgroundTask[]>(
    ServiceManager.manager.STORE_KEY,
  );
  const importQueue = useMemo(
    () => queue?.filter(t => t.name === 'IMPORT_EPUB') || [],
    [queue],
  );

  useEffect(() => {
    refetchLibrary();
  }, [importQueue, refetchLibrary]);

  const importNovel = useCallback((pickedNovel: DocumentPickerResult) => {
    if (pickedNovel.canceled) return;

    // Process each selected file and store in cache directory
    Promise.all(
      pickedNovel.assets.map(async asset => {
        try {
          let blob: Blob | null = null;

          // Convert URI to blob
          if (asset.uri.startsWith('blob:')) {
            const response = await fetch(asset.uri);
            blob = await response.blob();
          } else if (asset.uri.startsWith('data:')) {
            // Data URI - convert to blob
            const arr = asset.uri.split(',');
            const bstr = atob(arr[1]);
            const n = bstr.length;
            const u8arr = new Uint8Array(n);
            for (let i = 0; i < n; i++) {
              u8arr[i] = bstr.charCodeAt(i);
            }
            blob = new Blob([u8arr], { type: 'application/epub+zip' });
          } else {
            // Already a file path - store directly
            return {
              name: 'IMPORT_EPUB' as const,
              data: {
                filename: asset.name,
                uri: asset.uri,
              },
            };
          }

          if (!blob) {
            throw new Error('Failed to create blob from asset');
          }

          // Cache the blob in IndexedDB instead of writing to file system
          // This avoids storing huge URIs in MMKV
          const cacheKey = await cacheFile(blob, asset.name);

          return {
            name: 'IMPORT_EPUB' as const,
            data: {
              filename: asset.name,
              uri: cacheKey, // Store only the cache key, not the file data
            },
          };
        } catch (error) {
          return null;
        }
      }),
    )
      .then(tasks => {
        const validTasks = tasks.filter(Boolean) as any;

        // Sanitize tasks to ensure they're serializable
        const sanitizedTasks = validTasks.map((task: any) => ({
          name: task.name,
          data: {
            filename: String(task.data.filename),
            uri: String(task.data.uri),
          },
        }));

        try {
          ServiceManager.manager.addTask(sanitizedTasks);
        } catch (error) {
          // Alert user with more details
          const errorMsg =
            error instanceof Error ? error.message : 'Unknown error';
          alert(`Failed to add import tasks: ${errorMsg}`);
        }
      })
      .catch(_error => {});
  }, []);

  const resumeImport = () => ServiceManager.manager.resume();

  const pauseImport = () => ServiceManager.manager.pause();

  const cancelImport = () =>
    ServiceManager.manager.removeTasksByName('IMPORT_EPUB');

  return {
    importQueue,
    importNovel,
    resumeImport,
    pauseImport,
    cancelImport,
  };
}

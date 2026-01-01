import { useLibraryContext } from '@components/Context/LibraryContext';
import ServiceManager, { BackgroundTask } from '@services/ServiceManager';
import { DocumentPickerResult } from 'expo-document-picker';
import { useCallback, useEffect, useMemo } from 'react';
import { useMMKVObject } from 'react-native-mmkv';

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

    console.log('[useImport] Starting import for', pickedNovel.assets.length, 'files');

    // On web, we need to convert blob URIs to base64 immediately
    // because blob URLs are only valid in the current document context
    Promise.all(
      pickedNovel.assets.map(async (asset) => {
        console.log('[useImport] Processing asset:', asset.name, 'URI:', asset.uri.substring(0, 50));
        let uri = asset.uri;

        // If it's a blob URL on web, convert it to base64 data URI
        if (uri.startsWith('blob:')) {
          try {
            console.log('[useImport] Converting blob URL to base64 for', asset.name);
            const response = await fetch(uri);
            console.log('[useImport] Fetch response status:', response.status, 'ok:', response.ok);
            const blob = await response.blob();
            console.log('[useImport] Blob fetched successfully, size:', blob.size, 'type:', blob.type);
            
            const reader = new FileReader();
            console.log('[useImport] FileReader created, starting readAsDataURL');
            
            uri = await new Promise<string>((resolve, reject) => {
              const timeout = setTimeout(() => {
                console.error('[useImport] FileReader timeout after 30s');
                reject(new Error('FileReader timeout'));
              }, 30000);

              reader.onload = () => {
                clearTimeout(timeout);
                const result = reader.result as string;
                console.log('[useImport] FileReader onload fired, result length:', result.length);
                resolve(result);
              };
              reader.onerror = () => {
                clearTimeout(timeout);
                console.error('[useImport] FileReader onerror:', reader.error);
                reject(reader.error);
              };
              reader.onabort = () => {
                clearTimeout(timeout);
                console.error('[useImport] FileReader onabort');
                reject(new Error('FileReader aborted'));
              };
              
              console.log('[useImport] Starting FileReader.readAsDataURL');
              reader.readAsDataURL(blob);
            });
            console.log('[useImport] Promise resolved, uri length:', uri.length);
          } catch (error) {
            console.error('[useImport] Failed to convert blob to base64:', error);
            console.error('[useImport] Error stack:', error instanceof Error ? error.stack : 'no stack');
            return null;
          }
        }

        return {
          name: 'IMPORT_EPUB' as const,
          data: {
            filename: asset.name,
            uri,
          },
        };
      })
    ).then((tasks) => {
      console.log('[useImport] Promise.all completed, tasks count:', tasks.length);
      const validTasks = tasks.filter(Boolean) as any;
      console.log('[useImport] Adding', validTasks.length, 'tasks to queue');
      ServiceManager.manager.addTask(validTasks);
      console.log('[useImport] Tasks added successfully');
    }).catch((error) => {
      console.error('[useImport] Promise.all rejected:', error);
      console.error('[useImport] Error details:', error instanceof Error ? error.message : 'unknown error');
    });
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

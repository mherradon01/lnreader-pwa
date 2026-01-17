import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { debounce } from 'lodash-es';

import { NovelItem, PluginItem } from '@plugins/types';
import { getPlugin, loadPlugin } from '@plugins/pluginManager';
import { useBrowseSettings, usePlugins } from '@hooks/persisted';
import { useFocusEffect } from '@react-navigation/native';

interface Props {
  defaultSearchText?: string;
  hasResultsOnly?: boolean;
}

export interface GlobalSearchResult {
  isLoading: boolean;
  plugin: PluginItem;
  novels: NovelItem[];
  error?: string | null;
}

export const useGlobalSearch = ({
  defaultSearchText,
  hasResultsOnly = false,
}: Props) => {
  const isMounted = useRef(true); //if user closes the search screen, cancel the search
  const isFocused = useRef(true); //if the user opens a sub-screen (e.g. novel screen), pause the search
  const lastSearch = useRef(''); //if the user changes search, cancel running searches
  const lastEffectSearch = useRef(''); //track last search triggered by effect to prevent duplicates
  useEffect(
    () => () => {
      isMounted.current = false;
    },
    [],
  );
  useFocusEffect(
    useCallback(() => {
      isFocused.current = true;

      return () => (isFocused.current = false);
    }, []),
  );

  const { filteredInstalledPlugins } = usePlugins();

  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);
  const [progress, setProgress] = useState(0);

  const { globalSearchConcurrency = 1 } = useBrowseSettings();

  const globalSearch = useCallback(
    (searchText: string) => {
      if (!searchText || lastSearch.current === searchText) {
        return;
      }
      lastSearch.current = searchText;

      // If no plugins are installed, set empty results
      if (filteredInstalledPlugins.length === 0) {
        setSearchResults([]);
        setProgress(0);
        return;
      }

      const defaultResult: GlobalSearchResult[] = filteredInstalledPlugins.map(
        plugin => ({
          isLoading: true,
          plugin,
          novels: [],
          error: null,
        }),
      );

      setSearchResults(defaultResult.sort(novelResultSorter));
      setProgress(0);

      let running = 0;

      async function searchInPlugin(_plugin: PluginItem) {
        try {
          // Try sync getPlugin first (cached), fallback to async loadPlugin for web
          let plugin = getPlugin(_plugin.id);
          if (!plugin) {
            plugin = await loadPlugin(_plugin.id);
          }
          if (!plugin) {
            throw new Error(`Failed to load plugin: ${_plugin.name}`);
          }
          const res = await plugin.searchNovels(searchText, 1);

          try {
            setSearchResults(prevState =>
              prevState
                .map(prevResult =>
                  prevResult.plugin.id === _plugin.id
                    ? { ...prevResult, novels: res, isLoading: false }
                    : { ...prevResult },
                )
                .sort(novelResultSorter),
            );
          } catch (stateError: any) {
            throw stateError;
          }
        } catch (error: any) {
          const errorMessage = error?.message || String(error);
          try {
            setSearchResults(prevState =>
              prevState
                .map(prevResult =>
                  prevResult.plugin.id === _plugin.id
                    ? {
                        ...prevResult,
                        novels: [],
                        isLoading: false,
                        error: errorMessage,
                      }
                    : { ...prevResult },
                )
                .sort(novelResultSorter),
            );
          } catch (stateError: any) {
            // Don't rethrow here - we want to continue with other plugins
          }
        }
      }

      //Sort so we load the plugins results in the same order as they show on the list
      const filteredSortedInstalledPlugins = [...filteredInstalledPlugins].sort(
        (a, b) => a.name.localeCompare(b.name),
      );

      (async () => {
        if (globalSearchConcurrency > 1) {
          for (const _plugin of filteredSortedInstalledPlugins) {
            while (running >= globalSearchConcurrency || !isFocused.current) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            if (!isMounted.current || lastSearch.current !== searchText) {
              break;
            }
            running++;
            searchInPlugin(_plugin)
              .then(() => {
                running--;
                if (lastSearch.current === searchText) {
                  setProgress(
                    prevState =>
                      prevState + 1 / filteredInstalledPlugins.length,
                  );
                }
              })
              .catch(_err => {
                running--;
                // Still update progress even on error
                if (lastSearch.current === searchText) {
                  setProgress(
                    prevState =>
                      prevState + 1 / filteredInstalledPlugins.length,
                  );
                }
              });
          }
        } else {
          for (const _plugin of filteredSortedInstalledPlugins) {
            if (!isMounted.current || lastSearch.current !== searchText) {
              break;
            }
            while (!isFocused.current) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            try {
              await searchInPlugin(_plugin);
            } catch (err) {
              // Ignore error and continue with next plugin
            }
            if (lastSearch.current === searchText) {
              setProgress(
                prevState => prevState + 1 / filteredInstalledPlugins.length,
              );
            }
          }
        }
      })();
    },
    [filteredInstalledPlugins, globalSearchConcurrency],
  );

  const debouncedGlobalSearch = useMemo(
    () => debounce(globalSearch, 300),
    [globalSearch],
  );

  useEffect(() => {
    if (defaultSearchText && defaultSearchText !== lastEffectSearch.current) {
      lastEffectSearch.current = defaultSearchText;
      debouncedGlobalSearch(defaultSearchText);
    }

    return () => {
      debouncedGlobalSearch.cancel();
    };
  }, [defaultSearchText, debouncedGlobalSearch]);

  const filteredSearchResults = useMemo(() => {
    if (!hasResultsOnly) {
      return searchResults;
    }
    return searchResults.filter(
      result => !result.isLoading && !result.error && result.novels.length > 0,
    );
  }, [searchResults, hasResultsOnly]);

  return { searchResults: filteredSearchResults, globalSearch, progress };
};

function novelResultSorter(
  { novels: a, plugin: { name: aName } }: GlobalSearchResult,
  { novels: b, plugin: { name: bName } }: GlobalSearchResult,
) {
  if (!a.length && !b.length) {
    return aName.localeCompare(bName);
  }
  if (!a.length) {
    return 1;
  }
  if (!b.length) {
    return -1;
  }

  return aName.localeCompare(bName);
}

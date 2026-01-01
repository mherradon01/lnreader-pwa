import { getPlugin, LOCAL_PLUGIN_ID } from '@plugins/pluginManager';
import { isUrlAbsolute } from '@plugins/helpers/isAbsoluteUrl';

export const fetchNovel = async (pluginId: string, novelPath: string) => {
  // Local novels don't need to be fetched
  if (pluginId === LOCAL_PLUGIN_ID) {
    return null;
  }

  const plugin = getPlugin(pluginId);
  if (!plugin) {
    throw new Error(`Unknown plugin: ${pluginId}`);
  }
  const res = await plugin.parseNovel(novelPath);
  return res;
};

export const fetchChapter = async (pluginId: string, chapterPath: string) => {
  // Local novels have chapters stored in the file system
  if (pluginId === LOCAL_PLUGIN_ID) {
    // Chapter content is read directly from the database for local novels
    return '';
  }

  const plugin = getPlugin(pluginId);
  let chapterText = `Unknown plugin: ${pluginId}`;
  if (plugin) {
    chapterText = await plugin.parseChapter(chapterPath);
  }
  return chapterText;
};

export const fetchChapters = async (pluginId: string, novelPath: string) => {
  // Local novels don't need to fetch chapters
  if (pluginId === LOCAL_PLUGIN_ID) {
    return [];
  }

  const plugin = getPlugin(pluginId);
  if (!plugin) {
    throw new Error(`Unknown plugin: ${pluginId}`);
  }
  const res = await plugin.parseNovel(novelPath);
  return res?.chapters;
};

export const fetchPage = async (
  pluginId: string,
  novelPath: string,
  page: string,
) => {
  // Local novels don't support pagination
  if (pluginId === LOCAL_PLUGIN_ID) {
    return { chapters: [] };
  }

  const plugin = getPlugin(pluginId);

  if (!plugin) {
    throw new Error(`Unknown plugin: ${pluginId}`);
  }

  if (!plugin.parsePage) {
    throw new Error(`Could not fetch chapters for page ${page}`);
  }
  const res = await plugin.parsePage(novelPath, page);
  return res;
};

export const resolveUrl = (
  pluginId: string,
  path: string,
  isNovel?: boolean,
) => {
  if (isUrlAbsolute(path)) {
    return path;
  }

  // Local novels don't have URLs to resolve
  if (pluginId === LOCAL_PLUGIN_ID) {
    return path;
  }

  const plugin = getPlugin(pluginId);
  try {
    if (!plugin) {
      throw new Error(`Unknown plugin: ${pluginId}`);
    }
    if (plugin.resolveUrl) {
      return plugin.resolveUrl(path, isNovel);
    }
  } catch {
    return path;
  }
  return plugin.site + path;
};

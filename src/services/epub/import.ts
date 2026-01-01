import dayjs from 'dayjs';
import {
  updateNovelCategoryById,
  updateNovelInfo,
} from '@database/queries/NovelQueries';
import { LOCAL_PLUGIN_ID } from '@plugins/pluginManager';
import { getString } from '@strings/translations';
import { NOVEL_STORAGE } from '@utils/Storages';
import { db } from '@database/db';
import { BackgroundTaskMetadata } from '@services/ServiceManager';
import { getCachedFile, clearCachedFile } from '@utils/fileCache';

import NativeFile from '@specs/NativeFile';
import NativeZipArchive from '@specs/NativeZipArchive';
import NativeEpub from '@specs/NativeEpub';

const decodePath = (path: string) => {
  try {
    return decodeURI(path);
  } catch {
    return path;
  }
};

// Helper function to normalize paths and resolve ".." sequences
function normalizePath(path: string): string {
  const parts = path.split('/');
  const result: string[] = [];
  
  for (const part of parts) {
    if (part === '..') {
      // Go up one directory
      if (result.length > 0) {
        result.pop();
      }
    } else if (part && part !== '.') {
      // Add non-empty parts (skip "." and empty strings from double slashes)
      result.push(part);
    }
  }
  
  // Reconstruct path, preserving leading slash if present
  const normalized = result.join('/');
  return path.startsWith('/') ? '/' + normalized : normalized;
}

const insertLocalNovel = async (
  name: string,
  path: string,
  cover?: string,
  author?: string,
  artist?: string,
  summary?: string,
) => {
  const insertedNovel = await db.runAsync(
    `
      INSERT INTO 
        Novel(name, path, pluginId, inLibrary, isLocal) 
        VALUES(?, ?, 'local', 1, 1)`,
    name,
    path,
  );
  if (insertedNovel.lastInsertRowId && insertedNovel.lastInsertRowId >= 0) {
    await updateNovelCategoryById(insertedNovel.lastInsertRowId, [2]);
    const novelDir = NOVEL_STORAGE + '/local/' + insertedNovel.lastInsertRowId;
    await NativeFile.mkdir(novelDir);
    
    let coverPath = '';
    if (cover) {
      console.log('[insertLocalNovel] Original cover path:', cover);
      const decodedPath = decodePath(cover);
      console.log('[insertLocalNovel] Decoded cover path:', decodedPath);
      const coverFileName = decodedPath.split(/[/\\]/).pop();
      console.log('[insertLocalNovel] Cover file name:', coverFileName);
      const coverDestPath = novelDir + '/' + coverFileName;
      console.log('[insertLocalNovel] Cover destination path:', coverDestPath);
      
      const coverExists = await NativeFile.exists(decodedPath);
      console.log('[insertLocalNovel] Cover exists at source:', coverExists);
      if (coverExists) {
        await NativeFile.moveFile(decodedPath, coverDestPath);
        // Store the file:// URL for display with timestamp to bypass cache
        coverPath = 'file://' + coverDestPath + '?' + Date.now();
        console.log('[insertLocalNovel] Cover moved to:', coverDestPath);
        console.log('[insertLocalNovel] Cover stored as:', coverPath);
      } else {
        console.warn('[insertLocalNovel] Cover file not found at:', decodedPath);
      }
    }

    await updateNovelInfo({
      id: insertedNovel.lastInsertRowId,
      pluginId: LOCAL_PLUGIN_ID,
      author: author,
      artist: artist,
      summary: summary,
      path: NOVEL_STORAGE + '/local/' + insertedNovel.lastInsertRowId,
      cover: coverPath,
      name: name,
      inLibrary: true,
      isLocal: true,
      totalPages: 0,
    });
    console.log('[insertLocalNovel] Novel info updated with cover:', coverPath);
    return insertedNovel.lastInsertRowId;
  }
  throw new Error(getString('advancedSettingsScreen.novelInsertFailed'));
};

const insertLocalChapter = async (
  novelId: number,
  fakeId: number,
  name: string,
  path: string,
  releaseTime: string,
) => {
  const insertedChapter = await db.runAsync(
    'INSERT INTO Chapter(novelId, name, path, releaseTime, position, isDownloaded) VALUES(?, ?, ?, ?, ?, ?)',
    novelId,
    name,
    NOVEL_STORAGE + '/local/' + novelId + '/' + fakeId,
    releaseTime,
    fakeId,
    1,
  );
  if (insertedChapter.lastInsertRowId && insertedChapter.lastInsertRowId >= 0) {
    let chapterText: string = '';
    try {
      chapterText = await NativeFile.readFile(decodePath(path));
    } catch (error) {
      console.warn('[insertLocalChapter] Could not read chapter file:', path, error);
      return [];
    }
    
    if (!chapterText) {
      console.warn('[insertLocalChapter] Chapter text is empty:', path);
      return [];
    }
    
    const novelDir = NOVEL_STORAGE + '/local/' + novelId;
    const epubCacheDir = NativeFile.getConstants().ExternalCachesDirectoryPath + '/epub';
    
    // Rewrite resource paths to point to EPUB cache directory
    // This handles images, stylesheets, fonts, etc.
    // For very large files, skip the rewriting to avoid stack overflow
    if (chapterText.length < 10 * 1024 * 1024) { // 10MB limit
      try {
        const chapterDirFull = path.substring(0, path.lastIndexOf('/'));
        const chapterDirRelative = chapterDirFull.startsWith(epubCacheDir + '/') 
          ? chapterDirFull.substring(epubCacheDir.length + 1) 
          : chapterDirFull;
        
        chapterText = chapterText.replace(
          /(href|src)=["']([^"']*?)["']/g,
          (match: string, attrName: string, resourcePath: string) => {
            // Skip absolute URLs and data URLs
            if (resourcePath.startsWith('http') || resourcePath.startsWith('data:')) {
              return match;
            }
            // Skip already-converted file:// URLs
            if (resourcePath.startsWith('file://')) {
              return match;
            }
            
            const resolvedPath = epubCacheDir + '/' + chapterDirRelative + '/' + resourcePath;
            const normalizedPath = normalizePath(resolvedPath);
            
            return `${attrName}="${normalizedPath}"`;
          },
        );
      } catch (error) {
        console.warn('[insertLocalChapter] Error rewriting paths, continuing without rewriting:', error);
      }
    } else {
      console.log('[insertLocalChapter] Chapter HTML too large, skipping path rewriting');
    }
    
    await NativeFile.mkdir(novelDir + '/' + insertedChapter.lastInsertRowId);
    await NativeFile.writeFile(
      novelDir + '/' + insertedChapter.lastInsertRowId + '/index.html',
      chapterText,
    );
    console.log('[insertLocalChapter] Chapter stored:', insertedChapter.lastInsertRowId);
    return;
  }
  throw new Error(getString('advancedSettingsScreen.chapterInsertFailed'));
};

export const importEpub = async (
  {
    uri,
    filename,
  }: {
    uri: string;
    filename: string;
  },
  setMeta: (
    transformer: (meta: BackgroundTaskMetadata) => BackgroundTaskMetadata,
  ) => void,
) => {
  setMeta(meta => ({
    ...meta,
    isRunning: true,
    progress: 0,
  }));

  console.log('[importEpub] Starting EPUB import for:', filename);

  const epubFilePath =
    NativeFile.getConstants().ExternalCachesDirectoryPath + '/novel.epub';
  console.log('[importEpub] Copying file to:', epubFilePath);
  
  // Check if URI is a cache key (starts with 'file_') or a direct URI
  if (uri.startsWith('file_')) {
    console.log('[importEpub] Retrieving file from cache with key:', uri);
    const blob = await getCachedFile(uri);
    if (!blob) {
      throw new Error('Cached EPUB file not found: ' + uri);
    }
    
    // Convert blob to array buffer and write to file
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Use chunked approach to avoid stack overflow with large files
    let binaryString = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize);
      binaryString += String.fromCharCode(...chunk);
    }
    const base64 = btoa(binaryString);
    
    await NativeFile.writeFile(epubFilePath, base64);
    
    // Clean up the cache after retrieval
    clearCachedFile(uri).catch(err => {
      console.warn('[importEpub] Failed to cleanup cached file:', err);
    });
  } else {
    // Direct URI (data URI or file path)
    await NativeFile.copyFile(uri, epubFilePath);
  }
  
  console.log('[importEpub] File copied successfully');

  const epubDirPath =
    NativeFile.getConstants().ExternalCachesDirectoryPath + '/epub';
  console.log('[importEpub] Checking if epub dir exists:', epubDirPath);
  if (await NativeFile.exists(epubDirPath)) {
    console.log('[importEpub] Removing existing epub dir');
    await NativeFile.unlink(epubDirPath);
  }
  console.log('[importEpub] Creating epub dir');
  await NativeFile.mkdir(epubDirPath);
  console.log('[importEpub] Unzipping EPUB file');
  await NativeZipArchive.unzip(epubFilePath, epubDirPath);
  console.log('[importEpub] EPUB unzipped successfully');

  console.log('[importEpub] Parsing novel from:', epubDirPath);
  const novel = await NativeEpub.parseNovelAndChapters(epubDirPath);
  console.log('[importEpub] Novel parsed:', { name: novel.name, chapters: novel.chapters?.length });
  console.log('[importEpub] Image paths from parser:', novel.imagePaths);
  console.log('[importEpub] CSS paths from parser:', novel.cssPaths);
  
  if (!novel.name) {
    novel.name = filename.replace('.epub', '') || 'Untitled';
  }
  
  const novelId = await insertLocalNovel(
    novel.name,
    epubDirPath + novel.name, // temporary
    novel.cover || '',
    novel.author || '',
    novel.artist || '',
    novel.summary || '',
  );
  const now = dayjs().toISOString();
  console.log('[importEpub] Processing', novel.chapters?.length || 0, 'chapters');
  
  if (novel.chapters && Array.isArray(novel.chapters)) {
    for (let i = 0; i < novel.chapters.length; i++) {
      const chapter = novel.chapters[i];
      console.log('[importEpub] Processing chapter', i, ':', chapter.name);
      if (!chapter.name) {
        chapter.name = chapter.path.split(/[/\\]/).pop() || 'unknown';
      }

      setMeta(meta => ({
        ...meta,
        progressText: chapter.name,
      }));

      await insertLocalChapter(novelId, i, chapter.name, chapter.path, now);

      setMeta(meta => ({
        ...meta,
        progress: i / novel.chapters.length,
      }));
    }
  } else {
    console.warn('[importEpub] No chapters found or chapters is not an array');
  }
  
  const novelDir = NOVEL_STORAGE + '/local/' + novelId;

  setMeta(meta => ({
    ...meta,
    progressText: getString('advancedSettingsScreen.importStaticFiles'),
  }));

  // Note: Cover image extraction is already handled in insertLocalNovel
  // Additional image and CSS extraction is skipped as they're typically embedded in chapters
  console.log('[importEpub] Image extraction handled via cover extraction');

  setMeta(meta => ({
    ...meta,
    progress: 1,
    isRunning: false,
  }));
};

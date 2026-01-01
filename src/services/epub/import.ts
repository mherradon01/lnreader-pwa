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
    NativeFile.mkdir(novelDir);
    const newCoverPath =
      'file://' + novelDir + '/' + cover?.split(/[/\\]/).pop();

    if (cover) {
      const decodedPath = decodePath(cover);
      if (NativeFile.exists(decodedPath)) {
        NativeFile.moveFile(decodedPath, newCoverPath);
      }
    }
    await updateNovelInfo({
      id: insertedNovel.lastInsertRowId,
      pluginId: LOCAL_PLUGIN_ID,
      author: author,
      artist: artist,
      summary: summary,
      path: NOVEL_STORAGE + '/local/' + insertedNovel.lastInsertRowId,
      cover: newCoverPath,
      name: name,
      inLibrary: true,
      isLocal: true,
      totalPages: 0,
    });
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
    chapterText = chapterText.replace(
      /=(?<= href=| src=)(["'])([^]*?)\1/g,
      (_, __, $2: string) => {
        return `="file://${novelDir}/${$2.split(/[/\\]/).pop()}"`;
      },
    );
    
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
  await NativeFile.copyFile(uri, epubFilePath);
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

  for (const filePath of novel.imagePaths) {
    const decodedPath = decodePath(filePath);

    if (NativeFile.exists(decodedPath)) {
      NativeFile.moveFile(
        decodedPath,
        novelDir + '/' + filePath.split(/[/\\]/).pop(),
      );
    }
  }

  for (const filePath of novel.cssPaths) {
    const decodedPath = decodePath(filePath);
    if (NativeFile.exists(decodedPath)) {
      NativeFile.moveFile(
        decodedPath,
        novelDir + '/' + filePath.split(/[/\\]/).pop(),
      );
    }
  }

  setMeta(meta => ({
    ...meta,
    progress: 1,
    isRunning: false,
  }));
};

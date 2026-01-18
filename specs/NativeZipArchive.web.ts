// Web implementation of NativeZipArchive using JSZip
import JSZip from 'jszip';
import NativeFile from './NativeFile.web';

const NativeZipArchive = {
  zip: async (sourceDirPath: string, destFilePath: string): Promise<void> => {
    // For web, we'll create a basic implementation that works with the virtual file system
    console.warn('NativeZipArchive.zip: Web implementation limited');
    // This would need integration with NativeFile.web to work properly
    return Promise.resolve();
  },

  unzip: async (sourceFilePath: string, distDirPath: string): Promise<void> => {
    try {
      console.log('[NativeZipArchive.unzip] Starting unzip from:', sourceFilePath, 'to:', distDirPath);
      
      // Read the zip file from NativeFile (stored as base64)
      console.log('[NativeZipArchive.unzip] Reading zip file from storage');
      const zipContent = await NativeFile.readFile(sourceFilePath);
      console.log('[NativeZipArchive.unzip] Zip file size:', zipContent.length);
      
      // Convert from base64 to ArrayBuffer
      console.log('[NativeZipArchive.unzip] Converting base64 to ArrayBuffer');
      const binaryString = atob(zipContent);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const arrayBuffer = bytes.buffer;
      console.log('[NativeZipArchive.unzip] ArrayBuffer size:', arrayBuffer.byteLength);

      // Load and extract zip
      console.log('[NativeZipArchive.unzip] Loading zip archive');
      const zip = await JSZip.loadAsync(arrayBuffer);
      console.log('[NativeZipArchive.unzip] Zip loaded, extracting files');

      // Extract all files
      const filePromises: Promise<void>[] = [];
      let fileCount = 0;
      let dirCount = 0;

      zip.forEach((relativePath, file) => {
        const filePath = `${distDirPath}/${relativePath}`;

        if (file.dir) {
          dirCount++;
          // Create directory
          filePromises.push(NativeFile.mkdir(filePath).catch(() => {}));
        } else {
          fileCount++;
          // Extract file
          // Check if it's likely a binary file (image, pdf, etc.)
          const isBinary = /\.(jpg|jpeg|png|gif|webp|pdf|zip|epub|ttf|woff|woff2|eot)$/i.test(relativePath);
          
          if (isBinary) {
            // For binary files, extract as base64
            filePromises.push(
              file.async('base64').then((content) => {
                console.log('[NativeZipArchive.unzip] Extracting binary file:', relativePath, 'size:', content.length);
                return NativeFile.writeFile(filePath, content);
              })
            );
          } else {
            // For text files, extract as string
            filePromises.push(
              file.async('string').then((content) => {
                console.log('[NativeZipArchive.unzip] Extracting text file:', relativePath, 'size:', content.length);
                return NativeFile.writeFile(filePath, content);
              })
            );
          }
        }
      });

      console.log('[NativeZipArchive.unzip] Total files to extract:', fileCount, 'dirs:', dirCount);
      await Promise.all(filePromises);
      console.log('[NativeZipArchive.unzip] All files extracted successfully');
    } catch (error) {
      console.error('[NativeZipArchive.unzip] Error:', error);
      throw error;
    }
  },

  remoteUnzip: async (
    distDirPath: string,
    url: string,
    headers: { [key: string]: string },
  ): Promise<void> => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: new Headers(headers),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);

      // Extract files
      const filePromises: Promise<void>[] = [];
      zip.forEach((relativePath, file) => {
        const filePath = `${distDirPath}/${relativePath}`;

        if (file.dir) {
          // Create directory
          filePromises.push(NativeFile.mkdir(filePath).catch(() => {}));
        } else {
          // Extract file - check if it's likely a binary file
          const isBinary = /\.(jpg|jpeg|png|gif|webp|pdf|zip|epub|ttf|woff|woff2|eot)$/i.test(relativePath);
          
          if (isBinary) {
            // For binary files, extract as base64
            filePromises.push(
              file.async('base64').then((content) => {
                return NativeFile.writeFile(filePath, content);
              })
            );
          } else {
            // For text files, extract as string
            filePromises.push(
              file.async('string').then((content) => {
                return NativeFile.writeFile(filePath, content);
              })
            );
          }
        }
      });

      await Promise.all(filePromises);
    } catch (error) {
      console.error('remoteUnzip error:', error);
      throw error;
    }
  },

  remoteZip: async (
    sourceDirPath: string,
    url: string,
    headers: { [key: string]: string },
  ): Promise<string> => {
    console.warn('NativeZipArchive.remoteZip: Web implementation limited');
    // This would create a zip and upload it
    return Promise.resolve('');
  },
};

export default NativeZipArchive;

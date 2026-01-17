import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
  DriveCreateRequestData,
  DriveFile,
  DriveReponse,
  DriveRequestParams,
} from './types';
import { PATH_SEPARATOR } from '@api/constants';

const BASE_URL = 'https://www.googleapis.com/drive/v3/files';
const MEDIA_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';

const buildParams = (params: DriveRequestParams) => {
  return Object.entries(params)
    .filter(([_, value]) => value !== undefined)
    .map(pair => pair.map(encodeURIComponent).join('='))
    .join('&');
};

export const list = async (
  params: DriveRequestParams,
): Promise<DriveReponse> => {
  const { accessToken } = await GoogleSignin.getTokens();

  if (!params.fields) {
    params.fields =
      'nextPageToken, files(id, name, description, createdTime, parents)';
  }

  const url = BASE_URL + '?' + buildParams(params);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    // eslint-disable-next-line no-console
    console.error('Google Drive API error:', data);
    throw new Error(
      data.error?.message ||
        `API request failed with status ${response.status}`,
    );
  }

  return data;
};

export const create = async (
  data: DriveCreateRequestData,
): Promise<DriveFile> => {
  const { accessToken } = await GoogleSignin.getTokens();

  const params: DriveRequestParams = {
    fields: 'id, name, description, createdTime, parents',
    uploadType: 'multipart',
  };
  const url =
    (data.content ? MEDIA_UPLOAD_URL : BASE_URL) + '?' + buildParams(params);

  data.metadata.name = data.metadata.name.replace(/\//g, PATH_SEPARATOR);

  let body: BodyInit;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
  };

  if (data.content) {
    // For web, use multipart/related format with boundary
    const boundary = '-------314159265358979323846';
    const delimiter = '\r\n--' + boundary + '\r\n';
    const closeDelimiter = '\r\n--' + boundary + '--';

    const metadataPart =
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(data.metadata);

    let contentPart: string;
    if (data.metadata.mimeType === 'application/json') {
      contentPart =
        `Content-Type: ${data.metadata.mimeType}\r\n\r\n` + data.content;
    } else {
      // For binary data, we'll need to handle it differently
      // For now, assume it's text/json content
      contentPart =
        `Content-Type: ${data.metadata.mimeType}\r\n\r\n` + data.content;
    }

    body = delimiter + metadataPart + delimiter + contentPart + closeDelimiter;
    headers['Content-Type'] = `multipart/related; boundary="${boundary}"`;
  } else {
    body = JSON.stringify(data.metadata);
    headers['Content-Type'] = 'application/json';
  }

  return fetch(url, {
    method: 'POST',
    headers,
    body,
  }).then(res => res.json());
};

export const updateMetadata = async (
  fileId: string,
  fileMetaData: Partial<DriveFile>,
  oldParent?: string,
) => {
  const { accessToken } = await GoogleSignin.getTokens();
  const url =
    BASE_URL +
    '/' +
    fileId +
    '?' +
    buildParams({
      addParents: fileMetaData.parents?.[0],
      removeParents: oldParent,
    });
  return fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      'name': fileMetaData.name,
      'mimeType': fileMetaData.mimeType,
    }),
  });
};

export const uploadMedia = async (
  _sourceDirPath: string,
): Promise<DriveFile> => {
  // Web doesn't support native zip operations
  // This would need IndexedDB/localStorage export instead
  throw new Error(
    'uploadMedia is not supported on web platform. Use create() for JSON data backup instead.',
  );
};

export const download = async (_file: DriveFile, _distDirPath: string) => {
  // Web doesn't support native zip operations
  // This would need IndexedDB/localStorage import instead
  throw new Error(
    'download is not supported on web platform. Use downloadFile() for JSON data restore instead.',
  );
};

// Web-specific: Download file content as text
export const downloadFile = async (file: DriveFile): Promise<string> => {
  const { accessToken } = await GoogleSignin.getTokens();
  const url = BASE_URL + '/' + file.id + '?alt=media';

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  return response.text();
};

// Web-specific: Download file content as JSON
export const downloadFileJson = async <T>(file: DriveFile): Promise<T> => {
  const { accessToken } = await GoogleSignin.getTokens();
  const url = BASE_URL + '/' + file.id + '?alt=media';

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  return response.json();
};

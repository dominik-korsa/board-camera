import ky from 'ky-universal';
import {
  CreateFolderBody,
  CreateFolderReply, FolderAncestorsReply, FolderInfoReply,
  GetViewerReply,
  ListUserFoldersReply,
} from 'board-camera-api-schemas';

export function getUserInfo() {
  return ky.get('/api/viewer').json<GetViewerReply>();
}

export function listUserFolders() {
  return ky.get('/api/list-user-folders').json<ListUserFoldersReply>();
}

export function createRootFolder(name: string) {
  const body: CreateFolderBody = { name };
  return ky.post('/api/create-root-folder', { json: body }).json<CreateFolderReply>();
}

export function createSubfolder(name: string, parentShortId: string) {
  const body: CreateFolderBody = { name };
  return ky.post(`/api/folders/${parentShortId}/create-folder`, { json: body }).json<CreateFolderReply>();
}

export function getFolderAncestors(shortId: string) {
  return ky.get(`/api/folders/${shortId}/ancestors`).json<FolderAncestorsReply>();
}

export function getFolderInfo(shortId: string) {
  return ky.get(`/api/folders/${shortId}/info`).json<FolderInfoReply>();
}

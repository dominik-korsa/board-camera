import ky from 'ky-universal';
import {
  CreateFolderBody,
  CreateFolderReply,
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

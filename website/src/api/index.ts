import ky from 'ky-universal';
import { GetViewerReply } from 'board-camera-api-schemas';

export function getUserInfo() {
  return ky.get('/api/viewer').json<GetViewerReply>();
}

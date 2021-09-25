import ky from 'ky-universal';
import { GetViewerReply } from 'src/api/types';

export function getUserInfo() {
  return ky.get('/api/viewer').json<GetViewerReply>();
}

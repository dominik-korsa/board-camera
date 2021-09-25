import { reactive } from 'vue';
import { Viewer } from 'board-camera-api-schemas';

export default reactive<{
  signedInUser: Viewer | null,
}>({
  signedInUser: null,
});

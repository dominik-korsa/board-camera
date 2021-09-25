import { reactive } from 'vue';
import { ApiViewer } from 'src/api/types';

export default reactive<{
  signedInUser: ApiViewer | null,
}>({
  signedInUser: null,
});

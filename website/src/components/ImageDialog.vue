<template>
  <q-dialog
    :model-value="show"
    no-route-dismiss
    maximized
    full-height
    @hide="onHide"
  >
    <q-card
      dark
      class="full-height"
    >
      <q-img
        :src="imageSrc"
        class="full-height full-width"
        fit="contain"
        loading="lazy"
      >
        <div class="buttons">
          <q-btn
            flat
            round
            icon="mdi-arrow-left"
            @click="onHide"
          />
        </div>
      </q-img>
    </q-card>
  </q-dialog>
</template>

<script lang="ts" setup>
import {
  computed, PropType, ref, watch,
} from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const props = defineProps({
  folderId: {
    type: String as PropType<string | undefined>,
    default: undefined,
    required: false,
  },
  imageId: {
    type: String as PropType<string | undefined>,
    default: undefined,
    required: false,
  },
});

const image = ref(null);
const imageSrc = ref<null | string>(null);
watch(
  () => ({ folderId: props.folderId, imageId: props.imageId }),
  ({ folderId, imageId }) => {
    if (folderId === undefined || imageId === undefined) {
      image.value = null;
    } else {
      imageSrc.value = `/api/folders/${folderId}/images/${imageId}/full.webp`;
    }
  }, {
    immediate: true,
  },
);

const show = computed(() => props.folderId !== undefined && props.imageId !== undefined);
async function onHide() {
  if (props.folderId === undefined) await router.push('/');
  else await router.push(`/folders/${props.folderId}`);
}
</script>

<style lang="scss" scoped>
.buttons {
  background: none;
}
</style>

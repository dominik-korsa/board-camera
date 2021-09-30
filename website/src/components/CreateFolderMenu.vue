<template>
  <q-menu
    v-model="show"
    fit
    :offset="[0, 8]"
    :persistent="creating"
    no-refocus
  >
    <q-form @submit.prevent="createRootFolderSubmit">
      <q-card>
        <q-card-section>
          <div class="text-h6">
            {{ $t('createFolder.title') }}
          </div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-input
            v-model="name"
            autofocus
            filled
            :label="$t('createFolder.name')"
            maxlength="64"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            type="submit"
            color="primary"
            :loading="creating"
            :disable="disabled"
          >
            {{ $t('createFolder.button') }}
          </q-btn>
        </q-card-actions>
      </q-card>
    </q-form>
  </q-menu>
</template>

<script lang="ts">
import {
  computed, defineComponent, PropType, ref,
} from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { createRootFolder, createSubfolder } from 'src/api';
import { getTypeValidator } from 'src/utils';
import { CreateFolderReply } from 'board-camera-api-schemas';

function createFolder(name: string, parentFolderId?: string) {
  return (parentFolderId === undefined
    ? createRootFolder(name)
    : createSubfolder(name, parentFolderId));
}

export default defineComponent({
  props: {
    parentFolderId: {
      type: String as PropType<string>,
      required: false,
      default: undefined,
    },
  },
  emits: {
    created: getTypeValidator<CreateFolderReply>(),
  },
  setup(props, { emit }) {
    const $q = useQuasar();
    const $i18n = useI18n();
    const show = ref(false);
    const creating = ref(false);
    const name = ref('');
    const disabled = computed(() => name.value.trim() === '');
    return {
      show,
      creating,
      name,
      disabled,
      createRootFolderSubmit: async () => {
        if (disabled.value) return;
        creating.value = true;
        try {
          const result = await createFolder(name.value.trim(), props.parentFolderId);
          show.value = false;
          name.value = '';
          emit('created', result);
        } catch (error) {
          console.error(error);
          $q.notify({
            type: 'negative',
            message: $i18n.t('createFolder.error'),
          });
        }
        creating.value = false;
      },
    };
  },
});
</script>

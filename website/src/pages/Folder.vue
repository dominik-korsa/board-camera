<template>
  <q-page>
    <div
      class="flex header"
    >
      <q-scroll-area
        class="col-grow no-basis"
      >
        <div
          class="flex items-center q-pa-sm no-wrap breadcrumbs"
        >
          <q-skeleton
            v-if="breadcrumbs === null"
            type="rect"
            height="23px"
            width="200px"
          />
          <template v-else>
            <q-btn
              :icon="breadcrumbs.shared ? 'mdi-folder-account' : 'mdi-folder'"
              :label="$t(breadcrumbs.shared ? 'sharedFolders' : 'yourFolders')"
              to="/"
              flat
              dense
              no-caps
              size="sm"
              color="primary"
              no-wrap
            />
            <breadcrumb-divider :shared="breadcrumbs.shared" />
            <template
              v-for="item in breadcrumbs.items"
              :key="item.id"
            >
              <q-btn
                :label="item.name"
                :to="item.to"
                flat
                dense
                no-caps
                size="sm"
                color="primary"
                no-wrap
              />
              <breadcrumb-divider :folder-id="item.id" />
            </template>
            <div
              class="q-btn q-btn--dense q-btn--flat q-btn--no-uppercase
              breadcrumb-fake-button non-selectable text-no-wrap"
            >
              {{ breadcrumbs.self.name }}
            </div>
          </template>
        </div>
      </q-scroll-area>
      <q-separator vertical />
      <div class="flex items-center justify-center q-px-sm">
        <q-btn
          flat
          round
          icon="mdi-account-multiple"
          dense
        >
          <q-tooltip>{{ $t('sharing') }}</q-tooltip>
        </q-btn>
        <q-btn
          flat
          round
          icon="mdi-dots-vertical"
          dense
          class="q-ml-xs"
        >
          <q-tooltip class="text-no-wrap">
            {{ $t('otherOptions') }}
          </q-tooltip>
        </q-btn>
      </div>
    </div>
    <q-separator />
    <q-list
      bordered
      class="rounded-borders q-mx-lg q-mt-lg"
    >
      <q-item-label header>
        {{ $t('subfolders') }}
      </q-item-label>
      <folder-skeleton v-if="folderInfo === null" />
      <template v-else>
        <div
          v-if="folderInfo.subfolders.length === 0"
          class="text-center q-py-lg"
        >
          <div class="text-subtitle1">
            {{ $t('noFolders') }}
          </div>
        </div>
        <folder-item
          v-for="folder in folderInfo.subfolders"
          :key="folder.shortId"
          :folder="folder"
        />
        <div class="q-ma-sm">
          <q-btn
            class="full-width"
            color="primary"
            outline
          >
            {{ $t('createSubfolder') }}
            <create-folder-menu
              :parent-folder-id="$route.params.folderId"
              @created="onSubfolderCreated"
            />
          </q-btn>
        </div>
      </template>
    </q-list>
    <q-page-sticky
      position="bottom-right"
      :offset="[14, 14]"
    >
      <upload-button />
    </q-page-sticky>
  </q-page>
</template>

<script lang="ts">
import {
  computed, defineComponent, ref, watch,
} from 'vue';
import { getFolderAncestors, getFolderInfo } from 'src/api';
import { useRoute } from 'vue-router';
import { CreateFolderReply, FolderAncestorsReply, FolderInfoReply } from 'board-camera-api-schemas';
import FolderItem from 'components/FolderItem.vue';
import FolderSkeleton from 'components/FolderSkeleton.vue';
import CreateFolderMenu from 'components/CreateFolderMenu.vue';
import BreadcrumbDivider from 'components/BreadcrumbDivider.vue';
import UploadButton from 'components/UploadButton.vue';

interface BreadcrumbItem {
  name: string;
  id: string;
  to?: string;
}

export default defineComponent({
  components: {
    UploadButton,
    BreadcrumbDivider,
    FolderSkeleton,
    FolderItem,
    CreateFolderMenu,
  },
  setup() {
    const route = useRoute();
    const ancestors = ref<FolderAncestorsReply | null>(null);
    const folderInfo = ref<FolderInfoReply | null>(null);
    const fetchAncestors = async (folderId: string) => {
      ancestors.value = await getFolderAncestors(folderId);
    };
    const fetchInfo = async (folderId: string) => {
      folderInfo.value = await getFolderInfo(folderId);
    };
    watch(() => {
      let id = route.params.folderId as undefined | string | string[];
      if (typeof id === 'object') [id] = id;
      return id;
    }, async (folderId) => {
      if (folderId === undefined) {
        console.warn('folderId is undefined');
        return;
      }
      folderInfo.value = null;
      await Promise.all([
        fetchAncestors(folderId),
        fetchInfo(folderId),
      ]);
    }, {
      immediate: true,
    });
    return {
      folderInfo,
      ancestors,
      breadcrumbs: computed<{
        items: BreadcrumbItem[],
        shared: boolean
      } | null>(() => {
        if (ancestors.value === null) return null;
        const items: BreadcrumbItem[] = [
          ...ancestors.value.ancestors.map((el) => ({
            name: el.name,
            to: `/folders/${el.shortId}`,
            id: el.shortId,
          })),
        ];
        items.reverse();
        return {
          items,
          shared: !ancestors.value.isOwner,
          self: ancestors.value.self,
        };
      }),
      onSubfolderCreated(reply: CreateFolderReply) {
        if (folderInfo.value === null) return;
        folderInfo.value.subfolders.push(reply);
      },
    };
  },
});
</script>

<style lang="scss" scoped>
.breadcrumb-fake-button {
  font-size: 10px;
}

$headerHeight: 48px;
.header, .breadcrumbs {
  height: $headerHeight;
}
</style>

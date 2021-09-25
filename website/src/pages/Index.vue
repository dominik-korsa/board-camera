<template>
  <q-page class="row items-center justify-evenly">
    {{ signedInUser?.name ?? 'null' }}
  </q-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import state from 'src/state';

export default defineComponent({
  name: 'PageIndex',
  setup() {
    return { signedInUser: state.signedInUser };
  },
});
</script>

<template>
  <q-item
    v-ripple
    clickable
  >
    <q-item-section
      avatar
      top
    >
      <q-skeleton
        type="QAvatar"
        width="40px"
        height="40px"
      />
    </q-item-section>

    <q-item-section>
      <q-item-label>
        <q-skeleton
          type="text"
          height="24px"
        />
      </q-item-label>
    </q-item-section>
  </q-item>
</template>

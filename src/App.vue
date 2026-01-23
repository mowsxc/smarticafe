<script setup lang="ts">
import { onMounted } from 'vue';
import { tauriCmd } from './utils/tauri';

onMounted(() => {
  // Give it a moment to show off the fancy animation
  setTimeout(async () => {
    try {
      await tauriCmd('close_splash');
    } catch (e) {
      console.debug('Not in Tauri or splash failed', e);
    }
  }, 2000);
});
</script>

<template>
  <router-view />
</template>

<style>
/* Global styles are in style.css */
</style>
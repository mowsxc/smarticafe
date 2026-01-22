<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const url = computed(() => String(route.query.url || '').trim());
</script>

<template>
  <div class="h-full w-full flex flex-col">
    <div class="shrink-0 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
      <div class="text-sm font-bold text-gray-700">外部页面</div>
      <a v-if="url" class="text-xs font-bold text-brand-orange" :href="url" target="_blank" rel="noopener noreferrer">
        在浏览器中打开
      </a>
    </div>

    <div class="flex-1 overflow-hidden">
      <div v-if="!url" class="h-full w-full flex items-center justify-center text-sm text-gray-500">
        未提供 URL
      </div>
      <iframe v-else class="w-full h-full border-0" :src="url" />
    </div>
  </div>
</template>

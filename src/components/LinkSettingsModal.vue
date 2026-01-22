<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  isOpen: boolean;
  label: string;
  initialUrl: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', url: string): void;
}>();

const urlInput = ref('');

// Watch props to sync internal state when modal opens
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    urlInput.value = props.initialUrl || '';
  }
});

const handleSave = () => {
  emit('save', urlInput.value);
};
</script>

<template>
  <Transition name="modal">
    <div 
      v-if="isOpen" 
      class="fixed inset-0 z-9999 flex items-center justify-center p-4"
    >
      <!-- 背景遮罩 -->
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="emit('close')"></div>
      
      <!-- 内容卡片 -->
      <div 
        class="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-200"
        @click.stop
        style="background-color: white;"
      >
        <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 class="text-[15px] font-bold text-gray-800 tracking-wide">配置链接 - {{ label }}</h3>
          <button 
            @click="emit('close')"
            class="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all font-bold"
          >
            ✕
          </button>
        </div>
        
        <div class="p-6 space-y-4">
          <div class="space-y-2">
            <label class="text-[13px] font-bold text-gray-700">目标 URL</label>
            <textarea 
              v-model="urlInput" 
              rows="6"
              class="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-brand-orange/40 focus:ring-4 focus:ring-orange-500/10 outline-none font-mono text-xs text-gray-600 break-all resize-none transition-all"
              placeholder="请输入 https:// 开头的完整链接..."
            ></textarea>
          </div>
          <div class="flex items-start gap-2 p-3 rounded-lg bg-blue-50 text-blue-600 text-[11px] leading-relaxed">
            <svg class="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <p>更改链接后，下次点击该菜单项将打开新的地址。这只会影响当前浏览器，清除缓存后可能会重置。</p>
          </div>
        </div>
        
        <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/30">
          <button 
            @click="emit('close')"
            class="px-5 h-10 rounded-xl text-[13px] font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all"
          >
            取消
          </button>
          <button 
            @click="handleSave"
            class="px-6 h-10 rounded-xl text-[13px] font-bold text-white bg-brand-orange hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-95"
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
</style>

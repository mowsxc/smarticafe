<template>
  <Transition name="modal">
    <div v-if="isOpen" class="fixed inset-0 z-1000 flex items-center justify-center p-4 modal-backdrop" @click.self="emit('cancel')">
      <Transition name="scale" appear>
        <div v-if="isOpen" class="w-full max-w-[400px] glass-card rounded-[32px] shadow-2xl overflow-hidden relative" @click.stop>
          <!-- Decorative Glow -->
          <div class="absolute -top-20 -right-20 w-40 h-40 bg-brand-orange/10 blur-[60px] rounded-full pointer-events-none"></div>
          
          <div class="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white/40">
            <div class="flex flex-col">
              <span class="font-black text-gray-800 text-lg tracking-tight">{{ title }}</span>
              <span class="text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{{ subtitle }}</span>
            </div>
            <button @click="emit('cancel')" class="w-10 h-10 rounded-full hover:bg-black/5 flex items-center justify-center text-gray-400 transition-colors">✕</button>
          </div>
          
          <div class="p-8 bg-white/40">
            <div class="flex items-start gap-4 mb-8">
              <div class="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
                <span class="text-2xl">⚠️</span>
              </div>
              <p class="text-[14px] text-gray-600 leading-relaxed font-medium pt-1">
                {{ message }}
              </p>
            </div>
            
            <div class="flex gap-3">
              <button 
                @click="emit('cancel')" 
                class="flex-1 h-12 rounded-2xl bg-gray-100 text-gray-600 font-bold text-[14px] hover:bg-gray-200 transition-all active:scale-95"
              >
                {{ cancelText }}
              </button>
              <button 
                @click="emit('confirm')" 
                class="flex-1 h-12 rounded-2xl bg-brand-dark text-white font-bold text-[14px] shadow-lg shadow-gray-900/10 hover:bg-gray-800 transition-all active:scale-95"
              >
                {{ confirmText }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps({
  isOpen: Boolean,
  title: { type: String, default: '确认操作' },
  subtitle: { type: String, default: 'Confirmation Required' },
  message: String,
  confirmText: { type: String, default: '确定' },
  cancelText: { type: String, default: '取消' },
});

const emit = defineEmits(['confirm', 'cancel']);
</script>

<style scoped>
.modal-backdrop {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
}

.glass-card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.6);
}

.modal-enter-active, .modal-leave-active { transition: opacity 0.3s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

.scale-enter-active { transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
.scale-leave-active { transition: all 0.2s ease-in; }
.scale-enter-from { transform: scale(0.9) translateY(20px); opacity: 0; }
.scale-leave-to { transform: scale(0.95); opacity: 0; }
</style>

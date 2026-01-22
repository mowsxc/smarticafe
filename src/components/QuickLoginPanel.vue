<template>
  <Transition name="fade">
    <div 
      v-if="isOpen" 
      class="fixed inset-0 z-100 flex items-center justify-center p-4 modal-backdrop"
      @click.self="emit('close')"
    >
      <Transition name="scale" appear>
        <div 
          v-if="isOpen"
          class="w-full max-w-[480px] glass-card rounded-[40px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col relative"
          @click.stop
        >
          <!-- Header -->
          <div class="p-8 pb-6 text-center space-y-2">
            <div class="w-14 h-14 bg-linear-to-tr from-brand-orange to-orange-400 rounded-2xl mx-auto flex items-center justify-center shadow-xl shadow-orange-200/50 mb-3">
              <span class="text-2xl text-white font-black tracking-tighter">CX</span>
            </div>
            <h2 class="text-xl font-black text-gray-800 tracking-tight">快捷登录</h2>
            <p class="text-[10px] font-bold text-orange-500 uppercase tracking-[0.3em]">Quick Login</p>
          </div>

          <div class="px-8 pb-8 space-y-6">
            <!-- Section: Employees -->
            <div class="space-y-4">
              <div class="flex items-center gap-4">
                <div class="h-px flex-1 bg-gray-100"></div>
                <div class="flex flex-col items-center">
                  <span class="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] leading-none">
                    {{ mode === 'successor' ? '选择接班员工' : '员工登录' }}
                  </span>
                  <span class="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Staff Members</span>
                </div>
                <div class="h-px flex-1 bg-gray-100"></div>
              </div>

              <div class="grid grid-cols-5 gap-2">
                <button 
                  v-for="name in employees" 
                  :key="name"
                  @click="handleLogin(name)"
                  class="h-12 rounded-xl text-[12px] font-bold text-gray-700 bg-white/60 border border-white hover:bg-brand-orange hover:text-white hover:border-brand-orange shadow-sm transition-all duration-200 active:scale-95"
                >
                  {{ name }}
                </button>
              </div>
            </div>

            <!-- Section: Shareholders -->
            <div class="space-y-4">
              <div class="flex items-center gap-4">
                <div class="h-px flex-1 bg-gray-100"></div>
                <div class="flex flex-col items-center">
                  <span class="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] leading-none">
                    {{ mode === 'successor' ? '选择接班股东' : '股东登录' }}
                  </span>
                  <span class="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Shareholders</span>
                </div>
                <div class="h-px flex-1 bg-gray-100"></div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <button 
                  @click="handleLogin('莫健')"
                  class="h-14 rounded-xl text-[14px] font-bold text-gray-700 bg-white/60 border border-white hover:bg-brand-dark hover:text-white shadow-sm transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
                >
                  <span class="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-[12px] font-black">莫</span>
                  莫健
                </button>
                <button 
                  @click="handleLogin('朱晓培')"
                  class="h-14 rounded-xl text-[14px] font-bold text-gray-700 bg-white/60 border border-white hover:bg-brand-dark hover:text-white shadow-sm transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
                >
                  <span class="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-[12px] font-black">朱</span>
                  朱晓培
                </button>
              </div>
            </div>

            <!-- Section: Held Shareholders (for admin) -->
            <div v-if="showHeldShareholders && mode !== 'successor'" class="space-y-4">
              <div class="flex items-center gap-4">
                <div class="h-px flex-1 bg-gray-100"></div>
                <div class="flex flex-col items-center">
                  <span class="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] leading-none">代持股东</span>
                  <span class="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Held Shareholders</span>
                </div>
                <div class="h-px flex-1 bg-gray-100"></div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <button 
                  v-for="holder in heldShareholders"
                  :key="holder.key"
                  @click="handleLogin(holder.key)"
                  class="h-12 rounded-xl text-[12px] font-bold text-gray-600 bg-gray-50 border border-gray-200 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 shadow-sm transition-all duration-200 active:scale-95"
                >
                  {{ holder.name }} ({{ (holder.equity * 100).toFixed(0) }}%)
                </button>
              </div>
            </div>

            <!-- Error Message -->
            <Transition name="slide-up">
              <div v-if="errorMessage" class="flex items-center gap-3 px-4 py-3 bg-red-50 text-red-500 rounded-xl text-[12px] font-bold border border-red-100">
                <span class="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                {{ errorMessage }}
              </div>
            </Transition>

            <!-- Close Button -->
            <button 
              @click="emit('close')"
              class="w-full h-12 rounded-xl bg-gray-100 text-gray-600 font-bold text-[12px] hover:bg-gray-200 transition-all"
            >
              关闭
            </button>
          </div>

          <!-- Footer Status -->
          <div v-if="authStore.isAuthenticated" class="px-6 py-3 bg-emerald-50/50 border-t border-emerald-100/30 flex items-center justify-center gap-2">
            <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span class="text-[10px] font-medium text-emerald-600 uppercase tracking-wider">
              当前登录: {{ authStore.userProfile?.name }}
            </span>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '../stores/auth';

interface Props {
  isOpen: boolean;
  mode?: 'login' | 'successor'; // login: 普通登录, successor: 接班人选择
}

interface Emits {
  (e: 'close'): void;
  (e: 'login-success', name: string): void;
  (e: 'select-successor', name: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'login',
});

const emit = defineEmits<Emits>();

const authStore = useAuthStore();

// Employees (can login directly)
const employees = ['黄河', '刘杰', '贾政华', '秦佳', '史红'];

// Held shareholders (visible only to admin)
const heldShareholders = [
  { key: 'mojian_cuiguoli', name: '崔国丽', equity: 0.20 },
  { key: 'mojian_luqiumian', name: '路秋勉', equity: 0.13 },
  { key: 'mojian_caomengsi', name: '曹梦思', equity: 0.10 },
  { key: 'mojian_moyanfei', name: '莫艳菲', equity: 0.02 },
];

const errorMessage = ref('');

// Show held shareholders only if admin is logged in
const showHeldShareholders = computed(() => {
  return authStore.currentUser?.role === 'admin';
});

const handleLogin = async (name: string) => {
  errorMessage.value = '';
  
  try {
    if (employees.includes(name)) {
      // Employee: direct login
      if (props.mode === 'successor') {
        emit('select-successor', name);
      } else {
        await authStore.employeeLogin(name);
        emit('login-success', name);
      }
    } else if (name === '莫健') {
      // Mo Jian: use stored password or default
      const password = 'laoban'; // Default to boss role
      await authStore.mojianLogin(password);
      if (props.mode === 'successor') {
        emit('select-successor', name);
      } else {
        emit('login-success', name);
      }
    } else if (name === '朱晓培') {
      // Zhu Xiaopei: direct login
      if (props.mode === 'successor') {
        emit('select-successor', name);
      } else {
        await authStore.bossLogin('朱晓培', 0.30);
        emit('login-success', name);
      }
    } else if (name.startsWith('mojian_')) {
      // Held shareholder
      await authStore.mojianLogin(name);
      if (props.mode === 'successor') {
        emit('select-successor', heldShareholders.find(h => h.key === name)?.name || '');
      } else {
        emit('login-success', name);
      }
    }
    
    if (props.mode !== 'successor') {
      emit('close');
    }
  } catch (error: any) {
    errorMessage.value = error.message || '登录失败';
  }
};
</script>

<style scoped>
.modal-backdrop {
  background: linear-gradient(
    135deg,
    rgba(0, 0, 0, 0.6) 0%,
    rgba(0, 0, 0, 0.4) 50%,
    rgba(0, 0, 0, 0.6) 100%
  );
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.glass-card {
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.98) 0%,
    rgba(250, 250, 250, 0.98) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 
    0 32px 64px -16px rgba(0, 0, 0, 0.15),
    0 16px 32px -8px rgba(0, 0, 0, 0.1),
    0 8px 16px -4px rgba(0, 0, 0, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

/* Fade Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Scale Transition */
.scale-enter-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.scale-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.scale-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}

.scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* Slide Up Transition */
.slide-up-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>

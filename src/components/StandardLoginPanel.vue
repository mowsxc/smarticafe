<template>
  <Transition name="fade">
    <div 
      v-if="isOpen" 
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-backdrop"
      @click.self="emit('close')"
    >
      <Transition name="scale" appear>
        <div 
          v-if="isOpen"
          class="w-full max-w-[420px] glass-card rounded-[40px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col relative"
          @click.stop
        >
          <!-- Header: Branding -->
          <div class="p-10 pb-6 text-center space-y-2">
            <div class="w-16 h-16 bg-gradient-to-tr from-brand-orange to-orange-400 rounded-2xl mx-auto flex items-center justify-center shadow-xl shadow-orange-200/50 mb-4 animate-float">
              <span class="text-3xl text-white font-black tracking-tighter">CX</span>
            </div>
            <h2 class="text-2xl font-black text-gray-800 tracking-tight">创新意电竞 Pro</h2>
            <p class="text-[11px] font-bold text-orange-500 uppercase tracking-[0.3em]">Smarticafe Pro System</p>
          </div>

          <div class="px-10 pb-12 space-y-6">
            <!-- Username Input -->
            <div class="space-y-3">
              <div class="flex items-center gap-4">
                <div class="h-[1px] flex-1 bg-gray-100"></div>
                <div class="flex flex-col items-center">
                  <span class="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] leading-none">标准登录</span>
                  <span class="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">Standard Login</span>
                </div>
                <div class="h-[1px] flex-1 bg-gray-100"></div>
              </div>

              <div class="relative group">
                <div class="absolute -inset-2 bg-gradient-to-r from-brand-orange/15 to-transparent rounded-[32px] blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-1000"></div>
                <div class="relative flex items-center bg-white/60 backdrop-blur-2xl border border-white focus-within:border-brand-orange/40 focus-within:bg-white rounded-[26px] h-14 px-6 transition-all shadow-xl shadow-black/[0.02] focus-within:shadow-2xl focus-within:shadow-orange-200/20">
                  <div class="mr-4 text-gray-300 group-focus-within:text-brand-orange transition-colors">
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                  <input 
                    v-model="username"
                    type="text"
                    placeholder="输入用户名"
                    class="flex-1 bg-transparent border-none outline-none font-mono text-[14px] font-bold text-gray-700 placeholder:text-gray-300"
                    @input="onUsernameInput"
                    @keyup.enter="handleLogin"
                  />
                </div>
              </div>
            </div>

            <!-- Password Input (shown when user is a shareholder) -->
            <Transition name="slide-up">
              <div v-if="isShareholder" class="space-y-4">
                <div class="relative group">
                  <div class="absolute -inset-2 bg-gradient-to-r from-brand-orange/15 to-transparent rounded-[32px] blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-1000"></div>
                  <div class="relative flex items-center bg-white/60 backdrop-blur-2xl border border-white focus-within:border-brand-orange/40 focus-within:bg-white rounded-[26px] h-14 px-6 transition-all shadow-xl shadow-black/[0.02] focus-within:shadow-2xl focus-within:shadow-orange-200/20">
                    <div class="mr-4 text-gray-300 group-focus-within:text-brand-orange transition-colors">
                      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </div>
                    <input 
                      v-model="password"
                      type="password"
                      placeholder="请输入密码"
                      class="flex-1 bg-transparent border-none outline-none font-mono text-[14px] font-bold text-gray-700 placeholder:text-gray-300"
                      @keyup.enter="handleLogin"
                    />
                  </div>
                </div>
              </div>
            </Transition>

            <!-- User Type Hint -->
            <div class="flex items-center justify-center gap-2">
              <Transition name="fade">
                <span v-if="userHint" class="text-[11px]" :class="userHintClass">
                  {{ userHint }}
                </span>
              </Transition>
            </div>

            <!-- Error Feedback -->
            <Transition name="slide-up">
              <div v-if="errorMessage" class="flex items-center gap-4 px-6 py-4 bg-red-50 text-red-500 rounded-2xl text-[12px] font-bold border border-red-100 shadow-xl shadow-red-100/10">
                <div class="w-2.5 h-2.5 rounded-full bg-red-500 relative flex-shrink-0">
                  <div class="absolute inset-0 rounded-full bg-red-500 animate-ping"></div>
                </div>
                {{ errorMessage }}
              </div>
            </Transition>

            <!-- Action Buttons -->
            <div class="flex gap-3">
              <button 
                @click="emit('close')"
                class="flex-1 h-12 rounded-2xl bg-gray-100 text-gray-600 font-bold text-[12px] hover:bg-gray-200 transition-all"
              >
                取消
              </button>
              <button 
                @click="handleLogin"
                :disabled="!canLogin"
                class="flex-1 h-12 rounded-2xl bg-brand-orange text-white font-bold text-[12px] shadow-lg shadow-orange-200/50 hover:shadow-xl hover:shadow-orange-300/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ isShareholder ? '验证并登录' : '免密登录' }}
              </button>
            </div>
          </div>

          <!-- Footer Status -->
          <div v-if="authStore.isAuthenticated" class="px-8 py-3 bg-emerald-50/30 border-t border-emerald-100/30 flex items-center justify-center gap-2">
            <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
            <span class="text-[10px] font-black text-emerald-600/80 uppercase tracking-widest">SESSION SECURE: {{ authStore.userProfile?.name }}</span>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import { ACCOUNTS } from '../config/accounts';

interface Props {
  isOpen: boolean;
}

interface Emits {
  (e: 'close'): void;
  (e: 'login-success'): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();

const authStore = useAuthStore();

// Input state
const username = ref('');
const password = ref('');
const errorMessage = ref('');

// Employee list (can login without password)
const employees = ACCOUNTS.employees.map((e) => e.username);

// Shareholder list (need password)
const shareholders = ACCOUNTS.shareholders.map((s) => s.displayName);

// Determine user type based on username
const userType = computed(() => {
  const name = username.value.trim();
  if (employees.includes(name)) return 'employee';
  if (shareholders.includes(name)) return 'shareholder';
  return 'unknown';
});

const isShareholder = computed(() => userType.value === 'shareholder');
const canLogin = computed(() => {
  if (!username.value.trim()) return false;
  if (isShareholder.value) return password.value.length > 0;
  return true;
});

const userHint = computed(() => {
  const name = username.value.trim();
  if (!name) return '';
  if (employees.includes(name)) return '✓ 员工免密登录';
  if (shareholders.includes(name)) return '🔒 股东需要密码';
  return '? 用户名不存在';
});

const userHintClass = computed(() => {
  if (userType.value === 'employee') return 'text-emerald-500';
  if (userType.value === 'shareholder') return 'text-orange-500';
  return 'text-gray-400';
});

const onUsernameInput = () => {
  errorMessage.value = '';
  password.value = '';
};

const handleLogin = async () => {
  errorMessage.value = '';
  const name = username.value.trim();
  
  if (!name) {
    errorMessage.value = '请输入用户名';
    return;
  }

  try {
    await authStore.login(name, password.value);
    
    username.value = '';
    password.value = '';
    emit('login-success');
    emit('close');
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
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Scale Transition */
.scale-enter-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.scale-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}
</style>

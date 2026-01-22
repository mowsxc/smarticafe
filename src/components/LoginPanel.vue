<template>
  <Transition name="fade">
    <div 
      v-if="isOpen" 
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-backdrop"
      @click.self="emit('close')"
    >
      <!-- Glassmorphism Card -->
      <Transition name="scale" appear>
        <div 
          v-if="isOpen"
          class="w-full max-w-[420px] glass-card rounded-[40px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col relative"
          @click.stop
        >
          <!-- Subtle Shimmer effect -->
          <div class="absolute inset-0 pointer-events-none opacity-20 shimmer grayscale"></div>

          <!-- Header: Branding -->
          <div class="p-10 pb-6 text-center space-y-2">
            <div class="w-16 h-16 bg-gradient-to-tr from-brand-orange to-orange-400 rounded-2xl mx-auto flex items-center justify-center shadow-xl shadow-orange-200/50 mb-4 animate-float">
                <span class="text-3xl text-white font-black tracking-tighter">CX</span>
            </div>
            <h2 class="text-2xl font-black text-gray-800 tracking-tight">创新意电竞 Pro</h2>
            <p class="text-[11px] font-bold text-orange-500 uppercase tracking-[0.3em]">Smarticafe Pro System</p>
          </div>

          <div class="px-10 pb-12 space-y-10">
            <!-- Section 1: Employee Login -->
            <div class="space-y-5">
              <div class="flex items-center gap-4">
                 <div class="h-[1px] flex-1 bg-gray-100"></div>
                 <div class="flex flex-col items-center">
                   <span class="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] leading-none">快速登入通道</span>
                   <span class="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">Staff Landing Node</span>
                 </div>
                 <div class="h-[1px] flex-1 bg-gray-100"></div>
              </div>
              <!-- Single Row Layout for Employees -->
              <div class="grid grid-cols-5 gap-3">
                <button 
                  v-for="name in employees" 
                  :key="name"
                  @click="employeeLogin(name)"
                  class="glass-button h-11 rounded-2xl text-[12px] font-black text-gray-700 hover:text-brand-orange border border-white/80 shadow-sm transition-all active:scale-90 group relative"
                >
                  <span class="relative z-10">{{ name }}</span>
                  <div class="absolute inset-0 bg-brand-orange/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                </button>
              </div>
            </div>

            <!-- Section 2: Shareholders & Admin -->
            <div class="space-y-6">
              <div class="flex items-center gap-4">
                 <div class="h-[1px] flex-1 bg-gray-100"></div>
                 <div class="flex flex-col items-center">
                   <span class="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] leading-none">管理权限解析</span>
                   <span class="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">Management Verification</span>
                 </div>
                 <div class="h-[1px] flex-1 bg-gray-100"></div>
              </div>
              
               <div class="grid grid-cols-2 gap-4">
                <button 
                  v-for="name in shareholders"
                  :key="name"
                  @click="selectedAccount = name; errorMessage = ''"
                  :class="[
                    'h-16 rounded-2xl text-[14px] font-black transition-all flex items-center justify-center gap-3 border-2 relative overflow-hidden',
                    selectedAccount === name
                      ? 'bg-brand-dark text-white border-brand-dark shadow-2xl scale-[1.02]'
                      : 'bg-white/40 text-gray-400 border-white hover:border-gray-200 hover:text-gray-600'
                  ]"
                >
                  <div v-if="selectedAccount === name" class="absolute inset-0 bg-gradient-to-tr from-orange-500/10 to-transparent pointer-events-none"></div>
                  {{ name }}
                </button>
              </div>

              <!-- Password Field with Hint -->
              <div class="relative group mt-6">
                <div class="absolute -inset-2 bg-gradient-to-r from-brand-orange/15 to-transparent rounded-[32px] blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-1000"></div>
                <div class="relative flex items-center bg-white/60 backdrop-blur-2xl border border-white focus-within:border-brand-orange/40 focus-within:bg-white rounded-[26px] h-20 px-8 transition-all shadow-xl shadow-black/[0.02] focus-within:shadow-2xl focus-within:shadow-orange-200/20">
                  <div class="mr-5 text-gray-300 group-focus-within:text-brand-orange transition-colors">
                    <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0110 0v4"></path></svg>
                  </div>
                  <input 
                    v-model="password" 
                    type="password"
                    placeholder="请输入密码"
                    class="flex-1 bg-transparent border-none outline-none font-mono text-lg font-black tracking-[0.2em] text-gray-800 placeholder:text-gray-300 placeholder:font-sans placeholder:tracking-normal placeholder:text-[12px] placeholder:font-bold"
                    @keyup.enter="handleLogin"
                  />
                  <button 
                    @click="handleLogin"
                    :disabled="!password"
                    class="ml-4 w-12 h-12 rounded-2xl bg-brand-dark text-white flex items-center justify-center shadow-2xl active:scale-90 transition-all disabled:opacity-5 disabled:grayscale group/btn overflow-hidden relative"
                  >
                    <div class="absolute inset-0 bg-brand-orange opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                    <svg class="w-5 h-5 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </button>
                </div>
              </div>


              <!-- Error Feedback -->
              <Transition name="slide-up">
                <div v-if="errorMessage" class="flex items-center gap-4 px-8 py-5 bg-red-50 text-red-500 rounded-3xl text-[12px] font-black border border-red-100 shadow-xl shadow-red-100/10">
                  <div class="w-2.5 h-2.5 rounded-full bg-red-500 relative">
                    <div class="absolute inset-0 rounded-full bg-red-500 animate-ping"></div>
                  </div>
                  验证同步异常：{{ errorMessage }}
                </div>
              </Transition>
            </div>
          </div>

          <!-- Footer Status Indicator -->
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
import { ref, watch } from 'vue';
import { useAuthStore } from '../stores/auth';
import { ACCOUNTS } from '../config/accounts';

interface Props {
  isOpen: boolean;
}

interface Emits {
  (e: 'close'): void;
  (e: 'login-success'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const authStore = useAuthStore();

const employees = ACCOUNTS.employees.map((e) => e.username);
const shareholders = ACCOUNTS.shareholders.map((s) => s.displayName);

const selectedAccount = ref(shareholders[0] || '');
const password = ref('');
const errorMessage = ref('');

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    password.value = '';
    errorMessage.value = '';
    selectedAccount.value = shareholders[0] || '';
  }
});

const employeeLogin = async (name: string) => {
  try {
    await authStore.employeeLogin(name);
    emit('login-success');
    emit('close');
  } catch (error: any) {
    errorMessage.value = error.message;
  }
};

const handleLogin = async () => {
  if (!password.value) return;
  errorMessage.value = '';
  try {
    await authStore.login(selectedAccount.value, password.value);
    emit('login-success');
    emit('close');
  } catch (error: any) {
    errorMessage.value = error.message || '权限校验未通过';
  }
};
</script>

<style scoped>
/* ===== Login Panel Enhanced Styles ===== */

/* Modal Backdrop */
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

/* Glass Card Base */
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
  position: relative;
  isolation: isolate;
}

.glass-card::before {
  content: '';
  position: absolute;
  inset: -2px;
  background: linear-gradient(
    135deg,
    rgba(249, 115, 22, 0.3) 0%,
    rgba(249, 115, 22, 0.1) 50%,
    rgba(249, 115, 22, 0.05) 100%
  );
  border-radius: 44px;
  opacity: 0;
  z-index: -1;
  transition: opacity 0.5s ease;
  filter: blur(12px);
}

.glass-card:hover::before {
  opacity: 1;
}

/* Shimmer Effect */
.shimmer {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.5) 25%,
    rgba(255, 255, 255, 0.8) 50%,
    rgba(255, 255, 255, 0.5) 75%,
    transparent 100%
  );
  animation: shimmer 2s ease-in-out infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

/* Branding Section */
.branding-section {
  position: relative;
}

.brand-icon {
  position: relative;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.brand-icon:hover {
  transform: rotate(8deg) scale(1.08);
}

.brand-icon::after {
  content: '';
  position: absolute;
  inset: -4px;
  background: linear-gradient(
    135deg,
    rgba(249, 115, 22, 0.3) 0%,
    rgba(249, 115, 22, 0.1) 50%,
    rgba(249, 115, 22, 0.3) 100%
  );
  border-radius: inherit;
  opacity: 0;
  z-index: -1;
  transition: opacity 0.3s ease;
}

.glass-card:hover .brand-icon::after {
  opacity: 1;
}

/* Section Dividers */
.section-divider {
  display: flex;
  align-items: center;
  gap: 16px;
}

.section-divider .h-\[1px\] {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(0, 0, 0, 0.08) 50%,
    transparent 100%
  );
}

.section-label {
  text-align: center;
  white-space: nowrap;
}

/* Employee Buttons */
.employee-btn {
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(255, 255, 255, 0.8);
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.95) 0%,
    rgba(248, 250, 252, 0.95) 100%
  );
}

.employee-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(249, 115, 22, 0.1) 0%,
    rgba(249, 115, 22, 0.05) 50%,
    transparent 100%
  );
  opacity: 0;
  transition: opacity 0.3s ease;
}

.employee-btn:hover::before {
  opacity: 1;
}

.employee-btn:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 4px 12px rgba(249, 115, 22, 0.15),
    0 2px 6px rgba(249, 115, 22, 0.1);
  border-color: rgba(249, 115, 22, 0.3);
}

.employee-btn:active {
  transform: translateY(0) scale(0.96);
}

/* Boss Selection Buttons */
.boss-btn {
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.boss-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(249, 115, 22, 0.08) 0%,
    rgba(249, 115, 22, 0.04) 50%,
    transparent 100%
  );
  opacity: 0;
  transition: opacity 0.3s ease;
}

.boss-btn:hover::before {
  opacity: 1;
}

.boss-btn:hover {
  transform: translateY(-2px);
}

.boss-btn[data-selected="true"] {
  transform: scale(1.02);
}

.boss-btn[data-selected="true"]::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 2px solid #f97316;
  border-radius: inherit;
  animation: borderPulse 2s ease-in-out infinite;
}

@keyframes borderPulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.indicator-dot {
  transition: all 0.3s ease;
  position: relative;
}

.indicator-dot::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background: transparent;
  transition: background 0.3s ease;
}

.boss-btn[data-selected="true"] .indicator-dot::after {
  background: rgba(249, 115, 22, 0.2);
}

/* Password Input Field */
.password-field-container {
  position: relative;
}

.password-field {
  position: relative;
  transition: all 0.3s ease;
}

.password-field:focus-within {
  transform: scale(1.01);
}

.password-icon {
  transition: all 0.3s ease;
}

.password-field:focus-within .password-icon {
  color: #f97316;
  transform: scale(1.1);
}

/* Password Input */
.password-input {
  letter-spacing: 0.1em;
  transition: all 0.3s ease;
}

.password-input:focus {
  letter-spacing: 0.15em;
}

/* Submit Button */
.submit-btn {
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.submit-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    #f97316 0%,
    #ea580c 100%
  );
  opacity: 0;
  transition: opacity 0.3s ease;
}

.submit-btn:not(:disabled):hover::before {
  opacity: 1;
}

.submit-btn:not(:disabled):hover {
  transform: scale(1.05);
}

.submit-btn:not(:disabled):active {
  transform: scale(0.95);
}

.submit-btn svg {
  transition: transform 0.3s ease;
}

.submit-btn:not(:disabled):hover svg {
  transform: translateX(4px);
}

/* Error Message */
.error-message {
  position: relative;
  overflow: hidden;
}

.error-message::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(239, 68, 68, 0.05) 50%,
    transparent 100%
  );
  animation: errorShimmer 2s ease-in-out infinite;
}

@keyframes errorShimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.error-dot {
  position: relative;
}

.error-dot::after {
  content: '';
  position: absolute;
  inset: -4px;
  background: rgba(239, 68, 68, 0.2);
  border-radius: 50%;
  animation: errorPulse 1s ease-in-out infinite;
}

@keyframes errorPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.5;
  }
}

/* Footer Status */
.footer-status {
  background: linear-gradient(
    90deg,
    rgba(34, 197, 94, 0.05) 0%,
    rgba(34, 197, 94, 0.1) 50%,
    rgba(34, 197, 94, 0.05) 100%
  );
}

.status-dot {
  animation: statusGlow 2s ease-in-out infinite;
}

@keyframes statusGlow {
  0%, 100% {
    box-shadow: 0 0 8px rgba(34, 197, 94, 0.4);
  }
  50% {
    box-shadow: 0 0 16px rgba(34, 197, 94, 0.6);
  }
}

/* ===== Vue Transition Enhancements ===== */

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

/* ===== Focus Visible ===== */
button:focus-visible,
input:focus-visible {
  outline: 2px solid rgba(249, 115, 22, 0.5);
  outline-offset: 2px;
}

/* ===== Responsive ===== */
@media (max-width: 480px) {
  .glass-card {
    max-width: 100% !important;
    margin: 16px;
  }
  
  .grid-cols-5 {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .grid-cols-2 {
    grid-template-columns: 1fr;
  }
}
</style>

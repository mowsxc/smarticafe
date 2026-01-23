<template>
  <Transition name="fade">
    <div 
      v-if="isOpen" 
      class="login-overlay fixed inset-0 z-[100] flex items-center justify-center p-4"
      @click.self="emit('close')"
    >
      <!-- Glassmorphism Card -->
      <Transition name="scale" appear>
        <div 
          v-if="isOpen"
          class="login-card w-full max-w-[460px] relative overflow-hidden"
          @click.stop
        >
          <!-- Card Effects -->
          <div class="card-glow"></div>
          <div class="card-shimmer"></div>
          
          <!-- ===== Header: Branding ===== -->
          <div class="card-header">
            <!-- Animated Logo -->
            <div class="brand-logo">
              <div class="logo-ring"></div>
              <div class="logo-icon">
                <span class="logo-letter">{{ settingsStore.brandSettings.brandName?.[0] || 'S' }}</span>
              </div>
            </div>
            <h2 class="brand-title">{{ settingsStore.brandSettings.brandName }}</h2>
            <p class="brand-subtitle">{{ settingsStore.brandSettings.systemName }} SYSTEM</p>
          </div>

          <!-- ===== Body ===== -->
          <div class="card-body">
            <!-- Section 1: Quick Employee Login -->
            <div class="login-section">
              <div class="section-header">
                <div class="section-line"></div>
                <div class="section-label">
                  <span class="label-main">快速登入通道</span>
                  <span class="label-sub">Staff Quick Access</span>
                </div>
                <div class="section-line"></div>
              </div>
              
              <div class="employee-grid">
                <button 
                  v-for="name in employees" 
                  :key="name"
                  @click="employeeLogin(name)"
                  class="employee-btn"
                >
                  <span class="employee-avatar">{{ name[0] }}</span>
                  <span class="employee-name">{{ name }}</span>
                </button>
              </div>
            </div>

            <!-- Section 2: Shareholder Login -->
            <div class="login-section">
              <div class="section-header">
                <div class="section-line"></div>
                <div class="section-label">
                  <span class="label-main">管理权限验证</span>
                  <span class="label-sub">Management Auth</span>
                </div>
                <div class="section-line"></div>
              </div>
              
              <div class="shareholder-grid">
                <button 
                  v-for="name in shareholders"
                  :key="name"
                  @click="selectedAccount = name; errorMessage = ''"
                  class="shareholder-btn"
                  :class="{ 'is-selected': selectedAccount === name }"
                >
                  <div class="shareholder-avatar">
                    <span>{{ name[0] }}</span>
                    <div v-if="selectedAccount === name" class="avatar-ring"></div>
                  </div>
                  <span class="shareholder-name">{{ name }}</span>
                  <div v-if="selectedAccount === name" class="selected-indicator">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                </button>
              </div>

              <!-- Password Field -->
              <div class="password-container">
                <div class="password-field" :class="{ 'is-focused': isPasswordFocused }">
                  <div class="password-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0110 0v4"></path>
                    </svg>
                  </div>
                  <input 
                    v-model="password" 
                    type="password"
                    placeholder="请输入密码"
                    class="password-input"
                    @keyup.enter="handleLogin"
                    @focus="isPasswordFocused = true"
                    @blur="isPasswordFocused = false"
                  />
                  <button 
                    @click="handleLogin"
                    :disabled="!password || loading"
                    class="submit-btn"
                  >
                    <svg v-if="!loading" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                    <div v-else class="btn-spinner"></div>
                  </button>
                </div>
                <div class="password-glow"></div>
              </div>

              <!-- Error Message -->
              <Transition name="slide-up">
                <div v-if="errorMessage" class="error-toast">
                  <div class="error-pulse"></div>
                  <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                  <span>验证失败：{{ errorMessage }}</span>
                </div>
              </Transition>
            </div>
          </div>

          <!-- ===== Footer: Session Status ===== -->
          <Transition name="slide-up">
            <div v-if="authStore.isAuthenticated" class="card-footer">
              <div class="session-status">
                <div class="status-dot"></div>
                <span>SESSION ACTIVE</span>
                <span class="status-name">{{ authStore.userProfile?.name }}</span>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useSettingsStore } from '../stores/settings';

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
const settingsStore = useSettingsStore();

const employees = ref<string[]>([]);
const shareholders = ref<string[]>([]);

const selectedAccount = ref('');
const password = ref('');
const errorMessage = ref('');
const isPasswordFocused = ref(false);
const loading = ref(false);

watch(() => props.isOpen, (newVal) => {
  if (!newVal) return;
  password.value = '';
  errorMessage.value = '';
  loading.value = false;

  (async () => {
    const list = await authStore.fetchPickList();
    employees.value = list.employees || [];
    shareholders.value = list.bosses || [];
    selectedAccount.value = shareholders.value[0] || '';
  })();
});

const employeeLogin = async (name: string) => {
  try {
    loading.value = true;
    await authStore.employeeLogin(name);
    emit('login-success');
    emit('close');
  } catch (error: any) {
    errorMessage.value = error.message;
  } finally {
    loading.value = false;
  }
};

const handleLogin = async () => {
  if (!password.value || loading.value) return;
  errorMessage.value = '';
  loading.value = true;
  
  try {
    await authStore.login(selectedAccount.value, password.value);
    emit('login-success');
    emit('close');
  } catch (error: any) {
    errorMessage.value = error.message || '权限校验未通过';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
/* ===== Design Tokens ===== */
.login-overlay {
  --brand-orange: #FF6633;
  --brand-orange-light: #FF8855;
  --brand-orange-deep: #E85A2C;
  --brand-orange-glow: rgba(255, 102, 51, 0.35);
  
  --gray-50: #F9FAFB;
  --gray-100: #F3F4F6;
  --gray-200: #E5E7EB;
  --gray-300: #D1D5DB;
  --gray-400: #9CA3AF;
  --gray-500: #6B7280;
  --gray-600: #4B5563;
  --gray-700: #374151;
  --gray-800: #1F2937;
  --gray-900: #111827;
  
  --color-success: #10B981;
  --color-error: #EF4444;
  
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
}

/* ===== Overlay ===== */
.login-overlay {
  background: linear-gradient(
    135deg,
    rgba(0, 0, 0, 0.5) 0%,
    rgba(0, 0, 0, 0.35) 50%,
    rgba(0, 0, 0, 0.5) 100%
  );
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

/* ===== Login Card ===== */
.login-card {
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.98) 0%,
    rgba(250, 252, 255, 0.98) 100%
  );
  border-radius: 32px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 
    0 0 0 1px rgba(0, 0, 0, 0.03),
    0 16px 48px rgba(0, 0, 0, 0.12),
    0 32px 80px rgba(0, 0, 0, 0.08);
  isolation: isolate;
}

.card-glow {
  position: absolute;
  top: -50%;
  right: -30%;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, var(--brand-orange-glow) 0%, transparent 70%);
  opacity: 0.4;
  pointer-events: none;
  animation: glow-pulse 4s ease-in-out infinite;
  z-index: 0;
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.3; transform: scale(0.9); }
  50% { opacity: 0.5; transform: scale(1.1); }
}

.card-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 40%,
    rgba(255, 255, 255, 0.5) 50%,
    transparent 60%
  );
  transform: translateX(-100%);
  animation: card-shimmer 3.5s ease-in-out infinite;
  pointer-events: none;
  z-index: 1;
  border-radius: inherit;
}

@keyframes card-shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* ===== Card Header ===== */
.card-header {
  position: relative;
  z-index: 2;
  padding: 40px 40px 24px;
  text-align: center;
}

.brand-logo {
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
}

.logo-ring {
  position: absolute;
  inset: -6px;
  border-radius: 24px;
  border: 2px solid rgba(255, 102, 51, 0.2);
  animation: ring-pulse 2.5s ease-in-out infinite;
}

@keyframes ring-pulse {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.08); opacity: 0.3; }
}

.logo-icon {
  width: 100%;
  height: 100%;
  background: linear-gradient(145deg, var(--brand-orange-light), var(--brand-orange-deep));
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 
    0 8px 24px var(--brand-orange-glow),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  animation: logo-float 4s ease-in-out infinite;
}

@keyframes logo-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.logo-letter {
  font-size: 36px;
  font-weight: 900;
  color: white;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.brand-title {
  font-size: 26px;
  font-weight: 800;
  color: var(--gray-900);
  letter-spacing: -0.5px;
  margin-bottom: 6px;
}

.brand-subtitle {
  font-size: 10px;
  font-weight: 700;
  color: var(--brand-orange);
  text-transform: uppercase;
  letter-spacing: 2.5px;
}

/* ===== Card Body ===== */
.card-body {
  position: relative;
  z-index: 2;
  padding: 0 40px 40px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* ===== Login Section ===== */
.login-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.section-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--gray-200), transparent);
}

.section-label {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.label-main {
  font-size: 11px;
  font-weight: 800;
  color: var(--gray-500);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.label-sub {
  font-size: 9px;
  font-weight: 600;
  color: var(--gray-400);
  text-transform: uppercase;
  letter-spacing: 1.5px;
}

/* ===== Employee Grid ===== */
.employee-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 10px;
}

.employee-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  background: linear-gradient(180deg, var(--gray-50), white);
  border: 1.5px solid var(--gray-100);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.25s var(--ease-smooth);
  position: relative;
  overflow: hidden;
}

.employee-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 102, 51, 0.08), transparent);
  opacity: 0;
  transition: opacity 0.25s;
}

.employee-btn:hover {
  transform: translateY(-3px);
  border-color: rgba(255, 102, 51, 0.3);
  box-shadow: 0 8px 20px rgba(255, 102, 51, 0.12);
}

.employee-btn:hover::before {
  opacity: 1;
}

.employee-btn:active {
  transform: translateY(0) scale(0.97);
}

.employee-avatar {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, var(--gray-200), var(--gray-300));
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 800;
  color: var(--gray-600);
  transition: all 0.25s;
}

.employee-btn:hover .employee-avatar {
  background: linear-gradient(135deg, var(--brand-orange-light), var(--brand-orange));
  color: white;
}

.employee-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--gray-700);
  transition: color 0.25s;
}

.employee-btn:hover .employee-name {
  color: var(--brand-orange);
}

/* ===== Shareholder Grid ===== */
.shareholder-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.shareholder-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  background: white;
  border: 2px solid var(--gray-100);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s var(--ease-smooth);
  position: relative;
}

.shareholder-btn:hover:not(.is-selected) {
  border-color: var(--gray-200);
  background: var(--gray-50);
}

.shareholder-btn.is-selected {
  background: linear-gradient(135deg, var(--gray-900), var(--gray-800));
  border-color: var(--gray-900);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  transform: scale(1.02);
}

.shareholder-avatar {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, var(--gray-100), var(--gray-200));
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 800;
  color: var(--gray-500);
  transition: all 0.3s;
  position: relative;
}

.shareholder-btn.is-selected .shareholder-avatar {
  background: linear-gradient(135deg, var(--brand-orange-light), var(--brand-orange));
  color: white;
}

.avatar-ring {
  position: absolute;
  inset: -4px;
  border-radius: 14px;
  border: 2px solid var(--brand-orange);
  animation: ring-pulse 1.5s ease-in-out infinite;
}

.shareholder-name {
  flex: 1;
  font-size: 15px;
  font-weight: 800;
  color: var(--gray-700);
  transition: color 0.3s;
}

.shareholder-btn.is-selected .shareholder-name {
  color: white;
}

.selected-indicator {
  width: 24px;
  height: 24px;
  background: var(--brand-orange);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pop-in 0.3s var(--ease-spring);
}

.selected-indicator svg {
  width: 14px;
  height: 14px;
  color: white;
}

@keyframes pop-in {
  0% { transform: scale(0); }
  100% { transform: scale(1); }
}

/* ===== Password Field ===== */
.password-container {
  position: relative;
  margin-top: 8px;
}

.password-field {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 8px 8px 24px;
  background: linear-gradient(180deg, var(--gray-50), white);
  border: 2px solid var(--gray-100);
  border-radius: 24px;
  transition: all 0.3s var(--ease-smooth);
  position: relative;
  z-index: 1;
}

.password-field.is-focused {
  background: white;
  border-color: var(--brand-orange);
  box-shadow: 0 0 0 4px rgba(255, 102, 51, 0.1);
}

.password-glow {
  position: absolute;
  inset: -8px;
  background: radial-gradient(ellipse at center, var(--brand-orange-glow) 0%, transparent 70%);
  border-radius: 32px;
  opacity: 0;
  transition: opacity 0.4s;
  z-index: 0;
  filter: blur(12px);
}

.password-field.is-focused + .password-glow {
  opacity: 0.5;
}

.password-icon {
  width: 24px;
  height: 24px;
  color: var(--gray-300);
  transition: color 0.3s;
  flex-shrink: 0;
}

.password-field.is-focused .password-icon {
  color: var(--brand-orange);
}

.password-icon svg {
  width: 100%;
  height: 100%;
}

.password-input {
  flex: 1;
  height: 48px;
  border: none;
  background: transparent;
  font-size: 16px;
  font-weight: 700;
  font-family: 'SF Mono', 'Monaco', monospace;
  letter-spacing: 3px;
  color: var(--gray-800);
  outline: none;
}

.password-input::placeholder {
  font-family: inherit;
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0;
  color: var(--gray-300);
}

.submit-btn {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, var(--gray-800), var(--gray-900));
  border: none;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s var(--ease-smooth);
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}

.submit-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--brand-orange-light), var(--brand-orange-deep));
  opacity: 0;
  transition: opacity 0.3s;
}

.submit-btn:hover:not(:disabled)::before {
  opacity: 1;
}

.submit-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

.submit-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.submit-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.submit-btn svg {
  width: 24px;
  height: 24px;
  color: white;
  position: relative;
  z-index: 1;
  transition: transform 0.3s;
}

.submit-btn:hover:not(:disabled) svg {
  transform: translateX(3px);
}

.btn-spinner {
  width: 24px;
  height: 24px;
  border: 2.5px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ===== Error Toast ===== */
.error-toast {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  background: linear-gradient(135deg, #FEF2F2, #FEE2E2);
  border: 1px solid #FECACA;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-error);
  position: relative;
  overflow: hidden;
}

.error-pulse {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--color-error);
  animation: error-pulse 1.5s ease-in-out infinite;
}

@keyframes error-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.error-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

/* ===== Card Footer ===== */
.card-footer {
  position: relative;
  z-index: 2;
  padding: 16px 40px;
  background: linear-gradient(180deg, rgba(16, 185, 129, 0.04), rgba(16, 185, 129, 0.08));
  border-top: 1px solid rgba(16, 185, 129, 0.1);
}

.session-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 10px;
  font-weight: 700;
  color: var(--color-success);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: var(--color-success);
  border-radius: 50%;
  animation: status-glow 2s ease-in-out infinite;
}

@keyframes status-glow {
  0%, 100% { box-shadow: 0 0 8px rgba(16, 185, 129, 0.5); }
  50% { box-shadow: 0 0 16px rgba(16, 185, 129, 0.8); }
}

.status-name {
  color: var(--gray-700);
  font-weight: 800;
}

/* ===== Vue Transitions ===== */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.scale-enter-active {
  transition: all 0.5s var(--ease-spring);
}

.scale-leave-active {
  transition: all 0.3s var(--ease-smooth);
}

.scale-enter-from {
  opacity: 0;
  transform: scale(0.92) translateY(20px);
}

.scale-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

.slide-up-enter-active {
  transition: all 0.4s var(--ease-spring);
}

.slide-up-leave-active {
  transition: all 0.25s var(--ease-smooth);
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(16px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ===== Responsive ===== */
@media (max-width: 480px) {
  .login-card {
    margin: 16px;
    border-radius: 24px;
  }
  
  .card-header {
    padding: 32px 24px 20px;
  }
  
  .card-body {
    padding: 0 24px 32px;
  }
  
  .employee-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .shareholder-grid {
    grid-template-columns: 1fr;
  }
}
</style>

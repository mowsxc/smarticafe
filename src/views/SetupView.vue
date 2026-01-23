<template>
  <div class="setup-view min-h-screen w-full flex items-center justify-center p-6 relative overflow-hidden">
      <!-- ===== Ambient Background Effects ===== -->
      <div class="ambient-layer">
        <div class="ambient-orb ambient-orb--primary"></div>
        <div class="ambient-orb ambient-orb--secondary"></div>
        <div class="ambient-orb ambient-orb--accent"></div>
      </div>
      
      <!-- Pattern Grid -->
      <div class="pattern-grid"></div>

      <!-- ===== Main Container ===== -->
      <div class="setup-container w-full max-w-[540px] z-10">
          
          <!-- ===== Progress Stepper ===== -->
          <div class="stepper mb-10 px-4">
            <div class="stepper-track">
              <div class="stepper-track-fill" :style="{ width: `${((step - 1) / 2) * 100}%` }"></div>
            </div>
            <div class="stepper-nodes">
              <div 
                v-for="i in 3" 
                :key="i" 
                class="stepper-node"
                :class="{ 'is-active': step >= i, 'is-current': step === i }"
              >
                <!-- 光圈容器：与圆点位置完全重合 -->
                <div class="stepper-node-wrapper">
                  <div class="stepper-node-ring"></div>
                  <div class="stepper-node-dot">
                    <svg v-if="step > i" class="stepper-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span v-else class="stepper-number">{{ i }}</span>
                  </div>
                </div>
                <span class="stepper-label">{{ ['账号配置', '云端同步', '完成启动'][i-1] }}</span>
              </div>
            </div>
          </div>

          <!-- ===== Main Card ===== -->
          <div class="setup-card">
            <!-- Card Glow Effects -->
            <div class="card-glow"></div>
            <div class="card-shimmer"></div>
            
            <!-- ===== STEP 1: System Init ===== -->
            <Transition name="step-slide" mode="out-in">
              <div v-if="step === 1" key="step1" class="step-content">
                <!-- Header with Version -->
                <div class="step-header">
                  <div class="step-icon step-icon--orange">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                  <h1 class="step-title">初始化系统</h1>
                  <p class="step-subtitle">设置品牌信息与超级管理员账号</p>
                  <!-- 系统版本信息 -->
                  <div class="version-badge">
                    <span class="version-label">Smarticafe</span>
                    <span class="version-divider">·</span>
                    <span class="version-number">v2.0.0</span>
                  </div>
                </div>

                <!-- Scrollable Form Container -->
                <div ref="formScrollRef" class="step-body custom-scrollbar">
                  <!-- 品牌设置 Section -->
                  <div class="form-section" ref="brandSectionRef">
                    <div class="form-section-label" :class="{ 'is-focused': isBrandFocused }">
                      <div class="label-icon-wrap">
                        <svg class="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                          <polyline points="9 22 9 12 15 12 15 22"/>
                        </svg>
                        <div class="label-icon-glow"></div>
                      </div>
                      <span class="label-text">品牌设置</span>
                    </div>
                    <div class="form-row">
                      <div class="form-field">
                        <label class="field-label">品牌名称</label>
                        <input 
                          v-model="form.brandName" 
                          type="text" 
                          placeholder="如：创新意电竞"
                          class="field-input"
                          @focus="isBrandFocused = true"
                          @blur="handleBrandBlur"
                        />
                      </div>
                      <div class="form-field">
                        <label class="field-label">门店名称</label>
                        <input 
                          v-model="form.storeName" 
                          type="text" 
                          placeholder="如：总店"
                          class="field-input"
                          @focus="isBrandFocused = true"
                          @blur="handleStoreBlur"
                        />
                      </div>
                    </div>
                  </div>

                  <div class="form-divider"></div>

                  <!-- 管理员账号 Section -->
                  <div class="form-section" ref="adminSectionRef">
                    <div class="form-section-label" :class="{ 'is-focused': isAdminFocused }">
                      <div class="label-icon-wrap">
                        <svg class="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                        <div class="label-icon-glow"></div>
                      </div>
                      <span class="label-text">管理员账号</span>
                    </div>
                    <div class="form-field">
                      <label class="field-label">显示名称</label>
                      <input 
                        ref="displayNameInputRef"
                        v-model="form.displayName" 
                        type="text" 
                        placeholder="如：店长"
                        class="field-input"
                        @focus="isAdminFocused = true"
                        @blur="isAdminFocused = false"
                      />
                    </div>
                    <div class="form-row">
                      <div class="form-field">
                        <label class="field-label">登录账号</label>
                        <input 
                          v-model="form.pickName" 
                          type="text" 
                          placeholder="如：admin"
                          class="field-input"
                          @focus="isAdminFocused = true"
                          @blur="isAdminFocused = false"
                        />
                      </div>
                      <div class="form-field">
                        <label class="field-label">登录密码</label>
                        <input 
                          v-model="form.password" 
                          type="password" 
                          placeholder="••••••"
                          class="field-input"
                          @focus="isAdminFocused = true"
                          @blur="isAdminFocused = false"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Action Button -->
                <button @click="handleStep1" :disabled="!isValidStep1 || loading" class="btn-primary">
                  <div v-if="loading" class="btn-spinner"></div>
                  <span>{{ loading ? '正在处理...' : '下一步：云端设置' }}</span>
                  <svg v-if="!loading" class="btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>

              <!-- ===== STEP 2: Cloud Setup ===== -->
              <div v-else-if="step === 2" key="step2" class="step-content">
                <!-- Header -->
                <div class="step-header">
                  <div class="step-icon step-icon--blue">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
                    </svg>
                  </div>
                  <h1 class="step-title">云端同步</h1>
                  <p class="step-subtitle">连接 Supabase 实现多端数据互通</p>
                </div>

                <!-- Form Body -->
                <div class="step-body">
                  <!-- Toggle Switch -->
                  <label class="cloud-toggle-card" :class="{ 'is-enabled': cloudForm.enabled }">
                    <div class="toggle-switch">
                      <input type="checkbox" v-model="cloudForm.enabled" class="toggle-input">
                      <div class="toggle-track">
                        <div class="toggle-thumb"></div>
                      </div>
                    </div>
                    <div class="toggle-content">
                      <span class="toggle-title">启用云同步服务</span>
                      <span class="toggle-desc">开启后可远程管理店铺数据，支持多设备协同</span>
                    </div>
                    <div class="toggle-badge" :class="cloudForm.enabled ? 'badge--on' : 'badge--off'">
                      {{ cloudForm.enabled ? '已开启' : '已关闭' }}
                    </div>
                  </label>

                  <!-- Cloud Config Fields -->
                  <Transition name="expand">
                    <div v-if="cloudForm.enabled" class="cloud-config">
                      <div class="form-field">
                        <label class="field-label">Project URL</label>
                        <input 
                          v-model="cloudForm.url" 
                          type="text" 
                          placeholder="https://xxx.supabase.co"
                          class="field-input field-input--mono"
                        />
                      </div>
                      <div class="form-field">
                        <label class="field-label">Anon Key</label>
                        <input 
                          v-model="cloudForm.key" 
                          type="password" 
                          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                          class="field-input field-input--mono"
                        />
                      </div>
                      <button class="btn-link" @click="testConnection">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="23 4 23 10 17 10"/>
                          <polyline points="1 20 1 14 7 14"/>
                          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                        </svg>
                        测试连接
                      </button>
                    </div>
                  </Transition>

                  <!-- Disabled State Visual -->
                  <div v-if="!cloudForm.enabled" class="cloud-disabled">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <line x1="1" y1="1" x2="23" y2="23"/>
                      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
                      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
                      <path d="M10.71 5.05A16 16 0 0 1 22.58 9"/>
                      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
                      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
                      <line x1="12" y1="20" x2="12.01" y2="20"/>
                    </svg>
                    <p>云端同步已禁用</p>
                    <span>数据将仅保存在本地设备</span>
                  </div>
                </div>

                <!-- Action Buttons -->
                <div class="btn-group">
                  <button @click="handleCloudSkip" class="btn-secondary">
                    {{ cloudForm.enabled ? '暂不启用' : '跳过配置' }}
                  </button>
                  <button @click="handleStep2" class="btn-primary" :disabled="cloudForm.enabled && (!cloudForm.url || !cloudForm.key)">
                    <span>继续下一步</span>
                    <svg class="btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- ===== STEP 3: Complete ===== -->
              <div v-else-if="step === 3" key="step3" class="step-content step-content--center">
                <!-- Success Animation -->
                <div class="success-badge">
                  <div class="success-ring success-ring--outer"></div>
                  <div class="success-ring success-ring--inner"></div>
                  <div class="success-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <div class="success-particles">
                    <span v-for="i in 8" :key="i" class="particle" :style="{ '--i': i }"></span>
                  </div>
                </div>

                <!-- Header -->
                <div class="step-header">
                  <h1 class="step-title step-title--success">配置完成！</h1>
                  <p class="step-subtitle">系统已准备就绪，祝您生意兴隆 🎉</p>
                </div>

                <!-- Summary Card -->
                <div class="summary-card">
                  <div class="summary-row">
                    <span class="summary-label">店铺信息</span>
                    <div class="summary-value">
                      <span class="brand-name">{{ form.brandName }}</span>
                      <span class="divider">/</span>
                      <span class="store-name">{{ form.storeName }}</span>
                    </div>
                  </div>
                  <div class="summary-row">
                    <span class="summary-label">管理员</span>
                    <div class="summary-value">
                      <span>{{ form.displayName }}</span>
                      <span class="account-tag">@{{ form.pickName }}</span>
                    </div>
                  </div>
                  <div class="summary-row">
                    <span class="summary-label">云端服务</span>
                    <div class="summary-value">
                      <span class="status-indicator" :class="cloudForm.enabled ? 'status--online' : 'status--offline'">
                        <span class="status-dot"></span>
                        {{ cloudForm.enabled ? '已启用' : '未启用' }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Final Action -->
                <button @click="handleStep3" class="btn-primary btn-primary--success">
                  <span>进入收银台</span>
                  <svg class="btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>
            </Transition>

            <!-- ===== Error Message ===== -->
            <Transition name="slide-up">
              <div v-if="errorMsg" class="error-toast">
                <div class="error-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                </div>
                <span>{{ errorMsg }}</span>
              </div>
            </Transition>

            <!-- Debug Tools (Hidden) -->
            <div class="debug-tools">
              <button @click="injectTest" class="debug-btn">⚠️ Inject Test</button>
              <button @click="simulateTraffic" class="debug-btn">⚡ Simulate</button>
            </div>
          </div>
      </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useSettingsStore } from '../stores/settings';
import { tauriCmd } from '../utils/tauri';

const router = useRouter();
const authStore = useAuthStore();
const settingsStore = useSettingsStore();

const step = ref(1);
const loading = ref(false);
const errorMsg = ref('');

// Form focus states for icon glow effects
const isBrandFocused = ref(false);
const isAdminFocused = ref(false);

// Refs for auto-scroll functionality
const formScrollRef = ref<HTMLDivElement | null>(null);
const adminSectionRef = ref<HTMLDivElement | null>(null);
const displayNameInputRef = ref<HTMLInputElement | null>(null);

// Auto-scroll to admin section when brand fields are completed
const scrollToAdminSection = () => {
  if (!formScrollRef.value || !adminSectionRef.value) return;
  
  // Smooth scroll to admin section
  adminSectionRef.value.scrollIntoView({ 
    behavior: 'smooth', 
    block: 'start'
  });
  
  // Focus on first admin field after scroll
  setTimeout(() => {
    displayNameInputRef.value?.focus();
  }, 400);
};

// Handle brand field blur - check if should auto-scroll
const handleBrandBlur = () => {
  isBrandFocused.value = false;
  
  // If both brand fields are filled, scroll to admin section
  if (form.brandName && form.storeName) {
    // Small delay to allow Tab navigation to work naturally
    setTimeout(() => {
      // Only scroll if no admin field is focused
      if (!isAdminFocused.value && !form.displayName) {
        scrollToAdminSection();
      }
    }, 150);
  }
};

const handleStoreBlur = () => {
  isBrandFocused.value = false;
  
  // If both brand fields are filled and store was just completed
  if (form.brandName && form.storeName && !form.displayName) {
    setTimeout(() => {
      scrollToAdminSection();
    }, 150);
  }
};

// Step 1: System Init
const form = reactive({
    pickName: '',
    displayName: '',
    password: '',
    brandName: '',
    storeName: '',
});

const injectTest = async () => {
    if(!confirm("Create Full Test Data? (MoJian, CuiGuoli, etc.)")) return;
    try {
        await tauriCmd('debug_seed_full_data');
        alert("✅ Seeded! Please refresh.");
    } catch(e: any) {
        alert(e);
    }
};

const simulateTraffic = async () => {
    const count = parseInt(prompt("How many orders?", "50") || "0");
    if (!count) return;
    
    loading.value = true;
    try {
        let token = authStore.currentUser?.token;
        if (!token) {
            const session = await tauriCmd<any>('auth_login', { input: { pick_name: 'laoban', password: 'admin' } });
            token = session.token;
        }

        const products = await tauriCmd<any[]>('products_list', { token, q: '' });
        if (products.length === 0) throw new Error("No products found. Inject test data first.");

        const orders = [];
        for (let i = 0; i < count; i++) {
            const items = [];
            const itemCount = Math.floor(Math.random() * 5) + 1;
            for (let j = 0; j < itemCount; j++) {
                const prod = products[Math.floor(Math.random() * products.length)];
                items.push({ product_id: prod.id, quantity: 1 });
            }
            orders.push({
                token,
                date_ymd: '2026-01-23',
                shift: '白班',
                employee: 'admin',
                items
            });
        }

        const start = performance.now();
        await Promise.all(orders.map(o => tauriCmd('pos_checkout', o)));
        
        const duration = performance.now() - start;
        alert(`✅ Processed ${count} orders in ${(duration/1000).toFixed(2)}s\nTPS: ${(count / (duration/1000)).toFixed(1)}`);

    } catch (e: any) {
        alert("Stress Test Failed: " + e.message);
    } finally {
        loading.value = false;
    }
};

// Step 2: Cloud
const cloudForm = reactive({
    enabled: false,
    url: '',
    key: ''
});

const isValidStep1 = computed(() => {
    return form.pickName && form.displayName && form.password && form.brandName && form.storeName;
});

const testConnection = () => {
    // TODO: Implement actual connection test
    alert('连接测试功能开发中...');
};

const handleStep1 = async () => {
    if (loading.value) return;
    loading.value = true;
    errorMsg.value = '';

    try {
        await authStore.bootstrapAdmin(form);
        
        settingsStore.brandSettings.brandName = form.brandName;
        settingsStore.brandSettings.storeName = form.storeName;
        
        step.value = 2;
    } catch (e: any) {
        errorMsg.value = e.message || 'Initialization failed';
    } finally {
        loading.value = false;
    }
};

const handleCloudSkip = () => {
    cloudForm.enabled = false;
    handleStep2();
}

const handleStep2 = () => {
    settingsStore.cloudSettings.enabled = cloudForm.enabled;
    if (cloudForm.enabled) {
        settingsStore.cloudSettings.supabaseUrl = cloudForm.url;
        settingsStore.cloudSettings.supabaseAnonKey = cloudForm.key;
    }
    step.value = 3;
};

const handleStep3 = async () => {
    router.replace('/');
};
</script>

<style scoped>
/* ===== Design Tokens ===== */
.setup-view {
  --brand-orange: #FF6633;
  --brand-orange-deep: #E85A2C;
  --brand-orange-light: #FF8855;
  --brand-orange-glow: rgba(255, 102, 51, 0.4);
  --brand-blue: #3B82F6;
  --brand-blue-deep: #2563EB;
  --brand-emerald: #10B981;
  --brand-emerald-deep: #059669;
  
  --surface-base: #F5F7FA;
  --surface-card: #FFFFFF;
  --surface-elevated: rgba(255, 255, 255, 0.95);
  --surface-muted: #F0F2F5;
  
  --text-primary: #1A1D24;
  --text-secondary: #6B7280;
  --text-tertiary: #9CA3AF;
  
  --border-soft: rgba(0, 0, 0, 0.06);
  --border-medium: rgba(0, 0, 0, 0.1);
  
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.08);
  --shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.1);
  --shadow-card: 
    0 0 0 1px var(--border-soft),
    0 4px 24px rgba(0, 0, 0, 0.04),
    0 12px 48px rgba(0, 0, 0, 0.06);
  
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-xl: 32px;
  --radius-full: 9999px;
  
  background: var(--surface-base);
}

/* ===== Ambient Background ===== */
.ambient-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.ambient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  animation: orb-drift 12s ease-in-out infinite;
}

.ambient-orb--primary {
  top: -20%;
  right: -10%;
  width: 500px;
  height: 500px;
  background: linear-gradient(135deg, var(--brand-orange) 0%, var(--brand-orange-deep) 100%);
  opacity: 0.06;
}

.ambient-orb--secondary {
  bottom: -25%;
  left: -15%;
  width: 450px;
  height: 450px;
  background: linear-gradient(135deg, var(--brand-blue) 0%, var(--brand-blue-deep) 100%);
  opacity: 0.04;
  animation-delay: -4s;
}

.ambient-orb--accent {
  top: 40%;
  left: 30%;
  width: 300px;
  height: 300px;
  background: var(--brand-orange);
  opacity: 0.02;
  animation-delay: -8s;
}

@keyframes orb-drift {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(20px, -30px) scale(1.05); }
  66% { transform: translate(-15px, 20px) scale(0.95); }
}

.pattern-grid {
  position: fixed;
  inset: 0;
  background-image: 
    linear-gradient(rgba(0, 0, 0, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 0, 0, 0.02) 1px, transparent 1px);
  background-size: 48px 48px;
  pointer-events: none;
  z-index: 1;
}

/* ===== Setup Container ===== */
.setup-container {
  transition: transform 0.5s var(--ease-out-expo);
}

/* ===== Stepper ===== */
.stepper {
  position: relative;
}

.stepper-track {
  position: absolute;
  top: 20px;
  left: 60px;
  right: 60px;
  height: 3px;
  background: var(--surface-muted);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.stepper-track-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--brand-orange-light), var(--brand-orange));
  border-radius: var(--radius-full);
  transition: width 0.6s var(--ease-out-expo);
  box-shadow: 0 0 12px var(--brand-orange-glow);
}

.stepper-nodes {
  display: flex;
  justify-content: space-between;
  position: relative;
  z-index: 1;
}

.stepper-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

/* 光圈容器：用于精确居中对齐 */
.stepper-node-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
}

.stepper-node-ring {
  position: absolute;
  inset: 0; /* 完全填充wrapper，实现中心对齐 */
  border-radius: 50%;
  border: 2px solid transparent;
  transition: all 0.4s var(--ease-smooth);
  pointer-events: none;
}

.stepper-node.is-current .stepper-node-ring {
  border-color: var(--brand-orange);
  animation: ring-pulse 2s ease-in-out infinite;
}

@keyframes ring-pulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.2); opacity: 0.15; }
}

.stepper-node-dot {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--surface-card);
  border: 2px solid var(--border-medium);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-tertiary);
  transition: all 0.4s var(--ease-spring);
  box-shadow: var(--shadow-sm);
  position: relative;
  z-index: 1;
}

.stepper-node.is-active .stepper-node-dot {
  background: linear-gradient(135deg, var(--brand-orange-light), var(--brand-orange-deep));
  border-color: var(--brand-orange);
  color: white;
  box-shadow: 0 4px 16px var(--brand-orange-glow);
}

.stepper-number {
  font-weight: 800;
}

.stepper-check {
  width: 18px;
  height: 18px;
}

.stepper-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: color 0.3s var(--ease-smooth);
}

.stepper-node.is-active .stepper-label {
  color: var(--brand-orange);
}

/* ===== Setup Card ===== */
.setup-card {
  background: var(--surface-card);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-card);
  padding: 48px;
  position: relative;
  overflow: hidden;
  min-height: 520px;
  display: flex;
  flex-direction: column;
}

.card-glow {
  position: absolute;
  top: -100px;
  right: -100px;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, var(--brand-orange-glow) 0%, transparent 70%);
  opacity: 0.3;
  pointer-events: none;
  animation: glow-pulse 4s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.2; transform: scale(0.9); }
  50% { opacity: 0.4; transform: scale(1.1); }
}

.card-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 40%,
    rgba(255, 255, 255, 0.4) 50%,
    transparent 60%
  );
  transform: translateX(-100%);
  animation: card-shimmer 4s ease-in-out infinite;
  pointer-events: none;
}

@keyframes card-shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* ===== Step Content ===== */
.step-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 32px;
  position: relative;
  z-index: 1;
}

.step-content--center {
  align-items: center;
  text-align: center;
}

/* ===== Step Header ===== */
.step-header {
  text-align: center;
}

.step-icon {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  position: relative;
}

.step-icon svg {
  width: 28px;
  height: 28px;
  color: white;
}

.step-icon--orange {
  background: linear-gradient(135deg, var(--brand-orange-light), var(--brand-orange-deep));
  box-shadow: 0 8px 24px var(--brand-orange-glow);
}

.step-icon--blue {
  background: linear-gradient(135deg, #60A5FA, var(--brand-blue-deep));
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.35);
}

.step-title {
  font-size: 24px;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 8px;
  letter-spacing: -0.5px;
}

.step-title--success {
  background: linear-gradient(135deg, var(--brand-emerald), var(--brand-emerald-deep));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.step-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
}

/* ===== Version Badge ===== */
.version-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 6px 14px;
  background: linear-gradient(135deg, rgba(255, 102, 51, 0.08), rgba(255, 102, 51, 0.04));
  border: 1px solid rgba(255, 102, 51, 0.15);
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
}

.version-label {
  color: var(--text-primary);
  letter-spacing: 0.3px;
}

.version-divider {
  color: var(--text-tertiary);
}

.version-number {
  color: var(--brand-orange);
  font-family: 'SF Mono', 'Monaco', monospace;
  letter-spacing: 0.5px;
}

/* ===== Step Body (Scrollable) ===== */
.step-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow-y: auto;
  overflow-x: hidden;
  max-height: calc(100vh - 380px); /* 计算可用高度 */
  padding-right: 8px;
  margin-right: -8px;
}

/* ===== Custom Scrollbar ===== */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(255, 102, 51, 0.3), rgba(255, 102, 51, 0.15));
  border-radius: 3px;
  transition: background 0.3s;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(255, 102, 51, 0.5), rgba(255, 102, 51, 0.3));
}

.custom-scrollbar::-webkit-scrollbar-thumb:active {
  background: var(--brand-orange);
}

/* ===== Form Styles ===== */
.form-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-section-label {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 8px 0;
  transition: all 0.3s var(--ease-smooth);
}

.form-section-label.is-focused {
  color: var(--brand-orange);
}

/* 图标容器 - 用于光效定位 */
.label-icon-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
}

.label-icon {
  width: 20px;
  height: 20px;
  color: var(--text-tertiary);
  transition: all 0.3s var(--ease-smooth);
  position: relative;
  z-index: 1;
}

.form-section-label.is-focused .label-icon {
  color: var(--brand-orange);
  transform: scale(1.1);
}

/* 图标发光效果 */
.label-icon-glow {
  position: absolute;
  inset: -4px;
  background: radial-gradient(circle, var(--brand-orange-glow) 0%, transparent 70%);
  border-radius: 50%;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.4s var(--ease-smooth);
  pointer-events: none;
  filter: blur(4px);
}

.form-section-label.is-focused .label-icon-glow {
  opacity: 0.8;
  transform: scale(1);
  animation: icon-glow-pulse 2s ease-in-out infinite;
}

@keyframes icon-glow-pulse {
  0%, 100% { opacity: 0.8; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.15); }
}

.label-text {
  transition: color 0.3s var(--ease-smooth);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-left: 4px;
}

.field-input {
  height: 48px;
  padding: 0 16px;
  background: var(--surface-muted);
  border: 1.5px solid transparent;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  transition: all 0.25s var(--ease-smooth);
  outline: none;
}

.field-input::placeholder {
  color: var(--text-tertiary);
  font-weight: 500;
}

.field-input:hover {
  background: var(--surface-card);
  border-color: var(--border-medium);
}

.field-input:focus {
  background: var(--surface-card);
  border-color: var(--brand-orange);
  box-shadow: 0 0 0 4px rgba(255, 102, 51, 0.1);
}

.field-input--mono {
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 12px;
  letter-spacing: -0.3px;
}

.form-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--border-soft), transparent);
  margin: 8px 0;
}

/* ===== Cloud Toggle Card ===== */
.cloud-toggle-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: var(--surface-muted);
  border: 1.5px solid transparent;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.3s var(--ease-smooth);
}

.cloud-toggle-card:hover {
  background: var(--surface-card);
  border-color: var(--border-medium);
  box-shadow: var(--shadow-md);
}

.cloud-toggle-card.is-enabled {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(59, 130, 246, 0.04));
  border-color: rgba(59, 130, 246, 0.3);
}

.toggle-switch {
  position: relative;
  flex-shrink: 0;
}

.toggle-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-track {
  width: 52px;
  height: 28px;
  background: var(--surface-muted);
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-full);
  transition: all 0.3s var(--ease-smooth);
  position: relative;
}

.toggle-input:checked + .toggle-track {
  background: var(--brand-blue);
  border-color: var(--brand-blue);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 22px;
  height: 22px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  transition: transform 0.3s var(--ease-spring);
}

.toggle-input:checked + .toggle-track .toggle-thumb {
  transform: translateX(24px);
}

.toggle-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.toggle-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.toggle-desc {
  font-size: 12px;
  color: var(--text-tertiary);
}

.toggle-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badge--on {
  background: rgba(59, 130, 246, 0.15);
  color: var(--brand-blue);
}

.badge--off {
  background: var(--surface-muted);
  color: var(--text-tertiary);
}

/* ===== Cloud Config ===== */
.cloud-config {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 0;
}

/* ===== Cloud Disabled State ===== */
.cloud-disabled {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  text-align: center;
  color: var(--text-tertiary);
  opacity: 0.6;
}

.cloud-disabled svg {
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
}

.cloud-disabled p {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--text-secondary);
}

.cloud-disabled span {
  font-size: 12px;
}

/* ===== Success Badge ===== */
.success-badge {
  position: relative;
  width: 100px;
  height: 100px;
  margin-bottom: 16px;
}

.success-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid var(--brand-emerald);
}

.success-ring--outer {
  inset: -12px;
  border-color: rgba(16, 185, 129, 0.2);
  animation: success-ring 2s ease-out forwards;
}

.success-ring--inner {
  animation: success-ring 2s ease-out 0.2s forwards;
}

@keyframes success-ring {
  0% { transform: scale(0); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

.success-icon {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--brand-emerald), var(--brand-emerald-deep));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(16, 185, 129, 0.4);
  animation: success-pop 0.6s var(--ease-spring) 0.3s forwards;
  transform: scale(0);
}

@keyframes success-pop {
  0% { transform: scale(0) rotate(-20deg); }
  100% { transform: scale(1) rotate(0deg); }
}

.success-icon svg {
  width: 40px;
  height: 40px;
  color: white;
  animation: check-draw 0.5s ease-out 0.6s forwards;
  stroke-dasharray: 30;
  stroke-dashoffset: 30;
}

@keyframes check-draw {
  to { stroke-dashoffset: 0; }
}

.success-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.particle {
  position: absolute;
  width: 6px;
  height: 6px;
  background: var(--brand-emerald);
  border-radius: 50%;
  top: 50%;
  left: 50%;
  animation: particle-burst 0.8s ease-out 0.5s forwards;
  opacity: 0;
}

@keyframes particle-burst {
  0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
  100% { 
    transform: translate(
      calc(-50% + cos(calc(var(--i) * 45deg)) * 60px),
      calc(-50% + sin(calc(var(--i) * 45deg)) * 60px)
    ) scale(0);
    opacity: 0;
  }
}

/* ===== Summary Card ===== */
.summary-card {
  width: 100%;
  max-width: 360px;
  background: linear-gradient(135deg, rgba(255, 102, 51, 0.04), transparent);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-soft);
}

.summary-row:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.summary-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.summary-value {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.brand-name {
  color: var(--brand-orange);
}

.divider {
  color: var(--text-tertiary);
  font-weight: 400;
}

.account-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  background: var(--surface-muted);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status--online .status-dot {
  background: var(--brand-emerald);
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
}

.status--online {
  color: var(--brand-emerald);
}

.status--offline .status-dot {
  background: var(--text-tertiary);
}

.status--offline {
  color: var(--text-tertiary);
}

/* ===== Buttons ===== */
.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 56px;
  padding: 0 32px;
  background: linear-gradient(135deg, var(--brand-orange-light), var(--brand-orange-deep));
  color: white;
  font-size: 15px;
  font-weight: 700;
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.3s var(--ease-smooth);
  box-shadow: 
    0 4px 16px var(--brand-orange-glow),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  position: relative;
  overflow: hidden;
}

.btn-primary::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.15), transparent);
  pointer-events: none;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 
    0 8px 24px var(--brand-orange-glow),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 
    0 2px 8px var(--brand-orange-glow),
    inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary--success {
  background: linear-gradient(135deg, var(--brand-emerald), var(--brand-emerald-deep));
  box-shadow: 
    0 4px 16px rgba(16, 185, 129, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.btn-primary--success:hover:not(:disabled) {
  box-shadow: 
    0 8px 24px rgba(16, 185, 129, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.btn-secondary {
  height: 56px;
  padding: 0 32px;
  background: var(--surface-muted);
  color: var(--text-secondary);
  font-size: 15px;
  font-weight: 700;
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.3s var(--ease-smooth);
}

.btn-secondary:hover {
  background: var(--surface-card);
  color: var(--text-primary);
  box-shadow: var(--shadow-md);
}

.btn-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--brand-orange);
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px 0;
  align-self: flex-end;
  transition: color 0.2s var(--ease-smooth);
}

.btn-link:hover {
  color: var(--brand-orange-deep);
}

.btn-link svg {
  width: 16px;
  height: 16px;
}

.btn-group {
  display: flex;
  gap: 12px;
}

.btn-group .btn-secondary {
  flex: 0 0 auto;
}

.btn-group .btn-primary {
  flex: 1;
}

.btn-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.btn-arrow {
  width: 18px;
  height: 18px;
  transition: transform 0.2s var(--ease-smooth);
}

.btn-primary:hover:not(:disabled) .btn-arrow {
  transform: translateX(4px);
}

/* ===== Error Toast ===== */
.error-toast {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #FEF2F2, #FEE2E2);
  border: 1px solid #FECACA;
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 600;
  color: #DC2626;
  box-shadow: 0 4px 16px rgba(220, 38, 38, 0.15);
}

.error-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-icon svg {
  width: 100%;
  height: 100%;
}

/* ===== Debug Tools ===== */
.debug-tools {
  position: absolute;
  top: 16px;
  left: 16px;
  display: flex;
  gap: 8px;
  opacity: 0.05;
  transition: opacity 0.3s;
}

.debug-tools:hover {
  opacity: 1;
}

.debug-btn {
  font-size: 10px;
  font-family: monospace;
  color: var(--text-tertiary);
  background: var(--surface-muted);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  cursor: pointer;
}

.debug-btn:hover {
  color: var(--text-primary);
  border-color: var(--border-medium);
}

/* ===== Vue Transitions ===== */
.step-slide-enter-active {
  transition: all 0.5s var(--ease-out-expo);
}

.step-slide-leave-active {
  transition: all 0.3s var(--ease-smooth);
}

.step-slide-enter-from {
  opacity: 0;
  transform: translateX(40px);
}

.step-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.4s var(--ease-out-expo);
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}

.expand-enter-to,
.expand-leave-from {
  max-height: 250px;
}

.slide-up-enter-active {
  transition: all 0.4s var(--ease-spring);
}

.slide-up-leave-active {
  transition: all 0.3s var(--ease-smooth);
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

/* ===== Mobile Responsive ===== */

/* Tablet (768px - 1024px) */
@media (max-width: 1024px) {
  .setup-view {
    padding: 24px;
  }
  
  .setup-container {
    max-width: 480px;
  }
  
  .setup-card {
    padding: 36px;
    border-radius: 24px;
  }
  
  .stepper {
    margin-bottom: 32px;
  }
  
  .stepper-track {
    top: 18px;
    left: 50px;
    right: 50px;
  }
  
  .stepper-node-wrapper {
    width: 44px;
    height: 44px;
  }
  
  .stepper-node-dot {
    width: 36px;
    height: 36px;
    font-size: 13px;
  }
  
  .stepper-label {
    font-size: 10px;
  }
}

/* Mobile Large (480px - 768px) */
@media (max-width: 768px) {
  .setup-view {
    padding: 16px;
    min-height: 100dvh;
  }
  
  .setup-container {
    max-width: 100%;
  }
  
  .setup-card {
    padding: 28px;
    border-radius: 20px;
    min-height: auto;
  }
  
  .stepper {
    margin-bottom: 24px;
    padding: 0;
  }
  
  .stepper-track {
    top: 16px;
    left: 40px;
    right: 40px;
    height: 2px;
  }
  
  .stepper-node-wrapper {
    width: 36px;
    height: 36px;
  }
  
  .stepper-node-dot {
    width: 32px;
    height: 32px;
    font-size: 12px;
    border-width: 1.5px;
  }
  
  .stepper-check {
    width: 14px;
    height: 14px;
  }
  
  .stepper-label {
    font-size: 9px;
    letter-spacing: 0.3px;
    max-width: 60px;
    text-align: center;
    line-height: 1.3;
  }
  
  .stepper-node {
    gap: 8px;
  }
  
  .step-header {
    text-align: center;
  }
  
  .step-icon {
    width: 56px;
    height: 56px;
    border-radius: 16px;
  }
  
  .step-icon svg {
    width: 24px;
    height: 24px;
  }
  
  .step-title {
    font-size: 20px;
  }
  
  .step-subtitle {
    font-size: 13px;
  }
  
  /* 移动端版本徽章 */
  .version-badge {
    margin-top: 8px;
    padding: 4px 12px;
    font-size: 10px;
  }
  
  /* 关键：移动端step-body高度优化 */
  .step-body {
    gap: 16px;
    max-height: none; /* 移除桌面端的max-height限制 */
    overflow-y: visible;
    flex: 1;
    min-height: 0; /* 允许flex收缩 */
  }
  
  /* 让整个setup-card可滚动而不是step-body */
  .setup-card {
    max-height: calc(100dvh - 120px); /* 留出步进器空间 */
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
  
  .step-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  
  .form-section {
    gap: 12px;
  }
  
  .form-section-label {
    gap: 10px;
    padding: 6px 0;
    font-size: 11px;
  }
  
  .label-icon-wrap {
    width: 28px;
    height: 28px;
  }
  
  .label-icon {
    width: 18px;
    height: 18px;
  }
  
  .form-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .form-field {
    gap: 4px;
  }
  
  .field-label {
    font-size: 10px;
  }
  
  .field-input {
    height: 44px;
    font-size: 14px;
    padding: 0 14px;
    border-radius: 10px;
  }
  
  .form-divider {
    margin: 4px 0;
  }
  
  .btn-primary {
    height: 52px;
    padding: 0 24px;
    font-size: 14px;
    border-radius: 14px;
  }
  
  .btn-secondary {
    height: 52px;
    padding: 0 24px;
    font-size: 14px;
    border-radius: 14px;
  }
  
  .btn-group {
    flex-direction: column-reverse;
    gap: 10px;
  }
  
  .btn-group .btn-secondary,
  .btn-group .btn-primary {
    width: 100%;
  }
  
  /* Cloud Toggle */
  .cloud-toggle-card {
    padding: 16px;
    flex-wrap: wrap;
    gap: 12px;
    border-radius: 14px;
  }
  
  .toggle-content {
    min-width: 0;
    flex: 1 1 calc(100% - 80px);
  }
  
  .toggle-title {
    font-size: 13px;
  }
  
  .toggle-desc {
    font-size: 11px;
  }
  
  .toggle-badge {
    font-size: 9px;
    padding: 3px 8px;
  }
  
  /* Cloud Config */
  .cloud-config {
    padding: 16px 0;
    gap: 12px;
  }
  
  .cloud-disabled {
    padding: 32px;
  }
  
  .cloud-disabled svg {
    width: 40px;
    height: 40px;
  }
  
  /* Success Badge */
  .success-badge {
    width: 80px;
    height: 80px;
  }
  
  .success-icon svg {
    width: 32px;
    height: 32px;
  }
  
  .success-ring--outer {
    inset: -10px;
  }
  
  /* Summary Card */
  .summary-card {
    max-width: 100%;
    padding: 20px;
    border-radius: 14px;
  }
  
  .summary-row {
    padding-bottom: 12px;
    gap: 12px;
  }
  
  .summary-label {
    font-size: 10px;
  }
  
  .summary-value {
    font-size: 13px;
  }
  
  /* Error Toast */
  .error-toast {
    padding: 12px 16px;
    font-size: 11px;
    border-radius: 12px;
  }
  
  /* Debug Tools - hide on mobile */
  .debug-tools {
    display: none;
  }
  
  /* Ambient effects - reduce on mobile for performance */
  .ambient-orb {
    filter: blur(60px);
  }
  
  .ambient-orb--primary {
    width: 300px;
    height: 300px;
    opacity: 0.04;
  }
  
  .ambient-orb--secondary {
    width: 250px;
    height: 250px;
    opacity: 0.03;
  }
  
  .ambient-orb--accent {
    display: none;
  }
  
  .pattern-grid {
    opacity: 0.3;
    background-size: 32px 32px;
  }
  
  .card-glow {
    width: 200px;
    height: 200px;
  }
}

/* Mobile Small (< 480px) */
@media (max-width: 480px) {
  .setup-view {
    padding: 12px;
  }
  
  .setup-card {
    padding: 24px 20px;
    border-radius: 16px;
  }
  
  .stepper-track {
    left: 32px;
    right: 32px;
  }
  
  .stepper-label {
    font-size: 8px;
    max-width: 50px;
  }
  
  .step-title {
    font-size: 18px;
  }
  
  .step-subtitle {
    font-size: 12px;
  }
  
  .btn-primary,
  .btn-secondary {
    height: 48px;
    font-size: 13px;
  }
}

/* Landscape Mobile */
@media (max-height: 600px) and (orientation: landscape) {
  .setup-view {
    padding: 12px 24px;
    min-height: auto;
    height: auto;
    overflow-y: auto;
  }
  
  .setup-card {
    min-height: auto;
    padding: 24px;
  }
  
  .stepper {
    margin-bottom: 16px;
  }
  
  .step-header {
    margin-bottom: 16px;
  }
  
  .step-icon {
    width: 48px;
    height: 48px;
    margin-bottom: 8px;
  }
  
  .step-title {
    font-size: 18px;
    margin-bottom: 4px;
  }
  
  .step-body {
    gap: 16px;
  }
}

/* Reduce motion for accessibility */
@media (prefers-reduced-motion: reduce) {
  .ambient-orb,
  .stepper-node-ring,
  .label-icon-glow,
  .card-shimmer,
  .card-glow {
    animation: none !important;
  }
  
  .step-slide-enter-active,
  .step-slide-leave-active,
  .expand-enter-active,
  .expand-leave-active,
  .slide-up-enter-active,
  .slide-up-leave-active {
    transition-duration: 0.01ms !important;
  }
}
</style>

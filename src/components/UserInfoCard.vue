<template>
  <Transition name="card-appear">
    <div v-if="user" class="user-info-card" :class="{ 'user-info-card--expanded': expanded }">
      <!-- Card Glow Effect -->
      <div class="card-glow"></div>
      
      <!-- Card Header -->
      <div class="card-header" @click="toggleExpand">
        <div class="user-avatar" :class="`avatar--${user.role}`">
          <span class="avatar-initials">{{ user.displayName.charAt(0) }}</span>
          <span class="status-indicator" :class="{ 'status-indicator--online': isOnline }"></span>
        </div>
        
        <div class="user-info">
          <div class="user-name">
            <span class="name-text">{{ user.displayName }}</span>
          </div>
          <div class="user-role">
            <span class="role-icon">{{ roleIcon }}</span>
            <span class="role-text">{{ roleLabel }}</span>
          </div>
        </div>
        
        <div class="expand-toggle" :class="{ 'expand-toggle--expanded': expanded }">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>
      
      <!-- Card Body (Expandable) -->
      <Transition name="card-expand">
        <div v-if="expanded" class="card-body">
          <!-- Stats Grid -->
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-icon stat-icon--sessions">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <div class="stat-info">
                <span class="stat-value">{{ loginCount }}</span>
                <span class="stat-label">本月登录</span>
              </div>
            </div>
            
            <div class="stat-item">
              <div class="stat-icon stat-icon--hours">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <div class="stat-info">
                <span class="stat-value">{{ workHours }}h</span>
                <span class="stat-label">本月工时</span>
              </div>
            </div>
            
            <div class="stat-item">
              <div class="stat-icon stat-icon--orders">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <path d="M16 10a4 4 0 0 1-8 0"></path>
                </svg>
              </div>
              <div class="stat-info">
                <span class="stat-value">{{ orderCount }}</span>
                <span class="stat-label">本月订单</span>
              </div>
            </div>
          </div>
          
          <!-- Actions -->
          <div class="card-actions">
            <button class="action-btn action-btn--primary" @click="handleViewDetails">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              查看详情
            </button>
            <button class="action-btn action-btn--secondary" @click="handleLogout">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              退出登录
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'

interface Props {
  expanded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  expanded: false,
})

const emit = defineEmits<{
  (e: 'toggle'): void
  (e: 'view-details'): void
  (e: 'logout'): void
}>()

const authStore = useAuthStore()
const user = computed(() => authStore.currentUser)
const expanded = ref(props.expanded)
const isOnline = ref(true)
const loginCount = ref(18)
const workHours = ref(156)
const orderCount = ref(324)

const roleLabel = computed(() => {
  if (!user.value) return ''
  const labels: Record<string, string> = {
    admin: '超级管理员',
    boss: '股东',
    employee: '员工',
  }
  return labels[user.value.role] || '未知'
})

const roleIcon = computed(() => {
  if (!user.value) return ''
  const icons: Record<string, string> = {
    admin: '👑',
    boss: '💎',
    employee: '👤',
  }
  return icons[user.value.role] || '👤'
})

const toggleExpand = () => {
  expanded.value = !expanded.value
  emit('toggle')
}

const handleViewDetails = () => {
  emit('view-details')
}

const handleLogout = async () => {
  await authStore.logout()
  emit('logout')
}

onMounted(() => {
  // Simulate online status
  isOnline.value = true
})
</script>

<style scoped>
.user-info-card {
  position: relative;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.98) 0%,
    rgba(250, 250, 250, 0.98) 100%
  );
  border-radius: 20px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.08),
    0 2px 6px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.user-info-card:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 8px 24px rgba(0, 0, 0, 0.12),
    0 4px 12px rgba(0, 0, 0, 0.06);
}

.user-info-card--expanded {
  box-shadow: 
    0 12px 32px rgba(0, 0, 0, 0.15),
    0 6px 16px rgba(0, 0, 0, 0.08);
}

/* Glow Effect */
.card-glow {
  position: absolute;
  inset: -2px;
  background: linear-gradient(
    135deg,
    rgba(249, 115, 22, 0.15) 0%,
    rgba(249, 115, 22, 0.05) 50%,
    rgba(249, 115, 22, 0.15) 100%
  );
  border-radius: inherit;
  opacity: 0;
  z-index: -1;
  transition: opacity 0.3s ease;
}

.user-info-card:hover .card-glow {
  opacity: 1;
}

/* Card Header */
.card-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  cursor: pointer;
  position: relative;
}

/* Avatar */
.user-avatar {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: transform 0.3s ease;
}

.user-avatar:hover {
  transform: scale(1.05);
}

.avatar--admin {
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4);
}

.avatar--boss {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
}

.avatar--employee {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.avatar-initials {
  font-size: 24px;
  font-weight: 700;
  color: white;
  font-family: 'Zoho Puvi', sans-serif;
}

.status-indicator {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid white;
  background: #22c55e;
}

.status-indicator--online {
  animation: statusPulse 2s ease-in-out infinite;
}

@keyframes statusPulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
  }
}

/* User Info */
.user-info {
  flex: 1;
}

.user-name {
  display: flex;
  align-items: center;
  gap: 10px;
}

.name-text {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.equity-badge {
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
}

.equity-badge--gold {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
}

.equity-badge--silver {
  background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(107, 114, 128, 0.4);
}

.equity-badge--bronze {
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
  color: white;
}

.user-role {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}

.role-icon {
  font-size: 12px;
}

.role-text {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

/* Expand Toggle */
.expand-toggle {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  transition: all 0.3s ease;
}

.expand-toggle svg {
  width: 16px;
  height: 16px;
  color: #6b7280;
  transition: transform 0.3s ease;
}

.expand-toggle--expanded svg {
  transform: rotate(180deg);
}

.expand-toggle:hover {
  background: #e5e7eb;
}

/* Card Body */
.card-body {
  padding: 0 20px 20px 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.stat-item:hover {
  background: #f3f4f6;
  transform: translateY(-1px);
}

.stat-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon svg {
  width: 18px;
  height: 18px;
}

.stat-icon--sessions {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.stat-icon--hours {
  background: rgba(249, 115, 22, 0.1);
  color: #f97316;
}

.stat-icon--equity {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}

.stat-icon--orders {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
  font-family: 'SF Mono', monospace;
}

.stat-label {
  font-size: 10px;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Equity Progress */
.equity-progress {
  margin-top: 16px;
  padding: 16px;
  background: linear-gradient(
    135deg,
    rgba(139, 92, 246, 0.05) 0%,
    rgba(139, 92, 246, 0.02) 100%
  );
  border-radius: 14px;
  border: 1px solid rgba(139, 92, 246, 0.1);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.progress-title {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.progress-value {
  font-size: 16px;
  font-weight: 700;
  color: #8b5cf6;
  font-family: 'SF Mono', monospace;
}

.progress-bar {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #8b5cf6 0%, #a78bfa 100%);
  border-radius: 4px;
  transition: width 0.5s ease;
}

.progress-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}

.progress-label {
  font-size: 11px;
  color: #9ca3af;
}

.progress-amount {
  font-size: 14px;
  font-weight: 700;
  color: #8b5cf6;
  font-family: 'SF Mono', monospace;
}

/* Card Actions */
.card-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
}

.action-btn svg {
  width: 16px;
  height: 16px;
}

.action-btn--primary {
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
}

.action-btn--primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(249, 115, 22, 0.4);
}

.action-btn--secondary {
  background: #f3f4f6;
  color: #6b7280;
}

.action-btn--secondary:hover {
  background: #e5e7eb;
  color: #374151;
}

/* Transitions */
.card-appear-enter-active {
  animation: cardAppear 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.card-appear-leave-active {
  animation: cardAppear 0.3s ease reverse;
}

@keyframes cardAppear {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.card-expand-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-expand-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-expand-enter-from,
.card-expand-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>

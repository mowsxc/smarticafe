<template>
  <transition name="notification">
    <div
      v-if="isVisible"
      :class="notificationClasses"
      :style="notificationStyle"
      @click="handleClick"
    >
      <span class="notification-icon">{{ icon }}</span>
      <span class="notification-message">{{ message }}</span>
      <button class="notification-close" @click.stop="handleClose">✕</button>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Props {
  type?: 'success' | 'error' | 'warning' | 'info'
  message?: string
  duration?: number
  autoClose?: boolean
  onClick?: () => void
  onClose?: () => void
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  message: '',
  duration: 3000,
  autoClose: true,
})

const emit = defineEmits<{
  close: []
}>()

const isVisible = ref(false)
const timeoutId = ref<number | null>(null)

const iconMap = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}

const icon = computed(() => iconMap[props.type])

const notificationClasses = computed(() => [
  'modern-notification',
  `modern-notification--${props.type}`,
  {
    'modern-notification--clickable': !!props.onClick,
  },
])

const notificationStyle = computed(() => {
  if (props.type === 'success') {
    return {
      background: 'linear-gradient(135deg, #10b981 0%, #22c55e 100%)',
      boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
    }
  }
  if (props.type === 'error') {
    return {
      background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
    }
  }
  if (props.type === 'warning') {
    return {
      background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
      boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
    }
  }
  return {
    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
  }
})

const handleClick = () => {
  if (props.onClick) {
    props.onClick()
  }
  handleClose()
}

const handleClose = () => {
  if (timeoutId.value) {
    clearTimeout(timeoutId.value)
  }
  emit('close')
  isVisible.value = false
}

const show = () => {
  // Don't show if message is empty
  if (!props.message || !props.message.trim()) {
    return
  }
  isVisible.value = true
  
  if (props.autoClose) {
    timeoutId.value = window.setTimeout(() => {
      handleClose()
    }, props.duration)
  }
}

// Auto-show on mount only if there's a message
onMounted(() => {
  if (props.message && props.message.trim()) {
    show()
  }
})
</script>

<style scoped>
.modern-notification {
  position: fixed;
  top: 80px;
  right: 24px;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  min-width: 320px;
  max-width: 420px;
  border-radius: 16px;
  color: white;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  cursor: default;
  font-family: 'Zoho Puvi', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  will-change: transform, opacity;
}

.modern-notification--clickable {
  cursor: pointer;
}

.modern-notification--clickable:hover {
  transform: scale(1.02);
}

.notification-icon {
  font-size: 18px;
  font-weight: bold;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notification-message {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.notification-close {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  transition: background 150ms ease;
}

.notification-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Enter Animation */
.notification-enter-active {
  animation: slideInRight 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.notification-leave-active {
  animation: slideOutRight 200ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes slideInRight {
  0% {
    transform: translateX(100%);
    opacity: 0;
  }
  60% {
    transform: translateX(-10%);
  }
  100% {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOutRight {
  0% {
    transform: translateX(0);
    opacity: 1;
  }
 100% {
    transform: translateX(100%);
    opacity: 0;
  }
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  .notification-enter-active,
  .notification-leave-active {
    animation: none;
    transition: opacity 200ms ease;
  }
}
</style>

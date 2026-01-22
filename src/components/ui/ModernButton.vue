<template>
  <button
    :class="buttonClasses"
    :disabled="disabled || loading"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @mousedown="handleMouseDown"
    @mouseup="handleMouseUp"
    ref="buttonRef"
  >
    <!-- Ripple Effect -->
    <span v-if="rippleStyle" class="ripple" :style="rippleStyle"></span>
    
    <!-- Glow Effect -->
    <span v-if="showGlow" class="button-glow"></span>
    
    <!-- Shimmer Effect -->
    <span class="shimmer"></span>
    
    <!-- Gradient Overlay -->
    <span class="gradient-overlay"></span>
    
    <!-- Button Content -->
    <span class="button-content">
      <slot name="icon">
        <span v-if="icon" class="icon">
          <slot name="icon-content">{{ icon }}</slot>
        </span>
      </slot>
      <span class="label">
        <slot>{{ label }}</slot>
      </span>
      <span v-if="loading" class="loading-spinner">
        <svg class="spinner" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="32" stroke-dashoffset="32" />
        </svg>
      </span>
    </span>
    
    <!-- Success State -->
    <span v-if="showSuccess" class="success-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  </button>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link' | 'success'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  icon?: string
  label?: string
  disabled?: boolean
  loading?: boolean
  success?: boolean
  type?: 'button' | 'submit' | 'reset'
  ripple?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  success: false,
  type: 'button',
  ripple: true,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const buttonRef = ref<HTMLButtonElement | null>(null)
const isPressed = ref(false)
const isHovered = ref(false)
const rippleStyle = ref<{ left: string; top: string; scale: string } | null>(null)
const showSuccess = ref(false)
const showGlow = ref(false)

// Auto-hide success state
watch(() => props.success, (val) => {
  if (val) {
    showSuccess.value = true
    showGlow.value = true
    setTimeout(() => {
      showSuccess.value = false
      showGlow.value = false
    }, 2000)
  }
})

const buttonClasses = computed(() => [
  'modern-button',
  `modern-button--${props.variant}`,
  `modern-button--${props.size}`,
  {
    'modern-button--loading': props.loading,
    'modern-button--success': showSuccess.value,
    'modern-button--pressed': isPressed.value,
    'modern-button--hovered': isHovered.value,
    'modern-button--disabled': props.disabled,
  },
])

const handleClick = (event: MouseEvent) => {
  if (props.disabled || props.loading) return
  
  // Ripple effect
  if (props.ripple && buttonRef.value) {
    const rect = buttonRef.value.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = event.clientX - rect.left - size / 2
    const y = event.clientY - rect.top - size / 2
    
    rippleStyle.value = {
      left: `${x}px`,
      top: `${y}px`,
      scale: '0',
    }
    
    // Trigger animation
    requestAnimationFrame(() => {
      rippleStyle.value = {
        left: `${x}px`,
        top: `${y}px`,
        scale: '2',
      }
    })
    
    setTimeout(() => {
      rippleStyle.value = null
    }, 400)
  }
  
  emit('click', event)
}

const handleMouseEnter = () => {
  isHovered.value = true
  showGlow.value = true
}

const handleMouseLeave = () => {
  isHovered.value = false
  showGlow.value = false
}

const handleMouseDown = () => {
  isPressed.value = true
}

const handleMouseUp = () => {
  isPressed.value = false
}
</script>

<style scoped>
.modern-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: all 200ms linear;
  position: relative;
  overflow: hidden;
  isolation: isolate;
  transform: translateZ(0);
}

/* Sizes */
.modern-button--xs {
  height: 24px;
  padding: 0 8px;
  border-radius: 6px;
  font-size: 11px;
}

.modern-button--sm {
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 12px;
}

.modern-button--md {
  height: 40px;
  padding: 0 16px;
  border-radius: 10px;
  font-size: 13px;
}

.modern-button--lg {
  height: 48px;
  padding: 0 24px;
  border-radius: 12px;
  font-size: 15px;
}

.modern-button--xl {
  height: 56px;
  padding: 0 32px;
  border-radius: 14px;
  font-size: 16px;
}

/* Variants */
.modern-button--primary {
  background: linear-gradient(135deg, #f97316 0%, #ea580c 50%, #c2410c 100%);
  color: white;
  box-shadow: 
    0 2px 4px rgba(249, 115, 22, 0.2),
    0 4px 8px rgba(249, 115, 22, 0.15),
    0 8px 16px rgba(249, 115, 22, 0.1);
}

.modern-button--primary:hover:not(.modern-button--disabled) {
  transform: translateY(-2px);
  box-shadow: 
    0 4px 8px rgba(249, 115, 22, 0.3),
    0 8px 16px rgba(249, 115, 22, 0.2),
    0 12px 24px rgba(249, 115, 22, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
}

.modern-button--primary:active:not(.modern-button--disabled) {
  transform: translateY(0) scale(0.98);
  box-shadow: 
    0 1px 2px rgba(249, 115, 22, 0.2),
    0 2px 4px rgba(249, 115, 22, 0.15),
    inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Secondary */
.modern-button--secondary {
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  color: #374151;
  border: 1px solid #e2e8f0;
  box-shadow: 
    0 1px 2px rgba(0, 0, 0, 0.05),
    0 2px 4px rgba(0, 0, 0, 0.03),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.modern-button--secondary:hover:not(.modern-button--disabled) {
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  border-color: #cbd5e1;
  box-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.06),
    0 4px 8px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  transform: translateY(-1px);
}

.modern-button--secondary:active:not(.modern-button--disabled) {
  transform: translateY(0) scale(0.98);
  background: linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
}

/* Danger */
.modern-button--danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%);
  color: white;
  box-shadow: 
    0 2px 4px rgba(239, 68, 68, 0.25),
    0 4px 8px rgba(239, 68, 68, 0.2),
    0 8px 16px rgba(239, 68, 68, 0.1);
}

.modern-button--danger:hover:not(.modern-button--disabled) {
  transform: translateY(-2px);
  box-shadow: 
    0 4px 8px rgba(239, 68, 68, 0.35),
    0 8px 16px rgba(239, 68, 68, 0.25),
    0 12px 24px rgba(239, 68, 68, 0.15);
}

.modern-button--danger:active:not(.modern-button--disabled) {
  transform: translateY(0) scale(0.98);
}

/* Success */
.modern-button--success {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%);
  color: white;
  box-shadow: 
    0 2px 4px rgba(34, 197, 94, 0.25),
    0 4px 8px rgba(34, 197, 94, 0.2),
    0 8px 16px rgba(34, 197, 94, 0.1);
}

.modern-button--success:hover:not(.modern-button--disabled) {
  transform: translateY(-2px);
  box-shadow: 
    0 4px 8px rgba(34, 197, 94, 0.35),
    0 8px 16px rgba(34, 197, 94, 0.25),
    0 12px 24px rgba(34, 197, 94, 0.15);
}

/* Ghost */
.modern-button--ghost {
  background: transparent;
  color: #6b7280;
}

.modern-button--ghost:hover:not(.modern-button--disabled) {
  background: linear-gradient(180deg, rgba(249, 115, 22, 0.08) 0%, rgba(249, 115, 22, 0.04) 100%);
  color: #f97316;
  transform: translateY(-1px);
}

/* Link */
.modern-button--link {
  background: transparent;
  color: #f97316;
  padding: 0;
  height: auto;
}

.modern-button--link:hover:not(.modern-button--disabled) {
  text-decoration: none;
  color: #ea580c;
  transform: translateY(-1px);
}

/* Disabled */
.modern-button--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

/* Loading State */
.modern-button--loading {
  pointer-events: none;
}

.modern-button--loading .label {
  opacity: 0.7;
}

/* Success State */
.modern-button--success .button-content {
  opacity: 0;
}

.success-icon {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.success-icon svg {
  width: 24px;
  height: 24px;
  animation: successPopIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes successPopIn {
  0% {
    transform: scale(0) rotate(-45deg);
    opacity: 0;
  }
  50% {
    transform: scale(1.2) rotate(0deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}

/* Glow Effect */
.button-glow {
  position: absolute;
  inset: -4px;
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.3) 0%, rgba(249, 115, 22, 0) 50%, rgba(249, 115, 22, 0.3) 100%);
  border-radius: inherit;
  opacity: 0;
  transition: opacity 200ms linear;
  z-index: -1;
  filter: blur(8px);
}

.modern-button--hovered .button-glow {
  opacity: 1;
}

.modern-button--success .button-glow {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0) 50%, rgba(34, 197, 94, 0.4) 100%);
}

/* Shimmer Effect */
.shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.2) 25%,
    rgba(255, 255, 255, 0.4) 50%,
    rgba(255, 255, 255, 0.2) 75%,
    transparent 100%
  );
  transform: translateX(-100%);
  opacity: 0;
  z-index: 1;
  pointer-events: none;
}

.modern-button--hovered .shimmer {
  opacity: 1;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

/* Gradient Overlay */
.gradient-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.15) 0%,
    rgba(255, 255, 255, 0) 50%,
    rgba(0, 0, 0, 0.05) 100%
  );
  border-radius: inherit;
  pointer-events: none;
  z-index: 0;
}

/* Ripple Effect - smoother and longer */
.ripple {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  transform: scale(0);
  animation: ripple 600ms linear;
  pointer-events: none;
  z-index: 1;
}

@keyframes ripple {
  0% {
    transform: scale(0);
    opacity: 1;
  }
  100% {
    transform: scale(2);
    opacity: 0;
  }
}

/* Content */
.button-content {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  position: relative;
  z-index: 2;
}

.icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.label {
  white-space: nowrap;
  letter-spacing: 0.02em;
}

/* Loading Spinner */
.loading-spinner {
  display: inline-flex;
  position: relative;
}

.spinner {
  width: 1.2em;
  height: 1.2em;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
    stroke-dashoffset: 32;
  }
  50% {
    stroke-dashoffset: 8;
    transform: rotate(180deg);
  }
  100% {
    transform: rotate(360deg);
    stroke-dashoffset: 32;
  }
}

/* Focus Visible */
.modern-button:focus-visible {
  outline: 2px solid rgba(249, 115, 22, 0.5);
  outline-offset: 2px;
}

/* Pressed State */
.modern-button--pressed:not(.modern-button--disabled) {
  transform: scale(0.96) translateY(1px);
}

/* Transition for content */
.button-content > * {
  transition: transform 200ms linear;
}

.modern-button:hover:not(.modern-button--disabled) .button-content > * {
  transform: translateY(-0.5px);
}
</style>

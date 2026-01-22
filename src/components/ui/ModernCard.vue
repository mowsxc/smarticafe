<template>
  <div
    :class="cardClasses"
    :style="cardStyle"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @mousedown="handleMouseDown"
    @mouseup="handleMouseUp"
    @click="handleClick"
    ref="cardRef"
  >
    <!-- Glow Effect -->
    <span v-if="showGlow" class="card-glow"></span>
    
    <!-- Shimmer Effect -->
    <span class="card-shimmer"></span>
    
    <!-- Gradient Overlay -->
    <span class="card-gradient"></span>
    
    <!-- Border Gradient -->
    <span class="card-border-gradient"></span>
    
    <!-- Content -->
    <div class="card-inner">
      <!-- Card Header -->
      <div v-if="$slots.header || title" class="card-header">
        <slot name="header">
          <div class="header-content">
            <div v-if="$slots.headerIcon" class="header-icon">
              <slot name="headerIcon" />
            </div>
            <div class="header-text">
              <h3 class="card-title">{{ title }}</h3>
              <p v-if="subtitle" class="card-subtitle">{{ subtitle }}</p>
            </div>
          </div>
          <div class="header-actions">
            <slot name="actions" />
          </div>
        </slot>
      </div>

      <!-- Card Body -->
      <div class="card-body" :class="{ 'no-padding': noPadding }">
        <slot />
      </div>

      <!-- Card Footer -->
      <div v-if="$slots.footer || $slots.actions" class="card-footer">
        <slot name="footer">
          <slot name="actions" />
        </slot>
      </div>
    </div>
    
    <!-- Active Indicator -->
    <span v-if="active" class="active-indicator"></span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  variant?: 'default' | 'glass' | 'elevated' | 'flat' | 'premium' | 'warning'
  hoverable?: boolean
  clickable?: boolean
  active?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  title?: string
  subtitle?: string
  noPadding?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  hoverable: true,
  clickable: false,
  active: false,
  padding: 'md',
  noPadding: false,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const cardRef = ref<HTMLElement | null>(null)
const isHovered = ref(false)
const isPressed = ref(false)
const showGlow = ref(false)

const cardClasses = computed(() => [
  'modern-card',
  `modern-card--${props.variant}`,
  {
    'modern-card--hoverable': props.hoverable && !props.clickable,
    'modern-card--clickable': props.clickable,
    'modern-card--active': props.active,
    'modern-card--hovered': isHovered.value,
    'modern-card--pressed': isPressed.value,
    'modern-card--no-padding': props.noPadding,
  },
])

const cardStyle = computed(() => {
  const styles: Record<string, string> = {}
  
  if (props.clickable) {
    styles.cursor = 'pointer'
  } else if (props.hoverable) {
    styles.cursor = 'default'
  }
  
  return styles
})

const handleMouseEnter = () => {
  if (props.hoverable || props.clickable) {
    isHovered.value = true
    showGlow.value = true
  }
}

const handleMouseLeave = () => {
  isHovered.value = false
  showGlow.value = false
}

const handleMouseDown = () => {
  if (props.clickable) {
    isPressed.value = true
  }
}

const handleMouseUp = () => {
  isPressed.value = false
}

const handleClick = (event: MouseEvent) => {
  if (props.clickable) {
    emit('click', event)
  }
}
</script>

<style scoped>
.modern-card {
  background: white;
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.04),
    0 1px 2px rgba(0, 0, 0, 0.02);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  isolation: isolate;
  transform: translateZ(0);
}

/* Variant: Default */
.modern-card--default {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 1) 100%);
}

/* Variant: Glass */
.modern-card--glass {
  background: rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

/* Variant: Elevated */
.modern-card--elevated {
  background: white;
  box-shadow: 
    0 4px 8px rgba(0, 0, 0, 0.06),
    0 2px 4px rgba(0, 0, 0, 0.04),
    0 0 0 1px rgba(0, 0, 0, 0.02);
}

/* Variant: Flat */
.modern-card--flat {
  background: white;
  box-shadow: none;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

/* Variant: Premium */
.modern-card--premium {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 250, 250, 0.95) 100%);
  border: 1px solid rgba(249, 115, 22, 0.15);
  box-shadow: 
    0 4px 12px rgba(249, 115, 22, 0.1),
    0 2px 8px rgba(249, 115, 22, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

/* Variant: Warning */
.modern-card--warning {
  background: linear-gradient(135deg, rgba(254, 243, 199, 0.95) 0%, rgba(253, 230, 138, 0.9) 100%);
  border: 1px solid rgba(251, 191, 36, 0.3);
  box-shadow: 
    0 4px 12px rgba(251, 191, 36, 0.15),
    0 2px 6px rgba(251, 191, 36, 0.1);
}

/* Hoverable */
.modern-card--hoverable:hover:not(.modern-card--clickable) {
  transform: translateY(-4px);
  box-shadow: 
    0 12px 24px rgba(0, 0, 0, 0.1),
    0 6px 12px rgba(0, 0, 0, 0.06),
    0 2px 4px rgba(0, 0, 0, 0.04);
}

/* Clickable */
.modern-card--clickable {
  cursor: pointer;
}

.modern-card--clickable:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 8px 16px rgba(0, 0, 0, 0.1),
    0 4px 8px rgba(0, 0, 0, 0.06),
    0 2px 4px rgba(0, 0, 0, 0.04);
}

.modern-card--clickable:active {
  transform: translateY(0) scale(0.99);
  box-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.08),
    0 1px 2px rgba(0, 0, 0, 0.04);
}

/* Active State */
.modern-card--active {
  border-color: rgba(249, 115, 22, 0.5);
  box-shadow: 
    0 0 0 1px rgba(249, 115, 22, 0.3),
    0 4px 12px rgba(249, 115, 22, 0.2);
}

/* Active Indicator */
.active-indicator {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  box-shadow: 0 0 12px rgba(34, 197, 94, 0.6);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

/* Glow Effect */
.card-glow {
  position: absolute;
  inset: -8px;
  background: radial-gradient(circle at 50% 0%, rgba(249, 115, 22, 0.15) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: -1;
  filter: blur(12px);
}

.modern-card--hovered .card-glow {
  opacity: 1;
}

.modern-card--premium .card-glow {
  background: radial-gradient(circle at 50% 0%, rgba(249, 115, 22, 0.2) 0%, transparent 70%);
}

/* Shimmer Effect */
.card-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.4) 25%,
    rgba(255, 255, 255, 0.6) 50%,
    rgba(255, 255, 255, 0.4) 75%,
    transparent 100%
  );
  transform: translateX(-100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 1;
  pointer-events: none;
  border-radius: inherit;
}

.modern-card--hovered .card-shimmer {
  opacity: 1;
  animation: shimmer 1.5s ease-in-out infinite;
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
.card-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.3) 0%,
    rgba(255, 255, 255, 0.1) 30%,
    rgba(255, 255, 255, 0) 100%
  );
  border-radius: inherit;
  pointer-events: none;
  z-index: 0;
}

/* Border Gradient */
.card-border-gradient {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.6) 0%,
    rgba(255, 255, 255, 0.2) 50%,
    rgba(255, 255, 255, 0.1) 100%
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  z-index: 2;
}

/* Inner Container */
.card-inner {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Header */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  position: relative;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(249, 115, 22, 0.05) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #f97316;
}

.header-text {
  display: flex;
  flex-direction: column;
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.88);
  margin: 0;
  line-height: 1.2;
  letter-spacing: 0.01em;
}

.card-subtitle {
  font-size: 11px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.4);
  margin: 4px 0 0 0;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Body */
.card-body {
  padding: 16px 24px;
  min-height: 60px;
  flex: 1;
}

.card-body.no-padding {
  padding: 0;
}

.card-body:empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(0, 0, 0, 0.4);
  font-size: 14px;
}

/* Footer */
.card-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 24px 20px 24px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

/* Padding variants */
.modern-card--padding-none .card-body {
  padding: 0;
}

.modern-card--padding-sm .card-body {
  padding: 12px 16px;
}

.modern-card--padding-md .card-body {
  padding: 16px 24px;
}

.modern-card--padding-lg .card-body {
  padding: 24px 32px;
}

/* Focus Visible */
.modern-card--clickable:focus-visible {
  outline: 2px solid rgba(249, 115, 22, 0.5);
  outline-offset: 2px;
}

/* Transition for content */
.card-header,
.card-body,
.card-footer {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modern-card--clickable:hover .card-header,
.modern-card--clickable:hover .card-body,
.modern-card--clickable:hover .card-footer {
  transform: translateY(-1px);
}

.modern-card--clickable:active .card-header,
.modern-card--clickable:active .card-body,
.modern-card--clickable:active .card-footer {
  transform: translateY(0);
}
</style>

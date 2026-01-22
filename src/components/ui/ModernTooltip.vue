<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

interface Props {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  position: 'top',
  delay: 300,
  disabled: false,
});

const tooltipRef = ref<HTMLElement | null>(null);
const isVisible = ref(false);
const tooltipStyle = ref<Record<string, string>>({});

let showTimer: ReturnType<typeof setTimeout> | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

const updatePosition = (event: MouseEvent | null = null) => {
  if (!tooltipRef.value) return;
  
  const target = event?.currentTarget as HTMLElement || tooltipRef.value.parentElement;
  if (!target) return;
  
  const rect = target.getBoundingClientRect();
  const tooltipRect = tooltipRef.value.getBoundingClientRect();
  const gap = 8;
  
  let top = 0;
  let left = 0;
  
  switch (props.position) {
    case 'top':
      top = rect.top - tooltipRect.height - gap;
      left = rect.left + (rect.width - tooltipRect.width) / 2;
      break;
    case 'bottom':
      top = rect.bottom + gap;
      left = rect.left + (rect.width - tooltipRect.width) / 2;
      break;
    case 'left':
      top = rect.top + (rect.height - tooltipRect.height) / 2;
      left = rect.left - tooltipRect.width - gap;
      break;
    case 'right':
      top = rect.top + (rect.height - tooltipRect.height) / 2;
      left = rect.right + gap;
      break;
  }
  
  // Keep within viewport
  const padding = 8;
  left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));
  top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding));
  
  tooltipStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
  };
};

const handleMouseEnter = (event: MouseEvent) => {
  if (props.disabled) return;
  
  updatePosition(event);
  showTimer = setTimeout(() => {
    isVisible.value = true;
  }, props.delay);
};

const handleMouseLeave = () => {
  if (hideTimer) clearTimeout(hideTimer);
  isVisible.value = false;
  if (showTimer) clearTimeout(showTimer);
};

const handleClick = async (event: MouseEvent) => {
  // Copy content to clipboard
  try {
    await navigator.clipboard.writeText(props.content);
    // Show brief success feedback
    isVisible.value = true;
    updatePosition(event);
    hideTimer = setTimeout(() => {
      isVisible.value = false;
    }, 1000);
  } catch (e) {
    console.warn('Failed to copy:', e);
  }
};

// Update position on window resize
const handleResize = () => {
  if (isVisible.value) {
    updatePosition();
  }
};

onMounted(() => {
  window.addEventListener('resize', handleResize);
  window.addEventListener('scroll', handleResize, true);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('scroll', handleResize, true);
  if (showTimer) clearTimeout(showTimer);
  if (hideTimer) clearTimeout(hideTimer);
});
</script>

<template>
  <div 
    ref="tooltipRef"
    class="tooltip"
    :class="[
      `tooltip--${position}`,
      { 'tooltip--visible': isVisible }
    ]"
    :style="tooltipStyle"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @click="handleClick"
  >
    <slot>
      <span class="tooltip-content">{{ content }}</span>
    </slot>
    <span class="tooltip-arrow"></span>
  </div>
</template>

<style scoped>
.tooltip {
  position: fixed;
  z-index: 9999;
  pointer-events: auto;
  opacity: 0;
  visibility: hidden;
  transition: opacity 150ms linear, visibility 150ms linear;
  will-change: opacity, visibility, top, left;
}

.tooltip--visible {
  opacity: 1;
  visibility: visible;
}

.tooltip-content {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  border-radius: 8px;
  color: white;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
}

.tooltip-content::before {
  content: '📋';
  font-size: 10px;
  opacity: 0.7;
}

.tooltip-arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background: rgba(0, 0, 0, 0.85);
  transform: rotate(45deg);
}

.tooltip--top .tooltip-arrow {
  bottom: -4px;
  left: 50%;
  margin-left: -4px;
}

.tooltip--bottom .tooltip-arrow {
  top: -4px;
  left: 50%;
  margin-left: -4px;
}

.tooltip--left .tooltip-arrow {
  right: -4px;
  top: 50%;
  margin-top: -4px;
}

.tooltip--right .tooltip-arrow {
  left: -4px;
  top: 50%;
  margin-top: -4px;
}
</style>

import { ref, onMounted, onUnmounted, type Ref, watch } from 'vue';

interface TooltipOptions {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  copyable?: boolean;
}

export function useTooltip(
  elementRef: Ref<HTMLElement | null>,
  options: TooltipOptions
) {
  const isVisible = ref(false);
  const position = ref(options.position || 'top');
  const content = ref(options.content);
  const delay = options.delay || 300;
  const copyable = options.copyable || false;

  let showTimer: ReturnType<typeof setTimeout> | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  const updatePosition = () => {
    if (!elementRef.value) return;
    
    const rect = elementRef.value.getBoundingClientRect();
    const tooltip = document.querySelector('.tooltip-container') as HTMLElement;
    if (!tooltip) return;
    
    const tooltipRect = tooltip.getBoundingClientRect();
    const gap = 8;
    
    let top = 0;
    let left = 0;
    
    switch (position.value) {
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
    
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  };

  const show = () => {
    if (showTimer) clearTimeout(showTimer);
    showTimer = setTimeout(() => {
      updatePosition();
      isVisible.value = true;
    }, delay);
  };

  const hide = () => {
    if (hideTimer) clearTimeout(hideTimer);
    if (showTimer) clearTimeout(showTimer);
    isVisible.value = false;
  };

  const copy = async () => {
    if (!copyable) return;
    try {
      await navigator.clipboard.writeText(content.value);
      // Show brief success indicator
      const originalContent = content.value;
      content.value = '已复制!';
      setTimeout(() => {
        content.value = originalContent;
      }, 1000);
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  };

  const handleMouseEnter = () => show();
  const handleMouseLeave = () => hide();
  const handleClick = () => {
    if (copyable) copy();
  };

  const handleWheel = () => {
    // Hide tooltip when scrolling
    hide();
  };

  onMounted(() => {
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', updatePosition);
    window.removeEventListener('scroll', updatePosition, true);
    if (showTimer) clearTimeout(showTimer);
    if (hideTimer) clearTimeout(hideTimer);
  });

  return {
    isVisible,
    content,
    position,
    show,
    hide,
    handleMouseEnter,
    handleMouseLeave,
    handleClick,
    handleWheel,
  };
}

// Composable for numeric input with wheel scroll
export function useNumberInput(
  modelValue: Ref<number | string>,
  options: {
    min?: number;
    max?: number;
    step?: number;
    allowDecimal?: boolean;
  } = {}
) {
  const { min = -Infinity, max = Infinity, step = 1, allowDecimal = true } = options;

  const handleWheel = (event: WheelEvent) => {
    event.preventDefault();
    
    const currentValue = parseFloat(String(modelValue.value)) || 0;
    let delta = event.deltaY > 0 ? -step : step;
    
    // For shift+wheel, use smaller step
    if (event.shiftKey) {
      delta = delta * 0.1;
    }
    
    let newValue = currentValue + delta;
    
    // Round for decimal inputs
    if (!allowDecimal) {
      newValue = Math.round(newValue);
    }
    
    // Clamp to min/max
    newValue = Math.max(min, Math.min(max, newValue));
    
    modelValue.value = newValue;
  };

  const increment = (amount: number = step) => {
    const currentValue = parseFloat(String(modelValue.value)) || 0;
    modelValue.value = Math.min(max, currentValue + amount);
  };

  const decrement = (amount: number = step) => {
    const currentValue = parseFloat(String(modelValue.value)) || 0;
    modelValue.value = Math.max(min, currentValue - amount);
  };

  return {
    handleWheel,
    increment,
    decrement,
  };
}

// Composable for smooth value transitions
export function useValueAnimation(value: Ref<number>) {
  const displayValue = ref(value.value);
  let animationFrame: number | null = null;

  const animateTo = (target: number, duration: number = 300) => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }

    const start = displayValue.value;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Linear interpolation for smooth animation
      displayValue.value = start + (target - start) * progress;

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
  };

  // Watch for value changes
  watch(value, (newVal: number) => {
    animateTo(newVal);
  });

  onUnmounted(() => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
  });

  return { displayValue };
}

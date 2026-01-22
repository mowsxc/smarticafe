/**
 * Unified Animation System for Smarticafe Pro
 * 
 * Design Principles:
 * - Physical-feeling interactions with spring motion
 * - Consistent timing and easing across all components
 * - 60fps performance target
 * - Accessibility: respect prefers-reduced-motion
 */

import { ref, onMounted, onUnmounted, type Ref } from 'vue'

// ==================== Animation Timing System ====================

export const ANIMATION_DURATION = {
  instant: 100,
  fast: 200,
  normal: 300,
  slow: 500,
  slower: 700,
} as const

export const ANIMATION_DELAY = {
  none: 0,
  short: 100,
  normal: 200,
  long: 300,
} as const

// ==================== Easing Functions ====================

export const EASING = {
  // Spring-based easing for physical feel
  springOut: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  springIn: 'cubic-bezier(0.36, 0, 0.66, -0.56)',
  springInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  
  // Standard easing
  easeOut: 'cubic-bezier(0.25, 1, 0.5, 1)',
  easeIn: 'cubic-bezier(0.5, 0, 0.75, 0)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  
  // Expo easing for dramatic effects
  easeOutExpo: 'cubic-bezier(0.16, 1, 0.3, 1)',
  easeInExpo: 'cubic-bezier(0.7, 0, 0.84, 0)',
  
  // Back easing for overshoot
  easeOutBack: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  easeInBack: 'cubic-bezier(0.36, 0, 0.66, -0.56)',
} as const

// ==================== Animation Presets ====================

export const ANIMATION_PRESETS = {
  // Micro-interactions
  buttonPress: {
    duration: ANIMATION_DURATION.fast,
    easing: EASING.springOut,
    scale: 0.95,
  },
  buttonHover: {
    duration: ANIMATION_DURATION.fast,
    easing: EASING.easeOut,
    scale: 1.05,
    y: -2,
  },
  cardHover: {
    duration: ANIMATION_DURATION.normal,
    easing: EASING.easeOut,
    y: -4,
    scale: 1.02,
    shadow: '0 12px 24px rgba(0, 0, 0, 0.15)',
  },
  
  // Page transitions
  pageEnter: {
    duration: ANIMATION_DURATION.slow,
    easing: EASING.easeOutExpo,
    opacity: [0, 1],
    y: [20, 0],
  },
  pageLeave: {
    duration: ANIMATION_DURATION.fast,
    easing: EASING.easeInExpo,
    opacity: [1, 0],
    y: [0, -20],
  },
  
  // Modal transitions
  modalEnter: {
    duration: ANIMATION_DURATION.normal,
    easing: EASING.springOut,
    scale: [0.9, 1],
    opacity: [0, 1],
  },
  modalLeave: {
    duration: ANIMATION_DURATION.fast,
    easing: EASING.springIn,
    scale: [1, 0.9],
    opacity: [1, 0],
  },
  
  // List animations
  listEnter: {
    duration: ANIMATION_DURATION.normal,
    easing: EASING.springOut,
    opacity: [0, 1],
    x: [-30, 0],
    scale: [0.9, 1],
  },
  listLeave: {
    duration: ANIMATION_DURATION.fast,
    easing: EASING.springIn,
    opacity: [1, 0],
    x: [0, 30],
    scale: [1, 0.9],
  },
  
  // Success/error animations
  success: {
    duration: ANIMATION_DURATION.normal,
    easing: EASING.springOut,
    scale: [1, 1.2, 1],
    opacity: [1, 0.8, 1],
  },
  error: {
    duration: ANIMATION_DURATION.fast,
    easing: EASING.springOut,
    x: [0, -8, 8, 0],
  },
  
  // Loading animations
  pulse: {
    duration: 1500,
    easing: 'ease-in-out',
    opacity: [1, 0.5, 1],
    scale: [1, 1.05, 1],
  },
} as const

// ==================== Reduced Motion Support ====================

export const prefersReducedMotion = ref(false)

export function checkReducedMotion(): void {
  prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  const listener = (e: MediaQueryListEvent) => {
    prefersReducedMotion.value = e.matches
  }
  
  mediaQuery.addEventListener('change', listener)
}

// ==================== Animation Utilities ====================

export function getAnimationProps(preset: keyof typeof ANIMATION_PRESETS) {
  if (prefersReducedMotion.value) {
    return {
      duration: 0,
      easing: 'linear',
    }
  }
  
  return ANIMATION_PRESETS[preset]
}

export function getTransitionDelay(index: number, delay: number = ANIMATION_DELAY.short) {
  if (prefersReducedMotion.value) {
    return 0
  }
  return index * delay
}

// ==================== Performance Utilities ====================

export function usePerformanceAnimation(
  callback: () => void,
  _options: {
    duration?: number
    easing?: string
    requestAnimationFrame?: boolean
  } = {}
) {
  const { requestAnimationFrame = true } = _options
  let rafId: number | null = null

  const animate = () => {
    callback()
    
    if (requestAnimationFrame) {
      rafId = window.requestAnimationFrame(() => {
        rafId = null
      })
    }
  }

  onMounted(() => {
    animate()
  })

  onUnmounted(() => {
    if (rafId) {
      window.cancelAnimationFrame(rafId)
    }
  })
}

// ==================== Staggered Animations ====================

export function useStaggeredAnimation<T>(
  _items: Ref<T[]>,
  options: {
    duration?: number
    delay?: number
    stagger?: number
  } = {}
) {
  const { delay = ANIMATION_DELAY.short, stagger = 50 } = options
  const animatedItems = ref(new Set<number>())
  
  const animateItem = (index: number) => {
    if (animatedItems.value.has(index)) return
    
    setTimeout(() => {
      animatedItems.value.add(index)
    }, delay + index * stagger)
  }

  const resetAnimation = () => {
    animatedItems.value.clear()
  }

  return {
    animatedItems,
    animateItem,
    resetAnimation,
  }
}

// ==================== Ripple Effect ====================

export function useRipple() {
  const ripples = ref<Array<{ id: number; x: number; y: number }>>([])

  const createRipple = (event: MouseEvent, element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    const id = Date.now()
    ripples.value.push({ id, x, y })
    
    // Remove ripple after animation
    setTimeout(() => {
      ripples.value = ripples.value.filter(r => r.id !== id)
    }, 600)
  }

  return {
    ripples,
    createRipple,
  }
}

// ==================== Loading States ====================

export const LOADING_ANIMATIONS = {
  spinner: {
    keyframes: `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `,
    animation: 'spin 0.8s linear infinite',
  },
  pulse: {
    keyframes: `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `,
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  dots: {
    keyframes: `
      @keyframes dots {
        0%, 20% { transform: scale(0); opacity: 0; }
        40% { transform: scale(1); opacity: 1; }
        100% { transform: scale(0); opacity: 0; }
      }
    `,
    animation: 'dots 1s ease-in-out infinite',
  },
} as const

// ==================== Notification Animations ====================

export const NOTIFICATION_ANIMATIONS = {
  slideIn: {
    enter: {
      duration: ANIMATION_DURATION.normal,
      easing: EASING.easeOutBack,
      x: [100, 0],
      opacity: [0, 1],
    },
    leave: {
      duration: ANIMATION_DURATION.fast,
      easing: EASING.easeInBack,
      x: [0, 100],
      opacity: [1, 0],
    },
  },
  scaleIn: {
    enter: {
      duration: ANIMATION_DURATION.normal,
      easing: EASING.springOut,
      scale: [0.8, 1],
      opacity: [0, 1],
    },
    leave: {
      duration: ANIMATION_DURATION.fast,
      easing: EASING.springIn,
      scale: [1, 0.8],
      opacity: [1, 0],
    },
  },
  bounce: {
    enter: {
      duration: ANIMATION_DURATION.slow,
      easing: EASING.springOut,
      y: [-20, 0],
      opacity: [0, 1],
    },
    leave: {
      duration: ANIMATION_DURATION.normal,
      easing: EASING.easeOut,
      y: [0, -20],
      opacity: [1, 0],
    },
  },
} as const

// ==================== Micro-interaction Utilities ====================

export function pressEffect(element: HTMLElement, options: { scale?: number; duration?: number } = {}) {
  const { scale = 0.95, duration = 150 } = options

  element.style.transition = `transform ${duration}ms ${EASING.springOut}`
  element.style.transform = `scale(${scale})`

  setTimeout(() => {
    element.style.transform = 'scale(1)'
  }, duration)
}

export function hoverEffect(element: HTMLElement, options: { scale?: number; y?: number; duration?: number } = {}) {
  const { scale = 1.05, y = -2, duration = 200 } = options

  element.style.transition = `transform ${duration}ms ${EASING.easeOut}`
  element.style.transform = `translateY(${y}px) scale(${scale})`
  
  return () => {
    element.style.transform = 'translateY(0) scale(1)'
  }
}

// ==================== Initialize on app load ====================

if (typeof window !== 'undefined') {
  checkReducedMotion()
}

<template>
  <div :class="inputGroupClasses">
    <label v-if="label" :for="inputId" class="modern-input-label">
      <span class="label-text">{{ label }}</span>
      <span v-if="required" class="required-asterisk">*</span>
      <span v-if="hint" class="label-hint">{{ hint }}</span>
    </label>
    <div class="modern-input-wrapper">
      <!-- Stepper buttons for number inputs -->
      <div v-if="type === 'number' && !disabled" class="stepper-buttons">
        <button 
          class="stepper-btn stepper-btn--up"
          @click="handleStepUp"
          :disabled="isMax"
          tabindex="-1"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </button>
        <button 
          class="stepper-btn stepper-btn--down"
          @click="handleStepDown"
          :disabled="isMin"
          tabindex="-1"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      </div>
      
      <!-- Clear button -->
      <button 
        v-if="showClear && modelValue && !disabled"
        class="clear-btn"
        @click="handleClear"
        tabindex="-1"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      
      <input
        :id="inputId"
        :type="type"
        :placeholder="placeholder"
        :value="modelValue"
        :disabled="disabled"
        :class="inputClasses"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        @wheel="handleWheel"
        ref="inputRef"
      />
      <span v-if="$slots.prefix" class="prefix-slot">
        <slot name="prefix"></slot>
      </span>
      <span v-if="$slots.suffix" class="suffix-slot">
        <slot name="suffix"></slot>
      </span>
      <span class="focus-border"></span>
      <span v-if="error" class="error-message">{{ error }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Props {
  modelValue: string | number
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url'
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  hint?: string
  error?: string
  size?: 'sm' | 'md' | 'lg'
  icon?: string
  min?: number
  max?: number
  step?: number
  allowClear?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  size: 'md',
  disabled: false,
  allowClear: false,
  step: 1,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const inputId = computed(() => `input-${Math.random().toString(36).substr(2, 9)}`)
const inputRef = ref<HTMLInputElement>()
const isFocused = ref(false)
const showClear = computed(() => props.allowClear && !!props.modelValue)

const isMin = computed(() => {
  if (props.type !== 'number') return false;
  const val = parseFloat(String(props.modelValue));
  return props.min !== undefined && val <= props.min;
});

const isMax = computed(() => {
  if (props.type !== 'number') return false;
  const val = parseFloat(String(props.modelValue));
  return props.max !== undefined && val >= props.max;
});

const inputValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const inputGroupClasses = computed(() => [
  'modern-input-group',
  'modern-input-group--size-' + (props.size || 'md'),
  {
    'modern-input-group--focused': isFocused.value,
    'modern-input-group--has-error': !!props.error,
    'modern-input-group--disabled': props.disabled,
    'modern-input-group--has-stepper': props.type === 'number' && !props.disabled,
  },
])

const inputClasses = computed(() => [
  'modern-input',
  {
    'modern-input--has-prefix': !!props.icon,
    'modern-input--has-suffix': false,
    'modern-input--has-error': !!props.error,
  },
])

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  inputValue.value = target.value
}

const handleFocus = () => {
  isFocused.value = true
}

const handleBlur = () => {
  isFocused.value = false
}

const handleWheel = (event: WheelEvent) => {
  if (props.type === 'number' && isFocused.value) {
    event.preventDefault()
    const delta = event.deltaY > 0 ? -props.step : props.step
    const currentValue = parseFloat(String(props.modelValue)) || 0
    let newValue = currentValue + delta
    
    if (props.max !== undefined) newValue = Math.min(props.max, newValue)
    if (props.min !== undefined) newValue = Math.max(props.min, newValue)
    
    inputValue.value = newValue
  }
}

const handleStepUp = () => {
  if (props.type !== 'number') return
  const currentValue = parseFloat(String(props.modelValue)) || 0
  const newValue = props.max !== undefined ? Math.min(props.max, currentValue + props.step) : currentValue + props.step
  inputValue.value = newValue
}

const handleStepDown = () => {
  if (props.type !== 'number') return
  const currentValue = parseFloat(String(props.modelValue)) || 0
  const newValue = props.min !== undefined ? Math.max(props.min, currentValue - props.step) : currentValue - props.step
  inputValue.value = newValue
}

const handleClear = () => {
  inputValue.value = ''
  inputRef.value?.focus()
}

// Focus input when error occurs
watch(() => props.error, () => {
  if (props.error) {
    inputRef.value?.focus()
  }
})
</script>

<style scoped>
.modern-input-group {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.modern-input-group--focused .modern-input-wrapper,
.modern-input-group--has-error .modern-input-wrapper {
  border-color: #f97316;
}

.modern-input-group--has-error .modern-input-wrapper {
  border-color: #ef4444;
}

.modern-input-group--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Label */
.modern-input-label {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.72);
  display: flex;
  align-items: center;
  gap: 4px;
  line-height: 1;
}

.label-text {
  transition: all 200ms linear;
}

.modern-input-group--focused .label-text {
  color: #f97316;
  transform: translateY(-2px);
  font-size: 12px;
}

.required-asterisk {
  color: #ef4444;
  font-size: 18px;
  line-height: 1;
  margin-left: 2px;
}

.label-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.48);
  font-weight: 400;
  margin-left: auto;
}

/* Input Wrapper */
.modern-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 12px;
  transition: all 200ms linear;
  overflow: visible;
}

.modern-input-wrapper::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  background: transparent;
  border: 2px solid transparent;
  transition: border-color 200ms linear;
}

.modern-input-group--focused::before {
  border-color: #f97316;
}

.modern-input-group--has-error::before {
  border-color: #ef4444;
}

.modern-input-group--disabled {
  background: #f5f5f5;
  border-color: rgba(0, 0, 0, 0.1);
}

.modern-input-wrapper::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 2px;
  background: #f97316;
  transition: width 200ms linear;
}

.modern-input-group--focused::after {
  width: 100%;
}

.modern-input-group--has-error::after {
  background: #ef4444;
}

/* Stepper Buttons */
.stepper-buttons {
  display: flex;
  flex-direction: column;
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  gap: 1px;
  opacity: 0;
  transition: opacity 200ms linear;
}

.modern-input-group--focused .stepper-buttons,
.modern-input-group:hover .stepper-buttons {
  opacity: 1;
}

.stepper-btn {
  width: 20px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.04);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 150ms linear;
}

.stepper-btn:hover:not(:disabled) {
  background: rgba(249, 115, 22, 0.1);
}

.stepper-btn:active:not(:disabled) {
  background: rgba(249, 115, 22, 0.2);
}

.stepper-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.stepper-btn svg {
  width: 10px;
  height: 10px;
  color: #6b7280;
}

/* Clear Button */
.clear-btn {
  position: absolute;
  right: 32px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.1);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  opacity: 0;
  transition: all 150ms linear;
}

.modern-input-wrapper:hover .clear-btn {
  opacity: 1;
}

.clear-btn:hover {
  background: rgba(239, 68, 68, 0.2);
}

.clear-btn svg {
  width: 12px;
  height: 12px;
  color: #6b7280;
}

/* Input */
.modern-input {
  flex: 1;
  height: 100%;
  padding: 12px 16px;
  font-size: 15px;
  background: transparent;
  border: none;
  outline: none;
  color: rgba(0, 0, 0, 0.88);
  font-family: 'Zoho Puvi', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  transition: color 200ms linear, background 200ms linear;
}

.modern-input::placeholder {
  color: rgba(0, 0, 0, 0.42);
}

.modern-input:focus {
  background: white;
}

/* Size variants */
.modern-input-group--size-sm {
  height: 36px;
}

.modern-input-group--size-sm .modern-input {
  padding: 8px 12px;
  font-size: 13px;
}

.modern-input-group--size-lg {
  height: 52px;
}

.modern-input-group--size-lg .modern-input {
  padding: 14px 20px;
  font-size: 16px;
}

/* Prefix/Suffix Slots */
.prefix-slot,
.suffix-slot {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  color: rgba(0, 0, 0, 0.56);
  pointer-events: none;
}

.prefix-slot {
  left: 12px;
}

.suffix-slot {
  right: 12px;
}

.modern-input {
  padding-left: 40px;
}

.modern-input--has-prefix .modern-input {
  padding-left: 44px;
}

.modern-input--has-suffix {
  padding-right: 44px;
}

/* Error Message */
.error-message {
  font-size: 12px;
  color: #ef4444;
  font-weight: 500;
  padding: 0 4px;
  background: #fef2f0;
  border-radius: 4px;
  opacity: 0;
  transition: all 200ms ease;
}

.modern-input-group--has-error .error-message {
  opacity: 1;
  padding: 0 8px;
  margin-top: 4px;
}

/* Focus Border Animation */
.focus-border {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 2px;
  background: #f97316;
  transition: width 200ms linear;
  border-radius: 0 0 1px 1px;
}

.modern-input-group--focused .focus-border {
  width: 100%;
}

.modern-input-group--has-error .focus-border {
  background: #ef4444;
}

/* Has Stepper adjustment */
.modern-input-group--has-stepper .modern-input {
  padding-right: 36px;
}
</style>

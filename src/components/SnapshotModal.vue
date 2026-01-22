<template>
  <Transition name="modal">
    <div 
      v-if="isOpen" 
      class="snapshot-modal-overlay"
      @click.self="emit('close')"
    >
      <Transition name="slide-up">
        <div v-if="isOpen" class="snapshot-modal">
          <!-- Header -->
          <div class="snapshot-header">
            <!-- Left: Icon & Title -->
            <div class="header-left">
              <div class="header-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
              <div class="header-text">
                <h2 class="header-title">交班快照预览</h2>
                <span class="header-subtitle">Shift Snapshot Preview</span>
              </div>
              <div class="header-status" :class="{ 'header-status--ready': isReady }">
                {{ isReady ? '预览中' : '生成中' }}
              </div>
            </div>

            <!-- Right: Actions (Right to Left) -->
            <div class="header-right">
              <!-- Settings Toggle -->
              <button 
                class="header-btn header-btn--settings"
                :class="{ 'header-btn--active': showSettings }"
                @click="showSettings = !showSettings"
                title="快照设置"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </button>

              <!-- Vertical Layout Toggle -->
              <button 
                class="header-btn"
                :class="{ 'header-btn--active': layoutMode === 'vertical' }"
                @click="toggleLayout('vertical')"
                title="竖向布局"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="4" y="4" width="16" height="16" rx="2"/>
                  <line x1="8" y1="4" x2="8" y2="20"/>
                  <line x1="16" y1="4" x2="16" y2="20"/>
                </svg>
              </button>

              <!-- Horizontal Layout Toggle -->
              <button 
                class="header-btn"
                :class="{ 'header-btn--active': layoutMode === 'horizontal' }"
                @click="toggleLayout('horizontal')"
                title="横向布局"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="4" y="4" width="16" height="16" rx="2"/>
                  <line x1="4" y1="8" x2="20" y2="8"/>
                  <line x1="4" y1="16" x2="20" y2="16"/>
                </svg>
              </button>

              <!-- Confirm Button -->
              <button 
                class="header-btn header-btn--confirm"
                :class="{ 'header-btn--disabled': !isReady }"
                :disabled="!isReady"
                @click="handleConfirm"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                确定交班
              </button>

              <!-- Close Button -->
              <button 
                class="header-btn header-btn--close"
                @click="emit('close')"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                关闭预览
              </button>
            </div>
          </div>

          <!-- Settings Panel -->
          <Transition name="slide-down">
            <div v-if="showSettings" class="settings-panel">
              <!-- Watermark Settings -->
              <div class="settings-section">
                <div class="settings-section-header">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                  <span>水印设置</span>
                </div>
                
                <div class="settings-grid">
                  <!-- Watermark Toggle -->
                  <div class="settings-row">
                    <label class="settings-label">
                      <input type="checkbox" v-model="watermarkSettings.enabled" />
                      <span class="checkmark"></span>
                      显示水印
                    </label>
                  </div>

                  <!-- Watermark Content -->
                  <div class="settings-row">
                    <label class="settings-label-full">水印内容</label>
                    <input 
                      v-model="watermarkSettings.content" 
                      type="text" 
                      class="settings-input"
                      placeholder="支持变量: {班次}, {接班人}, {时间}"
                    />
                  </div>

                  <!-- Opacity -->
                  <div class="settings-row">
                    <label class="settings-label-full">透明度 ({{ (watermarkSettings.opacity * 100).toFixed(0) }}%)</label>
                    <input 
                      v-model.number="watermarkSettings.opacity" 
                      type="range" 
                      min="0.01" 
                      max="1" 
                      step="0.01"
                      class="settings-range"
                    />
                  </div>

                  <!-- Font Size -->
                  <div class="settings-row">
                    <label class="settings-label-full">字体大小 ({{ watermarkSettings.fontSize }}px)</label>
                    <input 
                      v-model.number="watermarkSettings.fontSize" 
                      type="range" 
                      min="12" 
                      max="32" 
                      step="1"
                      class="settings-range"
                    />
                  </div>

                  <!-- Rotation -->
                  <div class="settings-row">
                    <label class="settings-label-full">旋转角度 ({{ watermarkSettings.rotation }}°)</label>
                    <input 
                      v-model.number="watermarkSettings.rotation" 
                      type="range" 
                      min="-45" 
                      max="45" 
                      step="5"
                      class="settings-range"
                    />
                  </div>

                  <!-- Color -->
                  <div class="settings-row">
                    <label class="settings-label-full">颜色</label>
                    <div class="color-picker-row">
                      <button 
                        v-for="color in colorOptions" 
                        :key="color.value"
                        @click="watermarkSettings.color = color.value"
                        class="color-swatch"
                        :class="{ active: watermarkSettings.color === color.value }"
                        :style="{ background: color.value }"
                        :title="color.name"
                      ></button>
                      <input 
                        v-model="watermarkSettings.color" 
                        type="color" 
                        class="color-input"
                      />
                    </div>
                  </div>

                  <!-- Density -->
                  <div class="settings-row">
                    <label class="settings-label-full">密度</label>
                    <select v-model="watermarkSettings.density" class="settings-select">
                      <option value="sparse">稀疏</option>
                      <option value="normal">标准</option>
                      <option value="dense">密集</option>
                      <option value="very-dense">超密</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Display Options -->
              <div class="settings-section">
                <div class="settings-section-header">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                  <span>显示选项</span>
                </div>
                
                <div class="settings-grid">
                  <div class="settings-row">
                    <label class="settings-label">
                      <input type="checkbox" v-model="settings.showTimestamp" />
                      <span class="checkmark"></span>
                      时间戳
                    </label>
                    <label class="settings-label">
                      <input type="checkbox" v-model="settings.showUUID" />
                      <span class="checkmark"></span>
                      UUID
                    </label>
                  </div>
                  <div class="settings-row">
                    <label class="settings-label">
                      <input type="checkbox" v-model="settings.compactMode" />
                      <span class="checkmark"></span>
                      紧凑模式
                    </label>
                    <label class="settings-label">
                      <input type="checkbox" v-model="settings.darkMode" />
                      <span class="checkmark"></span>
                      深色模式
                    </label>
                  </div>
                </div>
              </div>

              <!-- Modules -->
              <div class="settings-section">
                <div class="settings-section-header">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <line x1="3" y1="9" x2="21" y2="9"/>
                    <line x1="9" y1="21" x2="9" y2="9"/>
                  </svg>
                  <span>显示模块</span>
                </div>
                
                <div class="settings-grid modules-grid">
                  <label class="settings-label" v-for="module in modules" :key="module.key">
                    <input type="checkbox" v-model="module.visible" />
                    <span class="checkmark"></span>
                    {{ module.label }}
                  </label>
                </div>
              </div>
            </div>
          </Transition>

          <!-- Preview Content -->
          <div class="snapshot-preview" :class="{ 'preview-vertical': layoutMode === 'vertical' }">
            <div v-if="!isReady" class="preview-loading">
              <div class="loading-dot"></div>
              <span>生成中</span>
            </div>
            <!-- Watermark -->
            <div 
              v-if="watermarkSettings.enabled" 
              class="watermark-overlay"
              :style="{
                opacity: watermarkSettings.opacity,
              }"
            >
              <div 
                v-for="i in watermarkRows" 
                :key="i" 
                class="watermark-row"
                :style="{ transform: `rotate(${watermarkSettings.rotation}deg)` }"
              >
                <span 
                  v-for="j in watermarkCols" 
                  :key="j"
                  class="watermark-text"
                  :style="{
                    fontSize: watermarkSettings.fontSize + 'px',
                    color: watermarkSettings.color,
                  }"
                >
                  {{ formattedWatermark }}
                </span>
              </div>
            </div>

            <!-- Preview Iframe -->
            <iframe 
              ref="previewFrame"
              class="preview-iframe"
              :class="{ 'iframe-compact': settings.compactMode }"
              :srcdoc="renderedHtml"
              sandbox="allow-same-origin"
            />

            <!-- Status Badge -->
            <div class="preview-status">
              <span class="status-dot"></span>
              <span>{{ info }}</span>
              <span class="status-time">{{ timestamp }}</span>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

interface Props {
  isOpen: boolean
  htmlContent: string
  info: string
  timestamp: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  confirm: []
}>()

const isReady = computed(() => Boolean(props.htmlContent && props.htmlContent.length > 0))

// Layout mode
const layoutMode = ref<'horizontal' | 'vertical'>('horizontal')

// Settings panel
const showSettings = ref(false)

// Color options
const colorOptions = [
  { name: '黑色', value: '#000000' },
  { name: '灰色', value: '#6b7280' },
  { name: '白色', value: '#ffffff' },
  { name: '品牌橙', value: '#f97316' },
  { name: '蓝色', value: '#3b82f6' },
  { name: '红色', value: '#ef4444' },
  { name: '绿色', value: '#22c55e' },
  { name: '紫色', value: '#a855f7' },
]

// Watermark settings
const watermarkSettings = ref({
  enabled: true,
  content: '{班次} → {接班人}',
  opacity: 0.08,
  fontSize: 14,
  rotation: -15,
  color: '#000000',
  density: 'normal',
})

// Load saved settings
onMounted(() => {
  const saved = localStorage.getItem('snapshotWatermarkSettings')
  if (saved) {
    try {
      watermarkSettings.value = { ...watermarkSettings.value, ...JSON.parse(saved) }
    } catch (e) {
      console.warn('Failed to load watermark settings')
    }
  }
})

// Save settings on change
watch(watermarkSettings, () => {
  localStorage.setItem('snapshotWatermarkSettings', JSON.stringify(watermarkSettings.value))
}, { deep: true })

// Settings
const settings = ref({
  showTimestamp: true,
  showUUID: true,
  compactMode: false,
  darkMode: false,
})

// Visible modules
const modules = ref([
  { key: 'header', label: '头部信息', visible: true },
  { key: 'finance', label: '财务概览', visible: true },
  { key: 'internet', label: '网费明细', visible: true },
  { key: 'sales', label: '售货统计', visible: true },
  { key: 'meituan', label: '美团订单', visible: true },
  { key: 'expenses', label: '支出明细', visible: true },
  { key: 'income', label: '入账明细', visible: true },
  { key: 'footer', label: '底部签名', visible: true },
])

// Toggle layout
const toggleLayout = (mode: 'horizontal' | 'vertical') => {
  layoutMode.value = mode
}

// Handle confirm
const handleConfirm = () => {
  emit('confirm')
}

// Safe HTML
const safeHtml = computed(() => {
  return props.htmlContent.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, '')
})

// Density to rows/cols mapping
const densityMap = {
  'sparse': { rows: 4, cols: 2 },
  'normal': { rows: 6, cols: 3 },
  'dense': { rows: 8, cols: 4 },
  'very-dense': { rows: 12, cols: 6 },
}

// Watermark rows and cols based on density
const watermarkRows = computed(() => densityMap[watermarkSettings.value.density as keyof typeof densityMap].rows)
const watermarkCols = computed(() => densityMap[watermarkSettings.value.density as keyof typeof densityMap].cols)

// Formatted watermark content
const formattedWatermark = computed(() => {
  let content = watermarkSettings.value.content
  // Replace variables
  content = content.replace('{班次}', props.info || '待交班')
  content = content.replace('{接班人}', props.timestamp || '')
  content = content.replace('{时间}', props.timestamp || '')
  return content
})

// Render HTML with settings
const renderedHtml = computed(() => {
  let html = safeHtml.value
  
  // Apply compact mode
  if (settings.value.compactMode) {
    html = html.replace(/style="[^"]*padding:\s*\d+px[^"]*"/g, 'style="padding: 8px"')
    html = html.replace(/style="[^"]*gap:\s*\d+px[^"]*"/g, 'style="gap: 6px"')
  }
  
  return html
})

// Watch for settings changes to update preview
watch(() => settings.value, () => {
  // Settings changed - preview will auto-update via computed
}, { deep: true })
</script>

<style scoped>
.snapshot-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.snapshot-modal {
  width: 100%;
  max-width: calc(100vw - 40px);
  height: calc(100vh - 40px);
  max-height: calc(100vh - 40px);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(250, 250, 250, 0.98) 100%);
  border-radius: 24px;
  box-shadow: 
    0 25px 80px -12px rgba(0, 0, 0, 0.35),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Header */
.snapshot-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(250, 250, 250, 0.9) 100%);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(249, 115, 22, 0.05) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #f97316;
}

.header-icon svg {
  width: 22px;
  height: 22px;
}

.header-text {
  display: flex;
  flex-direction: column;
}

.header-status {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  background: rgba(0, 0, 0, 0.05);
  color: #6b7280;
  letter-spacing: 0.08em;
}

.header-status--ready {
  background: rgba(34, 197, 94, 0.12);
  color: #16a34a;
}

.header-title {
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.header-subtitle {
  font-size: 10px;
  color: #f97316;
  text-transform: uppercase;
  letter-spacing: 0.15em;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  border: none;
  background: rgba(0, 0, 0, 0.04);
  color: #6b7280;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.header-btn svg {
  width: 16px;
  height: 16px;
}

.header-btn:hover {
  background: rgba(0, 0, 0, 0.08);
  color: #1f2937;
}

.header-btn--active {
  background: rgba(249, 115, 22, 0.1);
  color: #f97316;
}

.header-btn--settings:hover,
.header-btn--settings.active {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.header-btn--confirm {
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  color: white;
}

.header-btn--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.header-btn--confirm:hover {
  background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%);
  color: white;
}

.header-btn--close {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.header-btn--close:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #dc2626;
}

/* Settings Panel */
.settings-panel {
  padding: 16px 20px;
  background: rgba(249, 115, 22, 0.03);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}

.settings-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.settings-row:last-child {
  margin-bottom: 0;
}

.settings-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
  cursor: pointer;
  user-select: none;
}

.settings-label input {
  display: none;
}

.settings-label-full {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #6b7280;
  width: 100%;
}

.settings-section {
  margin-bottom: 16px;
}

.settings-section:last-child {
  margin-bottom: 0;
}

.settings-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 600;
  color: #f97316;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 12px;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.modules-grid {
  grid-template-columns: repeat(4, 1fr);
}

.settings-input {
  grid-column: span 2;
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 12px;
  outline: none;
  transition: all 0.2s;
}

.settings-input:focus {
  border-color: #f97316;
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
}

.settings-range {
  grid-column: span 2;
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #e5e7eb;
  outline: none;
  appearance: none;
  -webkit-appearance: none;
}

.settings-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #f97316;
  cursor: pointer;
  transition: all 0.2s;
}

.settings-range::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(249, 115, 22, 0.3);
}

.settings-select {
  grid-column: span 2;
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 12px;
  outline: none;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.settings-select:focus {
  border-color: #f97316;
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
}

.color-picker-row {
  grid-column: span 2;
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-swatch {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.color-swatch:hover {
  transform: scale(1.1);
}

.color-swatch.active {
  border-color: #f97316;
  box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.2);
}

.color-input {
  width: 32px;
  height: 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.checkmark {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 2px solid #d1d5db;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.settings-label input:checked + .checkmark {
  background: #f97316;
  border-color: #f97316;
}

.settings-label input:checked + .checkmark::after {
  content: '✓';
  color: white;
  font-size: 10px;
  font-weight: bold;
}

.settings-section-title {
  font-size: 11px;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-right: 8px;
}

/* Preview */
.snapshot-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  padding: 10px;
  gap: 10px;
}

.preview-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 12px;
  font-weight: 700;
  color: #6b7280;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(6px);
  z-index: 15;
}

.loading-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f97316;
  animation: pulse 1.4s ease-in-out infinite;
}

.snapshot-preview.preview-vertical {
  overflow-y: auto;
}

.preview-iframe {
  flex: 1;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.preview-iframe.iframe-compact {
  border-radius: 8px;
}

/* Watermark */
.watermark-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
  opacity: 0.04;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.watermark-row {
  display: flex;
  justify-content: center;
  gap: 60px;
  transform: rotate(-15deg);
}

.watermark-text {
  font-size: 14px;
  font-weight: 700;
  color: #000;
  white-space: nowrap;
}

/* Status */
.preview-status {
  position: absolute;
  bottom: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
  z-index: 20;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  animation: pulse 2s ease-in-out infinite;
}

.status-time {
  opacity: 0.7;
}

/* Animations */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .snapshot-modal,
.modal-leave-to .snapshot-modal {
  transform: scale(0.95) translateY(20px);
}

.slide-up-enter-active,
.slide-up-leave-active,
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
  }
  50% {
    opacity: 0.8;
    box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
  }
}
</style>

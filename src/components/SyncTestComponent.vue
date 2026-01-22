/**
 * Sync Test Component - Tests real cloud synchronization
 * 
 * This component provides comprehensive testing of the sync system:
 * - Connection testing
 * - Latency measurement  
 * - Queue status monitoring
 * - Real-time sync verification
 * - Manual sync triggering
 */

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { getEnhancedSyncServiceInstance } from '../services/supabase/enhanced-client'
import ModernButton from './ui/ModernButton.vue'
import ModernCard from './ui/ModernCard.vue'
import { useToast } from '../composables/useToast'

// Toast notifications
const { success, error, info, warning } = useToast()

// Test state
const isRunning = ref(false)
const testResults = ref<any[]>([])
const currentTest = ref('')
const syncService = ref<any>(null)
const realtimeStatus = ref('disconnected')

// Monitoring data
const queueSize = ref(0)
const lastSyncTime = ref('never')
const syncInProgress = ref(false)
const detailedStats = ref<any>(null)

// Test intervals
let updateInterval: number | null = null

// Computed properties
const isHealthy = computed(() => {
  const latestTest = testResults.value[0]
  return latestTest?.success && latestTest.latency < 5000
})

const statusColor = computed(() => {
  if (isRunning.value) return 'text-yellow-600'
  if (isHealthy.value) return 'text-green-600'
  return 'text-red-600'
})

const statusIcon = computed(() => {
  if (isRunning.value) return '⏳'
  if (isHealthy.value) return '✅'
  return '❌'
})

// Initialize
onMounted(() => {
  syncService.value = getEnhancedSyncServiceInstance()
  if (syncService.value) {
    updateMonitoringData()
    updateInterval = window.setInterval(updateMonitoringData, 1000)
  }
})

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
})

// Update monitoring data
function updateMonitoringData() {
  if (!syncService.value) return

  const stats = syncService.value.getDetailedStats()
  queueSize.value = stats.currentQueueSize
  lastSyncTime.value = stats.lastSyncTime || 'never'
  syncInProgress.value = stats.syncInProgress
  detailedStats.value = stats
  realtimeStatus.value = stats.realtimeSubscriptions > 0 ? 'connected' : 'disconnected'
}

// Test functions
async function runConnectionTest() {
  if (!syncService.value) {
    error('Sync service not initialized')
    return
  }

  isRunning.value = true
  currentTest.value = 'connection'

  try {
    const result = await syncService.value.testCloudSync()
    
    const testResult = {
      timestamp: new Date().toISOString(),
      type: 'connection',
      success: result.success,
      latency: result.latency,
      connected: result.connected,
      error: result.error,
      details: result
    }

    testResults.value.unshift(testResult)
    
    if (result.success) {
      success(`Connection test passed! Latency: ${result.latency}ms`)
    } else {
      error(`Connection test failed: ${result.error}`)
    }
  } catch (e) {
    const testResult = {
      timestamp: new Date().toISOString(),
      type: 'connection',
      success: false,
      error: `Test exception: ${String(e)}`,
      latency: 0,
      connected: false
    }
    
    testResults.value.unshift(testResult)
    error(`Test failed with exception: ${String(e)}`)
  } finally {
    isRunning.value = false
    currentTest.value = ''
  }
}

async function runQueueTest() {
  if (!syncService.value) {
    error('Sync service not initialized')
    return
  }

  isRunning.value = true
  currentTest.value = 'queue'

  try {
    // 记录测试开始时的队列状态
    const startStats = syncService.value.getDetailedStats()
    
    // 触发同步
    info('Triggering manual sync...')
    const syncResult = await syncService.value.forceSync()
    
    // 等待一下让同步完成
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 检查同步后的状态
    const endStats = syncService.value.getDetailedStats()
    
    const testResult = {
      timestamp: new Date().toISOString(),
      type: 'queue',
      success: !syncResult.syncError,
      startQueueSize: startStats.currentQueueSize,
      endQueueSize: endStats.currentQueueSize,
      syncedCount: syncResult.detailedStats?.syncedCount || 0,
      errorCount: syncResult.detailedStats?.errorCount || 0,
      syncDuration: syncResult.detailedStats?.syncDuration || 0,
      error: syncResult.syncError
    }
    
    testResults.value.unshift(testResult)
    
    if (testResult.success) {
      success(`Queue sync completed! Synced ${testResult.syncedCount} items in ${testResult.syncDuration}ms`)
    } else {
      error(`Queue sync failed: ${testResult.error}`)
    }
  } catch (e) {
    const testResult = {
      timestamp: new Date().toISOString(),
      type: 'queue',
      success: false,
      error: `Test exception: ${String(e)}`,
      syncedCount: 0,
      errorCount: 1
    }
    
    testResults.value.unshift(testResult)
    error(`Queue test failed: ${String(e)}`)
  } finally {
    isRunning.value = false
    currentTest.value = ''
  }
}

async function runRealtimeTest() {
  if (!syncService.value) {
    error('Sync service not initialized')
    return
  }

  isRunning.value = true
  currentTest.value = 'realtime'

  try {
    info('Testing realtime connection...')
    
    // 检查实时订阅状态
    const stats = syncService.value.getDetailedStats()
    const subscriptionCount = stats.realtimeSubscriptions
    
    const testResult = {
      timestamp: new Date().toISOString(),
      type: 'realtime',
      success: subscriptionCount > 0,
      subscriptionCount,
      status: realtimeStatus.value,
      tables: ['orders', 'order_items', 'products', 'shift_records', 'auth_sessions']
    }
    
    testResults.value.unshift(testResult)
    
    if (testResult.success) {
      success(`Realtime connected! ${subscriptionCount} active subscriptions`)
    } else {
      warning('Realtime not connected or no active subscriptions')
    }
  } catch (e) {
    const testResult = {
      timestamp: new Date().toISOString(),
      type: 'realtime',
      success: false,
      error: `Test exception: ${String(e)}`,
      subscriptionCount: 0
    }
    
    testResults.value.unshift(testResult)
    error(`Realtime test failed: ${String(e)}`)
  } finally {
    isRunning.value = false
    currentTest.value = ''
  }
}

async function runAllTests() {
  await runConnectionTest()
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  await runQueueTest()
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  await runRealtimeTest()
}

// Manual operations
async function forceManualSync() {
  if (!syncService.value) {
    error('Sync service not initialized')
    return
  }

  try {
    info('Triggering manual sync...')
    const result = await syncService.value.forceSync()
    
    if (result.syncError) {
      error(`Manual sync failed: ${result.syncError}`)
    } else {
      success(`Manual sync completed! ${result.detailedStats?.syncedCount || 0} items synced`)
    }
  } catch (e) {
    error(`Manual sync exception: ${String(e)}`)
  }
}

function clearTestResults() {
  testResults.value = []
  info('Test results cleared')
}

function clearQueue() {
  if (!syncService.value) {
    error('Sync service not initialized')
    return
  }

  syncService.value.clearQueue()
  warning('Sync queue cleared')
}

// Format functions
function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString()
}

function formatLatency(latency: number): string {
  if (latency < 100) return `${latency}ms ⚡`
  if (latency < 500) return `${latency}ms 🟢`
  if (latency < 2000) return `${latency}ms 🟡`
  return `${latency}ms 🔴`
}

function getTestTypeIcon(type: string): string {
  const icons = {
    connection: '🌐',
    queue: '📋',
    realtime: '📡'
  }
  return icons[type as keyof typeof icons] || '❓'
}
</script>

<template>
  <div class="sync-test-page p-6 space-y-6">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-gray-800 mb-2">
        🔄 云同步测试工具
      </h1>
      <p class="text-gray-600">
        测试真实的云同步连接，确保数据正确同步到 Supabase
      </p>
    </div>

    <!-- Status Card -->
    <ModernCard class="mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-semibold mb-2">
            {{ statusIcon }} 同步状态
          </h2>
          <div class="space-y-1 text-sm">
            <div :class="statusColor">
              连接状态: {{ isHealthy ? '健康' : '异常' }}
            </div>
            <div class="text-gray-600">
              实时同步: {{ realtimeStatus === 'connected' ? '已连接' : '未连接' }}
            </div>
            <div class="text-gray-600">
              队列大小: {{ queueSize }} 项
            </div>
            <div class="text-gray-600">
              最后同步: {{ lastSyncTime === 'never' ? '从未' : formatTimestamp(lastSyncTime) }}
            </div>
          </div>
        </div>
        
        <div class="text-right">
          <div v-if="syncInProgress" class="text-yellow-600 font-medium">
            ⏳ 同步进行中...
          </div>
          <div v-else class="text-gray-500 text-sm">
            空闲状态
          </div>
        </div>
      </div>
    </ModernCard>

    <!-- Test Controls -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <ModernButton
        @click="runConnectionTest"
        :disabled="isRunning"
        variant="primary"
        size="lg"
      >
        🌐 连接测试
      </ModernButton>
      
      <ModernButton
        @click="runQueueTest"
        :disabled="isRunning"
        variant="secondary"
        size="lg"
      >
        📋 队列测试
      </ModernButton>
      
      <ModernButton
        @click="runRealtimeTest"
        :disabled="isRunning"
        variant="secondary"
        size="lg"
      >
        📡 实时测试
      </ModernButton>
      
      <ModernButton
        @click="runAllTests"
        :disabled="isRunning"
        variant="ghost"
        size="lg"
      >
        🚀 运行全部
      </ModernButton>
    </div>

    <!-- Manual Operations -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <ModernButton
        @click="forceManualSync"
        :disabled="isRunning"
        variant="success"
        size="md"
      >
        🔄 手动同步
      </ModernButton>
      
      <ModernButton
        @click="clearQueue"
        :disabled="isRunning"
        variant="danger"
        size="md"
      >
        🗑️ 清空队列
      </ModernButton>
    </div>

    <!-- Current Test Progress -->
    <div v-if="isRunning" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div class="flex items-center">
        <div class="animate-spin mr-3">⏳</div>
        <span class="text-yellow-800 font-medium">
          正在运行: {{ currentTest }}
        </span>
      </div>
    </div>

    <!-- Detailed Stats -->
    <ModernCard v-if="detailedStats" class="mb-6">
      <h3 class="text-lg font-semibold mb-4">📊 详细统计</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div class="text-gray-500">总入队</div>
          <div class="font-semibold">{{ detailedStats.totalEnqueued }}</div>
        </div>
        <div>
          <div class="text-gray-500">已同步</div>
          <div class="font-semibold text-green-600">{{ detailedStats.totalSynced }}</div>
        </div>
        <div>
          <div class="text-gray-500">错误数</div>
          <div class="font-semibold text-red-600">{{ detailedStats.totalErrors }}</div>
        </div>
        <div>
          <div class="text-gray-500">平均延迟</div>
          <div class="font-semibold">{{ Math.round(detailedStats.averageSyncTime) }}ms</div>
        </div>
        <div>
          <div class="text-gray-500">平均队列</div>
          <div class="font-semibold">{{ Math.round(detailedStats.averageQueueSize) }}</div>
        </div>
        <div>
          <div class="text-gray-500">实时订阅</div>
          <div class="font-semibold text-blue-600">{{ detailedStats.realtimeSubscriptions }}</div>
        </div>
        <div>
          <div class="text-gray-500">最后清理</div>
          <div class="font-semibold">{{ formatTimestamp(detailedStats.lastCleanup) }}</div>
        </div>
      </div>
    </ModernCard>

    <!-- Test Results -->
    <ModernCard>
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">📋 测试结果</h3>
        <ModernButton
          @click="clearTestResults"
          variant="ghost"
          size="sm"
        >
          清空结果
        </ModernButton>
      </div>
      
      <div v-if="testResults.length === 0" class="text-center text-gray-500 py-8">
        暂无测试结果，点击上方按钮开始测试
      </div>
      
      <div v-else class="space-y-3">
        <div
          v-for="result in testResults.slice(0, 20)"
          :key="result.timestamp"
          class="border rounded-lg p-4"
          :class="result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center mb-2">
                <span class="mr-2">{{ getTestTypeIcon(result.type) }}</span>
                <span class="font-medium capitalize">{{ result.type }}测试</span>
                <span class="ml-2" :class="result.success ? 'text-green-600' : 'text-red-600'">
                  {{ result.success ? '✅ 成功' : '❌ 失败' }}
                </span>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                <div v-if="result.latency">
                  <span>延迟:</span>
                  <span class="font-medium">{{ formatLatency(result.latency) }}</span>
                </div>
                
                <div v-if="result.syncedCount !== undefined">
                  <span>同步:</span>
                  <span class="font-medium">{{ result.syncedCount }}项</span>
                </div>
                
                <div v-if="result.errorCount !== undefined">
                  <span>错误:</span>
                  <span class="font-medium text-red-600">{{ result.errorCount }}项</span>
                </div>
                
                <div v-if="result.subscriptionCount !== undefined">
                  <span>订阅:</span>
                  <span class="font-medium text-blue-600">{{ result.subscriptionCount }}个</span>
                </div>
              </div>
              
              <div v-if="result.error" class="text-red-600 text-sm mt-2">
                <strong>错误:</strong> {{ result.error }}
              </div>
            </div>
            
            <div class="text-xs text-gray-500 ml-4">
              {{ formatTimestamp(result.timestamp) }}
            </div>
          </div>
        </div>
      </div>
    </ModernCard>
  </div>
</template>

<style scoped>
.sync-test-page {
  max-width: 1200px;
  margin: 0 auto;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
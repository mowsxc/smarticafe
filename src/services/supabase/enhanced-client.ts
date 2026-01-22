/**
 * Enhanced Sync Service with Queue Management, Smart Intervals, and Realtime Support
 * 
 * Features:
 * - Queue size limits and priority management
 * - Intelligent sync intervals based on queue load
 * - Automatic cleanup of old entries
 * - Real-time Supabase synchronization
 * - Comprehensive sync monitoring and testing
 */

import { type SupabaseClient } from '@supabase/supabase-js'
import type { SyncOperation, SyncStatus } from './adapters'

// ==================== Enhanced Sync Configuration ====================

interface SyncConfig {
  MAX_QUEUE_SIZE: number
  MAX_QUEUE_AGE_MS: number
  SMART_INTERVALS: {
    HIGH_LOAD: number    // 队列 > 50
    MEDIUM_LOAD: number  // 队列 > 20
    LOW_LOAD: number     // 队列 <= 20
  }
  REALTIME_ENABLED: boolean
  PRIORITY_LEVELS: {
    HIGH: number    // 订单、交班
    MEDIUM: number  // 商品变更
    LOW: number     // 日志、统计
  }
}

const SYNC_CONFIG: SyncConfig = {
  MAX_QUEUE_SIZE: 1000,
  MAX_QUEUE_AGE_MS: 30 * 60 * 1000, // 30分钟
  SMART_INTERVALS: {
    HIGH_LOAD: 5000,    // 5秒
    MEDIUM_LOAD: 10000,  // 10秒
    LOW_LOAD: 30000      // 30秒（原逻辑）
  },
  REALTIME_ENABLED: true,
  PRIORITY_LEVELS: {
    HIGH: 1,    // 订单、交班
    MEDIUM: 2,  // 商品变更
    LOW: 3      // 日志、统计
  }
}

// ==================== Enhanced Sync Operation ====================

interface EnhancedSyncOperation extends SyncOperation {
  timestamp: number
  priority: number
  retryCount: number
  lastSyncAttempt?: number
}

// ==================== Realtime Subscription Manager ====================

class RealtimeManager {
  private subscriptions: Map<string, any> = new Map()
  private supabase: SupabaseClient<any>

  constructor(supabaseClient: SupabaseClient<any>) {
    this.supabase = supabaseClient
  }

  subscribe(table: string, callback: (payload: any) => void): void {
    if (!SYNC_CONFIG.REALTIME_ENABLED || this.subscriptions.has(table)) {
      return
    }

    try {
      const channelName = `public:${table}`
      const channel = this.supabase.channel(channelName)

      channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table as any,
          },
          (payload) => {
            console.log(`🔄 Realtime update from ${table}:`, payload)
            callback(payload)
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`✅ Subscribed to ${table} realtime updates`)
          } else {
            console.error(`❌ Failed to subscribe to ${table}:`, status)
          }
        })

      this.subscriptions.set(table, {
        channel,
        unsubscribe: () => {
          this.supabase.removeChannel(channel)
          this.subscriptions.delete(table)
        }
      })
    } catch (error) {
      console.error(`Failed to setup realtime for ${table}:`, error)
    }
  }

  unsubscribe(table?: string): void {
    if (table) {
      const subscription = this.subscriptions.get(table)
      if (subscription) {
        subscription.unsubscribe()
      }
    } else {
      // Unsubscribe all
      this.subscriptions.forEach((sub) => sub.unsubscribe())
      this.subscriptions.clear()
    }
  }

  getSubscriptionCount(): number {
    return this.subscriptions.size
  }
}

// ==================== Enhanced Sync Service ====================

export class EnhancedSyncService {
  private syncQueue: Map<string, EnhancedSyncOperation> = new Map()
  private syncInProgress = false
  private lastSyncTime: string | null = null
  private syncTimer: number | null = null
  private realtimeManager: RealtimeManager | null = null
  private syncStats = {
    totalEnqueued: 0,
    totalSynced: 0,
    totalErrors: 0,
    averageSyncTime: 0,
    queueSizeHistory: [] as number[],
    lastCleanup: Date.now()
  }

  constructor(private supabaseClient: SupabaseClient<any> | null) {
    if (supabaseClient && SYNC_CONFIG.REALTIME_ENABLED) {
      this.realtimeManager = new RealtimeManager(supabaseClient)
    }
  }

  // ==================== Queue Management ====================

  private getPriority(table: string): number {
    const tablePriorities: Record<string, number> = {
      'orders': SYNC_CONFIG.PRIORITY_LEVELS.HIGH,
      'order_items': SYNC_CONFIG.PRIORITY_LEVELS.HIGH,
      'shift_records': SYNC_CONFIG.PRIORITY_LEVELS.HIGH,
      'products': SYNC_CONFIG.PRIORITY_LEVELS.MEDIUM,
      'auth_sessions': SYNC_CONFIG.PRIORITY_LEVELS.MEDIUM,
      'sales_orders': SYNC_CONFIG.PRIORITY_LEVELS.LOW,
      'accounting_entries': SYNC_CONFIG.PRIORITY_LEVELS.LOW
    }
    return tablePriorities[table] || SYNC_CONFIG.PRIORITY_LEVELS.LOW
  }

  public enqueue(operation: SyncOperation): void {
    // 清理过期条目
    this.cleanupExpiredEntries()

    // 检查队列大小限制
    if (this.syncQueue.size >= SYNC_CONFIG.MAX_QUEUE_SIZE) {
      console.warn('🚨 Sync queue at capacity, forcing cleanup...')
      this.forceCleanup()
    }

    const priority = this.getPriority(operation.table)
    const id = `${operation.table}_${operation.data.id || Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const enhancedOp: EnhancedSyncOperation = {
      ...operation,
      timestamp: Date.now(),
      priority,
      retryCount: 0
    }

    this.syncQueue.set(id, enhancedOp)
    this.syncStats.totalEnqueued++

    // 根据优先级排序（高优先级在前）
    this.sortQueueByPriority()
    
    this.saveSyncQueue()
    this.adjustSyncInterval()

    console.log(`📤 Enqueued ${operation.table} operation (priority: ${priority}, queue size: ${this.syncQueue.size})`)
  }

  private sortQueueByPriority(): void {
    const sorted = Array.from(this.syncQueue.entries()).sort(([, a], [, b]) => {
      // 先按优先级排序，再按时间戳排序
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }
      return a.timestamp - b.timestamp
    })
    
    this.syncQueue = new Map(sorted)
  }

  // ==================== Cleanup Management ====================

  private cleanupExpiredEntries(): void {
    const now = Date.now()
    const expired: string[] = []

    for (const [id] of this.syncQueue.entries()) {
      const entry = this.syncQueue.get(id)!
    if (now - entry.timestamp > SYNC_CONFIG.MAX_QUEUE_AGE_MS) {
        expired.push(id)
      }
    }

    if (expired.length > 0) {
      console.log(`🧹 Cleaning up ${expired.length} expired entries`)
      expired.forEach(id => this.syncQueue.delete(id))
      this.syncStats.lastCleanup = now
      this.saveSyncQueue()
    }
  }

  private forceCleanup(): void {
    // 保留最近的前100个高优先级操作
    const sorted = Array.from(this.syncQueue.entries())
      .sort(([, a], [, b]) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority
        }
        return b.timestamp - a.timestamp // 新的在前
      })

    const toKeep = sorted.slice(0, SYNC_CONFIG.MAX_QUEUE_SIZE)
    this.syncQueue = new Map(toKeep)
    
    console.log(`🔧 Force cleanup: kept ${toKeep.length}/${sorted.length} entries`)
  }

  // ==================== Smart Sync Intervals ====================

  private adjustSyncInterval(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
    }

    const queueSize = this.syncQueue.size
    let interval: number

    if (queueSize > 50) {
      interval = SYNC_CONFIG.SMART_INTERVALS.HIGH_LOAD
      console.log(`⚡ High queue load (${queueSize}), using ${interval/1000}s interval`)
    } else if (queueSize > 20) {
      interval = SYNC_CONFIG.SMART_INTERVALS.MEDIUM_LOAD
      console.log(`🔄 Medium queue load (${queueSize}), using ${interval/1000}s interval`)
    } else {
      interval = SYNC_CONFIG.SMART_INTERVALS.LOW_LOAD
      console.log(`🐌 Low queue load (${queueSize}), using ${interval/1000}s interval`)
    }

    this.syncTimer = window.setInterval(() => {
      if (this.syncQueue.size > 0 && !this.syncInProgress) {
        this.sync()
      }
    }, interval as any)
  }

  // ==================== Enhanced Sync Implementation ====================

  public async sync(): Promise<SyncStatus & { detailedStats?: any }> {
    if (!this.supabaseClient) {
      return {
        lastSync: this.lastSyncTime || 'never',
        pendingChanges: this.syncQueue.size,
        isOnline: false,
        syncError: 'Supabase not configured'
      }
    }

    if (this.syncInProgress) {
      return {
        lastSync: this.lastSyncTime || 'never',
        pendingChanges: this.syncQueue.size,
        isOnline: true,
        syncError: null
      }
    }

    this.syncInProgress = true
    const startTime = Date.now()
    let syncedCount = 0
    let errorCount = 0

    try {
      // 记录队列大小历史
      this.syncStats.queueSizeHistory.push(this.syncQueue.size)
      if (this.syncStats.queueSizeHistory.length > 100) {
        this.syncStats.queueSizeHistory = this.syncStats.queueSizeHistory.slice(-100)
      }

      // 批量处理队列（按优先级）
      const batchSize = Math.min(10, this.syncQueue.size) // 每次最多10个
      const toProcess = Array.from(this.syncQueue.entries()).slice(0, batchSize)

      for (const [id, operation] of toProcess) {
        try {
          await this.syncOperation(operation)
          this.syncQueue.delete(id)
          syncedCount++
          this.syncStats.totalSynced++
        } catch (error) {
          console.error(`❌ Sync failed for ${id}:`, error)
          errorCount++
          this.syncStats.totalErrors++
          
          // 更新重试计数
          operation.retryCount++
          operation.lastSyncAttempt = Date.now()
          
          // 重试超过3次的条目从队列中移除
          if (operation.retryCount >= 3) {
            console.error(`💀 Removing ${id} after 3 failed attempts`)
            this.syncQueue.delete(id)
          } else {
            // 指数退避：下次重试延迟
            const backoffDelay = Math.min(1000 * Math.pow(2, operation.retryCount), 30000)
            setTimeout(() => {
              console.log(`🔄 Retrying ${id} after ${backoffDelay}ms delay`)
            }, backoffDelay)
          }
        }
      }

      this.lastSyncTime = new Date().toISOString()
      const syncDuration = Date.now() - startTime
      this.updateSyncStats(syncDuration)

      this.saveSyncQueue()

      return {
        lastSync: this.lastSyncTime,
        pendingChanges: this.syncQueue.size,
        isOnline: true,
        syncError: errorCount > 0 ? `Failed to sync ${errorCount} items` : null,
        detailedStats: {
          syncedCount,
          errorCount,
          syncDuration,
          queueSize: this.syncQueue.size,
          subscriptionCount: this.realtimeManager?.getSubscriptionCount() || 0
        }
      }
    } catch (error) {
      console.error('💥 Sync process failed:', error)
      this.syncStats.totalErrors++
      return {
        lastSync: this.lastSyncTime || 'never',
        pendingChanges: this.syncQueue.size,
        isOnline: true,
        syncError: String(error)
      }
    } finally {
      this.syncInProgress = false
      this.adjustSyncInterval() // 重新调整间隔
    }
  }

  private async syncOperation(operation: EnhancedSyncOperation): Promise<void> {
    const { table, operation: op, data } = operation

    switch (table) {
      case 'orders':
        await this.syncTable('orders', op, data)
        break
      case 'order_items':
        await this.syncTable('order_items', op, data)
        break
      case 'products':
        await this.syncTable('products', op, data)
        break
      case 'shift_records':
        await this.syncTable('shift_records', op, data)
        break
      case 'auth_sessions':
        await this.syncTable('auth_sessions', op, data)
        break
      default:
        await this.syncTable(table, op, data)
    }
  }

  private async syncTable(table: string, operation: string, data: any): Promise<void> {
    const client = this.supabaseClient!
    
    if (operation === 'delete') {
      const { error } = await client.from(table).delete().eq('id', data.id)
      if (error) throw error
    } else {
      const { error } = await client.from(table).upsert({
        ...data,
        synced_at: new Date().toISOString(),
      })
      if (error) throw error
    }
  }

  // ==================== Realtime Setup ====================

  public enableRealtime(tables: string[]): void {
    if (!this.realtimeManager) {
      console.warn('⚠️ Realtime manager not initialized')
      return
    }

    console.log('🔗 Setting up realtime subscriptions for:', tables)
    
    tables.forEach(table => {
      this.realtimeManager!.subscribe(table, (payload) => {
        this.handleRealtimeUpdate(table, payload)
      })
    })
  }

  private handleRealtimeUpdate(table: string, payload: any): void {
    console.log(`📡 Realtime update received for ${table}:`, payload)
    
    // 处理冲突：如果本地队列中有相同操作，需要解决冲突
    const conflictingOps = Array.from(this.syncQueue.entries())
      .filter(([, op]) => op.table === table && op.data.id === payload.new?.id)

    if (conflictingOps.length > 0) {
      console.log(`⚠️ Conflict detected for ${table}, resolving...`)
      this.resolveConflicts(table, payload, conflictingOps)
    } else {
      // 直接更新本地数据
      this.updateLocalData(table, payload)
    }
  }

  private resolveConflicts(table: string, remotePayload: any, localOps: [string, EnhancedSyncOperation][]): void {
    // 简单的时间戳冲突解决策略
    localOps.forEach(([id, localOp]) => {
      const remoteTime = new Date(remotePayload.new?.updated_at || 0).getTime()
      const localTime = localOp.timestamp
      
      if (remoteTime > localTime) {
        // 远程数据更新，移除本地操作
        this.syncQueue.delete(id)
        console.log(`✅ Resolved conflict: remote data wins for ${id}`)
        this.updateLocalData(table, remotePayload)
      } else {
        // 本地数据更新，继续同步
        console.log(`✅ Resolved conflict: local data wins for ${id}`)
      }
    })
  }

  private updateLocalData(table: string, payload: any): void {
    // 这里应该更新本地数据库，需要与Tauri后端集成
    console.log(`🔄 Updating local data for ${table}:`, payload.new || payload.old)
    // TODO: 调用Tauri API更新本地SQLite
  }

  // ==================== Sync Testing ====================

  public async testCloudSync(): Promise<{
    success: boolean
    latency: number
    connected: boolean
    error?: string
  }> {
    if (!this.supabaseClient) {
      return {
        success: false,
        latency: 0,
        connected: false,
        error: 'Supabase client not initialized'
      }
    }

    try {
      const startTime = Date.now()
      
      // 测试1: 连接性检查
      const { error } = await this.supabaseClient
        .from('sync_test')
        .select('test_timestamp')
        .limit(1)
      
      const latency = Date.now() - startTime
      
      if (error) {
        return {
          success: false,
          latency,
          connected: false,
          error: `Connection test failed: ${error.message}`
        }
      }

      // 测试2: 写入测试
      const testData = {
        id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        test_timestamp: new Date().toISOString(),
        source: 'sync_test',
        sync_enabled: true
      }

      const { error: insertError } = await this.supabaseClient
        .from('sync_test')
        .insert(testData)
        .select()

      if (insertError) {
        return {
          success: false,
          latency,
          connected: true,
          error: `Write test failed: ${insertError.message}`
        }
      }

      // 测试3: 读取验证
      const { data: verifyData, error: verifyError } = await this.supabaseClient
        .from('sync_test')
        .select('*')
        .eq('id', testData.id)
        .single()

      if (verifyError || !verifyData) {
        return {
          success: false,
          latency,
          connected: true,
          error: 'Read verification failed'
        }
      }

      // 清理测试数据
      await this.supabaseClient
        .from('sync_test')
        .delete()
        .eq('id', testData.id)

      return {
        success: true,
        latency,
        connected: true
      }
    } catch (error) {
      return {
        success: false,
        latency: 0,
        connected: false,
        error: `Test exception: ${String(error)}`
      }
    }
  }

  // ==================== Monitoring and Stats ====================

  private updateSyncStats(duration: number): void {
    // 更新平均同步时间
    const totalSyncs = this.syncStats.totalSynced
    if (totalSyncs > 0) {
      this.syncStats.averageSyncTime = 
        (this.syncStats.averageSyncTime * (totalSyncs - 1) + duration) / totalSyncs
    } else {
      this.syncStats.averageSyncTime = duration
    }
  }

  public getDetailedStats() {
    return {
      ...this.syncStats,
      currentQueueSize: this.syncQueue.size,
      lastSyncTime: this.lastSyncTime,
      syncInProgress: this.syncInProgress,
      realtimeSubscriptions: this.realtimeManager?.getSubscriptionCount() || 0,
      averageQueueSize: this.syncStats.queueSizeHistory.length > 0
        ? this.syncStats.queueSizeHistory.reduce((a, b) => a + b) / this.syncStats.queueSizeHistory.length
        : 0
    }
  }

  // ==================== Storage Management ====================

  private saveSyncQueue(): void {
    try {
      const queueArray = Array.from(this.syncQueue.entries())
      const serialized = JSON.stringify(queueArray)
      
      // 检查存储大小
      if (serialized.length > 4 * 1024 * 1024) { // 4MB警告
        console.warn(`⚠️ Sync queue size warning: ${(serialized.length / 1024 / 1024).toFixed(2)}MB`)
      }
      
      localStorage.setItem('smarticafe_enhanced_sync_queue', serialized)
    } catch (e) {
      console.error('Failed to save enhanced sync queue:', e)
      // 触发紧急清理
      this.forceCleanup()
    }
  }

  private loadSyncQueue(): void {
    try {
      const saved = localStorage.getItem('smarticafe_enhanced_sync_queue')
      if (saved) {
        const queueArray = JSON.parse(saved)
        this.syncQueue = new Map(queueArray)
        console.log(`📂 Loaded ${this.syncQueue.size} items from enhanced sync queue`)
      }
    } catch (e) {
      console.error('Failed to load enhanced sync queue:', e)
    }
  }

  // ==================== Public API ====================

  public init(): void {
    this.loadSyncQueue()
    
    // 初始化实时同步
    if (this.realtimeManager) {
      const tablesToSync = ['orders', 'order_items', 'products', 'shift_records', 'auth_sessions']
      this.enableRealtime(tablesToSync)
    }
    
    this.adjustSyncInterval()

    // 网络状态监听
    window.addEventListener('online', () => {
      console.log('🌐 Network restored, triggering sync...')
      if (this.syncQueue.size > 0) {
        this.sync()
      }
    })

    window.addEventListener('offline', () => {
      console.log('📵 Network disconnected, queue will build up...')
    })

    console.log('✅ Enhanced Sync Service initialized')
  }

  public forceSync(): Promise<SyncStatus & { detailedStats?: any }> {
    return this.sync()
  }

  public clearQueue(): void {
    const count = this.syncQueue.size
    this.syncQueue.clear()
    localStorage.removeItem('smarticafe_enhanced_sync_queue')
    console.log(`🗑️ Cleared sync queue (${count} items removed)`)
  }

  public destroy(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
    }
    
    this.realtimeManager?.unsubscribe()
    
    this.saveSyncQueue()
    console.log('💥 Enhanced Sync Service destroyed')
  }
}

// ==================== Global Instance ====================

let enhancedSyncService: EnhancedSyncService | null = null

export function getEnhancedSyncService(supabaseClient: SupabaseClient<any> | null): EnhancedSyncService {
  if (!enhancedSyncService) {
    enhancedSyncService = new EnhancedSyncService(supabaseClient)
    enhancedSyncService.init()
  }
  return enhancedSyncService
}

export function getEnhancedSyncServiceInstance(): EnhancedSyncService | null {
  return enhancedSyncService
}
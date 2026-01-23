/**
 * Supabase Cloud Integration Layer
 *
 * Architecture:
 * - Local SQLite (Primary) - Fast, offline-first
 * - Supabase PostgreSQL (Secondary) - Cloud backup, multi-device sync
 * - Bidirectional sync with conflict resolution
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  type SyncStatus,
  type SyncOperation,
} from './adapters'

// ==================== Conflict Resolution ====================

export type Database = {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          name: string
          category: string
          unit_price: number
          cost_price: number
          stock: number
          spec: number
          on_shelf: number
          created_at: string
          updated_at: string
          synced_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'synced_at'>
        Update: Partial<Database['public']['Tables']['products']['Row']>
      }
      sales_orders: {
        Row: {
          id: string
          date_ymd: string
          shift: string
          employee: string
          total_revenue: number
          total_profit: number
          created_at: string
          updated_at: string
          synced_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['sales_orders']['Row'], 'id' | 'created_at' | 'synced_at'>
        Update: Partial<Database['public']['Tables']['sales_orders']['Row']>
      }
      sales_items: {
        Row: {
          id: string
          order_id: string
          product_name: string
          sales: number | null
          revenue: number | null
          unit_price: number | null
          cost_price: number | null
          spec: number | null
          created_at: string
          synced_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['sales_items']['Row'], 'id' | 'created_at' | 'synced_at'>
        Update: Partial<Database['public']['Tables']['sales_items']['Row']>
      }
      accounting_entries: {
        Row: {
          id: string
          date_ymd: string
          shift: string
          employee: string
          entry_type: string
          item: string
          amount: number
          bar_pay: number
          finance_pay: number
          created_at: string
          synced_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['accounting_entries']['Row'], 'id' | 'created_at' | 'synced_at'>
        Update: Partial<Database['public']['Tables']['accounting_entries']['Row']>
      }
      shift_records: {
        Row: {
          id: string
          date_ymd: string
          shift: string
          employee: string
          successor: string | null
          wangfei: number
          shouhuo: number
          meituan: number
          zhichu: number
          income: number
          yingjiao: number
          snapshot_html: string | null
          snapshot_info: string | null
          created_at: string
          synced_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['shift_records']['Row'], 'id' | 'created_at' | 'synced_at'>
        Update: Partial<Database['public']['Tables']['shift_records']['Row']>
      }
      meituan_orders: {
        Row: {
          id: string
          coupon_no: string | null
          raw_text: string
          amount: number
          discount: number
          financial: number
          bar_total: number
          date_ymd: string
          shift: string
          employee: string
          created_at: string
          synced_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['meituan_orders']['Row'], 'id' | 'created_at' | 'synced_at'>
        Update: Partial<Database['public']['Tables']['meituan_orders']['Row']>
      }
      shift_live: {
        Row: {
          id: string
          date_ymd: string
          shift: string
          employee: string
          wangfei: number
          shouhuo: number
          meituan: number
          bar_pay: number
          income: number
          amount_due: number
          payload: any | null
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['shift_live']['Row'], 'updated_at'>
        Update: Partial<Database['public']['Tables']['shift_live']['Row']>
      }
      original_shifts: {
        Row: {
          id: string
          version: number
          is_active: boolean
          shift_date: string
          shift_type: string
          employee: string
          wangfei: number
          shouhuo: number
          meituan: number
          zhichu: number
          income: number
          yingjiao: number
          inventory_items: string  // JSON string
          expenses: string         // JSON string
          meituan_raw_data: string | null
          notes: string | null
          maintained_by: string | null
          maintained_at: string | null
          created_at: string
          updated_at: string | null
          synced_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['original_shifts']['Row'], 'id' | 'created_at' | 'synced_at'>
        Update: Partial<Database['public']['Tables']['original_shifts']['Row']>
      }
      auth_sessions: {
        Row: {
          id: string
          user_id: string
          user_name: string
          role: string
          login_at: string
          logout_at: string | null
          ip_address: string | null
          synced_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['auth_sessions']['Row'], 'id' | 'synced_at'>
        Update: Partial<Database['public']['Tables']['auth_sessions']['Row']>
      }
      orders: {
        Row: {
          id: string
          order_no: string
          total_amount: number
          payment_method: string
          status: string
          created_at: string
          synced_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at' | 'synced_at'>
        Update: Partial<Database['public']['Tables']['orders']['Row']>
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
          total_price: number
          synced_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['order_items']['Row'], 'id' | 'synced_at'>
        Update: Partial<Database['public']['Tables']['order_items']['Row']>
      }
      shifts: {
        Row: {
          id: string
          date_ymd: string
          shift_type: string
          employee: string
          start_at: string
          end_at: string | null
          status: string
          synced_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['shifts']['Row'], 'id' | 'synced_at'>
        Update: Partial<Database['public']['Tables']['shifts']['Row']>
      }
    }
    Functions: {
      sync_products: {
        Args: { local_data: any[] }
        Returns: { success: boolean; synced_count: number }
      }
      sync_sales_orders: {
        Args: { local_data: any[] }
        Returns: { success: boolean; synced_count: number }
      }
    }
  }
}

// ==================== Supabase Client Setup ====================

type LocalCloudSettings = {
  enabled?: boolean
  supabaseUrl?: string
  supabaseAnonKey?: string
}

const readLocalCloudSettings = (): LocalCloudSettings | null => {
  try {
    const raw = localStorage.getItem('cloudSettings')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed as LocalCloudSettings
  } catch {
    return null
  }
}

const localCloud = readLocalCloudSettings()
const localEnabled = localCloud?.enabled

const envSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const envSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

const supabaseUrl = localEnabled === false
  ? ''
  : (String(localCloud?.supabaseUrl || '').trim() || envSupabaseUrl)

const supabaseAnonKey = localEnabled === false
  ? ''
  : (String(localCloud?.supabaseAnonKey || '').trim() || envSupabaseAnonKey)

// 核心 Supabase 客户端 (使用 anon key)
// 注意：在浏览器环境严禁使用 Service Role Key，否则会被 Supabase 拦截并报错 401
export const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null

// 为了向后兼容，将 supabaseAdmin 设为 supabase 的别名
// 之前使用 service role key 的代码逻辑现在将受到 RLS 策略约束
export const supabaseAdmin: SupabaseClient<Database> | null = supabase

// ==================== Conflict Resolution ====================



// ==================== Sync Service ====================

class SyncService {
  private syncQueue: Map<string, { table: string; operation: string; data: any; timestamp: number }> = new Map()
  private syncInProgress = false
  private lastSyncTime: string | null = null
  private lastSyncError: string | null = null

  // Add operation to sync queue (new API)
  public enqueue(operation: SyncOperation): void {
    const id = `${operation.table}::${operation.data.id || Date.now()}`
    this.syncQueue.set(id, {
      table: operation.table,
      operation: operation.operation,
      data: operation.data,
      timestamp: Date.now(),
    })
    this.saveSyncQueue()
  }

  public isSyncing(): boolean {
    return this.syncInProgress
  }

  public getStatus(): SyncStatus {
    return {
      lastSync: this.lastSyncTime || 'never',
      pendingChanges: this.syncQueue.size,
      isOnline: !!supabase,
      syncError: this.lastSyncError,
    }
  }

  // Legacy API for backward compatibility
  public enqueueTable(table: string, action: 'insert' | 'update' | 'upsert' | 'delete', data: any): void {
    this.enqueue({ table, operation: action, data })
  }

  // Save sync queue to localStorage
  private saveSyncQueue(): void {
    try {
      const queueArray = Array.from(this.syncQueue.entries())
      localStorage.setItem('smarticafe_sync_queue', JSON.stringify(queueArray))
    } catch (e) {
      console.error('Failed to save sync queue:', e)
    }
  }

  // Load sync queue from localStorage
  private loadSyncQueue(): void {
    try {
      const saved = localStorage.getItem('smarticafe_sync_queue')
      if (saved) {
        const queueArray = JSON.parse(saved)
        this.syncQueue = new Map(queueArray)
      }
    } catch (e) {
      console.error('Failed to load sync queue:', e)
    }
  }

  // Sync pending changes to Supabase
  public async sync(): Promise<SyncStatus> {
    if (!supabase) {
      this.lastSyncError = 'Supabase not configured'
      return {
        lastSync: this.lastSyncTime || 'never',
        pendingChanges: this.syncQueue.size,
        isOnline: false,
        syncError: this.lastSyncError,
      }
    }

    if (this.syncInProgress) {
      return {
        lastSync: this.lastSyncTime || 'never',
        pendingChanges: this.syncQueue.size,
        isOnline: true,
        syncError: this.lastSyncError,
      }
    }

    this.syncInProgress = true
    this.lastSyncError = null

    try {
      let syncedCount = 0
      let errorCount = 0

      // Process all items in sync queue
      for (const [id, item] of this.syncQueue.entries()) {
        const { table, operation, data } = item

        try {
          switch (table) {
            case 'auth_sessions':
              await this.syncAuthSession(operation, data)
              this.syncQueue.delete(id)
              syncedCount++
              break

            case 'orders':
              await this.syncOrder(operation, data)
              this.syncQueue.delete(id)
              syncedCount++
              break

            case 'order_items':
              await this.syncOrderItem(operation, data)
              this.syncQueue.delete(id)
              syncedCount++
              break

            case 'products':
              await this.syncProduct(operation, data)
              this.syncQueue.delete(id)
              syncedCount++
              break

            case 'shifts':
              await this.syncShift(operation, data)
              this.syncQueue.delete(id)
              syncedCount++
              break

            case 'shift_records':
              await this.syncLegacyTable('shift_records', operation, data)
              this.syncQueue.delete(id)
              syncedCount++
              break

            default:
              // Handle legacy tables (sales_orders, sales_items, etc.)
              await this.syncLegacyTable(table, operation, data)
              this.syncQueue.delete(id)
              syncedCount++
          }
        } catch (e) {
          console.error(`Failed to sync ${id} on table ${table}:`, e)
          errorCount++
        }
      }

      this.lastSyncTime = new Date().toISOString()
      this.saveSyncQueue()

      this.lastSyncError = errorCount > 0 ? `Failed to sync ${errorCount} items` : null

      return {
        lastSync: this.lastSyncTime,
        pendingChanges: this.syncQueue.size,
        isOnline: true,
        syncError: this.lastSyncError,
      }
    } catch (e) {
      console.error('Sync failed:', e)

      this.lastSyncError = String(e)
      return {
        lastSync: this.lastSyncTime || 'never',
        pendingChanges: this.syncQueue.size,
        isOnline: true,
        syncError: this.lastSyncError,
      }
    } finally {
      this.syncInProgress = false
    }
  }

  // Sync auth session
  private async syncAuthSession(_operation: string, data: any): Promise<void> {
    const client = supabaseAdmin || supabase
    if (!client) return
    const { error } = await client.from('auth_sessions').upsert({
      ...data,
      synced_at: new Date().toISOString(),
    })
    if (error) throw error
  }

  // Sync order
  private async syncOrder(_operation: string, data: any): Promise<void> {
    const client = supabaseAdmin || supabase
    if (!client) return
    if (_operation === 'delete') {
      const { error } = await client.from('orders').delete().eq('id', data.id)
      if (error) throw error
    } else {
      const { error } = await client.from('orders').upsert({
        ...data,
        synced_at: new Date().toISOString(),
      })
      if (error) throw error
    }
  }

  // Sync order item
  private async syncOrderItem(_operation: string, data: any): Promise<void> {
    const client = supabaseAdmin || supabase
    if (!client) return
    if (_operation === 'delete') {
      const { error } = await client.from('order_items').delete().eq('id', data.id)
      if (error) throw error
    } else {
      const { error } = await client.from('order_items').upsert({
        ...data,
        synced_at: new Date().toISOString(),
      })
      if (error) throw error
    }
  }

  // Sync product
  private async syncProduct(operation: string, data: any): Promise<void> {
    const client = (supabaseAdmin || supabase) as any
    if (!client) return
    if (operation === 'delete') {
      const { error } = await client.from('products').delete().eq('id', data.id)
      if (error) throw error
    } else {
      // Normalize data: ensure on_shelf is number if present
      const normalizedData = { ...data }
      if ('on_shelf' in normalizedData) {
        normalizedData.on_shelf = normalizedData.on_shelf ? 1 : 0
      }
      
      const payload = {
        ...normalizedData,
        synced_at: new Date().toISOString(),
      }

      const syncFn = async (p: any) => {
        if (operation === 'update') {
          return await client.from('products').update(p).eq('id', data.id)
        } else {
          return await client.from('products').upsert(p)
        }
      }

      const { error } = await syncFn(payload)
      
      // If column doesn't exist (Error 42703), try to clean payload and retry
      if (error && error.code === '42703') {
        process.env.NODE_ENV !== 'production' && console.warn(`Retrying product sync without potential missing columns...`, error.message)
        const safePayload = { ...payload }
        // Remove columns that are commonly missing in older schemas
        delete safePayload.synced_at
        const { error: retryError } = await syncFn(safePayload)
        if (retryError) throw retryError
      } else if (error) {
        throw error
      }
    }
  }

  // Sync shift
  private async syncShift(_operation: string, data: any): Promise<void> {
    const client = (supabaseAdmin || supabase) as any
    if (!client) return
    const payload = {
      ...data,
      synced_at: new Date().toISOString(),
    }
    
    const syncFn = async (p: any) => {
        if (_operation === 'update') {
          return await client.from('shifts').update(p).eq('id', data.id)
        } else {
          return await client.from('shifts').upsert(p)
        }
    }

    const { error } = await syncFn(payload)
    if (error) throw error
  }

  // Sync legacy tables (for backward compatibility)
  private async syncLegacyTable(table: string, operation: string, data: any): Promise<void> {
    const client = (supabaseAdmin || supabase) as any
    if (!client) return
    const payload = {
      ...data,
      synced_at: new Date().toISOString(),
    }

    const syncFn = async (p: any) => {
        if (operation === 'delete') {
            return await client.from(table).delete().eq('id', data.id)
        } else if (operation === 'update') {
            return await client.from(table).update(p).eq('id', data.id)
        } else {
            return await client.from(table).upsert(p)
        }
    }

    const { error } = await syncFn(payload)
    
    // Handle missing column errors gracefully
    if (error && error.code === '42703') {
        console.warn(`[SyncService] Column missing in ${table}, retrying with safe payload`, error.message)
        const safePayload = { ...payload }
        // List of columns that might be missing and are safe to drop
        const problematicColumns = ['snapshot_info', 'snapshot_html', 'successor', 'synced_at']
        problematicColumns.forEach(col => delete safePayload[col])
        
        const { error: retryError } = await syncFn(safePayload)
        if (retryError) {
            console.error(`[SyncService] Retry failed for ${table}:`, retryError)
            throw retryError
        }
    } else if (error) {
        throw error
    }
  }

  // Get sync status
  public getSyncStatus(): SyncStatus {
    return {
      lastSync: this.lastSyncTime || 'never',
      pendingChanges: this.syncQueue.size,
      isOnline: navigator.onLine,
      syncError: null,
    }
  }

  // Manual sync trigger
  public async forceSync(): Promise<SyncStatus> {
    return await this.sync()
  }

  // Initialize sync service
  public init(): void {
    this.loadSyncQueue()
    
    // Auto sync every 30 seconds
    if (navigator.onLine) {
      setInterval(() => {
        if (this.syncQueue.size > 0) {
          this.sync()
        }
      }, 30000)
    }

    // Sync on network reconnect
    window.addEventListener('online', () => {
      if (this.syncQueue.size > 0) {
        this.sync()
      }
    })
  }
}

// ==================== Global Types ====================

declare global {
  interface Window {
    smarticafeEnhancedSync?: import('./enhanced-client').EnhancedSyncService
  }
}

// ==================== Export ====================

 export const syncService = new SyncService()

export function getSyncService(): SyncService {
  return syncService
}

export async function initSupabaseSync(): Promise<void> {
  if (!supabase) {
    console.warn('Supabase not configured, skipping cloud sync')
    return
  }

  try {
    // Initialize enhanced sync service
    const { getEnhancedSyncService } = await import('./enhanced-client')
    const enhancedService = getEnhancedSyncService(supabase)
    
    if (enhancedService) {
      console.log('✅ Enhanced Supabase sync initialized')
      window.smarticafeEnhancedSync = enhancedService
    } else {
      console.log('🔄 Enhanced service not available, using fallback')
      syncService.init()
    }
  } catch (e) {
    console.error('Failed to initialize Enhanced Supabase sync:', e)
    console.log('🔄 Fallback to original sync service')
    
    try {
      syncService.init()
      console.log('✅ Fallback sync service initialized')
    } catch (fallbackError) {
      console.error('Failed to initialize fallback sync service:', fallbackError)
    }
  }
}

// ==================== Realtime Subscriptions ====================

export function subscribeToTable(
  table: string,
  filter: string | undefined,
  callback: (payload: any) => void,
  onStatus?: (status: string) => void
) {
  if (!supabase) return null

  const channelName = `public:${table}`
  const channel = supabase.channel(channelName)

  channel
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: table as any,
        filter,
      },
      (payload) => {
        console.log(`Realtime change in ${table}:`, payload)
        callback(payload)
      }
    )
    .subscribe((status) => {
      try {
        onStatus?.(String(status))
      } catch {
        // ignore
      }
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Subscribed to ${table} changes`)
      }
    })

  return {
    channel,
    unsubscribe: () => {
      supabase.removeChannel(channel)
    },
  }
}

/**
 * Data Adapter Layer - Converts between SQLite format and Supabase format
 *
 * This adapter handles data transformation between the local SQLite database
 * and the remote Supabase PostgreSQL database, ensuring type compatibility
 * and field name mapping.
 */

// ============================================================================
// TYPE DEFINITIONS (Supabase Schema)
// ============================================================================

// Product type for API
export interface Product {
  id: string;
  name: string;
  category: string;
  unit_price: number;
  description?: string;
  stock_quantity: number;
  image_url?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Sync Status interface (moved from client.ts to avoid circular dependency)
export interface SyncStatus {
  lastSync: string;
  pendingChanges: number;
  isOnline: boolean;
  syncError: string | null;
}

export interface SyncOperation {
  table: string;
  operation: 'insert' | 'update' | 'upsert' | 'delete';
  data: any;
}

export interface SupabaseAuthSession {
  user_id: string;
  username: string;
  role: 'admin' | 'boss' | 'employee';
  display_name: string;
  equity_percentage?: number;
  login_at: string;
  logout_at: string | null;
}

export interface SupabaseOrder {
  id: string;
  user_id: string;
  employee_name: string;
  shift_name: string;
  order_date: string;
  total_amount: number;
  created_at: string;
  updated_at?: string;
  synced_at: string;
}

export interface SupabaseOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface SupabaseProduct {
  id: string;
  name: string;
  category: string;
  unit_price: number;
  description?: string;
  stock_quantity: number;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  synced_at: string;
}

export interface SupabaseShift {
  id: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// AUTH SESSION ADAPTERS
// ============================================================================

export interface SQLiteAuthSession {
  id: string;
  username: string;
  role: string;
  display_name: string;
  equity_percentage: number | null;
  login_at: string;
  logout_at: string | null;
}

export function authSessionToSupabase(session: SQLiteAuthSession): SupabaseAuthSession {
  return {
    user_id: session.id,
    username: session.username,
    role: session.role as 'admin' | 'boss' | 'employee',
    display_name: session.display_name,
    equity_percentage: session.equity_percentage ?? undefined,
    login_at: session.login_at,
    logout_at: session.logout_at,
  };
}

export function authSessionFromSupabase(session: SupabaseAuthSession): SQLiteAuthSession {
  return {
    id: session.user_id,
    username: session.username,
    role: session.role,
    display_name: session.display_name,
    equity_percentage: session.equity_percentage ?? null,
    login_at: session.login_at,
    logout_at: session.logout_at,
  };
}

// ============================================================================
// ORDER ADAPTERS
// ============================================================================

export interface SQLiteOrder {
  id: string;
  user_id: string;
  employee_name: string;
  shift_name: string;
  order_date: string;
  total_amount: number;
  created_at: string;
  synced_at: string | null;
}

export function orderToSupabase(order: SQLiteOrder): SupabaseOrder {
  return {
    id: order.id,
    user_id: order.user_id,
    employee_name: order.employee_name,
    shift_name: order.shift_name,
    order_date: order.order_date,
    total_amount: Number(order.total_amount),
    created_at: order.created_at,
    synced_at: order.synced_at ?? new Date().toISOString(),
  };
}

export function orderFromSupabase(order: SupabaseOrder): SQLiteOrder {
  return {
    id: order.id,
    user_id: order.user_id,
    employee_name: order.employee_name,
    shift_name: order.shift_name,
    order_date: order.order_date,
    total_amount: order.total_amount,
    created_at: order.created_at,
    synced_at: order.synced_at,
  };
}

// ============================================================================
// ORDER ITEM ADAPTERS
// ============================================================================

export interface SQLiteOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export function orderItemToSupabase(item: SQLiteOrderItem): SupabaseOrderItem {
  return {
    id: item.id,
    order_id: item.order_id,
    product_id: item.product_id,
    product_name: item.product_name,
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
    total_price: Number(item.total_price),
    created_at: item.created_at,
  };
}

export function orderItemFromSupabase(item: SupabaseOrderItem): SQLiteOrderItem {
  return {
    id: item.id,
    order_id: item.order_id,
    product_id: item.product_id,
    product_name: item.product_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.total_price,
    created_at: item.created_at,
  };
}

// ============================================================================
// PRODUCT ADAPTERS
// ============================================================================

export interface SQLiteProduct {
  id: string;
  name: string;
  category: string;
  unit_price: number;
  description: string | null;
  stock_quantity: number;
  image_url: string | null;
  is_active: number; // SQLite uses INTEGER (0 or 1)
  created_at: string;
  updated_at: string;
  synced_at: string | null;
}

export function productToSupabase(product: Product | SQLiteProduct): SupabaseProduct {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    unit_price: Number(product.unit_price),
    description: ('description' in product ? product.description : undefined) ?? undefined,
    stock_quantity: Number(product.stock_quantity),
    image_url: ('image_url' in product ? product.image_url : undefined) ?? undefined,
    is_active: Boolean('is_active' in product ? product.is_active : true),
    created_at: ('created_at' in product ? product.created_at : undefined) ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
    synced_at: new Date().toISOString(),
  };
}

export function productFromSupabase(product: SupabaseProduct): SQLiteProduct {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    unit_price: product.unit_price,
    description: product.description ?? null,
    stock_quantity: product.stock_quantity,
    image_url: product.image_url ?? null,
    is_active: product.is_active ? 1 : 0,
    created_at: product.created_at,
    updated_at: product.updated_at,
    synced_at: product.synced_at,
  };
}

export function supabaseProductToApiProduct(product: SupabaseProduct): Product {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    unit_price: product.unit_price,
    description: product.description ?? '',
    stock_quantity: product.stock_quantity,
    image_url: product.image_url ?? '',
  };
}

// ============================================================================
// SHIFT ADAPTERS
// ============================================================================

export interface SQLiteShift {
  id: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export function shiftToSupabase(shift: SQLiteShift): SupabaseShift {
  return {
    id: shift.id,
    shift_name: shift.shift_name,
    start_time: shift.start_time,
    end_time: shift.end_time,
    description: shift.description ?? undefined,
    created_at: shift.created_at,
    updated_at: new Date().toISOString(),
  };
}

export function shiftFromSupabase(shift: SupabaseShift): SQLiteShift {
  return {
    id: shift.id,
    shift_name: shift.shift_name,
    start_time: shift.start_time,
    end_time: shift.end_time,
    description: shift.description ?? null,
    created_at: shift.created_at,
    updated_at: shift.updated_at,
  };
}

// ============================================================================
// CONFLICT RESOLUTION HELPERS
// ============================================================================

export interface ConflictResolution<T> {
  local: T;
  remote: T;
  resolution: 'local' | 'remote' | 'merge';
  result: T;
}

/**
 * Resolves conflicts between local and remote data based on timestamps
 * Uses "last write wins" strategy with timestamp comparison
 */
export function resolveConflict<T extends { updated_at?: string; synced_at?: string }>(
  local: T,
  remote: T,
): ConflictResolution<T> {
  const localTime = new Date((local.updated_at ?? local.synced_at) as string);
  const remoteTime = new Date((remote.updated_at ?? remote.synced_at) as string);

  if (localTime > remoteTime) {
    return {
      local,
      remote,
      resolution: 'local',
      result: local,
    };
  } else if (remoteTime > localTime) {
    return {
      local,
      remote,
      resolution: 'remote',
      result: remote,
    };
  } else {
    // Timestamps are equal, prefer local
    return {
      local,
      remote,
      resolution: 'local',
      result: local,
    };
  }
}

/**
 * Custom conflict resolution for orders (never overwrite completed orders)
 */
export function resolveOrderConflict(
  local: SQLiteOrder,
  remote: SupabaseOrder,
): ConflictResolution<SQLiteOrder> {
  // Orders are immutable once created, so we prefer whichever has synced_at set
  if (local.synced_at) {
    return {
      local,
      remote: orderFromSupabase(remote),
      resolution: 'local',
      result: local,
    };
  }
  return {
    local,
    remote: orderFromSupabase(remote),
    resolution: 'remote',
    result: orderFromSupabase(remote),
  };
}

// ============================================================================
// BATCH CONVERSION HELPERS
// ============================================================================

export function batchConvert<T, R>(items: T[], converter: (item: T) => R): R[] {
  return items.map(converter);
}

export function batchFilter<T>(items: T[], predicate: (item: T) => boolean): T[] {
  return items.filter(predicate);
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export function isValidSupabaseOrder(order: Partial<SupabaseOrder>): boolean {
  return !!(
    order.id &&
    order.user_id &&
    order.employee_name &&
    order.shift_name &&
    order.order_date &&
    order.total_amount !== undefined
  );
}

export function isValidSupabaseProduct(product: Partial<SupabaseProduct>): boolean {
  return !!(
    product.id &&
    product.name &&
    product.category &&
    product.unit_price !== undefined
  );
}

export function isValidSupabaseAuthSession(session: Partial<SupabaseAuthSession>): boolean {
  return !!(
    session.user_id &&
    session.username &&
    session.role &&
    session.display_name &&
    session.login_at
  );
}

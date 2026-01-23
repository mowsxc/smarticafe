// Generic Tauri Command Wrapper with robust error handling
// Handle both Tauri native and browser modes gracefully
const isTauriAvailable = () => {
  try {
    const tauri = (window as any).__TAURI__;
    return tauri && typeof tauri.invoke === 'function';
  } catch {
    return false;
  }
};

export async function tauriCmd<T>(cmd: string, args: Record<string, any> = {}): Promise<T> {
  const SENSITIVE_KEYS = ['supabaseAnonKey', 'password', 'token', 'key', 'secret', 'serviceRoleKey'];

  // Check if Tauri is available (native mode)
  if (isTauriAvailable()) {
    try {
      console.debug(`[Tauri] Invoke: ${cmd}`, redact(args, SENSITIVE_KEYS));
      const tauri = (window as any).__TAURI__;
      const result = await tauri.invoke(cmd, args);
      console.debug(`[Tauri] Result: ${cmd}`, redact(result, SENSITIVE_KEYS));
      return result;
    } catch (error) {
      console.error(`[Tauri] Error: ${cmd}`, error);
      throw error;
    }
  }

  // Fallback to HTTP for browser/mobile mode
  console.debug(`[HTTP] Remote Call: ${cmd}`, redact(args, SENSITIVE_KEYS));
  
  const apiHost = window.location.hostname;
  const apiPort = 32521;
  
  // Map command names to specific API routes
  let url = `http://${apiHost}:${apiPort}/api/rpc/${cmd}`;
  let method = 'POST';

  if (cmd === 'products_list') url = `http://${apiHost}:${apiPort}/api/products`;
  else if (cmd === 'auth_pick_list') url = `http://${apiHost}:${apiPort}/api/auth/pick_list`;
  else if (cmd === 'auth_login') url = `http://${apiHost}:${apiPort}/api/auth/login`;
  else if (cmd === 'auth_employee_login') url = `http://${apiHost}:${apiPort}/api/auth/employee_login`;
  else if (cmd === 'pos_checkout') url = `http://${apiHost}:${apiPort}/api/pos/checkout`;
  else if (cmd === 'shift_record_insert') url = `http://${apiHost}:${apiPort}/api/shift/record`;
  else if (cmd === 'accounting_entries_create_from_shift') url = `http://${apiHost}:${apiPort}/api/finance/accounting`;

  // Get methods for list/fetch commands
  if (['products_list', 'auth_pick_list', 'auth_bootstrap_required'].includes(cmd)) {
    method = 'GET';
  }

  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: method === 'POST' ? JSON.stringify(args) : undefined,
    });

    if (!response.ok) {
      const errorJson = await response.json();
      throw new Error(errorJson.error || 'Network Error');
    }

    const payload = await response.json();
    if (!payload.success) throw new Error(payload.error || 'API Error');
    
    return payload.data as T;
  } catch (error) {
    console.error(`[HTTP] Remote Error: ${cmd}`, error);
    throw error;
  }
}

// Internal redact helper
function redact(v: any, sensitiveKeys: string[]): any {
  if (v === null || v === undefined) return v;
  if (typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(i => redact(i, sensitiveKeys));

  const out: any = {};
  for (const [k, val] of Object.entries(v)) {
    if (sensitiveKeys.includes(k)) {
      out[k] = '***';
    } else {
      out[k] = redact(val, sensitiveKeys);
    }
  }
  return out;
}

// Ensure database is connected (optional check)
export async function checkDbStats() {
  return tauriCmd('db_stats');
}

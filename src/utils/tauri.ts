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

const redact = (value: any): any => {
  try {
    if (value === null || value === undefined) return value;
    if (typeof value !== 'object') return value;

    const SENSITIVE_KEYS = ['supabaseAnonKey', 'password', 'token', 'key', 'secret', 'serviceRoleKey'];

    const walk = (v: any): any => {
      if (v === null || v === undefined) return v;
      if (Array.isArray(v)) return v.map(walk);
      if (typeof v !== 'object') return v;

      const out: Record<string, any> = {};
      for (const [k, val] of Object.entries(v)) {
        if (SENSITIVE_KEYS.includes(k)) {
          out[k] = '***';
          continue;
        }
        out[k] = walk(val);
      }
      return out;
    };

    return walk(value);
  } catch {
    return '[redacted]';
  }
};

export async function tauriCmd<T>(cmd: string, args: Record<string, any> = {}): Promise<T> {
  // Check if Tauri is available (browser mode check)
  if (!isTauriAvailable()) {
    const error = new Error(`[Tauri] ${cmd}: Tauri runtime not available (browser mode)`);
    console.warn(`[Tauri] Command ${cmd} skipped - running in browser mode`);
    throw error;
  }

  try {
    console.debug(`[Tauri] Invoke: ${cmd}`, redact(args));
    const tauri = (window as any).__TAURI__;
    const result = await tauri.invoke(cmd, args);
    console.debug(`[Tauri] Result: ${cmd}`, redact(result));
    return result;
  } catch (error) {
    console.error(`[Tauri] Error: ${cmd}`, error);
    throw error;
  }
}

// Ensure database is connected (optional check)
export async function checkDbStats() {
  return tauriCmd('db_stats');
}

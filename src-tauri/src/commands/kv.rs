use tauri::AppHandle;
use serde_json::Value;
use crate::db::open_db;
use crate::db::now_ts;

#[tauri::command]
pub fn kv_get(app: AppHandle, key: String) -> Result<Option<Value>, String> {
    let conn = open_db(&app)?;
    let mut stmt = conn
        .prepare("SELECT v FROM kv WHERE k = ?1")
        .map_err(|e| format!("prepare: {e}"))?;
    let row: Option<String> = stmt
        .query_row([key], |r| r.get(0))
        .optional()
        .map_err(|e| format!("query_row: {e}"))?;
    Ok(row.map(|s| serde_json::from_str(&s).unwrap_or(Value::Null)))
}

#[tauri::command]
pub fn kv_set(app: AppHandle, key: String, value: Value) -> Result<(), String> {
    let conn = open_db(&app)?;
    let now = now_ts()?;
    let v = serde_json::to_string(&value).map_err(|e| format!("serialize: {e}"))?;
    conn.execute(
        "INSERT INTO kv(k, v, updated_at) VALUES(?1, ?2, ?3)\
         ON CONFLICT(k) DO UPDATE SET v=excluded.v, updated_at=excluded.updated_at",
        params![key, v, now],
    )
    .map_err(|e| format!("execute: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn kv_remove(app: AppHandle, key: String) -> Result<(), String> {
    let conn = open_db(&app)?;
    conn.execute("DELETE FROM kv WHERE k = ?1", [key])
        .map_err(|e| format!("execute: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn kv_dump(app: AppHandle) -> Result<serde_json::Map<String, Value>, String> {
    let conn = open_db(&app)?;
    let mut stmt = conn
        .prepare("SELECT k, v FROM kv")
        .map_err(|e| format!("prepare: {e}"))?;
    let mut rows = stmt.query([]).map_err(|e| format!("query: {e}"))?;
    let mut map = serde_json::Map::new();
    while let Some(row) = rows.next().map_err(|e| format!("next: {e}"))? {
        let k: String = row.get(0).map_err(|e| format!("get k: {e}"))?;
        let v_raw: String = row.get(1).map_err(|e| format!("get v: {e}"))?;
        let v: Value = serde_json::from_str(&v_raw).unwrap_or(Value::Null);
        map.insert(k, v);
    }
    Ok(map)
}

// Helper for other commands
pub fn load_kv_json(conn: &rusqlite::Connection, key: &str) -> Result<Option<Value>, String> {
    let mut stmt = conn
        .prepare("SELECT v FROM kv WHERE k = ?1")
        .map_err(|e| format!("prepare: {e}"))?;
    let row: Option<String> = stmt
        .query_row([key], |r| r.get(0))
        .optional()
        .map_err(|e| format!("query_row: {e}"))?;
    Ok(row.map(|s| serde_json::from_str(&s).unwrap_or(Value::Null)))
}

use rusqlite::{params, OptionalExtension};

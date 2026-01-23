use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};
use rusqlite::{Connection, OptionalExtension};
use crate::models::SystemLog;
use crate::db::now_ymd;

pub static AUTH_SESSIONS: OnceLock<Mutex<HashMap<String, String>>> = OnceLock::new();
pub static SYSTEM_LOGS: OnceLock<Mutex<Vec<SystemLog>>> = OnceLock::new();

pub fn auth_sessions() -> &'static Mutex<HashMap<String, String>> {
    AUTH_SESSIONS.get_or_init(|| Mutex::new(HashMap::new()))
}

pub fn system_logs() -> &'static Mutex<Vec<SystemLog>> {
    SYSTEM_LOGS.get_or_init(|| Mutex::new(Vec::new()))
}

pub fn auth_resolve_account_id(token: &str) -> Option<String> {
    if token.trim().is_empty() {
        return None;
    }
    let map = auth_sessions().lock().ok()?;
    map.get(token).cloned()
}

pub fn require_admin(conn: &Connection, token: &str) -> Result<String, String> {
    let actor_id = auth_resolve_account_id(token).ok_or_else(|| String::from("unauthorized"))?;
    let role: Option<String> = conn
        .query_row("SELECT role FROM auth_accounts WHERE id = ?1", [actor_id.clone()], |r| r.get(0))
        .optional()
        .map_err(|e| format!("actor role: {e}"))?;
    let role = role.ok_or_else(|| String::from("unauthorized"))?;
    if role != "admin" {
        return Err(String::from("unauthorized"));
    }
    Ok(actor_id)
}

pub fn log_to_system(level: &str, module: &str, message: &str, details: Option<&str>) {
    let now = now_ymd().unwrap_or_else(|_| String::from(""));
    use std::time::SystemTime;
    let timestamp = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|d| {
            let secs = d.as_secs();
            let hours = (secs / 3600) % 24;
            let mins = (secs / 60) % 60;
            let secs = secs % 60;
            format!("{:02}:{:02}:{:02}", hours, mins, secs)
        })
        .unwrap_or_else(|_| String::from("00:00:00"));
    
    let log = SystemLog {
        id: SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).map(|d| d.as_millis() as i64).unwrap_or(0),
        timestamp: format!("{} {}", now, timestamp),
        level: level.to_string(),
        module: module.to_string(),
        message: message.to_string(),
        details: details.map(|s| s.to_string()),
    };
    
    let mut logs = system_logs().lock().unwrap();
    logs.push(log);
    if logs.len() > 1000 {
        logs.remove(0);
    }
}

use tauri::AppHandle;
use crate::db::{open_db, db_path};
use crate::state::{require_admin, system_logs, log_to_system};
use crate::models::{SystemLog, SystemLogInput};

#[tauri::command]
pub fn system_logs_list(_app: AppHandle, token: String, limit: Option<i64>) -> Result<Vec<SystemLog>, String> {
    let _ = require_admin(&open_db(&_app)?, &token)?;
    let logs = system_logs().lock().map_err(|_| String::from("lock"))?;
    let logs: Vec<SystemLog> = logs.iter().rev().take(limit.unwrap_or(100) as usize).cloned().collect();
    Ok(logs)
}

#[tauri::command]
pub fn system_log_add(_app: AppHandle, input: SystemLogInput) -> Result<(), String> {
    let _ = require_admin(&open_db(&_app)?, &input.token)?;
    log_to_system(&input.level, &input.module, &input.message, input.details.as_deref());
    Ok(())
}

#[tauri::command]
pub fn system_log_clear(_app: AppHandle, token: String) -> Result<(), String> {
    let _ = require_admin(&open_db(&_app)?, &token)?;
    let mut logs = system_logs().lock().map_err(|_| String::from("lock"))?;
    logs.clear();
    Ok(())
}

#[tauri::command]
pub async fn open_external_webview(
    app: AppHandle,
    label: String,
    url: String,
    title: Option<String>,
    user_agent: Option<String>,
) -> Result<(), String> {
    use tauri::{Url, WebviewUrl, WebviewWindowBuilder};
    
    let label = label.trim().to_string();
    if label.is_empty() {
        return Err(String::from("label is empty"));
    }
    let url_s = url.trim().to_string();
    if url_s.is_empty() {
        return Err(String::from("url is empty"));
    }
    let parsed: Url = url_s
        .parse()
        .map_err(|e| format!("invalid url: {e}"))?;

    let mut builder = WebviewWindowBuilder::new(&app, label, WebviewUrl::External(parsed))
        .title(title.unwrap_or_else(|| String::from("外部页面")))
        .inner_size(1280.0, 900.0);

    if let Some(ua) = user_agent.as_ref() {
        let ua = ua.trim();
        if !ua.is_empty() {
            builder = builder.user_agent(ua);
        }
    }

    builder
        .build()
        .map_err(|e| format!("create webview window failed: {e}"))?;
    Ok(())
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct DbTablesInfo {
    pub table_count: i64,
    pub record_count: i64,
    pub db_size: String,
}

#[tauri::command]
pub fn db_tables_info(app: AppHandle, token: String) -> Result<DbTablesInfo, String> {
    let conn = open_db(&app)?;
    let _ = require_admin(&conn, token.trim())?;

    let table_count: i64 = conn.query_row(
        "SELECT COUNT(1) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        [],
        |r| r.get(0)
    ).unwrap_or(0);

    let mut record_count = 0;
    let mut stmt = conn.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").map_err(|e| format!("prepare: {e}"))?;
    let mut rows = stmt.query([]).map_err(|e| format!("query: {e}"))?;
    while let Some(row) = rows.next().map_err(|e| format!("next row: {e}"))? {
        let table_name: String = row.get(0).map_err(|e| format!("get table name: {e}"))?;
        let count: i64 = conn.query_row(
            &format!("SELECT COUNT(1) FROM {}", table_name),
            [],
            |r| r.get(0)
        ).unwrap_or(0);
        record_count += count;
    }

    let p = db_path(&app)?;
    let db_size = std::fs::metadata(&p)
        .map(|m| format!("{:.1} MB", m.len() as f64 / 1024.0 / 1024.0))
        .unwrap_or_else(|_| "0 MB".to_string());

    Ok(DbTablesInfo {
        table_count,
        record_count,
        db_size,
    })
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct ApiStats {
    pub total_calls: i64,
    pub errors: i64,
    pub avg_response: String,
}

#[tauri::command]
pub fn api_stats(app: AppHandle, token: String) -> Result<ApiStats, String> {
    let conn = open_db(&app)?;
    let _ = require_admin(&conn, token.trim())?;

    // Placeholder for real monitoring system
    Ok(ApiStats {
        total_calls: 0,
        errors: 0,
        avg_response: String::from("0ms"),
    })
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct SystemInfo {
    pub version: String,
    pub rust_version: String,
    pub tauri_version: String,
    pub os: String,
}

#[tauri::command]
pub fn system_info(app: AppHandle, token: String) -> Result<SystemInfo, String> {
    let conn = open_db(&app)?;
    let _ = require_admin(&conn, token.trim())?;

    Ok(SystemInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        rust_version: String::from("1.75+"), // Simplified or can be improved with rustc version at build time
        tauri_version: String::from("2.0.0"),
        os: std::env::consts::OS.to_string(),
    })
}

#[tauri::command]
pub async fn close_splash(app: AppHandle) -> Result<(), String> {
    use tauri::Manager;
    if let Some(splash) = app.get_webview_window("splashscreen") {
        splash.close().map_err(|e| e.to_string())?;
    }
    if let Some(main) = app.get_webview_window("main") {
        main.center().map_err(|e| e.to_string())?;
        main.show().map_err(|e| e.to_string())?;
        main.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

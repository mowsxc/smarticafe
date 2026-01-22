use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Manager, Url, WebviewUrl, WebviewWindowBuilder};
use uuid::Uuid;
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};

// HTTP API Server module
mod http_server;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AuthSession {
    account_id: String,
    role: String,
    identity: String,
    name: String,
    equity: f64,
    token: String,
}

fn require_admin(conn: &Connection, token: &str) -> Result<String, String> {
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

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AuthLoginInput {
    pick_name: String,
    password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AuthSetPasswordInput {
    token: String,
    id: String,
    new_password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AuthPickList {
    employees: Vec<String>,
    bosses: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AuthAccountRow {
    id: String,
    pick_name: String,
    display_name: String,
    role: String,
    identity: String,
    equity: f64,
    is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct EmployeeRow {
    id: String,
    name: String,
    sort_order: i64,
    is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct EmployeeUpsertInput {
    token: String,
    id: Option<String>,
    name: String,
    sort_order: Option<i64>,
    is_active: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct EmployeeSetActiveInput {
    token: String,
    id: String,
    is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AuthAccountSetActiveInput {
    token: String,
    id: String,
    is_active: bool,
}

static AUTH_SESSIONS: OnceLock<Mutex<HashMap<String, String>>> = OnceLock::new();
static SYSTEM_LOGS: OnceLock<Mutex<Vec<SystemLog>>> = OnceLock::new();

fn auth_sessions() -> &'static Mutex<HashMap<String, String>> {
    AUTH_SESSIONS.get_or_init(|| Mutex::new(HashMap::new()))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SystemLog {
    id: i64,
    timestamp: String,
    level: String,
    module: String,
    message: String,
    details: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SystemLogInput {
    token: String,
    level: String,
    module: String,
    message: String,
    details: Option<String>,
}

fn system_logs() -> &'static Mutex<Vec<SystemLog>> {
    SYSTEM_LOGS.get_or_init(|| Mutex::new(Vec::new()))
}

fn log_to_system(level: &str, module: &str, message: &str, details: Option<&str>) {
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

fn auth_resolve_account_id(token: &str) -> Option<String> {
    if token.trim().is_empty() {
        return None;
    }
    let map = auth_sessions().lock().ok()?;
    map.get(token).cloned()
}

#[tauri::command]
fn system_logs_list(app: tauri::AppHandle, token: String, limit: Option<i64>) -> Result<Vec<SystemLog>, String> {
    let _ = require_admin(&open_db(&app)?, &token)?;
    let logs = system_logs().lock().map_err(|_| String::from("lock"))?;
    let logs: Vec<SystemLog> = logs.iter().rev().take(limit.unwrap_or(100) as usize).cloned().collect();
    Ok(logs)
}

#[tauri::command]
fn system_log_add(app: tauri::AppHandle, input: SystemLogInput) -> Result<(), String> {
    let _ = require_admin(&open_db(&app)?, &input.token)?;
    log_to_system(&input.level, &input.module, &input.message, input.details.as_deref());
    Ok(())
}

#[tauri::command]
fn system_log_clear(app: tauri::AppHandle, token: String) -> Result<(), String> {
    let _ = require_admin(&open_db(&app)?, &token)?;
    let mut logs = system_logs().lock().map_err(|_| String::from("lock"))?;
    logs.clear();
    Ok(())
}

fn db_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    std::fs::create_dir_all(&base).map_err(|e| format!("create_dir_all: {e}"))?;
    Ok(base.join("smarticafe.db"))
}

#[tauri::command]
async fn open_external_webview(
    app: tauri::AppHandle,
    label: String,
    url: String,
    title: Option<String>,
    user_agent: Option<String>,
) -> Result<(), String> {
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

    // On Windows, creating webviews synchronously can deadlock in some contexts.
    // Keep this command async.
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

#[tauri::command]
fn shift_snapshot_insert(app: tauri::AppHandle, input: ShiftSnapshotInsertInput) -> Result<String, String> {
    let conn = open_db(&app)?;
    let now = now_ts()?;

    let shift_record_id = input.shift_record_id.trim().to_string();
    if shift_record_id.is_empty() {
        return Err(String::from("shift_record_id is empty"));
    }
    let date_ymd = input.date_ymd.trim().to_string();
    let shift = input.shift.trim().to_string();
    let employee = input.employee.trim().to_string();
    let html = input.html;
    if html.trim().is_empty() {
        return Err(String::from("html is empty"));
    }

    let mut hasher = Sha256::new();
    hasher.update(html.as_bytes());
    let digest = hasher.finalize();
    let computed = hex::encode(digest);

    let provided = input.sha256.trim().to_lowercase();
    if !provided.is_empty() && provided != computed {
        return Err(String::from("sha256 mismatch"));
    }

    let id = Uuid::new_v4().to_string();
    let changes = conn
        .execute(
            "INSERT INTO shift_snapshots(id, shift_record_id, date_ymd, shift, employee, html, sha256, created_at)\
             VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)\
             ON CONFLICT(shift_record_id) DO NOTHING",
            params![id, shift_record_id, date_ymd, shift, employee, html, computed, now],
        )
        .map_err(|e| format!("execute: {e}"))?;

    if changes > 0 {
        return Ok(id);
    }

    // already exists, return existing id
    let existing: Option<String> = conn
        .query_row(
            "SELECT id FROM shift_snapshots WHERE shift_record_id = ?1",
            [input.shift_record_id.trim()],
            |r| r.get(0),
        )
        .optional()
        .map_err(|e| format!("query_row: {e}"))?;

    Ok(existing.unwrap_or(id))
}

#[tauri::command]
fn shift_snapshot_get(app: tauri::AppHandle, shift_record_id: String) -> Result<Option<ShiftSnapshotRow>, String> {
    let conn = open_db(&app)?;
    let sid = shift_record_id.trim().to_string();
    if sid.is_empty() {
        return Ok(None);
    }

    let mut stmt = conn
        .prepare(
            "SELECT id, shift_record_id, date_ymd, shift, employee, html, sha256, created_at \
             FROM shift_snapshots WHERE shift_record_id = ?1",
        )
        .map_err(|e| format!("prepare: {e}"))?;

    let row = stmt
        .query_row([sid], |r| {
            Ok(ShiftSnapshotRow {
                id: r.get(0)?,
                shift_record_id: r.get(1)?,
                date_ymd: r.get(2)?,
                shift: r.get(3)?,
                employee: r.get(4)?,
                html: r.get(5)?,
                sha256: r.get(6)?,
                created_at: r.get(7)?,
            })
        })
        .optional()
        .map_err(|e| format!("query_row: {e}"))?;

    if let Some(ref snap) = row {
        let mut hasher = Sha256::new();
        hasher.update(snap.html.as_bytes());
        let digest = hasher.finalize();
        let computed = hex::encode(digest);
        if computed != snap.sha256.trim().to_lowercase() {
            return Err(String::from("snapshot sha256 mismatch"));
        }
    }

    Ok(row)
}

#[tauri::command]
fn shift_records_list(
    app: tauri::AppHandle,
    date_ymd: Option<String>,
    shift: Option<String>,
    employee: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<ShiftRecordRow>, String> {
    let conn = open_db(&app)?;
    let limit = limit.unwrap_or(200).clamp(1, 2000);
    let d = date_ymd.unwrap_or_default().trim().to_string();
    let s = shift.unwrap_or_default().trim().to_string();
    let e = employee.unwrap_or_default().trim().to_string();

    let mut sql = String::from(
        "SELECT id, date_ymd, shift, employee, wangfei, shouhuo, meituan, zhichu, income, yingjiao, created_at \
         FROM shift_records",
    );
    let mut where_parts: Vec<&str> = Vec::new();
    if !d.is_empty() {
        where_parts.push("date_ymd = ?1");
    }
    if !s.is_empty() {
        where_parts.push(if d.is_empty() { "shift = ?1" } else { "shift = ?2" });
    }
    if !e.is_empty() {
        where_parts.push(if d.is_empty() {
            if s.is_empty() { "employee = ?1" } else { "employee = ?2" }
        } else {
            if s.is_empty() { "employee = ?2" } else { "employee = ?3" }
        });
    }
    if !where_parts.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&where_parts.join(" AND "));
    }
    sql.push_str(" ORDER BY created_at DESC LIMIT ");
    sql.push_str(&limit.to_string());

    let mut stmt = conn.prepare(&sql).map_err(|x| format!("prepare: {x}"))?;

    let map_row = |r: &rusqlite::Row<'_>| {
        Ok(ShiftRecordRow {
            id: r.get(0)?,
            date_ymd: r.get(1)?,
            shift: r.get(2)?,
            employee: r.get(3)?,
            wangfei: r.get(4)?,
            shouhuo: r.get(5)?,
            meituan: r.get(6)?,
            zhichu: r.get(7)?,
            income: r.get(8)?,
            yingjiao: r.get(9)?,
            created_at: r.get(10)?,
        })
    };

    let mut out = Vec::new();
    if d.is_empty() && s.is_empty() && e.is_empty() {
        let rows = stmt
            .query_map([], map_row)
            .map_err(|x| format!("query_map: {x}"))?;
        for r in rows {
            out.push(r.map_err(|x| format!("row: {x}"))?);
        }
        return Ok(out);
    }

    if !d.is_empty() && s.is_empty() && e.is_empty() {
        let rows = stmt
            .query_map([d], map_row)
            .map_err(|x| format!("query_map: {x}"))?;
        for r in rows {
            out.push(r.map_err(|x| format!("row: {x}"))?);
        }
        return Ok(out);
    }

    if d.is_empty() && !s.is_empty() && e.is_empty() {
        let rows = stmt
            .query_map([s], map_row)
            .map_err(|x| format!("query_map: {x}"))?;
        for r in rows {
            out.push(r.map_err(|x| format!("row: {x}"))?);
        }
        return Ok(out);
    }

    if d.is_empty() && s.is_empty() && !e.is_empty() {
        let rows = stmt
            .query_map([e], map_row)
            .map_err(|x| format!("query_map: {x}"))?;
        for r in rows {
            out.push(r.map_err(|x| format!("row: {x}"))?);
        }
        return Ok(out);
    }

    if !d.is_empty() && !s.is_empty() && e.is_empty() {
        let rows = stmt
            .query_map([d, s], map_row)
            .map_err(|x| format!("query_map: {x}"))?;
        for r in rows {
            out.push(r.map_err(|x| format!("row: {x}"))?);
        }
        return Ok(out);
    }

    if !d.is_empty() && s.is_empty() && !e.is_empty() {
        let rows = stmt
            .query_map([d, e], map_row)
            .map_err(|x| format!("query_map: {x}"))?;
        for r in rows {
            out.push(r.map_err(|x| format!("row: {x}"))?);
        }
        return Ok(out);
    }

    if d.is_empty() && !s.is_empty() && !e.is_empty() {
        let rows = stmt
            .query_map([s, e], map_row)
            .map_err(|x| format!("query_map: {x}"))?;
        for r in rows {
            out.push(r.map_err(|x| format!("row: {x}"))?);
        }
        return Ok(out);
    }

    let rows = stmt
        .query_map([d, s, e], map_row)
        .map_err(|x| format!("query_map: {x}"))?;
    for r in rows {
        out.push(r.map_err(|x| format!("row: {x}"))?);
    }
    Ok(out)
}

#[tauri::command]
fn sales_orders_list(
    app: tauri::AppHandle,
    date_ymd: Option<String>,
    shift: Option<String>,
    employee: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<SalesOrderRow>, String> {
    let conn = open_db(&app)?;
    let limit = limit.unwrap_or(200).clamp(1, 2000);
    let d = date_ymd.unwrap_or_default().trim().to_string();
    let s = shift.unwrap_or_default().trim().to_string();
    let e = employee.unwrap_or_default().trim().to_string();

    let mut sql = String::from(
        "SELECT id, date_ymd, shift, employee, total_revenue, total_profit, created_at \
         FROM sales_orders",
    );
    let mut where_parts: Vec<&str> = Vec::new();
    if !d.is_empty() {
        where_parts.push("date_ymd = ?1");
    }
    if !s.is_empty() {
        where_parts.push(if d.is_empty() { "shift = ?1" } else { "shift = ?2" });
    }
    if !e.is_empty() {
        where_parts.push(if d.is_empty() {
            if s.is_empty() { "employee = ?1" } else { "employee = ?2" }
        } else {
            if s.is_empty() { "employee = ?2" } else { "employee = ?3" }
        });
    }
    if !where_parts.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&where_parts.join(" AND "));
    }
    sql.push_str(" ORDER BY created_at DESC LIMIT ");
    sql.push_str(&limit.to_string());

    let mut stmt = conn.prepare(&sql).map_err(|x| format!("prepare: {x}"))?;
    let mut out = Vec::new();

    if d.is_empty() && s.is_empty() && e.is_empty() {
        let rows = stmt
            .query_map([], |r| {
                Ok(SalesOrderRow {
                    id: r.get(0)?,
                    date_ymd: r.get(1)?,
                    shift: r.get(2)?,
                    employee: r.get(3)?,
                    total_revenue: r.get(4)?,
                    total_profit: r.get(5)?,
                    created_at: r.get(6)?,
                })
            })
            .map_err(|x| format!("query_map: {x}"))?;
        for r in rows {
            out.push(r.map_err(|x| format!("row: {x}"))?);
        }
        return Ok(out);
    }

    if !d.is_empty() && s.is_empty() && e.is_empty() {
        let rows = stmt
            .query_map([d], |r| {
                Ok(SalesOrderRow {
                    id: r.get(0)?,
                    date_ymd: r.get(1)?,
                    shift: r.get(2)?,
                    employee: r.get(3)?,
                    total_revenue: r.get(4)?,
                    total_profit: r.get(5)?,
                    created_at: r.get(6)?,
                })
            })
            .map_err(|x| format!("query_map: {x}"))?;
        for r in rows {
            out.push(r.map_err(|x| format!("row: {x}"))?);
        }
        return Ok(out);
    }

    if d.is_empty() && !s.is_empty() && e.is_empty() {
        let rows = stmt
            .query_map([s], |r| {
                Ok(SalesOrderRow {
                    id: r.get(0)?,
                    date_ymd: r.get(1)?,
                    shift: r.get(2)?,
                    employee: r.get(3)?,
                    total_revenue: r.get(4)?,
                    total_profit: r.get(5)?,
                    created_at: r.get(6)?,
                })
            })
            .map_err(|x| format!("query_map: {x}"))?;
        for r in rows {
            out.push(r.map_err(|x| format!("row: {x}"))?);
        }
        return Ok(out);
    }

    if d.is_empty() && s.is_empty() && !e.is_empty() {
        let rows = stmt
            .query_map([e], |r| {
                Ok(SalesOrderRow {
                    id: r.get(0)?,
                    date_ymd: r.get(1)?,
                    shift: r.get(2)?,
                    employee: r.get(3)?,
                    total_revenue: r.get(4)?,
                    total_profit: r.get(5)?,
                    created_at: r.get(6)?,
                })
            })
            .map_err(|x| format!("query_map: {x}"))?;
        for r in rows {
            out.push(r.map_err(|x| format!("row: {x}"))?);
        }
        return Ok(out);
    }

    if !d.is_empty() && !s.is_empty() && e.is_empty() {
        let rows = stmt
            .query_map([d, s], |r| {
                Ok(SalesOrderRow {
                    id: r.get(0)?,
                    date_ymd: r.get(1)?,
                    shift: r.get(2)?,
                    employee: r.get(3)?,
                    total_revenue: r.get(4)?,
                    total_profit: r.get(5)?,
                    created_at: r.get(6)?,
                })
            })
            .map_err(|x| format!("query_map: {x}"))?;
        for r in rows {
            out.push(r.map_err(|x| format!("row: {x}"))?);
        }
        return Ok(out);
    }

    if !d.is_empty() && s.is_empty() && !e.is_empty() {
        let rows = stmt
            .query_map([d, e], |r| {
                Ok(SalesOrderRow {
                    id: r.get(0)?,
                    date_ymd: r.get(1)?,
                    shift: r.get(2)?,
                    employee: r.get(3)?,
                    total_revenue: r.get(4)?,
                    total_profit: r.get(5)?,
                    created_at: r.get(6)?,
                })
            })
            .map_err(|x| format!("query_map: {x}"))?;
        for r in rows {
            out.push(r.map_err(|x| format!("row: {x}"))?);
        }
        return Ok(out);
    }

    if d.is_empty() && !s.is_empty() && !e.is_empty() {
        let rows = stmt
            .query_map([s, e], |r| {
                Ok(SalesOrderRow {
                    id: r.get(0)?,
                    date_ymd: r.get(1)?,
                    shift: r.get(2)?,
                    employee: r.get(3)?,
                    total_revenue: r.get(4)?,
                    total_profit: r.get(5)?,
                    created_at: r.get(6)?,
                })
            })
            .map_err(|x| format!("query_map: {x}"))?;
        for r in rows {
            out.push(r.map_err(|x| format!("row: {x}"))?);
        }
        return Ok(out);
    }

    let rows = stmt
        .query_map([d, s, e], |r| {
            Ok(SalesOrderRow {
                id: r.get(0)?,
                date_ymd: r.get(1)?,
                shift: r.get(2)?,
                employee: r.get(3)?,
                total_revenue: r.get(4)?,
                total_profit: r.get(5)?,
                created_at: r.get(6)?,
            })
        })
        .map_err(|x| format!("query_map: {x}"))?;
    for r in rows {
        out.push(r.map_err(|x| format!("row: {x}"))?);
    }
    Ok(out)
}

#[tauri::command]
fn sales_items_list(app: tauri::AppHandle, order_id: String) -> Result<Vec<SalesItemRow>, String> {
    let conn = open_db(&app)?;
    let oid = order_id.trim().to_string();
    if oid.is_empty() {
        return Ok(Vec::new());
    }
    let mut stmt = conn
        .prepare(
            "SELECT id, order_id, product_name, original, restock, remaining, redeem, redeem_mode, loss, purchase, stock_prev, stock, sales, revenue, unit_price, cost_price, spec, created_at \
             FROM sales_items WHERE order_id = ?1 ORDER BY created_at ASC",
        )
        .map_err(|x| format!("prepare: {x}"))?;
    let rows = stmt
        .query_map([oid], |r| {
            Ok(SalesItemRow {
                id: r.get(0)?,
                order_id: r.get(1)?,
                product_name: r.get(2)?,
                original: r.get(3)?,
                restock: r.get(4)?,
                remaining: r.get(5)?,
                redeem: r.get(6)?,
                redeem_mode: r.get(7)?,
                loss: r.get(8)?,
                purchase: r.get(9)?,
                stock_prev: r.get(10)?,
                stock: r.get(11)?,
                sales: r.get(12)?,
                revenue: r.get(13)?,
                unit_price: r.get(14)?,
                cost_price: r.get(15)?,
                spec: r.get(16)?,
                created_at: r.get(17)?,
            })
        })
        .map_err(|x| format!("query_map: {x}"))?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|x| format!("row: {x}"))?);
    }
    Ok(out)
}

#[tauri::command]
fn accounting_entries_list(
    app: tauri::AppHandle,
    date_ymd: Option<String>,
    shift: Option<String>,
    employee: Option<String>,
    entry_type: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<AccountingEntryRow>, String> {
    let conn = open_db(&app)?;
    let limit = limit.unwrap_or(500).clamp(1, 5000);
    let d = date_ymd.unwrap_or_default().trim().to_string();
    let s = shift.unwrap_or_default().trim().to_string();
    let e = employee.unwrap_or_default().trim().to_string();
    let t = entry_type.unwrap_or_default().trim().to_string();

    let mut sql = String::from(
        "SELECT id, date_ymd, shift, employee, entry_type, item, amount, bar_pay, finance_pay, created_at \
         FROM accounting_entries",
    );
    let mut where_parts: Vec<&str> = Vec::new();
    if !d.is_empty() {
        where_parts.push("date_ymd = ?1");
    }
    if !s.is_empty() {
        where_parts.push(if d.is_empty() { "shift = ?1" } else { "shift = ?2" });
    }
    if !e.is_empty() {
        where_parts.push(if d.is_empty() {
            if s.is_empty() { "employee = ?1" } else { "employee = ?2" }
        } else {
            if s.is_empty() { "employee = ?2" } else { "employee = ?3" }
        });
    }
    if !t.is_empty() {
        where_parts.push(match (d.is_empty(), s.is_empty(), e.is_empty()) {
            (true, true, true) => "entry_type = ?1",
            (false, true, true) | (true, false, true) | (true, true, false) => "entry_type = ?2",
            (false, false, true) | (false, true, false) | (true, false, false) => "entry_type = ?3",
            (false, false, false) => "entry_type = ?4",
        });
    }
    if !where_parts.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&where_parts.join(" AND "));
    }
    sql.push_str(" ORDER BY created_at DESC LIMIT ");
    sql.push_str(&limit.to_string());

    let mut stmt = conn.prepare(&sql).map_err(|x| format!("prepare: {x}"))?;
    let mut out = Vec::new();

    // Keep combinations explicit to avoid rusqlite generic param type mismatch.
    match (d.is_empty(), s.is_empty(), e.is_empty(), t.is_empty()) {
        (true, true, true, true) => {
            let rows = stmt.query_map([], map_accounting_row).map_err(|x| format!("query_map: {x}"))?;
            for r in rows { out.push(r.map_err(|x| format!("row: {x}"))?); }
        }
        (false, true, true, true) => {
            let rows = stmt.query_map([d], map_accounting_row).map_err(|x| format!("query_map: {x}"))?;
            for r in rows { out.push(r.map_err(|x| format!("row: {x}"))?); }
        }
        (true, false, true, true) => {
            let rows = stmt.query_map([s], map_accounting_row).map_err(|x| format!("query_map: {x}"))?;
            for r in rows { out.push(r.map_err(|x| format!("row: {x}"))?); }
        }
        (true, true, false, true) => {
            let rows = stmt.query_map([e], map_accounting_row).map_err(|x| format!("query_map: {x}"))?;
            for r in rows { out.push(r.map_err(|x| format!("row: {x}"))?); }
        }
        (true, true, true, false) => {
            let rows = stmt.query_map([t], map_accounting_row).map_err(|x| format!("query_map: {x}"))?;
            for r in rows { out.push(r.map_err(|x| format!("row: {x}"))?); }
        }
        (false, false, true, true) => {
            let rows = stmt.query_map([d, s], map_accounting_row).map_err(|x| format!("query_map: {x}"))?;
            for r in rows { out.push(r.map_err(|x| format!("row: {x}"))?); }
        }
        (false, true, false, true) => {
            let rows = stmt.query_map([d, e], map_accounting_row).map_err(|x| format!("query_map: {x}"))?;
            for r in rows { out.push(r.map_err(|x| format!("row: {x}"))?); }
        }
        (true, false, false, true) => {
            let rows = stmt.query_map([s, e], map_accounting_row).map_err(|x| format!("query_map: {x}"))?;
            for r in rows { out.push(r.map_err(|x| format!("row: {x}"))?); }
        }
        (false, true, true, false) => {
            let rows = stmt.query_map([d, t], map_accounting_row).map_err(|x| format!("query_map: {x}"))?;
            for r in rows { out.push(r.map_err(|x| format!("row: {x}"))?); }
        }
        (true, false, true, false) => {
            let rows = stmt.query_map([s, t], map_accounting_row).map_err(|x| format!("query_map: {x}"))?;
            for r in rows { out.push(r.map_err(|x| format!("row: {x}"))?); }
        }
        (true, true, false, false) => {
            let rows = stmt.query_map([e, t], map_accounting_row).map_err(|x| format!("query_map: {x}"))?;
            for r in rows { out.push(r.map_err(|x| format!("row: {x}"))?); }
        }
        (false, false, false, true) => {
            let rows = stmt.query_map([d, s, e], map_accounting_row).map_err(|x| format!("query_map: {x}"))?;
            for r in rows { out.push(r.map_err(|x| format!("row: {x}"))?); }
        }
        (false, false, true, false) => {
            let rows = stmt.query_map([d, s, t], map_accounting_row).map_err(|x| format!("query_map: {x}"))?;
            for r in rows { out.push(r.map_err(|x| format!("row: {x}"))?); }
        }
        (false, true, false, false) => {
            let rows = stmt.query_map([d, e, t], map_accounting_row).map_err(|x| format!("query_map: {x}"))?;
            for r in rows { out.push(r.map_err(|x| format!("row: {x}"))?); }
        }
        (true, false, false, false) => {
            let rows = stmt.query_map([s, e, t], map_accounting_row).map_err(|x| format!("query_map: {x}"))?;
            for r in rows { out.push(r.map_err(|x| format!("row: {x}"))?); }
        }
        (false, false, false, false) => {
            let rows = stmt.query_map([d, s, e, t], map_accounting_row).map_err(|x| format!("query_map: {x}"))?;
            for r in rows { out.push(r.map_err(|x| format!("row: {x}"))?); }
        }
    }

    Ok(out)
}

fn map_accounting_row(r: &rusqlite::Row<'_>) -> rusqlite::Result<AccountingEntryRow> {
    Ok(AccountingEntryRow {
        id: r.get(0)?,
        date_ymd: r.get(1)?,
        shift: r.get(2)?,
        employee: r.get(3)?,
        entry_type: r.get(4)?,
        item: r.get(5)?,
        amount: r.get(6)?,
        bar_pay: r.get(7)?,
        finance_pay: r.get(8)?,
        created_at: r.get(9)?,
    })
}

#[tauri::command]
fn meituan_orders_list(
    app: tauri::AppHandle,
    date_ymd: Option<String>,
    shift: Option<String>,
    employee: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<MeituanOrderRow>, String> {
    let conn = open_db(&app)?;
    let limit = limit.unwrap_or(500).clamp(1, 5000);
    let d = date_ymd.unwrap_or_default().trim().to_string();
    let s = shift.unwrap_or_default().trim().to_string();
    let e = employee.unwrap_or_default().trim().to_string();

    let mut sql = String::from(
        "SELECT id, date_ymd, shift, employee, coupon_no, raw_text, amount, discount, financial, bar_total, created_at \
         FROM meituan_orders",
    );
    let mut where_parts: Vec<&str> = Vec::new();
    if !d.is_empty() {
        where_parts.push("date_ymd = ?1");
    }
    if !s.is_empty() {
        where_parts.push(if d.is_empty() { "shift = ?1" } else { "shift = ?2" });
    }
    if !e.is_empty() {
        where_parts.push(if d.is_empty() {
            if s.is_empty() { "employee = ?1" } else { "employee = ?2" }
        } else {
            if s.is_empty() { "employee = ?2" } else { "employee = ?3" }
        });
    }
    if !where_parts.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&where_parts.join(" AND "));
    }
    sql.push_str(" ORDER BY created_at DESC LIMIT ");
    sql.push_str(&limit.to_string());

    let mut stmt = conn.prepare(&sql).map_err(|x| format!("prepare: {x}"))?;
    let mut out = Vec::new();

    let map_row = |r: &rusqlite::Row<'_>| {
        Ok(MeituanOrderRow {
            id: r.get(0)?,
            date_ymd: r.get(1)?,
            shift: r.get(2)?,
            employee: r.get(3)?,
            coupon_no: r.get(4)?,
            raw_text: r.get(5)?,
            amount: r.get(6)?,
            discount: r.get(7)?,
            financial: r.get(8)?,
            bar_total: r.get(9)?,
            created_at: r.get(10)?,
        })
    };

    if d.is_empty() && s.is_empty() && e.is_empty() {
        let rows = stmt.query_map([], map_row).map_err(|x| format!("query_map: {x}"))?;
        for r in rows {
            out.push(r.map_err(|x| format!("row: {x}"))?);
        }
        return Ok(out);
    }
    if !d.is_empty() && s.is_empty() && e.is_empty() {
        let rows = stmt.query_map([d], map_row).map_err(|x| format!("query_map: {x}"))?;
        for r in rows {
            out.push(r.map_err(|x| format!("row: {x}"))?);
        }
        return Ok(out);
    }
    if d.is_empty() && !s.is_empty() && e.is_empty() {
        let rows = stmt.query_map([s], map_row).map_err(|x| format!("query_map: {x}"))?;
        for r in rows {
            out.push(r.map_err(|x| format!("row: {x}"))?);
        }
        return Ok(out);
    }
    if d.is_empty() && s.is_empty() && !e.is_empty() {
        let rows = stmt.query_map([e], map_row).map_err(|x| format!("query_map: {x}"))?;
        for r in rows {
            out.push(r.map_err(|x| format!("row: {x}"))?);
        }
        return Ok(out);
    }
    if !d.is_empty() && !s.is_empty() && e.is_empty() {
        let rows = stmt.query_map([d, s], map_row).map_err(|x| format!("query_map: {x}"))?;
        for r in rows {
            out.push(r.map_err(|x| format!("row: {x}"))?);
        }
        return Ok(out);
    }
    if !d.is_empty() && s.is_empty() && !e.is_empty() {
        let rows = stmt.query_map([d, e], map_row).map_err(|x| format!("query_map: {x}"))?;
        for r in rows {
            out.push(r.map_err(|x| format!("row: {x}"))?);
        }
        return Ok(out);
    }
    if d.is_empty() && !s.is_empty() && !e.is_empty() {
        let rows = stmt.query_map([s, e], map_row).map_err(|x| format!("query_map: {x}"))?;
        for r in rows {
            out.push(r.map_err(|x| format!("row: {x}"))?);
        }
        return Ok(out);
    }

    let rows = stmt
        .query_map([d, s, e], map_row)
        .map_err(|x| format!("query_map: {x}"))?;
    for r in rows {
        out.push(r.map_err(|x| format!("row: {x}"))?);
    }
    Ok(out)
}

#[tauri::command]
fn accounting_entries_create_from_shift(
    app: tauri::AppHandle,
    input: AccountingEntriesCreateFromShiftInput,
) -> Result<usize, String> {
    let mut conn = open_db(&app)?;
    let now = now_ts()?;

    let date_ymd = input.date_ymd.trim().to_string();
    let shift = input.shift.trim().to_string();
    let employee = input.employee.trim().to_string();
    if date_ymd.is_empty() {
        return Err(String::from("date_ymd is empty"));
    }
    if shift.is_empty() {
        return Err(String::from("shift is empty"));
    }
    if employee.is_empty() {
        return Err(String::from("employee is empty"));
    }

    let tx = conn.transaction().map_err(|e| format!("tx: {e}"))?;
    let mut inserted: usize = 0;

    for it in input.expenses.into_iter() {
        let item = it.item.trim().to_string();
        if item.is_empty() {
            continue;
        }
        let id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO accounting_entries(
                id, date_ymd, shift, employee,
                entry_type, item, amount, bar_pay, finance_pay,
                created_at
             ) VALUES(
                ?1, ?2, ?3, ?4,
                ?5, ?6, ?7, ?8, ?9,
                ?10
             )",
            params![
                id,
                date_ymd,
                shift,
                employee,
                "expense",
                item,
                it.amount,
                it.bar_pay,
                it.finance_pay,
                now
            ],
        )
        .map_err(|e| format!("insert expense: {e}"))?;
        inserted += 1;
    }

    for it in input.incomes.into_iter() {
        let item = it.item.trim().to_string();
        if item.is_empty() {
            continue;
        }
        let id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO accounting_entries(
                id, date_ymd, shift, employee,
                entry_type, item, amount, bar_pay, finance_pay,
                created_at
             ) VALUES(
                ?1, ?2, ?3, ?4,
                ?5, ?6, ?7, ?8, ?9,
                ?10
             )",
            params![
                id,
                date_ymd,
                shift,
                employee,
                "income",
                item,
                it.amount,
                0.0_f64,
                0.0_f64,
                now
            ],
        )
        .map_err(|e| format!("insert income: {e}"))?;
        inserted += 1;
    }

    tx.commit().map_err(|e| format!("commit: {e}"))?;
    Ok(inserted)
}

#[tauri::command]
fn sales_order_create_from_shift(
    app: tauri::AppHandle,
    input: SalesOrderCreateFromShiftInput,
) -> Result<String, String> {
    let mut conn = open_db(&app)?;
    let now = now_ts()?;

    let date_ymd = input.date_ymd.trim().to_string();
    let shift = input.shift.trim().to_string();
    let employee = input.employee.trim().to_string();
    if date_ymd.is_empty() {
        return Err(String::from("date_ymd is empty"));
    }
    if shift.is_empty() {
        return Err(String::from("shift is empty"));
    }
    if employee.is_empty() {
        return Err(String::from("employee is empty"));
    }

    let order_id = Uuid::new_v4().to_string();
    let tx = conn.transaction().map_err(|e| format!("tx: {e}"))?;

    let mut total_revenue: f64 = 0.0;
    let mut total_profit: f64 = 0.0;

    for it in input.items.iter() {
        let name = it.product_name.trim();
        if name.is_empty() {
            continue;
        }
        let revenue = it.revenue.unwrap_or(0.0);
        total_revenue += revenue;

        // profit ≈ revenue - (sales_qty/spec)*cost_price
        let sales_qty = it.sales.unwrap_or(0.0);
        let spec = it.spec.unwrap_or(1.0);
        let cost_price = it.cost_price.unwrap_or(0.0);
        let qty = if spec.abs() < 1e-9 { sales_qty } else { sales_qty / spec };
        let cost_total = qty * cost_price;
        total_profit += revenue - cost_total;
    }

    tx.execute(
        "INSERT INTO sales_orders(id, date_ymd, shift, employee, total_revenue, total_profit, created_at, updated_at)\
         VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            order_id,
            date_ymd,
            shift,
            employee,
            total_revenue,
            total_profit,
            now,
            now
        ],
    )
    .map_err(|e| format!("insert order: {e}"))?;

    for it in input.items.into_iter() {
        let product_name = it.product_name.trim().to_string();
        if product_name.is_empty() {
            continue;
        }
        let id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO sales_items(
                id, order_id, product_name,
                original, restock, remaining,
                redeem, redeem_mode, loss, purchase,
                stock_prev, stock,
                sales, revenue,
                unit_price, cost_price, spec,
                created_at
             ) VALUES(
                ?1, ?2, ?3,
                ?4, ?5, ?6,
                ?7, ?8, ?9, ?10,
                ?11, ?12,
                ?13, ?14,
                ?15, ?16, ?17,
                ?18
             )",
            params![
                id,
                order_id,
                product_name,
                it.original,
                it.restock,
                it.remaining,
                it.redeem,
                it.redeem_mode,
                it.loss,
                it.purchase,
                it.stock_prev,
                it.stock,
                it.sales,
                it.revenue,
                it.unit_price,
                it.cost_price,
                it.spec,
                now
            ],
        )
        .map_err(|e| format!("insert item: {e}"))?;
    }

    tx.commit().map_err(|e| format!("commit: {e}"))?;
    Ok(order_id)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ShiftRecordInsertInput {
    date_ymd: String,
    shift: String,
    employee: String,
    wangfei: f64,
    shouhuo: f64,
    meituan: f64,
    zhichu: f64,
    #[serde(default)]
    income: f64,
    yingjiao: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SalesItemSnapshotInput {
    product_name: String,
    original: Option<f64>,
    restock: Option<f64>,
    remaining: Option<f64>,
    redeem: Option<f64>,
    redeem_mode: Option<i64>,
    loss: Option<f64>,
    purchase: Option<f64>,
    stock_prev: Option<f64>,
    stock: Option<f64>,
    sales: Option<f64>,
    revenue: Option<f64>,
    unit_price: Option<f64>,
    cost_price: Option<f64>,
    spec: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SalesOrderCreateFromShiftInput {
    date_ymd: String,
    shift: String,
    employee: String,
    items: Vec<SalesItemSnapshotInput>,
}

#[derive(Debug, serde::Deserialize)]
struct PosCheckoutItem {
    product_id: String,
    quantity: f64,
}

#[derive(Debug, serde::Deserialize)]
struct PosCheckoutInput {
    token: String,
    date_ymd: String,
    shift: String,
    employee: String,
    items: Vec<PosCheckoutItem>,
}

#[tauri::command]
fn pos_checkout(app: tauri::AppHandle, input: PosCheckoutInput) -> Result<String, String> {
    let mut conn = open_db(&app)?;
    let now = now_ts()?;
    
    // Auth check - simplified for now, as long as token is valid
    let _actor_id = auth_resolve_account_id(&input.token).ok_or_else(|| String::from("unauthorized"))?;

    let tx = conn.transaction().map_err(|e| format!("tx: {e}"))?;
    let order_id = Uuid::new_v4().to_string();
    
    let mut total_revenue: f64 = 0.0;
    let mut total_profit: f64 = 0.0;

    for it in input.items.iter() {
        // Fetch product info
        let product: ProductRow = tx.query_row(
            "SELECT id, name, category, unit_price, cost_price, spec, on_shelf, stock, is_active 
             FROM products WHERE id = ?1",
            params![it.product_id],
            |r| Ok(ProductRow {
                id: r.get(0)?,
                name: r.get(1)?,
                category: r.get(2)?,
                unit_price: r.get(3)?,
                cost_price: r.get(4)?,
                spec: r.get(5)?,
                on_shelf: r.get(6)?,
                stock: r.get(7)?,
                is_active: r.get::<_, i64>(8)? != 0,
            }),
        ).map_err(|_| format!("product_not_found: {}", it.product_id))?;

        let revenue = product.unit_price * it.quantity;
        let cost = (it.quantity / product.spec) * product.cost_price;
        
        total_revenue += revenue;
        total_profit += revenue - cost;

        // Update Stock
        tx.execute(
            "UPDATE products SET stock = stock - ?1, updated_at = ?2 WHERE id = ?3",
            params![it.quantity, now, it.product_id]
        ).map_err(|e| format!("update_stock: {e}"))?;

        // Insert Sales Item
        let item_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO sales_items(
                id, order_id, product_name, 
                sales, revenue, unit_price, cost_price, spec, created_at
            ) VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                item_id, order_id, product.name,
                it.quantity, revenue, product.unit_price, product.cost_price, product.spec, now
            ]
        ).map_err(|e| format!("insert_item: {e}"))?;
    }

    // Insert Sales Order
    tx.execute(
        "INSERT INTO sales_orders(id, date_ymd, shift, employee, total_revenue, total_profit, created_at, updated_at)
         VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            order_id, input.date_ymd, input.shift, input.employee,
            total_revenue, total_profit, now, now
        ]
    ).map_err(|e| format!("insert_order: {e}"))?;

    tx.commit().map_err(|e| format!("commit: {e}"))?;
    Ok(order_id)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AccountingExpenseItemInput {
    item: String,
    amount: f64,
    bar_pay: f64,
    finance_pay: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AccountingIncomeItemInput {
    item: String,
    amount: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AccountingEntriesCreateFromShiftInput {
    date_ymd: String,
    shift: String,
    employee: String,
    expenses: Vec<AccountingExpenseItemInput>,
    incomes: Vec<AccountingIncomeItemInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct MeituanOrderImportItem {
    date_ymd: String,
    shift: String,
    employee: String,
    coupon_no: Option<String>,
    raw_text: String,
    amount: f64,
    discount: f64,
    financial: f64,
    bar_total: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct MeituanOrdersImportInput {
    items: Vec<MeituanOrderImportItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ShiftRecordRow {
    id: String,
    date_ymd: String,
    shift: String,
    employee: String,
    wangfei: f64,
    shouhuo: f64,
    meituan: f64,
    zhichu: f64,
    income: f64,
    yingjiao: f64,
    created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SalesOrderRow {
    id: String,
    date_ymd: String,
    shift: String,
    employee: String,
    total_revenue: f64,
    total_profit: f64,
    created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SalesItemRow {
    id: String,
    order_id: String,
    product_name: String,
    original: Option<f64>,
    restock: Option<f64>,
    remaining: Option<f64>,
    redeem: Option<f64>,
    redeem_mode: Option<i64>,
    loss: Option<f64>,
    purchase: Option<f64>,
    stock_prev: Option<f64>,
    stock: Option<f64>,
    sales: Option<f64>,
    revenue: Option<f64>,
    unit_price: Option<f64>,
    cost_price: Option<f64>,
    spec: Option<f64>,
    created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AccountingEntryRow {
    id: String,
    date_ymd: String,
    shift: String,
    employee: String,
    entry_type: String,
    item: String,
    amount: f64,
    bar_pay: f64,
    finance_pay: f64,
    created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct MeituanOrderRow {
    id: String,
    date_ymd: String,
    shift: String,
    employee: String,
    coupon_no: Option<String>,
    raw_text: String,
    amount: f64,
    discount: f64,
    financial: f64,
    bar_total: f64,
    created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct MigrationStats {
    source_key: String,
    total: usize,
    imported: usize,
    skipped: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ShiftSnapshotInsertInput {
    shift_record_id: String,
    date_ymd: String,
    shift: String,
    employee: String,
    html: String,
    sha256: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ShiftSnapshotRow {
    id: String,
    shift_record_id: String,
    date_ymd: String,
    shift: String,
    employee: String,
    html: String,
    sha256: String,
    created_at: i64,
}

pub fn open_db(app: &tauri::AppHandle) -> Result<Connection, String> {
    let path = db_path(app)?;
    let conn = Connection::open(path).map_err(|e| format!("open db: {e}"))?;
    conn.execute_batch(
        "PRAGMA journal_mode=WAL;\
         PRAGMA synchronous=NORMAL;\
         CREATE TABLE IF NOT EXISTS auth_accounts (\
           id TEXT PRIMARY KEY NOT NULL,\
           pick_name TEXT NOT NULL,\
           pass_salt TEXT NOT NULL,\
           pass_hash TEXT NOT NULL,\
           role TEXT NOT NULL,\
           identity TEXT NOT NULL,\
           display_name TEXT NOT NULL,\
           equity REAL NOT NULL DEFAULT 0,\
           is_active INTEGER NOT NULL DEFAULT 1,\
           created_at INTEGER NOT NULL,\
           updated_at INTEGER NOT NULL\
         );\
         CREATE INDEX IF NOT EXISTS idx_auth_accounts_pick ON auth_accounts(pick_name);\
         CREATE TABLE IF NOT EXISTS employees (\
           id TEXT PRIMARY KEY NOT NULL,\
           name TEXT NOT NULL UNIQUE,\
           sort_order INTEGER NOT NULL DEFAULT 0,\
           is_active INTEGER NOT NULL DEFAULT 1,\
           created_at INTEGER NOT NULL,\
           updated_at INTEGER NOT NULL\
         );\
         CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(is_active, sort_order);\
         CREATE TABLE IF NOT EXISTS kv (\
           k TEXT PRIMARY KEY NOT NULL,\
           v TEXT NOT NULL,\
           updated_at INTEGER NOT NULL\
         );\
         CREATE TABLE IF NOT EXISTS products (\
           id TEXT PRIMARY KEY NOT NULL,\
           name TEXT NOT NULL UNIQUE,\
           category TEXT NOT NULL DEFAULT '饮品',\
           unit_price REAL NOT NULL DEFAULT 0,\
           cost_price REAL NOT NULL DEFAULT 0,\
           spec REAL NOT NULL DEFAULT 0,\
           on_shelf REAL NOT NULL DEFAULT 0,\
           stock REAL NOT NULL DEFAULT 0,\
           is_active INTEGER NOT NULL DEFAULT 1,\
           created_at INTEGER NOT NULL,\
           updated_at INTEGER NOT NULL\
         );\
         CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);\
         CREATE TABLE IF NOT EXISTS sales_orders (\
           id TEXT PRIMARY KEY NOT NULL,\
           date_ymd TEXT NOT NULL,\
           shift TEXT NOT NULL,\
           employee TEXT NOT NULL,\
           total_revenue REAL NOT NULL DEFAULT 0,\
           total_profit REAL NOT NULL DEFAULT 0,\
           created_at INTEGER NOT NULL,\
           updated_at INTEGER NOT NULL\
         );\
         CREATE INDEX IF NOT EXISTS idx_sales_orders_date ON sales_orders(date_ymd);\
         CREATE TABLE IF NOT EXISTS sales_items (\
           id TEXT PRIMARY KEY NOT NULL,\
           order_id TEXT NOT NULL,\
           product_name TEXT NOT NULL,\
           original REAL,\
           restock REAL,\
           remaining REAL,\
           redeem REAL,\
           redeem_mode INTEGER,\
           loss REAL,\
           purchase REAL,\
           stock_prev REAL,\
           stock REAL,\
           sales REAL,\
           revenue REAL,\
           unit_price REAL,\
           cost_price REAL,\
           spec REAL,\
           created_at INTEGER NOT NULL\
         );\
         CREATE INDEX IF NOT EXISTS idx_sales_items_order ON sales_items(order_id);\
         CREATE TABLE IF NOT EXISTS accounting_entries (\
           id TEXT PRIMARY KEY NOT NULL,\
           date_ymd TEXT NOT NULL,\
           shift TEXT NOT NULL,\
           employee TEXT NOT NULL,\
           entry_type TEXT NOT NULL,\
           item TEXT NOT NULL,\
           amount REAL NOT NULL DEFAULT 0,\
           bar_pay REAL NOT NULL DEFAULT 0,\
           finance_pay REAL NOT NULL DEFAULT 0,\
           created_at INTEGER NOT NULL\
         );\
         CREATE INDEX IF NOT EXISTS idx_accounting_date ON accounting_entries(date_ymd);\
         CREATE TABLE IF NOT EXISTS meituan_orders (\
           id TEXT PRIMARY KEY NOT NULL,\
           date_ymd TEXT NOT NULL,\
           shift TEXT NOT NULL,\
           employee TEXT NOT NULL,\
           coupon_no TEXT,\
           raw_text TEXT NOT NULL,\
           amount REAL NOT NULL DEFAULT 0,\
           discount REAL NOT NULL DEFAULT 0,\
           financial REAL NOT NULL DEFAULT 0,\
           bar_total REAL NOT NULL DEFAULT 0,\
           created_at INTEGER NOT NULL\
         );\
         CREATE INDEX IF NOT EXISTS idx_meituan_date ON meituan_orders(date_ymd);\
         CREATE INDEX IF NOT EXISTS idx_meituan_coupon ON meituan_orders(coupon_no);\
         CREATE UNIQUE INDEX IF NOT EXISTS ux_meituan_coupon_no ON meituan_orders(coupon_no) WHERE coupon_no IS NOT NULL AND coupon_no != '';\
         CREATE UNIQUE INDEX IF NOT EXISTS ux_meituan_date_raw ON meituan_orders(date_ymd, raw_text);\
         CREATE TABLE IF NOT EXISTS shift_records (\
           id TEXT PRIMARY KEY NOT NULL,\
           date_ymd TEXT NOT NULL,\
           shift TEXT NOT NULL,\
           employee TEXT NOT NULL,\
           wangfei REAL NOT NULL DEFAULT 0,\
           shouhuo REAL NOT NULL DEFAULT 0,\
           meituan REAL NOT NULL DEFAULT 0,\
           zhichu REAL NOT NULL DEFAULT 0,\
           income REAL NOT NULL DEFAULT 0,\
           yingjiao REAL NOT NULL DEFAULT 0,\
           created_at INTEGER NOT NULL\
         );\
         CREATE INDEX IF NOT EXISTS idx_shift_records_date ON shift_records(date_ymd);\
         CREATE TABLE IF NOT EXISTS shift_snapshots (\
           id TEXT PRIMARY KEY NOT NULL,\
           shift_record_id TEXT NOT NULL UNIQUE,\
           date_ymd TEXT NOT NULL,\
           shift TEXT NOT NULL,\
           employee TEXT NOT NULL,\
           html TEXT NOT NULL,\
           sha256 TEXT NOT NULL,\
           created_at INTEGER NOT NULL\
         );\
         CREATE INDEX IF NOT EXISTS idx_shift_snapshots_date ON shift_snapshots(date_ymd);",
    )
    .map_err(|e| format!("init db: {e}"))?;

    let now = now_ts()?;
    ensure_auth_seed(&conn, now)?;
    ensure_employees_seed(&conn, now)?;
    ensure_products_seed(&conn, now)?;

    // Schema upgrade: ensure old DBs get the new column
    conn.execute_batch("ALTER TABLE shift_records ADD COLUMN income REAL NOT NULL DEFAULT 0;")
        .ok();
    conn.execute_batch("ALTER TABLE products ADD COLUMN category TEXT NOT NULL DEFAULT '饮品';")
        .ok();
    Ok(conn)
}

fn sha256_hex(s: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(s.as_bytes());
    let out = hasher.finalize();
    let mut hex = String::with_capacity(out.len() * 2);
    for b in out {
        hex.push_str(&format!("{:02x}", b));
    }
    hex
}

fn pass_hash(salt: &str, password: &str) -> String {
    sha256_hex(&format!("{salt}:{password}"))
}

fn ensure_auth_seed(conn: &Connection, now: i64) -> Result<(), String> {
    let seeds: Vec<(&str, &str, &str, &str, &str, f64)> = vec![
        ("莫健", "laoban", "boss", "shareholder", "莫健", 20.0),
        ("莫健", "chaoguan", "admin", "admin", "莫健", 20.0),
        ("莫健", "cuiguoli", "boss", "shareholder", "崔国丽", 15.0),
        ("莫健", "luqiumian", "boss", "shareholder", "路秋勉", 12.0),
        ("莫健", "caomengsi", "boss", "shareholder", "曹梦思", 4.0),
        ("朱晓培", "zhuxiaopei", "boss", "shareholder", "朱晓培", 49.0),
    ];

    for (pick_name, password, role, identity, display_name, equity) in seeds.into_iter() {
        let exists: i64 = conn
            .query_row(
                "SELECT COUNT(1) FROM auth_accounts WHERE pick_name = ?1 AND identity = ?2 AND display_name = ?3",
                params![pick_name, identity, display_name],
                |r| r.get(0),
            )
            .map_err(|e| format!("seed auth_accounts exists: {e}"))?;

        if exists > 0 {
            continue;
        }

        let id = Uuid::new_v4().to_string();
        let salt = Uuid::new_v4().to_string();
        let hash = pass_hash(&salt, password);
        conn.execute(
            "INSERT INTO auth_accounts(
                id, pick_name, pass_salt, pass_hash,
                role, identity, display_name, equity,
                is_active, created_at, updated_at
             ) VALUES(
                ?1, ?2, ?3, ?4,
                ?5, ?6, ?7, ?8,
                1, ?9, ?10
             )",
            params![
                id,
                pick_name,
                salt,
                hash,
                role,
                identity,
                display_name,
                equity,
                now,
                now
            ],
        )
        .map_err(|e| format!("seed auth_accounts insert: {e}"))?;
    }
    Ok(())
}

fn ensure_employees_seed(conn: &Connection, now: i64) -> Result<(), String> {
    let count: i64 = conn
        .query_row("SELECT COUNT(1) FROM employees", [], |r| r.get(0))
        .map_err(|e| format!("employees count: {e}"))?;
    if count > 0 {
        return Ok(());
    }

    let seeds: Vec<(&str, i64)> = vec![
        ("黄河", 1),
        ("刘杰", 2),
        ("贾政华", 3),
        ("秦佳", 4),
        ("史红", 5),
    ];

    for (name, sort_order) in seeds.into_iter() {
        let id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO employees(id, name, sort_order, is_active, created_at, updated_at) VALUES(?1, ?2, ?3, 1, ?4, ?5)",
            params![id, name, sort_order, now, now],
        )
        .map_err(|e| format!("seed employees: {e}"))?;
    }
    Ok(())
}

fn ensure_products_seed(conn: &Connection, now: i64) -> Result<(), String> {
    let count: i64 = conn
        .query_row("SELECT COUNT(1) FROM products", [], |r| r.get(0))
        .map_err(|e| format!("products count: {e}"))?;
    if count > 0 {
        return Ok(());
    }

    // (name, original, stock, price, spec, category)
    // Note: User provided "Original", "Stock", "Price", "Spec".
    // We map "Stock" to `stock` column. "Price" to `unit_price`. "Spec" to `spec`.
    // "Original" is not a standard column in products table usually (it's snapshot data), 
    // but maybe we can put it in `stock_prev` or just ignore if it's not needed for current operations.
    // However, the products table schema has `cost_price`, `spec`, `on_shelf`, `stock`.
    // We will assume `on_shelf` = `stock` for initialization or just 0.
    // Category is inferred or default.
    let seeds: Vec<(&str, f64, f64, f64, f64, &str)> = vec![
        ("百岁山", 27.0, 7.0, 3.0, 24.0, "饮品"),
        ("可口可乐", 28.0, 1.0, 3.0, 24.0, "饮品"),
        ("中瓶/冰茶", 40.0, 50.0, 5.0, 12.0, "饮品"),
        ("阿萨姆", 15.0, 5.0, 5.0, 15.0, "饮品"),
        ("营养快线", 20.0, 9.0, 5.0, 15.0, "饮品"),
        ("脉动", 9.0, 9.0, 5.0, 15.0, "饮品"),
        ("红牛", 16.0, 6.0, 6.0, 24.0, "饮品"),
        ("毛峰", 11.0, 4.0, 6.0, 12.0, "饮品"),
        ("乐虎", 17.0, 9.0, 6.0, 24.0, "饮品"),
        ("大补水", 10.0, 9.0, 6.0, 12.0, "饮品"),
        ("东鹏", 13.0, 6.0, 6.0, 24.0, "饮品"),
        ("咖啡", 4.0, 2.0, 8.0, 15.0, "饮品"),
        ("东方树叶", 20.0, 9.0, 8.0, 12.0, "饮品"),
        ("桶装泡面", 14.0, 143.0, 6.0, 1.0, "食品"),
        ("袋装泡面", 2.0, 155.0, 5.0, 1.0, "食品"),
        ("纸巾", 27.0, 312.0, 1.0, 1.0, "日用"),
        ("约辣", 15.0, 90.0, 1.0, 1.0, "食品"),
        ("豆干", 12.0, 80.0, 1.5, 1.0, "食品"),
        ("干吃面", 33.0, 5.0, 1.5, 30.0, "食品"),
        ("小火腿", 8.0, 3.0, 1.0, 50.0, "食品"),
        ("卤蛋", 11.0, 27.0, 2.0, 1.0, "食品"),
        ("自热火锅", 5.0, 4.0, 15.0, 1.0, "食品"),
        ("大火腿", 43.0, 3.0, 3.0, 50.0, "食品"),
        ("鸡蛋", 1.0, 0.0, 3.5, 1.0, "食品"),
        ("大辣条", 11.0, 85.0, 4.0, 1.0, "食品"),
        ("口味王10", 0.0, 0.0, 10.0, 1.0, "槟榔"),
        ("口味王15", 0.0, 0.0, 15.0, 1.0, "槟榔"),
        ("口味王30", 13.0, 10.0, 30.0, 1.0, "槟榔"),
        ("口味王50", 8.0, 2.0, 50.0, 1.0, "槟榔"),
        ("口味王100", 2.0, 0.0, 100.0, 1.0, "槟榔"),
        ("锅巴", 13.0, 45.0, 3.0, 1.0, "食品"),
        ("酸辣粉", 4.0, 26.0, 7.0, 1.0, "食品"),
        ("四联玉米肠", 7.0, 46.0, 5.0, 1.0, "食品"),
        ("奶茶", 11.0, 12.0, 5.0, 1.0, "饮品"),
    ];

    for (name, _, stock, price, spec, category) in seeds.into_iter() {
        let id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO products(
                id, name, category, unit_price, cost_price, spec,
                on_shelf, stock, is_active, created_at, updated_at
             ) VALUES(
                ?1, ?2, ?3, ?4, ?5, ?6,
                ?7, ?8, 1, ?9, ?10
             )",
            params![
                id, name, category, price, 0.0, spec,
                stock, stock, // on_shelf init same as stock
                now, now
            ],
        )
        .map_err(|e| format!("seed products: {e}"))?;
    }
    Ok(())
}

#[tauri::command]
fn auth_login(app: tauri::AppHandle, input: AuthLoginInput) -> Result<AuthSession, String> {
    let conn = open_db(&app)?;
    let pick_name = input.pick_name.trim().to_string();
    let pick_name_q = pick_name.clone();
    let password = input.password.trim().to_string();
    println!(
        "[auth_login] pick_name='{}' password_len={}",
        pick_name,
        password.len()
    );
    if pick_name.is_empty() || password.is_empty() {
        return Err(format!(
            "invalid:pick_name_len={} password_len={}",
            pick_name.len(),
            password.len()
        ));
    }

    let mut stmt = conn
        .prepare(
            "SELECT pass_salt, pass_hash, role, identity, display_name, equity
             FROM auth_accounts
             WHERE pick_name = ?1 AND is_active = 1",
        )
        .map_err(|e| format!("prepare auth_login: {e}"))?;

    let mut rows = stmt
        .query([pick_name_q])
        .map_err(|e| format!("query auth_login: {e}"))?;

    let mut matched_any = false;

    while let Some(row) = rows.next().map_err(|e| format!("next auth_login: {e}"))? {
        matched_any = true;
        let salt: String = row.get(0).map_err(|e| format!("get salt: {e}"))?;
        let hash_db: String = row.get(1).map_err(|e| format!("get hash: {e}"))?;
        let hash_in = pass_hash(&salt, &password);
        if hash_in == hash_db {
            let role: String = row.get(2).map_err(|e| format!("get role: {e}"))?;
            let identity: String = row.get(3).map_err(|e| format!("get identity: {e}"))?;
            let name: String = row.get(4).map_err(|e| format!("get name: {e}"))?;
            let equity: f64 = row.get(5).map_err(|e| format!("get equity: {e}"))?;

            let token = Uuid::new_v4().to_string();
            let mut map = auth_sessions().lock().map_err(|_| String::from("lock"))?;
            map.insert(token.clone(), String::new());
            drop(map);

            // resolve account_id for this matched row
            let account_id: Option<String> = conn
                .query_row(
                    "SELECT id FROM auth_accounts WHERE pick_name = ?1 AND pass_salt = ?2 AND pass_hash = ?3 LIMIT 1",
                    params![pick_name, salt, hash_db],
                    |r| r.get(0),
                )
                .optional()
                .map_err(|e| format!("query account_id: {e}"))?;
            let account_id = account_id.unwrap_or_else(|| String::new());

            let mut map = auth_sessions().lock().map_err(|_| String::from("lock"))?;
            map.insert(token.clone(), account_id.clone());

            return Ok(AuthSession {
                account_id,
                role,
                identity,
                name,
                equity,
                token,
            });
        }
    }

    if !matched_any {
        return Err(format!("no_account:{pick_name}"));
    }
    Err(String::from("bad_password"))
}

#[tauri::command]
fn auth_employee_login(app: tauri::AppHandle, pick_name: String) -> Result<AuthSession, String> {
    let conn = open_db(&app)?;
    let name = pick_name.trim().to_string();
    if name.is_empty() {
        return Err(String::from("invalid"));
    }
    let exists: Option<String> = conn
        .query_row(
            "SELECT id FROM employees WHERE name = ?1 AND is_active = 1 LIMIT 1",
            [name.clone()],
            |r| r.get(0),
        )
        .optional()
        .map_err(|e| format!("employees query: {e}"))?;
    let account_id = exists.ok_or_else(|| String::from("unauthorized"))?;

    let token = Uuid::new_v4().to_string();
    let mut map = auth_sessions().lock().map_err(|_| String::from("lock"))?;
    map.insert(token.clone(), account_id.clone());

    Ok(AuthSession {
        account_id,
        role: String::from("employee"),
        identity: String::from("employee"),
        name,
        equity: 0.0,
        token,
    })
}

#[tauri::command]
fn auth_pick_list(app: tauri::AppHandle) -> Result<AuthPickList, String> {
    let conn = open_db(&app)?;

    let mut employees: Vec<String> = Vec::new();
    let mut stmt = conn
        .prepare("SELECT name FROM employees WHERE is_active = 1 ORDER BY sort_order ASC, name ASC")
        .map_err(|e| format!("prepare employees: {e}"))?;
    let rows = stmt
        .query_map([], |r| r.get::<_, String>(0))
        .map_err(|e| format!("query employees: {e}"))?;
    for r in rows {
        employees.push(r.map_err(|e| format!("row employees: {e}"))?);
    }

    let mut bosses: Vec<String> = Vec::new();
    let mut stmt = conn
        .prepare("SELECT DISTINCT pick_name FROM auth_accounts WHERE is_active = 1 ORDER BY pick_name ASC")
        .map_err(|e| format!("prepare bosses: {e}"))?;
    let rows = stmt
        .query_map([], |r| r.get::<_, String>(0))
        .map_err(|e| format!("query bosses: {e}"))?;
    for r in rows {
        bosses.push(r.map_err(|e| format!("row bosses: {e}"))?);
    }

    Ok(AuthPickList { employees, bosses })
}

#[tauri::command]
fn auth_accounts_list(app: tauri::AppHandle, token: String) -> Result<Vec<AuthAccountRow>, String> {
    let conn = open_db(&app)?;
    let token = token.trim().to_string();
    let actor_id = auth_resolve_account_id(&token).ok_or_else(|| String::from("unauthorized"))?;

    let actor: Option<(String, String)> = conn
        .query_row(
            "SELECT role, display_name FROM auth_accounts WHERE id = ?1",
            [actor_id.clone()],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .optional()
        .map_err(|e| format!("actor query: {e}"))?;
    let (actor_role, actor_name) = actor.ok_or_else(|| String::from("unauthorized"))?;

    let sql = if actor_role == "admin" {
        "SELECT id, pick_name, display_name, role, identity, equity, is_active FROM auth_accounts ORDER BY pick_name ASC, display_name ASC"
            .to_string()
    } else {
        "SELECT id, pick_name, display_name, role, identity, equity, is_active FROM auth_accounts WHERE id = ?1 ORDER BY pick_name ASC, display_name ASC"
            .to_string()
    };

    let mut out: Vec<AuthAccountRow> = Vec::new();
    if actor_role == "admin" {
        let mut stmt = conn.prepare(&sql).map_err(|e| format!("prepare: {e}"))?;
        let rows = stmt
            .query_map([], |r| {
                Ok(AuthAccountRow {
                    id: r.get(0)?,
                    pick_name: r.get(1)?,
                    display_name: r.get(2)?,
                    role: r.get(3)?,
                    identity: r.get(4)?,
                    equity: r.get(5)?,
                    is_active: r.get::<_, i64>(6)? != 0,
                })
            })
            .map_err(|e| format!("query_map: {e}"))?;
        for r in rows {
            out.push(r.map_err(|e| format!("row: {e}"))?);
        }
    } else {
        let mut stmt = conn.prepare(&sql).map_err(|e| format!("prepare: {e}"))?;
        let rows = stmt
            .query_map([actor_id], |r| {
                Ok(AuthAccountRow {
                    id: r.get(0)?,
                    pick_name: r.get(1)?,
                    display_name: r.get(2)?,
                    role: r.get(3)?,
                    identity: r.get(4)?,
                    equity: r.get(5)?,
                    is_active: r.get::<_, i64>(6)? != 0,
                })
            })
            .map_err(|e| format!("query_map: {e}"))?;
        for r in rows {
            out.push(r.map_err(|e| format!("row: {e}"))?);
        }
    }
    if actor_role != "admin" {
        // sanity: ensure boss cannot see others even if DB is corrupted
        out.retain(|x| x.display_name == actor_name);
    }
    Ok(out)
}

#[tauri::command]
fn auth_set_password(app: tauri::AppHandle, input: AuthSetPasswordInput) -> Result<(), String> {
    let conn = open_db(&app)?;
    let token = input.token.trim().to_string();
    let actor_id = auth_resolve_account_id(&token).ok_or_else(|| String::from("unauthorized"))?;

    let actor: Option<String> = conn
        .query_row("SELECT role FROM auth_accounts WHERE id = ?1", [actor_id.clone()], |r| r.get(0))
        .optional()
        .map_err(|e| format!("actor role: {e}"))?;
    let actor_role = actor.ok_or_else(|| String::from("unauthorized"))?;

    let id = input.id.trim().to_string();
    let p = input.new_password.trim().to_string();
    if id.is_empty() || p.is_empty() {
        return Err(String::from("invalid"));
    }

    if actor_role != "admin" && actor_id != id {
        return Err(String::from("unauthorized"));
    }

    let now = now_ts()?;
    let salt = Uuid::new_v4().to_string();
    let hash = pass_hash(&salt, &p);
    let n = conn
        .execute(
            "UPDATE auth_accounts SET pass_salt = ?2, pass_hash = ?3, updated_at = ?4 WHERE id = ?1",
            params![id, salt, hash, now],
        )
        .map_err(|e| format!("update auth_accounts: {e}"))?;
    if n == 0 {
        return Err(String::from("not_found"));
    }
    Ok(())
}

#[tauri::command]
fn employees_list(app: tauri::AppHandle, token: String) -> Result<Vec<EmployeeRow>, String> {
    let conn = open_db(&app)?;
    let _actor_id = require_admin(&conn, token.trim())?;

    let mut out: Vec<EmployeeRow> = Vec::new();
    let mut stmt = conn
        .prepare("SELECT id, name, sort_order, is_active FROM employees ORDER BY sort_order ASC, name ASC")
        .map_err(|e| format!("prepare employees_list: {e}"))?;
    let rows = stmt
        .query_map([], |r| {
            Ok(EmployeeRow {
                id: r.get(0)?,
                name: r.get(1)?,
                sort_order: r.get(2)?,
                is_active: r.get::<_, i64>(3)? != 0,
            })
        })
        .map_err(|e| format!("query_map employees_list: {e}"))?;
    for r in rows {
        out.push(r.map_err(|e| format!("row employees_list: {e}"))?);
    }
    Ok(out)
}

#[tauri::command]
fn employee_upsert(app: tauri::AppHandle, input: EmployeeUpsertInput) -> Result<String, String> {
    let conn = open_db(&app)?;
    let _actor_id = require_admin(&conn, input.token.trim())?;

    let name = input.name.trim().to_string();
    if name.is_empty() {
        return Err(String::from("invalid"));
    }
    let sort_order = input.sort_order.unwrap_or(0);
    let is_active = input.is_active.unwrap_or(true);
    let now = now_ts()?;

    let id = input.id.unwrap_or_default().trim().to_string();
    if id.is_empty() {
        let id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO employees(id, name, sort_order, is_active, created_at, updated_at) VALUES(?1, ?2, ?3, ?4, ?5, ?6)",
            params![id, name, sort_order, if is_active { 1 } else { 0 }, now, now],
        )
        .map_err(|e| format!("insert employees: {e}"))?;
        return Ok(id);
    }

    let n = conn
        .execute(
            "UPDATE employees SET name = ?2, sort_order = ?3, is_active = ?4, updated_at = ?5 WHERE id = ?1",
            params![id, name, sort_order, if is_active { 1 } else { 0 }, now],
        )
        .map_err(|e| format!("update employees: {e}"))?;
    if n == 0 {
        return Err(String::from("not_found"));
    }
    Ok(id)
}

#[tauri::command]
fn employee_set_active(app: tauri::AppHandle, input: EmployeeSetActiveInput) -> Result<(), String> {
    let conn = open_db(&app)?;
    let _actor_id = require_admin(&conn, input.token.trim())?;
    let id = input.id.trim().to_string();
    if id.is_empty() {
        return Err(String::from("invalid"));
    }
    let now = now_ts()?;
    let n = conn
        .execute(
            "UPDATE employees SET is_active = ?2, updated_at = ?3 WHERE id = ?1",
            params![id, if input.is_active { 1 } else { 0 }, now],
        )
        .map_err(|e| format!("update employees: {e}"))?;
    if n == 0 {
        return Err(String::from("not_found"));
    }
    Ok(())
}

#[tauri::command]
fn auth_account_set_active(app: tauri::AppHandle, input: AuthAccountSetActiveInput) -> Result<(), String> {
    let conn = open_db(&app)?;
    let _actor_id = require_admin(&conn, input.token.trim())?;
    let id = input.id.trim().to_string();
    if id.is_empty() {
        return Err(String::from("invalid"));
    }
    let now = now_ts()?;
    let n = conn
        .execute(
            "UPDATE auth_accounts SET is_active = ?2, updated_at = ?3 WHERE id = ?1",
            params![id, if input.is_active { 1 } else { 0 }, now],
        )
        .map_err(|e| format!("update auth_accounts: {e}"))?;
    if n == 0 {
        return Err(String::from("not_found"));
    }
    Ok(())
}

#[tauri::command]
fn meituan_orders_import(app: tauri::AppHandle, input: MeituanOrdersImportInput) -> Result<usize, String> {
    let mut conn = open_db(&app)?;
    let now = now_ts()?;
    let tx = conn.transaction().map_err(|e| format!("tx: {e}"))?;
    let mut inserted: usize = 0;

    for it in input.items.into_iter() {
        let date_ymd = it.date_ymd.trim().to_string();
        let shift = it.shift.trim().to_string();
        let employee = it.employee.trim().to_string();
        let raw_text = it.raw_text.trim().to_string();
        let coupon_no = it.coupon_no.map(|s| s.trim().to_string()).filter(|s| !s.is_empty());

        if date_ymd.is_empty() || shift.is_empty() || employee.is_empty() || raw_text.is_empty() {
            continue;
        }

        let id = Uuid::new_v4().to_string();
        let n = tx
            .execute(
                "INSERT OR IGNORE INTO meituan_orders(
                    id, date_ymd, shift, employee,
                    coupon_no, raw_text,
                    amount, discount, financial, bar_total,
                    created_at
                 ) VALUES(
                    ?1, ?2, ?3, ?4,
                    ?5, ?6,
                    ?7, ?8, ?9, ?10,
                    ?11
                 )",
                params![
                    id,
                    date_ymd,
                    shift,
                    employee,
                    coupon_no,
                    raw_text,
                    it.amount,
                    it.discount,
                    it.financial,
                    it.bar_total,
                    now
                ],
            )
            .map_err(|e| format!("insert: {e}"))?;
        inserted += n as usize;
    }

    tx.commit().map_err(|e| format!("commit: {e}"))?;
    Ok(inserted)
}

pub fn now_ts() -> Result<i64, String> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| format!("time: {e}"))?
        .as_secs() as i64;
    Ok(now)
}

pub fn now_ymd() -> Result<String, String> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| format!("time: {e}"))?;
    let secs = now.as_secs() as i64;
    let days = secs / 86400;
    // 简单计算日期（基准：1970-01-01）
    let year = 1970 + days / 365;
    let remainder = days % 365;
    let month = 1 + remainder / 30;
    let day = 1 + remainder % 30;
    Ok(format!("{:04}-{:02}-{:02}", year, month, day))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductRow {
    id: String,
    name: String,
    category: String,
    unit_price: f64,
    cost_price: f64,
    spec: f64,
    on_shelf: f64,
    stock: f64,
    is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ProductUpsertInput {
    id: Option<String>,
    name: String,
    category: Option<String>,
    unit_price: f64,
    cost_price: f64,
    spec: f64,
    on_shelf: f64,
    stock: f64,
    is_active: bool,
}

#[tauri::command]
fn kv_get(app: tauri::AppHandle, key: String) -> Result<Option<Value>, String> {
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
fn kv_set(app: tauri::AppHandle, key: String, value: Value) -> Result<(), String> {
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
fn kv_remove(app: tauri::AppHandle, key: String) -> Result<(), String> {
    let conn = open_db(&app)?;
    conn.execute("DELETE FROM kv WHERE k = ?1", [key])
        .map_err(|e| format!("execute: {e}"))?;
    Ok(())
}

#[tauri::command]
fn kv_dump(app: tauri::AppHandle) -> Result<serde_json::Map<String, Value>, String> {
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

#[tauri::command]
fn products_list(app: tauri::AppHandle, q: Option<String>, include_inactive: Option<bool>) -> Result<Vec<ProductRow>, String> {
    products_list_internal(app, q, include_inactive)
}

// Public wrapper for HTTP API
pub fn products_list_internal(app: tauri::AppHandle, q: Option<String>, include_inactive: Option<bool>) -> Result<Vec<ProductRow>, String> {
    let conn = open_db(&app)?;
    let qn = q.unwrap_or_default().trim().to_lowercase();
    let include_inactive = include_inactive.unwrap_or(false);

    fn map_product_row(r: &rusqlite::Row<'_>) -> rusqlite::Result<ProductRow> {
        Ok(ProductRow {
            id: r.get(0)?,
            name: r.get(1)?,
            category: r.get(2)?,
            unit_price: r.get(3)?,
            cost_price: r.get(4)?,
            spec: r.get(5)?,
            on_shelf: r.get(6)?,
            stock: r.get(7)?,
            is_active: r.get::<_, i64>(8)? != 0,
        })
    }

    let mut sql = String::from(
        "SELECT id, name, category, unit_price, cost_price, spec, on_shelf, stock, is_active \
         FROM products",
    );
    let mut clauses: Vec<String> = Vec::new();
    if !include_inactive {
        clauses.push(String::from("is_active = 1"));
    }
    if !qn.is_empty() {
        clauses.push(String::from("lower(name) LIKE '%' || ?1 || '%'") );
    }
    if !clauses.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&clauses.join(" AND "));
    }
    sql.push_str(" ORDER BY name ASC");

    let mut stmt = conn.prepare(&sql).map_err(|e| format!("prepare: {e}"))?;
    if qn.is_empty() {
        let rows = stmt
            .query_map([], map_product_row)
            .map_err(|e| format!("query_map: {e}"))?;
        let mut out = Vec::new();
        for r in rows {
            out.push(r.map_err(|e| format!("row: {e}"))?);
        }
        Ok(out)
    } else {
        let rows = stmt
            .query_map([qn], map_product_row)
            .map_err(|e| format!("query_map: {e}"))?;
        let mut out = Vec::new();
        for r in rows {
            out.push(r.map_err(|e| format!("row: {e}"))?);
        }
        Ok(out)
    }
}

#[tauri::command]
fn product_upsert(app: tauri::AppHandle, input: ProductUpsertInput) -> Result<ProductRow, String> {
    let conn = open_db(&app)?;
    let now = now_ts()?;
    let id = input
        .id
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| Uuid::new_v4().to_string());

    let name = input.name.trim().to_string();
    if name.is_empty() {
        return Err(String::from("name is empty"));
    }

    let category = input
        .category
        .unwrap_or_else(|| String::from("饮品"))
        .trim()
        .to_string();
    let category = if category.is_empty() { String::from("饮品") } else { category };

    conn.execute(
        "INSERT INTO products(id, name, category, unit_price, cost_price, spec, on_shelf, stock, is_active, created_at, updated_at) VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11) ON CONFLICT(name) DO UPDATE SET category=excluded.category, unit_price=excluded.unit_price, cost_price=excluded.cost_price, spec=excluded.spec, on_shelf=excluded.on_shelf, stock=excluded.stock, is_active=excluded.is_active, updated_at=excluded.updated_at",
        params![
            id,
            name,
            category,
            input.unit_price,
            input.cost_price,
            input.spec,
            input.on_shelf,
            input.stock,
            if input.is_active { 1i64 } else { 0i64 },
            now,
            now
        ],
    )
    .map_err(|e| format!("execute: {e}"))?;

    let mut stmt = conn
        .prepare("SELECT id, name, category, unit_price, cost_price, spec, on_shelf, stock, is_active FROM products WHERE name = ?1")
        .map_err(|e| format!("prepare: {e}"))?;
    let row = stmt
        .query_row([input.name.trim()], |r| {
            Ok(ProductRow {
                id: r.get(0)?,
                name: r.get(1)?,
                category: r.get(2)?,
                unit_price: r.get(3)?,
                cost_price: r.get(4)?,
                spec: r.get(5)?,
                on_shelf: r.get(6)?,
                stock: r.get(7)?,
                is_active: r.get::<_, i64>(8)? != 0,
            })
        })
        .map_err(|e| format!("query_row: {e}"))?;
    Ok(row)
}

#[tauri::command]
fn product_delete(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let conn = open_db(&app)?;
    conn.execute("DELETE FROM products WHERE id = ?1", [id])
        .map_err(|e| format!("execute: {e}"))?;
    Ok(())
}

#[tauri::command]
fn shift_record_insert(app: tauri::AppHandle, input: ShiftRecordInsertInput) -> Result<String, String> {
    let conn = open_db(&app)?;
    let now = now_ts()?;
    let id = Uuid::new_v4().to_string();

    let date_ymd = input.date_ymd.trim().to_string();
    let shift = input.shift.trim().to_string();
    let employee = input.employee.trim().to_string();
    if date_ymd.is_empty() {
        return Err(String::from("date_ymd is empty"));
    }
    if shift.is_empty() {
        return Err(String::from("shift is empty"));
    }
    if employee.is_empty() {
        return Err(String::from("employee is empty"));
    }

    conn.execute(
        "INSERT INTO shift_records(id, date_ymd, shift, employee, wangfei, shouhuo, meituan, zhichu, income, yingjiao, created_at)\
         VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            id,
            date_ymd,
            shift,
            employee,
            input.wangfei,
            input.shouhuo,
            input.meituan,
            input.zhichu,
            input.income,
            input.yingjiao,
            now
        ],
    )
    .map_err(|e| format!("execute: {e}"))?;

    Ok(id)
}

fn load_kv_json(conn: &Connection, key: &str) -> Result<Option<Value>, String> {
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
fn migrate_products_from_kv(app: tauri::AppHandle) -> Result<MigrationStats, String> {
    let mut conn = open_db(&app)?;

    // primary DB_PATH key
    let key_primary = "modules.productCatalog.data";
    let key_legacy = "product-catalog-data";

    let payload = load_kv_json(&conn, key_primary)?
        .or(load_kv_json(&conn, key_legacy)?)
        .unwrap_or(Value::Null);

    let items = match payload {
        Value::Array(arr) => arr,
        _ => Vec::new(),
    };

    let now = now_ts()?;
    let tx = conn.transaction().map_err(|e| format!("tx: {e}"))?;

    let mut imported = 0usize;
    let mut skipped = 0usize;

    for it in items.iter() {
        let obj = match it.as_object() {
            Some(o) => o,
            None => {
                skipped += 1;
                continue;
            }
        };

        let name = obj
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if name.is_empty() {
            skipped += 1;
            continue;
        }

        let unit_price = obj.get("unitPrice").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let cost_price = obj.get("costPrice").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let spec = obj.get("spec").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let on_shelf = obj.get("onShelf").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let stock = obj.get("stock").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let category = obj
            .get("category")
            .and_then(|v| v.as_str())
            .unwrap_or("饮品")
            .trim()
            .to_string();
        let is_active = obj.get("onShelf").is_some() || obj.get("stock").is_some() || obj.get("unitPrice").is_some();

        let id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO products(id, name, category, unit_price, cost_price, spec, on_shelf, stock, is_active, created_at, updated_at) VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11) ON CONFLICT(name) DO UPDATE SET category=excluded.category, unit_price=excluded.unit_price, cost_price=excluded.cost_price, spec=excluded.spec, on_shelf=excluded.on_shelf, stock=excluded.stock, is_active=excluded.is_active, updated_at=excluded.updated_at",
            params![
                id,
                name,
                category,
                unit_price,
                cost_price,
                spec,
                on_shelf,
                stock,
                if is_active { 1i64 } else { 0i64 },
                now,
                now
            ],
        )
        .map_err(|e| format!("upsert product: {e}"))?;
        imported += 1;
    }

    tx.commit().map_err(|e| format!("commit: {e}"))?;

    Ok(MigrationStats {
        source_key: if load_kv_json(&conn, key_primary)?.is_some() {
            key_primary.to_string()
        } else {
            key_legacy.to_string()
        },
        total: items.len(),
        imported,
        skipped,
    })
}

// ============ 权限管理相关命令 ============

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct RoleRow {
    pub id: String,
    pub name: String,
    pub desc: String,
    pub user_count: i64,
    pub is_active: bool,
}

#[tauri::command]
fn roles_list(app: tauri::AppHandle, token: String) -> Result<Vec<RoleRow>, String> {
    let conn = open_db(&app)?;
    let _actor_id = require_admin(&conn, token.trim())?;

    // 返回内置角色
    Ok(vec![
        RoleRow {
            id: "admin".to_string(),
            name: "超管".to_string(),
            desc: "系统最高权限，可管理所有功能".to_string(),
            user_count: 1,
            is_active: true,
        },
        RoleRow {
            id: "boss".to_string(),
            name: "股东".to_string(),
            desc: "可查看数据、管理商品和财务".to_string(),
            user_count: 2,
            is_active: true,
        },
        RoleRow {
            id: "employee".to_string(),
            name: "员工".to_string(),
            desc: "收银台和验券操作权限".to_string(),
            user_count: 5,
            is_active: true,
        },
    ])
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct ModuleRow {
    pub id: String,
    pub name: String,
    pub permissions: serde_json::Value,
}

#[tauri::command]
fn modules_list(app: tauri::AppHandle, token: String) -> Result<Vec<ModuleRow>, String> {
    let conn = open_db(&app)?;
    let _actor_id = require_admin(&conn, token.trim())?;

    Ok(vec![
        ModuleRow {
            id: "cashier".to_string(),
            name: "收银台".to_string(),
            permissions: serde_json::json!({
                "admin": "full",
                "boss": "full",
                "employee": "full"
            }),
        },
        ModuleRow {
            id: "coupon".to_string(),
            name: "验券管理".to_string(),
            permissions: serde_json::json!({
                "admin": "full",
                "boss": "full",
                "employee": "full"
            }),
        },
        ModuleRow {
            id: "sales".to_string(),
            name: "消费数据".to_string(),
            permissions: serde_json::json!({
                "admin": "full",
                "boss": "full",
                "employee": "read"
            }),
        },
        ModuleRow {
            id: "shift".to_string(),
            name: "交班管理".to_string(),
            permissions: serde_json::json!({
                "admin": "full",
                "boss": "full",
                "employee": "none"
            }),
        },
        ModuleRow {
            id: "products".to_string(),
            name: "商品管理".to_string(),
            permissions: serde_json::json!({
                "admin": "full",
                "boss": "read",
                "employee": "none"
            }),
        },
        ModuleRow {
            id: "finance".to_string(),
            name: "财务管理".to_string(),
            permissions: serde_json::json!({
                "admin": "full",
                "boss": "read",
                "employee": "none"
            }),
        },
        ModuleRow {
            id: "users".to_string(),
            name: "用户管理".to_string(),
            permissions: serde_json::json!({
                "admin": "full",
                "boss": "none",
                "employee": "none"
            }),
        },
        ModuleRow {
            id: "settings".to_string(),
            name: "系统设置".to_string(),
            permissions: serde_json::json!({
                "admin": "full",
                "boss": "none",
                "employee": "none"
            }),
        },
    ])
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct ApiRow {
    pub id: String,
    pub name: String,
    pub method: String,
    pub path: String,
    pub status: String,
}

#[tauri::command]
fn api_list(app: tauri::AppHandle, token: String) -> Result<Vec<ApiRow>, String> {
    let conn = open_db(&app)?;
    let _actor_id = require_admin(&conn, token.trim())?;

    Ok(vec![
        ApiRow {
            id: "auth_login".to_string(),
            name: "老板登录".to_string(),
            method: "POST".to_string(),
            path: "/auth/login".to_string(),
            status: "active".to_string(),
        },
        ApiRow {
            id: "auth_employee_login".to_string(),
            name: "员工登录".to_string(),
            method: "POST".to_string(),
            path: "/auth/employee".to_string(),
            status: "active".to_string(),
        },
        ApiRow {
            id: "auth_accounts_list".to_string(),
            name: "账号列表".to_string(),
            method: "GET".to_string(),
            path: "/auth/accounts".to_string(),
            status: "active".to_string(),
        },
        ApiRow {
            id: "auth_set_password".to_string(),
            name: "修改密码".to_string(),
            method: "POST".to_string(),
            path: "/auth/password".to_string(),
            status: "active".to_string(),
        },
        ApiRow {
            id: "employees_list".to_string(),
            name: "员工列表".to_string(),
            method: "GET".to_string(),
            path: "/employees".to_string(),
            status: "active".to_string(),
        },
        ApiRow {
            id: "products_list".to_string(),
            name: "商品列表".to_string(),
            method: "GET".to_string(),
            path: "/products".to_string(),
            status: "active".to_string(),
        },
        ApiRow {
            id: "shift_records_list".to_string(),
            name: "交班记录".to_string(),
            method: "GET".to_string(),
            path: "/shifts".to_string(),
            status: "active".to_string(),
        },
        ApiRow {
            id: "sales_orders_list".to_string(),
            name: "销售订单".to_string(),
            method: "GET".to_string(),
            path: "/sales".to_string(),
            status: "active".to_string(),
        },
        ApiRow {
            id: "accounting_entries_list".to_string(),
            name: "财务明细".to_string(),
            method: "GET".to_string(),
            path: "/accounting".to_string(),
            status: "active".to_string(),
        },
        ApiRow {
            id: "meituan_orders_list".to_string(),
            name: "美团订单".to_string(),
            method: "GET".to_string(),
            path: "/meituan".to_string(),
            status: "active".to_string(),
        },
    ])
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct OperationLogRow {
    pub id: i64,
    pub user: String,
    pub action: String,
    pub module: String,
    pub time: String,
    pub ip: String,
}

#[tauri::command]
fn operation_logs_list(app: tauri::AppHandle, token: String, limit: Option<i64>) -> Result<Vec<OperationLogRow>, String> {
    let conn = open_db(&app)?;
    let _actor_id = require_admin(&conn, token.trim())?;
    let _l = limit.unwrap_or(50); 

    // 返回模拟数据
    Ok(vec![
        OperationLogRow {
            id: 1,
            user: "莫健".to_string(),
            action: "登录系统".to_string(),
            module: "认证".to_string(),
            time: "2026-01-14 09:30:15".to_string(),
            ip: "127.0.0.1".to_string(),
        },
        OperationLogRow {
            id: 2,
            user: "莫健".to_string(),
            action: "修改密码".to_string(),
            module: "用户管理".to_string(),
            time: "2026-01-14 09:25:00".to_string(),
            ip: "127.0.0.1".to_string(),
        },
        OperationLogRow {
            id: 3,
            user: "朱晓培".to_string(),
            action: "登录系统".to_string(),
            module: "认证".to_string(),
            time: "2026-01-14 08:45:22".to_string(),
            ip: "127.0.0.1".to_string(),
        },
    ])
}

// ============ 财务管理相关命令 ============

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct WalletBalance {
    pub finance: f64,
    pub meituan: f64,
    pub amap: f64,
}

#[tauri::command]
fn wallet_balance(app: tauri::AppHandle, token: String) -> Result<WalletBalance, String> {
    let conn = open_db(&app)?;
    let _actor_id = auth_resolve_account_id(&token).ok_or_else(|| String::from("unauthorized"))?;

    // 计算财务账户余额（从 accounting_entries）
    let finance: f64 = conn.query_row(
        "SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) FROM accounting_entries WHERE account = 'finance'",
        [],
        |r| r.get(0)
    ).unwrap_or(0.0);

    let meituan: f64 = conn.query_row(
        "SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) FROM accounting_entries WHERE account = 'meituan'",
        [],
        |r| r.get(0)
    ).unwrap_or(0.0);

    let amap: f64 = conn.query_row(
        "SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) FROM accounting_entries WHERE account = 'amap'",
        [],
        |r| r.get(0)
    ).unwrap_or(0.0);

    Ok(WalletBalance {
        finance: finance.max(0.0),
        meituan: meituan.max(0.0),
        amap: amap.max(0.0),
    })
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct MeituanPending {
    pub pending: f64,
}

#[tauri::command]
fn meituan_orders_pending(app: tauri::AppHandle, token: String) -> Result<MeituanPending, String> {
    let conn = open_db(&app)?;
    let _actor_id = auth_resolve_account_id(&token).ok_or_else(|| String::from("unauthorized"))?;

    // 计算美团待到账金额（已确认但未到账的订单）
    let pending: f64 = conn.query_row(
        "SELECT COALESCE(SUM(actual_amount), 0) FROM meituan_orders WHERE status = 'confirmed' AND settlement_status = 'pending'",
        [],
        |r| r.get(0)
    ).unwrap_or(0.0);

    Ok(MeituanPending { pending })
}

// ============ 交班管理相关命令 ============

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct ShiftRecordsStats {
    pub today: i64,
    pub pending: i64,
    pub month: i64,
    pub profit: f64,
}

#[tauri::command]
fn shift_records_stats(app: tauri::AppHandle, token: String) -> Result<ShiftRecordsStats, String> {
    let conn = open_db(&app)?;
    let _actor_id = auth_resolve_account_id(&token).ok_or_else(|| String::from("unauthorized"))?;

    let today = now_ymd()?;
    let month_start = format!("{}-01", &today[..7]);

    let today_count: i64 = conn.query_row(
        "SELECT COUNT(1) FROM shift_records WHERE date_ymd = ?1",
        [today.clone()],
        |r| r.get(0)
    ).unwrap_or(0);

    let pending_count: i64 = conn.query_row(
        "SELECT COUNT(1) FROM shift_records WHERE status = 'pending'",
        [],
        |r| r.get(0)
    ).unwrap_or(0);

    let month_count: i64 = conn.query_row(
        "SELECT COUNT(1) FROM shift_records WHERE date_ymd >= ?1",
        [month_start.clone()],
        |r| r.get(0)
    ).unwrap_or(0);

    let profit: f64 = conn.query_row(
        "SELECT COALESCE(SUM(net_amount), 0) FROM shift_records WHERE date_ymd >= ?1",
        [month_start],
        |r| r.get(0)
    ).unwrap_or(0.0);

    Ok(ShiftRecordsStats {
        today: today_count,
        pending: pending_count,
        month: month_count,
        profit,
    })
}

// ============ 后端管理相关命令 ============

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct DbTablesInfo {
    pub table_count: i64,
    pub record_count: i64,
    pub db_size: String,
}

#[tauri::command]
fn db_tables_info(app: tauri::AppHandle, token: String) -> Result<DbTablesInfo, String> {
    let conn = open_db(&app)?;
    let _actor_id = require_admin(&conn, token.trim())?;

    let table_count: i64 = conn.query_row(
        "SELECT COUNT(1) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        [],
        |r| r.get(0)
    ).unwrap_or(0);

    let mut record_count = 0;
    let mut tables: Vec<String> = Vec::new();
    let mut stmt = conn.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").map_err(|e| format!("prepare: {e}"))?;
    let mut rows = stmt.query([]).map_err(|e| format!("query: {e}"))?;
    while let Some(row) = rows.next().map_err(|e| format!("next row: {e}"))? {
        let table_name: String = row.get(0).map_err(|e| format!("get table name: {e}"))?;
        tables.push(table_name);
    }
    for table in &tables {
        let count: i64 = conn.query_row(
            &format!("SELECT COUNT(1) FROM {}", table),
            [],
            |r| r.get(0)
        ).unwrap_or(0);
        record_count += count;
    }

    let db_path = db_path(&app)?;
    let db_size = std::fs::metadata(&db_path)
        .map(|m| format!("{:.1} MB", m.len() as f64 / 1024.0 / 1024.0))
        .unwrap_or("0 MB".to_string());

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
fn api_stats(app: tauri::AppHandle, token: String) -> Result<ApiStats, String> {
    let conn = open_db(&app)?;
    let _actor_id = require_admin(&conn, token.trim())?;

    // 返回模拟数据
    Ok(ApiStats {
        total_calls: 1234,
        errors: 2,
        avg_response: "45ms".to_string(),
    })
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct SystemInfo {
    pub version: String,
    pub rust_version: String,
    pub tauri_version: String,
}

#[tauri::command]
fn system_info(app: tauri::AppHandle, token: String) -> Result<SystemInfo, String> {
    let conn = open_db(&app)?;
    let _actor_id = require_admin(&conn, token.trim())?;

    Ok(SystemInfo {
        version: "1.0.0".to_string(),
        rust_version: "1.75.0".to_string(),
        tauri_version: "1.6.0".to_string(),
    })
}

// ============ 验券管理相关命令 ============

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct CouponRow {
    pub id: String,
    pub code: String,
    pub name: String,
    pub face_value: f64,
    pub status: String,
    pub created_at: i64,
    pub used_at: Option<i64>,
}

#[tauri::command]
fn coupons_list(app: tauri::AppHandle, token: String) -> Result<Vec<CouponRow>, String> {
    let _conn = open_db(&app)?;
    let _actor_id = auth_resolve_account_id(&token).ok_or_else(|| String::from("unauthorized"))?;

    // 返回模拟数据
    Ok(vec![
        CouponRow {
            id: "coupon_001".to_string(),
            code: "Voucher20260114A".to_string(),
            name: "满100减10券".to_string(),
            face_value: 10.0,
            status: "unused".to_string(),
            created_at: now_ts()?,
            used_at: None,
        },
        CouponRow {
            id: "coupon_002".to_string(),
            code: "Voucher20260114B".to_string(),
            name: "满200减20券".to_string(),
            face_value: 20.0,
            status: "used".to_string(),
            created_at: now_ts()?,
            used_at: Some(now_ts()?),
        },
    ])
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct CouponUseInput {
    pub token: String,
    pub code: String,
    pub order_id: String,
}

#[tauri::command]
fn coupon_use(app: tauri::AppHandle, input: CouponUseInput) -> Result<bool, String> {
    let _conn = open_db(&app)?;
    let _actor_id = auth_resolve_account_id(&input.token).ok_or_else(|| String::from("unauthorized"))?;

    // 模拟验券逻辑
    Ok(true)
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct CouponCreateInput {
    pub token: String,
    pub name: String,
    pub face_value: f64,
    pub code: String,
}

#[tauri::command]
fn coupon_create(app: tauri::AppHandle, input: CouponCreateInput) -> Result<String, String> {
    let conn = open_db(&app)?;
    let _actor_id = require_admin(&conn, input.token.trim())?;

    // 模拟创建验券
    Ok(format!("coupon_{}", Uuid::new_v4().to_string()))
}

// ============ 财务报表相关命令 ============

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct FinanceDailyReport {
    pub date_ymd: String,
    pub total_income: f64,
    pub total_expense: f64,
    pub net_profit: f64,
    pub shift_count: i64,
    pub details: Vec<FinanceEntry>,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
pub struct FinanceEntry {
    pub item: String,
    pub amount: f64,
    pub type_: String,
}

#[tauri::command]
fn finance_daily_report(app: tauri::AppHandle, token: String, date_ymd: String) -> Result<FinanceDailyReport, String> {
    let conn = open_db(&app)?;
    let _actor_id = auth_resolve_account_id(&token).ok_or_else(|| String::from("unauthorized"))?;

    // 计算收入
    let income: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM accounting_entries WHERE date_ymd = ?1 AND entry_type = 'income'",
        [date_ymd.clone()],
        |r| r.get(0)
    ).unwrap_or(0.0);

    // 计算支出
    let expense: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM accounting_entries WHERE date_ymd = ?1 AND entry_type = 'expense'",
        [date_ymd.clone()],
        |r| r.get(0)
    ).unwrap_or(0.0);

    // 班次数量
    let shift_count: i64 = conn.query_row(
        "SELECT COUNT(1) FROM shift_records WHERE date_ymd = ?1",
        [date_ymd.clone()],
        |r| r.get(0)
    ).unwrap_or(0);

    // 获取明细
    let mut details = Vec::new();
    let mut stmt = conn.prepare(
        "SELECT item, amount, entry_type FROM accounting_entries WHERE date_ymd = ?1 ORDER BY created_at DESC"
    ).map_err(|e| format!("prepare: {e}"))?;
    let mut rows = stmt.query([date_ymd.clone()]).map_err(|e| format!("query: {e}"))?;
    while let Some(r) = rows.next().map_err(|e| format!("next: {e}"))? {
        details.push(FinanceEntry {
            item: r.get(0).unwrap_or_default(),
            amount: r.get(1).unwrap_or(0.0),
            type_: r.get(2).unwrap_or_default(),
        });
    }

    Ok(FinanceDailyReport {
        date_ymd,
        total_income: income,
        total_expense: expense,
        net_profit: income - expense,
        shift_count,
        details,
    })
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct FinanceWeeklyReport {
    pub week_start: String,
    pub week_end: String,
    pub total_income: f64,
    pub total_expense: f64,
    pub net_profit: f64,
    pub daily_stats: Vec<DailyStat>,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
pub struct DailyStat {
    pub date_ymd: String,
    pub income: f64,
    pub expense: f64,
}

#[tauri::command]
fn finance_weekly_report(app: tauri::AppHandle, token: String, week_start: String) -> Result<FinanceWeeklyReport, String> {
    let conn = open_db(&app)?;
    let _actor_id = auth_resolve_account_id(&token).ok_or_else(|| String::from("unauthorized"))?;

    // 计算一周的统计数据
    let mut total_income = 0.0;
    let mut total_expense = 0.0;
    let mut daily_stats = Vec::new();

    // 解析周开始日期
    let parts: Vec<&str> = week_start.split('-').collect();
    if parts.len() != 3 {
        return Err(String::from("invalid date format"));
    }
    let year: i32 = parts[0].parse().map_err(|_| String::from("invalid year"))?;
    let month: i32 = parts[1].parse().map_err(|_| String::from("invalid month"))?;
    let day: i32 = parts[2].parse().map_err(|_| String::from("invalid day"))?;

    for i in 0..7 {
        // 简单日期计算（假设每月至少28天）
        let mut current_day = day + i;
        let mut current_month = month;
        let mut current_year = year;

        // 处理月份溢出
        while current_day > 28 {
            if current_month == 12 {
                current_month = 1;
                current_year += 1;
            } else {
                current_month += 1;
            }
            current_day -= 28;
        }

        let date_ymd = format!("{:04}-{:02}-{:02}", current_year, current_month, current_day);

        let income: f64 = conn.query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM accounting_entries WHERE date_ymd = ?1 AND entry_type = 'income'",
            [date_ymd.clone()],
            |r| r.get(0)
        ).unwrap_or(0.0);

        let expense: f64 = conn.query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM accounting_entries WHERE date_ymd = ?1 AND entry_type = 'expense'",
            [date_ymd.clone()],
            |r| r.get(0)
        ).unwrap_or(0.0);

        total_income += income;
        total_expense += expense;

        daily_stats.push(DailyStat {
            date_ymd,
            income,
            expense,
        });
    }

    // 计算周结束日期
    let mut end_day = day + 6;
    let mut end_month = month;
    let mut end_year = year;
    while end_day > 28 {
        if end_month == 12 {
            end_month = 1;
            end_year += 1;
        } else {
            end_month += 1;
        }
        end_day -= 28;
    }
    let week_end = format!("{:04}-{:02}-{:02}", end_year, end_month, end_day);

    Ok(FinanceWeeklyReport {
        week_start,
        week_end,
        total_income,
        total_expense,
        net_profit: total_income - total_expense,
        daily_stats,
    })
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct FinanceMonthlyReport {
    pub month: String,
    pub total_income: f64,
    pub total_expense: f64,
    pub net_profit: f64,
    pub daily_stats: Vec<DailyStat>,
    pub category_stats: Vec<CategoryStat>,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
pub struct CategoryStat {
    pub category: String,
    pub income: f64,
    pub expense: f64,
}

#[tauri::command]
fn finance_monthly_report(app: tauri::AppHandle, token: String, month: String) -> Result<FinanceMonthlyReport, String> {
    let conn = open_db(&app)?;
    let _actor_id = auth_resolve_account_id(&token).ok_or_else(|| String::from("unauthorized"))?;

    let month_start = format!("{}-01", month);
    let month_end = format!("{}-31", month);

    // 计算月收入
    let total_income: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM accounting_entries WHERE date_ymd >= ?1 AND date_ymd <= ?2 AND entry_type = 'income'",
        [month_start.clone(), month_end.clone()],
        |r| r.get(0)
    ).unwrap_or(0.0);

    // 计算月支出
    let total_expense: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM accounting_entries WHERE date_ymd >= ?1 AND date_ymd <= ?2 AND entry_type = 'expense'",
        [month_start.clone(), month_end.clone()],
        |r| r.get(0)
    ).unwrap_or(0.0);

    // 获取每日统计
    let mut daily_stats = Vec::new();
    let mut stmt = conn.prepare(
        "SELECT date_ymd, COALESCE(SUM(CASE WHEN entry_type = 'income' THEN amount ELSE 0 END), 0), COALESCE(SUM(CASE WHEN entry_type = 'expense' THEN amount ELSE 0 END), 0) FROM accounting_entries WHERE date_ymd >= ?1 AND date_ymd <= ?2 GROUP BY date_ymd ORDER BY date_ymd DESC"
    ).map_err(|e| format!("prepare: {e}"))?;
    let mut rows = stmt.query([month_start.clone(), month_end.clone()]).map_err(|e| format!("query: {e}"))?;
    while let Some(r) = rows.next().map_err(|e| format!("next: {e}"))? {
        daily_stats.push(DailyStat {
            date_ymd: r.get(0).unwrap_or_default(),
            income: r.get(1).unwrap_or(0.0),
            expense: r.get(2).unwrap_or(0.0),
        });
    }

    // 获取分类统计
    let mut category_stats = Vec::new();
    let mut stmt = conn.prepare(
        "SELECT item, COALESCE(SUM(CASE WHEN entry_type = 'income' THEN amount ELSE 0 END), 0), COALESCE(SUM(CASE WHEN entry_type = 'expense' THEN amount ELSE 0 END), 0) FROM accounting_entries WHERE date_ymd >= ?1 AND date_ymd <= ?2 GROUP BY item ORDER BY SUM(amount) DESC"
    ).map_err(|e| format!("prepare: {e}"))?;
    let mut rows = stmt.query([month_start.clone(), month_end.clone()]).map_err(|e| format!("query: {e}"))?;
    while let Some(r) = rows.next().map_err(|e| format!("next: {e}"))? {
        let income = r.get(1).unwrap_or(0.0);
        let expense = r.get(2).unwrap_or(0.0);
        if income > 0.0 || expense > 0.0 {
            category_stats.push(CategoryStat {
                category: r.get(0).unwrap_or_default(),
                income,
                expense,
            });
        }
    }

    Ok(FinanceMonthlyReport {
        month,
        total_income,
        total_expense,
        net_profit: total_income - total_expense,
        daily_stats,
        category_stats,
    })
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct DividendReport {
    pub month: String,
    pub total_profit: f64,
    pub shareholders: Vec<ShareholderDividend>,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
pub struct ShareholderDividend {
    pub name: String,
    pub equity: f64,
    pub dividend: f64,
}

#[tauri::command]
fn finance_dividend_report(app: tauri::AppHandle, token: String, month: String) -> Result<DividendReport, String> {
    let conn = open_db(&app)?;
    let _actor_id = auth_resolve_account_id(&token).ok_or_else(|| String::from("unauthorized"))?;

    let month_start = format!("{}-01", month);
    let month_end = format!("{}-31", month);

    // 计算净利润
    let total_income: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM accounting_entries WHERE date_ymd >= ?1 AND date_ymd <= ?2 AND entry_type = 'income'",
        [month_start.clone(), month_end.clone()],
        |r| r.get(0)
    ).unwrap_or(0.0);

    let total_expense: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM accounting_entries WHERE date_ymd >= ?1 AND date_ymd <= ?2 AND entry_type = 'expense'",
        [month_start.clone(), month_end.clone()],
        |r| r.get(0)
    ).unwrap_or(0.0);

    let total_profit = total_income - total_expense;

    // 股东分红（模拟数据）
    let shareholders = vec![
        ShareholderDividend { name: "朱".to_string(), equity: 49.0, dividend: total_profit * 0.49 },
        ShareholderDividend { name: "莫".to_string(), equity: 20.0, dividend: total_profit * 0.20 },
        ShareholderDividend { name: "崔".to_string(), equity: 15.0, dividend: total_profit * 0.15 },
        ShareholderDividend { name: "路".to_string(), equity: 12.0, dividend: total_profit * 0.12 },
        ShareholderDividend { name: "曹".to_string(), equity: 4.0, dividend: total_profit * 0.04 },
    ];

    Ok(DividendReport {
        month,
        total_profit,
        shareholders,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // 启动HTTP API服务器
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                // 创建tokio runtime并启动HTTP服务器
                let rt = tokio::runtime::Runtime::new().unwrap();
                rt.block_on(async {
                    if let Err(e) = http_server::start_http_server(app_handle).await {
                        eprintln!("❌ HTTP服务器启动失败: {}", e);
                    }
                });
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            open_external_webview,
            auth_login,
            auth_employee_login,
            auth_pick_list,
            auth_accounts_list,
            auth_set_password,
            employees_list,
            employee_upsert,
            employee_set_active,
            auth_account_set_active,
            kv_get,
            kv_set,
            kv_remove,
            kv_dump,
            products_list,
            product_upsert,
            product_delete,
            migrate_products_from_kv,
            shift_record_insert,
            sales_order_create_from_shift,
            accounting_entries_create_from_shift,
            meituan_orders_import,
            shift_records_list,
            sales_orders_list,
            sales_items_list,
            accounting_entries_list,
            meituan_orders_list,
            shift_snapshot_insert,
            shift_snapshot_get,
            pos_checkout,
            // 新增命令
            roles_list,
            modules_list,
            api_list,
            operation_logs_list,
            wallet_balance,
            meituan_orders_pending,
            shift_records_stats,
            db_tables_info,
            api_stats,
            system_info,
            // 验券管理命令
            coupons_list,
            coupon_use,
            coupon_create,
            // 财务报表命令
            finance_daily_report,
            finance_weekly_report,
            finance_monthly_report,
            finance_dividend_report,
            // 日志系统命令
            system_logs_list,
            system_log_add,
            system_log_clear
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

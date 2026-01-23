use tauri::AppHandle;
use rusqlite::{params, OptionalExtension};
use uuid::Uuid;
use crate::db::{open_db, now_ts};
use crate::state::{auth_sessions, auth_resolve_account_id, require_admin};
use crate::models::*;

fn sha256_hex(s: &str) -> String {
    use sha2::{Digest, Sha256};
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

#[tauri::command]
pub fn auth_login(app: AppHandle, input: AuthLoginInput) -> Result<AuthSession, String> {
    let conn = open_db(&app)?;
    let pick_name = input.pick_name.trim().to_string();
    let pick_name_q = pick_name.clone();
    let password = input.password.trim().to_string();
    
    if pick_name.is_empty() || password.is_empty() {
        return Err(format!(
            "invalid:pick_name_len={} password_len={}",
            pick_name.len(),
            password.len()
        ));
    }

    // 1. Try Direct Login
    let mut stmt = conn
        .prepare(
            "SELECT pass_salt, pass_hash, role, identity, display_name, equity, id
             FROM auth_accounts
             WHERE pick_name = ?1 AND is_active = 1",
        )
        .map_err(|e| format!("prepare auth_login: {e}"))?;

    let mut rows = stmt
        .query([&pick_name_q])
        .map_err(|e| format!("query auth_login: {e}"))?;

    while let Some(row) = rows.next().map_err(|e| format!("next auth_login: {e}"))? {
        let salt: String = row.get(0).map_err(|e| format!("get salt: {e}"))?;
        let hash_db: String = row.get(1).map_err(|e| format!("get hash: {e}"))?;
        
        if pass_hash(&salt, &password) == hash_db {
            // Direct login success
            let role: String = row.get(2).map_err(|e| format!("get role: {e}"))?;
            let identity: String = row.get(3).map_err(|e| format!("get identity: {e}"))?;
            let name: String = row.get(4).map_err(|e| format!("get name: {e}"))?;
            let equity: f64 = row.get(5).map_err(|e| format!("get equity: {e}"))?;
            let account_id: String = row.get(6).map_err(|e| format!("get id: {e}"))?;

            let token = Uuid::new_v4().to_string();
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

    Err(String::from("bad_password"))
}

#[tauri::command]
pub fn auth_employee_login(app: AppHandle, pick_name: String) -> Result<AuthSession, String> {
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
pub fn auth_pick_list(app: AppHandle) -> Result<AuthPickList, String> {
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
pub fn auth_update_brand_settings(app: AppHandle, token: String, input: BrandSettings) -> Result<(), String> {
    let conn = open_db(&app)?;
    require_admin(&conn, &token)?;

    let now = crate::db::now_ts()?;
    conn.execute("INSERT OR REPLACE INTO kv(k, v, updated_at) VALUES('brand_name', ?1, ?2)", params![input.brand_name.trim(), now])
        .map_err(|e| format!("update brand_name: {e}"))?;
    conn.execute("INSERT OR REPLACE INTO kv(k, v, updated_at) VALUES('store_name', ?1, ?2)", params![input.store_name.trim(), now])
        .map_err(|e| format!("update store_name: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn auth_accounts_list(app: AppHandle, token: String) -> Result<Vec<AuthAccountRow>, String> {
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

    // Extended query
    let sql = if actor_role == "admin" {
        "SELECT id, pick_name, display_name, role, identity, equity, is_active, proxy_host, is_hidden, salary_base, profile 
         FROM auth_accounts ORDER BY pick_name ASC, display_name ASC".to_string()
    } else {
        "SELECT id, pick_name, display_name, role, identity, equity, is_active, proxy_host, is_hidden, salary_base, profile 
         FROM auth_accounts WHERE id = ?1 ORDER BY pick_name ASC, display_name ASC".to_string()
    };

    let mut out: Vec<AuthAccountRow> = Vec::new();
    if actor_role == "admin" {
        let mut stmt = conn.prepare(&sql).map_err(|e| format!("prepare: {e}"))?;
        let rows = stmt
            .query_map([], |r| {
                let raw_profile: Option<String> = r.get(10)?;
                let profile = raw_profile.map(|p| crate::cipher::decrypt_data(&p));
                
                Ok(AuthAccountRow {
                    id: r.get(0)?,
                    pick_name: r.get(1)?,
                    display_name: r.get(2)?,
                    role: r.get(3)?,
                    identity: r.get(4)?,
                    equity: r.get(5)?,
                    is_active: r.get::<_, i64>(6)? != 0,
                    proxy_host: r.get(7)?,
                    is_hidden: r.get::<_, i64>(8).unwrap_or(0) != 0,
                    salary_base: r.get::<_, f64>(9).unwrap_or(0.0),
                    profile,
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
                let raw_profile: Option<String> = r.get(10)?;
                let profile = raw_profile.map(|p| crate::cipher::decrypt_data(&p));

                Ok(AuthAccountRow {
                    id: r.get(0)?,
                    pick_name: r.get(1)?,
                    display_name: r.get(2)?,
                    role: r.get(3)?,
                    identity: r.get(4)?,
                    equity: r.get(5)?,
                    is_active: r.get::<_, i64>(6)? != 0,
                    proxy_host: r.get(7)?,
                    is_hidden: r.get::<_, i64>(8).unwrap_or(0) != 0,
                    salary_base: r.get::<_, f64>(9).unwrap_or(0.0),
                    profile,
                })
            })
            .map_err(|e| format!("query_map: {e}"))?;
        for r in rows {
            out.push(r.map_err(|e| format!("row: {e}"))?);
        }
    }
    if actor_role != "admin" {
        out.retain(|x| x.display_name == actor_name);
    }
    Ok(out)
}

#[tauri::command]
pub fn auth_bootstrap_required(app: AppHandle) -> Result<bool, String> {
    let conn = open_db(&app)?;
    
    // 检查是否已完成全部初始化步骤 (KV标记)
    let completed: Option<String> = conn.query_row(
        "SELECT v FROM kv WHERE k = 'setup_completed'",
        [],
        |r| r.get(0)
    ).optional().map_err(|e| e.to_string())?;

    if let Some(v) = completed {
        if v == "true" {
            return Ok(false); // 已完全初始化
        }
    }

    Ok(true) // 需要初始化
}

#[tauri::command]
pub fn auth_complete_setup(app: AppHandle) -> Result<(), String> {
    let conn = open_db(&app)?;
    let now = now_ts()?;
    conn.execute(
        "INSERT OR REPLACE INTO kv(k, v, updated_at) VALUES('setup_completed', 'true', ?1)",
        params![now]
    ).map_err(|e| e.to_string())?;
    // 完成后自动清除步骤标记
    conn.execute("DELETE FROM kv WHERE k = 'setup_step'", []).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn auth_save_setup_step(app: AppHandle, step: i32) -> Result<(), String> {
    let conn = open_db(&app)?;
    let now = now_ts()?;
    conn.execute(
        "INSERT OR REPLACE INTO kv(k, v, updated_at) VALUES('setup_step', ?1, ?2)",
        params![step.to_string(), now]
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn auth_save_setup_data(app: AppHandle, key: String, data: String) -> Result<(), String> {
    let conn = open_db(&app)?;
    let now = now_ts()?;
    conn.execute(
        "INSERT OR REPLACE INTO kv(k, v, updated_at) VALUES(?1, ?2, ?3)",
        params![format!("setup_data_{}", key), data, now]
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn auth_get_setup_data(app: AppHandle, key: String) -> Result<String, String> {
    let conn = open_db(&app)?;
    let data: Option<String> = conn.query_row(
        "SELECT v FROM kv WHERE k = ?",
        [format!("setup_data_{}", key)],
        |r| r.get(0)
    ).optional().map_err(|e| e.to_string())?;
    Ok(data.unwrap_or_default())
}

#[tauri::command]
pub fn auth_get_setup_step(app: AppHandle) -> Result<i32, String> {
    let conn = open_db(&app)?;
    let step: Option<String> = conn.query_row(
        "SELECT v FROM kv WHERE k = 'setup_step'",
        [],
        |r| r.get(0)
    ).optional().map_err(|e| e.to_string())?;
    
    Ok(step.and_then(|v| v.parse().ok()).unwrap_or(1))
}

#[tauri::command]
pub fn auth_bootstrap_admin(app: AppHandle, input: AuthBootstrapAdminInput) -> Result<AuthSession, String> {
    let conn = open_db(&app)?;

    let pick_name = input.pick_name.trim().to_string();
    let display_name = input.display_name.trim().to_string();
    let password = input.password.trim().to_string();
    if pick_name.is_empty() || display_name.is_empty() || password.is_empty() {
        return Err(String::from("invalid"));
    }

    let exists: Option<String> = conn
        .query_row(
            "SELECT id FROM auth_accounts WHERE role = 'admin' AND is_active = 1 LIMIT 1",
            [],
            |r| r.get(0),
        )
        .optional()
        .map_err(|e| format!("query bootstrap exists: {e}"))?;
    if exists.is_some() {
        return Err(String::from("already_initialized"));
    }

    let now = now_ts()?;
    let id = Uuid::new_v4().to_string();
    let salt = Uuid::new_v4().to_string();
    let hash = pass_hash(&salt, &password);
    conn.execute(
        "INSERT INTO auth_accounts(id, pick_name, pass_salt, pass_hash, role, identity, display_name, equity, is_active, created_at, updated_at)
         VALUES(?1, ?2, ?3, ?4, 'admin', 'admin', ?5, 0, 1, ?6, ?7)",
        params![id, pick_name, salt, hash, display_name, now, now],
    )
    .map_err(|e| format!("insert bootstrap admin: {e}"))?;

    // Save Brand and Store Names
    let brand_name = input.brand_name.trim();
    let store_name = input.store_name.trim();
    
    let now = now_ts()?;
    conn.execute("INSERT OR REPLACE INTO kv(k, v, updated_at) VALUES('brand_name', ?1, ?2)", params![brand_name, now])
        .map_err(|e| format!("save brand_name: {e}"))?;
    conn.execute("INSERT OR REPLACE INTO kv(k, v, updated_at) VALUES('store_name', ?1, ?2)", params![store_name, now])
        .map_err(|e| format!("save store_name: {e}"))?;

    let token = Uuid::new_v4().to_string();
    let mut map = auth_sessions().lock().map_err(|_| String::from("lock"))?;
    map.insert(token.clone(), id.clone());

    Ok(AuthSession {
        account_id: id,
        role: String::from("admin"),
        identity: String::from("admin"),
        name: display_name,
        equity: 0.0,
        token,
    })
}

#[tauri::command]
pub fn auth_dbg_fully_reset_accounts(app: tauri::AppHandle) -> Result<(), String> {
    let conn = open_db(&app)?;
    // 彻底清空所有业务数据和初始化标记
    conn.execute("DELETE FROM auth_accounts", []).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM kv", []).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM employees", []).map_err(|e| e.to_string())?;
    
    // 清除会话
    if let Ok(mut sessions) = auth_sessions().lock() {
        sessions.clear();
    }
    Ok(())
}

#[tauri::command]
pub fn debug_seed_full_data(app: AppHandle) -> Result<String, String> {
    let conn = open_db(&app)?;
    let now = now_ts()?;
    
    // 1. Admin: Mo Jian (laoban)
    let admin_salt = Uuid::new_v4().to_string();
    let admin_hash = pass_hash(&admin_salt, "admin"); // password: admin
    let _ = conn.execute(
        "INSERT OR IGNORE INTO auth_accounts(id, pick_name, pass_salt, pass_hash, role, identity, display_name, equity, is_active, created_at, updated_at)
         VALUES('u_mojian', 'laoban', ?1, ?2, 'admin', 'admin', '莫健', 25.0, 1, ?3, ?3)",
        params![admin_salt, admin_hash, now],
    );

    // 2. Shareholder: Zhu Xiaopei
    let zhu_salt = Uuid::new_v4().to_string();
    let zhu_hash = pass_hash(&zhu_salt, "zhuxiaopei");
    let _ = conn.execute(
        "INSERT OR IGNORE INTO auth_accounts(id, pick_name, pass_salt, pass_hash, role, identity, display_name, equity, is_active, created_at, updated_at)
         VALUES('u_zhu', 'zhuxiaopei', ?1, ?2, 'boss', 'shareholder', '朱晓培', 30.0, 1, ?3, ?3)",
        params![zhu_salt, zhu_hash, now],
    );

    // 3. Hidden Proxy Shareholder: Cui Guoli (Proxied by laoban)
    let cui_profile = r#"{"idCard":"110101199001011234","bankCard":"6222021234567890","bankName":"招商银行"}"#;
    let cui_enc = crate::cipher::encrypt_data(cui_profile);
    let cui_salt = Uuid::new_v4().to_string();
    let cui_hash = pass_hash(&cui_salt, "cuiguoli");
    let _ = conn.execute(
        "INSERT OR IGNORE INTO auth_accounts(id, pick_name, pass_salt, pass_hash, role, identity, display_name, equity, proxy_host, is_hidden, salary_base, profile, is_active, created_at, updated_at)
         VALUES('u_cui', 'cuiguoli', ?1, ?2, 'boss', 'shareholder', '崔国丽', 20.0, 'laoban', 1, 0, ?3, 1, ?4, ?4)",
        params![cui_salt, cui_hash, cui_enc, now],
    );

    // 4. Hidden Proxy Shareholder: Lu Qiumian (Proxied by laoban)
    let lu_salt = Uuid::new_v4().to_string();
    let lu_hash = pass_hash(&lu_salt, "luqiumian");
    let _ = conn.execute(
        "INSERT OR IGNORE INTO auth_accounts(id, pick_name, pass_salt, pass_hash, role, identity, display_name, equity, proxy_host, is_hidden, salary_base, profile, is_active, created_at, updated_at)
         VALUES('u_lu', 'luqiumian', ?1, ?2, 'boss', 'shareholder', '路秋勉', 13.0, 'laoban', 1, 0, NULL, 1, ?3, ?3)",
        params![lu_salt, lu_hash, now],
    );

    Ok("Data Seeded Successfully".into())
}

#[tauri::command]
pub fn auth_set_password(app: AppHandle, input: AuthSetPasswordInput) -> Result<(), String> {
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
pub fn employees_list(app: AppHandle, token: String) -> Result<Vec<EmployeeRow>, String> {
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
pub fn employee_upsert(app: AppHandle, input: EmployeeUpsertInput) -> Result<String, String> {
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
pub fn employee_set_active(app: AppHandle, input: EmployeeSetActiveInput) -> Result<(), String> {
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
pub fn auth_account_set_active(app: AppHandle, input: AuthAccountSetActiveInput) -> Result<(), String> {
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
pub fn roles_list(_app: AppHandle, token: String) -> Result<Vec<RoleRow>, String> {
    let conn = open_db(&_app)?;
    let _ = require_admin(&conn, token.trim())?;

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

#[tauri::command]
pub fn modules_list(_app: AppHandle, token: String) -> Result<Vec<ModuleRow>, String> {
    let conn = open_db(&_app)?;
    let _ = require_admin(&conn, token.trim())?;

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

#[tauri::command]
pub fn api_list(_app: AppHandle, token: String) -> Result<Vec<ApiRow>, String> {
    let conn = open_db(&_app)?;
    let _ = require_admin(&conn, token.trim())?;

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

#[tauri::command]
pub fn operation_logs_list(_app: AppHandle, token: String, _limit: Option<i64>) -> Result<Vec<OperationLogRow>, String> {
    let conn = open_db(&_app)?;
    let _ = require_admin(&conn, token.trim())?;
    Ok(Vec::new())
}

#[tauri::command]
pub fn auth_get_brand_settings(app: AppHandle) -> Result<BrandSettings, String> {
    let conn = open_db(&app)?;
    
    let brand_name: String = conn.query_row("SELECT v FROM kv WHERE k = 'brand_name'", [], |r| r.get(0))
        .optional()
        .map_err(|e| format!("get brand_name: {e}"))?
        .unwrap_or_else(|| "我的电竞馆".to_string());
        
    let store_name: String = conn.query_row("SELECT v FROM kv WHERE k = 'store_name'", [], |r| r.get(0))
        .optional()
        .map_err(|e| format!("get store_name: {e}"))?
        .unwrap_or_else(|| "总店".to_string());

    Ok(BrandSettings { brand_name, store_name })
}

#[tauri::command]
pub fn auth_account_update_profile(app: AppHandle, token: String, input: AuthAccountUpdateInput) -> Result<(), String> {
    let conn = open_db(&app)?;
    // Only Admin can update sensitive profiles like equity/salary
    let _ = require_admin(&conn, &token)?;

    let id = input.id.trim().to_string();
    if id.is_empty() { return Err("invalid_id".into()); }
    
    let now = crate::db::now_ts()?;
    
    let mut sql = "UPDATE auth_accounts SET ".to_string();
    let mut updates = vec![];
    let mut params_vals: Vec<Box<dyn rusqlite::ToSql>> = vec![];
    
    // Always update updated_at
    updates.push("updated_at = ?");
    params_vals.push(Box::new(now));

    // Optional fields
    if let Some(dn) = input.display_name {
        updates.push("display_name = ?");
        params_vals.push(Box::new(dn));
    }
    if let Some(eq) = input.equity {
        updates.push("equity = ?");
        params_vals.push(Box::new(eq));
    }
    if let Some(ph) = input.proxy_host {
        updates.push("proxy_host = ?");
        params_vals.push(Box::new(ph));
    }
    if let Some(sb) = input.salary_base {
        updates.push("salary_base = ?");
        params_vals.push(Box::new(sb));
    }
    if let Some(hd) = input.is_hidden {
        updates.push("is_hidden = ?");
        params_vals.push(Box::new(if hd { 1 } else { 0 }));
    }
    if let Some(prof) = input.profile {
        // ENCRYPT HERE
        let encrypted = crate::cipher::encrypt_data(&prof);
        updates.push("profile = ?");
        params_vals.push(Box::new(encrypted));
    }
    
    if updates.len() == 1 {
        return Ok(()); // Nothing to update
    }
    
    sql.push_str(&updates.join(", "));
    sql.push_str(" WHERE id = ?");
    params_vals.push(Box::new(id));
    
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    
    // Convert Vec<Box<dyn ToSql>> to slice of refs
    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vals.iter().map(|p| p.as_ref()).collect();
    
    stmt.execute(&*params_refs).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[derive(Debug, serde::Deserialize)]
pub struct AuthAccountUpdateInput {
    pub id: String,
    pub display_name: Option<String>,
    pub equity: Option<f64>,
    pub proxy_host: Option<String>,
    pub salary_base: Option<f64>,
    pub is_hidden: Option<bool>,
    pub profile: Option<String>, // JSON string
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct RoleRow {
    pub id: String,
    pub name: String,
    pub desc: String,
    pub user_count: i64,
    pub is_active: bool,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct ModuleRow {
    pub id: String,
    pub name: String,
    pub permissions: serde_json::Value,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct ApiRow {
    pub id: String,
    pub name: String,
    pub method: String,
    pub path: String,
    pub status: String,
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

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct AuthAccountRow {
    pub id: String,
    pub pick_name: String,
    pub display_name: String,
    pub role: String,
    pub identity: String,
    pub equity: f64,
    pub is_active: bool,
    pub proxy_host: Option<String>,
    pub is_hidden: bool,
    pub salary_base: f64,
    pub profile: Option<String>,
}

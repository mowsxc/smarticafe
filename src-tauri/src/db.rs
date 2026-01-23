use rusqlite::{params, Connection};
use tauri::{AppHandle, Manager};
use std::path::PathBuf;
use uuid::Uuid;
use crate::constants::DEFAULT_CATEGORY;

pub fn db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    std::fs::create_dir_all(&base).map_err(|e| format!("create_dir_all: {e}"))?;
    Ok(base.join("smarticafe.db"))
}

pub fn open_db(app: &AppHandle) -> Result<Connection, String> {
    let path = db_path(app)?;
    let conn = Connection::open(path).map_err(|e| format!("sqlite open: {e}"))?;
    
    init_db(&conn)?;
    
    let now = now_ts()?;
    ensure_auth_seed(&conn, now)?;
    ensure_employees_seed(&conn, now)?;
    ensure_products_seed(&conn, now)?;
    
    Ok(conn)
}

fn init_db(conn: &Connection) -> Result<(), String> {
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

    // Schema upgrades
    let _ = conn.execute_batch("ALTER TABLE shift_records ADD COLUMN income REAL NOT NULL DEFAULT 0;");
    let _ = conn.execute_batch(&format!("ALTER TABLE products ADD COLUMN category TEXT NOT NULL DEFAULT '{}';", DEFAULT_CATEGORY));
    
    Ok(())
}

fn ensure_auth_seed(_conn: &Connection, _now: i64) -> Result<(), String> {
    Ok(())
}

fn ensure_employees_seed(conn: &Connection, now: i64) -> Result<(), String> {
    let count: i64 = conn
        .query_row("SELECT COUNT(1) FROM employees", [], |r| r.get(0))
        .map_err(|e| format!("count employees: {e}"))?;
    if count == 0 {
        let names = vec!["莫健", "员工1", "员工2"];
        for (i, name) in names.into_iter().enumerate() {
            let _ = conn.execute(
                "INSERT INTO employees(id, name, sort_order, is_active, created_at, updated_at) VALUES(?1, ?2, ?3, 1, ?4, ?5)",
                params![Uuid::new_v4().to_string(), name, i as i64, now, now],
            );
        }
    }
    Ok(())
}

fn ensure_products_seed(conn: &Connection, now: i64) -> Result<(), String> {
    let count: i64 = conn
        .query_row("SELECT COUNT(1) FROM products", [], |r| r.get(0))
        .map_err(|e| format!("count products: {e}"))?;
    if count == 0 {
        // Reduced/Categorized items for cleaner list
        let items = vec![
            ("bc770a50-ee87-4008-90f0-c3a7c0689c6a", "东方树叶", "饮品", 8.0, 0.0, 12.0, 6.0),
            ("e3fd819b-4d83-4a0c-b0bd-0630a3475e0a", "东鹏", "饮品", 6.0, 0.0, 24.0, 10.0),
            ("5fdcf34f-e168-4199-8a33-d21319575629", "维他冰茶", "饮品", 5.0, 0.0, 12.0, 91.0),
            ("c8ab7099-d3a2-4ede-b1dd-e648eeed93a8", "乐虎", "饮品", 6.0, 0.0, 24.0, 6.0),
            ("61763fcc-08f1-4086-a1bf-725d7cc394bb", "卤蛋", "零食", 2.0, 0.0, 1.0, 14.0),
            ("b64067a4-8b4b-44c9-8ebf-b2f2aefc3a7c", "口味王(中)", "槟榔", 30.0, 0.0, 1.0, 0.0),
            ("e3e6a8cc-e42a-4906-b45b-b5c142277e0d", "信阳毛峰", "饮品", 6.0, 0.0, 12.0, 3.0),
            ("76a5f09f-57fb-4656-82e2-13a039c662d3", "百岁山", "饮品", 3.0, 0.0, 24.0, 11.0),
            ("b52ac3d1-371f-446b-b808-b32b17707efc", "红烧牛肉面", "零食", 6.0, 0.0, 1.0, 258.0),
            ("aed72ade-a13f-408d-8159-6ed49efa5517", "洁柔纸巾", "杂货", 1.0, 0.0, 1.0, 72.0),
        ];

        for (id, name, cat, up, cp, sp, st) in items {
            let _ = conn.execute(
                "INSERT INTO products(id, name, category, unit_price, cost_price, spec, on_shelf, stock, is_active, created_at, updated_at) 
                 VALUES(?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, 1, ?8, ?9)",
                params![id, name, cat, up, cp, sp, st, now, now],
            );
        }
    }
    Ok(())
}

pub fn now_ts() -> Result<i64, String> {
    use std::time::SystemTime;
    SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .map_err(|e| format!("time: {e}"))
}

pub fn now_ymd() -> Result<String, String> {
    use std::time::SystemTime;
    let secs = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .map_err(|e| format!("time: {e}"))?;
    
    let day_secs = 24 * 3600;
    let days = secs / day_secs;
    
    let mut days_rem = days;
    let mut year = 1970;
    
    loop {
        let leap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
        let year_days = if leap { 366 } else { 365 };
        if days_rem < year_days { break; }
        days_rem -= year_days;
        year += 1;
    }
    
    let leap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
    let month_days = if leap {
        [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    } else {
        [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };
    
    let mut month = 1;
    for mday in month_days.iter() {
        if days_rem < *mday { break; }
        days_rem -= *mday;
        month += 1;
    }
    
    Ok(format!("{:04}-{:02}-{:02}", year, month, days_rem + 1))
}

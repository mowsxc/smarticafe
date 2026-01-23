use tauri::AppHandle;
use rusqlite::{params, OptionalExtension};
use uuid::Uuid;
use sha2::{Digest, Sha256};
use crate::db::{open_db, now_ts, now_ymd};
use crate::state::{auth_resolve_account_id};
use crate::models::*;

#[tauri::command]
pub fn shift_record_insert(app: AppHandle, input: ShiftRecordInsertInput) -> Result<String, String> {
    let conn = open_db(&app)?;
    let now = now_ts()?;
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO shift_records(id, date_ymd, shift, employee, wangfei, shouhuo, meituan, zhichu, income, yingjiao, created_at)
         VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            id, input.date_ymd, input.shift, input.employee,
            input.wangfei, input.shouhuo, input.meituan, input.zhichu,
            input.income, input.yingjiao, now
        ]
    ).map_err(|e| format!("insert: {e}"))?;
    Ok(id)
}

#[tauri::command]
pub fn shift_snapshot_insert(app: AppHandle, input: ShiftSnapshotInsertInput) -> Result<String, String> {
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

    let existing: Option<String> = conn
        .query_row(
            "SELECT id FROM shift_snapshots WHERE shift_record_id = ?1",
            [shift_record_id],
            |r| r.get(0),
        )
        .optional()
        .map_err(|e| format!("query_row: {e}"))?;

    Ok(existing.unwrap_or(id))
}

#[tauri::command]
pub fn shift_snapshot_get(app: AppHandle, shift_record_id: String) -> Result<Option<ShiftSnapshotRow>, String> {
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
pub fn shift_records_list(
    app: AppHandle,
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
    let params: Vec<String> = vec![d, s, e].into_iter().filter(|x| !x.is_empty()).collect();
    
    let rows = match params.len() {
        0 => stmt.query_map([], map_row),
        1 => stmt.query_map([&params[0]], map_row),
        2 => stmt.query_map([&params[0], &params[1]], map_row),
        3 => stmt.query_map([&params[0], &params[1], &params[2]], map_row),
        _ => return Err(String::from("too many params")),
    }.map_err(|x| format!("query_map: {x}"))?;

    for r in rows {
        out.push(r.map_err(|x| format!("row: {x}"))?);
    }
    Ok(out)
}

#[tauri::command]
pub fn sales_orders_list(
    app: AppHandle,
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
    let params_v: Vec<String> = vec![d, s, e].into_iter().filter(|x| !x.is_empty()).collect();

    let map_order_row = |r: &rusqlite::Row<'_>| {
        Ok(SalesOrderRow {
            id: r.get(0)?,
            date_ymd: r.get(1)?,
            shift: r.get(2)?,
            employee: r.get(3)?,
            total_revenue: r.get(4)?,
            total_profit: r.get(5)?,
            created_at: r.get(6)?,
        })
    };

    let rows = match params_v.len() {
        0 => stmt.query_map([], map_order_row),
        1 => stmt.query_map([&params_v[0]], map_order_row),
        2 => stmt.query_map([&params_v[0], &params_v[1]], map_order_row),
        3 => stmt.query_map([&params_v[0], &params_v[1], &params_v[2]], map_order_row),
        _ => return Err(String::from("too many params")),
    }.map_err(|x| format!("query_map: {x}"))?;

    for r in rows {
        out.push(r.map_err(|x| format!("row: {x}"))?);
    }
    Ok(out)
}

#[tauri::command]
pub fn sales_items_list(app: AppHandle, order_id: String) -> Result<Vec<SalesItemRow>, String> {
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
pub fn accounting_entries_list(
    app: AppHandle,
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
    let mut params_v: Vec<String> = Vec::new();

    if !d.is_empty() {
        where_parts.push("date_ymd = ?");
        params_v.push(d);
    }
    if !s.is_empty() {
        where_parts.push("shift = ?");
        params_v.push(s);
    }
    if !e.is_empty() {
        where_parts.push("employee = ?");
        params_v.push(e);
    }
    if !t.is_empty() {
        where_parts.push("entry_type = ?");
        params_v.push(t);
    }

    if !where_parts.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&where_parts.join(" AND "));
    }
    sql.push_str(" ORDER BY created_at DESC LIMIT ");
    sql.push_str(&limit.to_string());

    let mut stmt = conn.prepare(&sql).map_err(|x| format!("prepare: {x}"))?;
    let mut out = Vec::new();

    let rows = stmt.query_map(rusqlite::params_from_iter(params_v), map_accounting_row).map_err(|x| format!("query_map: {x}"))?;
    for r in rows {
        out.push(r.map_err(|x| format!("row: {x}"))?);
    }

    Ok(out)
}

#[tauri::command]
pub fn meituan_orders_list(
    app: AppHandle,
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
    let mut params_v: Vec<String> = Vec::new();

    if !d.is_empty() {
        where_parts.push("date_ymd = ?");
        params_v.push(d);
    }
    if !s.is_empty() {
        where_parts.push("shift = ?");
        params_v.push(s);
    }
    if !e.is_empty() {
        where_parts.push("employee = ?");
        params_v.push(e);
    }

    if !where_parts.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&where_parts.join(" AND "));
    }
    sql.push_str(" ORDER BY created_at DESC LIMIT ");
    sql.push_str(&limit.to_string());

    let mut stmt = conn.prepare(&sql).map_err(|x| format!("prepare: {x}"))?;
    let mut out = Vec::new();

    let map_meituan_row = |r: &rusqlite::Row<'_>| {
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

    let rows = stmt.query_map(rusqlite::params_from_iter(params_v), map_meituan_row).map_err(|x| format!("query_map: {x}"))?;

    for r in rows {
        out.push(r.map_err(|x| format!("row: {x}"))?);
    }
    Ok(out)
}

#[tauri::command]
pub fn accounting_entries_create_from_shift(
    app: AppHandle,
    input: AccountingEntriesCreateFromShiftInput,
) -> Result<usize, String> {
    let mut conn = open_db(&app)?;
    let now = now_ts()?;

    let date_ymd = input.date_ymd.trim().to_string();
    let shift = input.shift.trim().to_string();
    let employee = input.employee.trim().to_string();
    if date_ymd.is_empty() || shift.is_empty() || employee.is_empty() {
        return Err(String::from("missing fields"));
    }

    let tx = conn.transaction().map_err(|e| format!("tx: {e}"))?;
    let mut inserted: usize = 0;

    for it in input.expenses.into_iter() {
        let item = it.item.trim().to_string();
        if item.is_empty() { continue; }
        let id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO accounting_entries(id, date_ymd, shift, employee, entry_type, item, amount, bar_pay, finance_pay, created_at) VALUES(?1, ?2, ?3, ?4, 'expense', ?5, ?6, ?7, ?8, ?9)",
            params![id, date_ymd, shift, employee, item, it.amount, it.bar_pay, it.finance_pay, now],
        ).map_err(|e| format!("insert expense: {e}"))?;
        inserted += 1;
    }

    for it in input.incomes.into_iter() {
        let item = it.item.trim().to_string();
        if item.is_empty() { continue; }
        let id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO accounting_entries(id, date_ymd, shift, employee, entry_type, item, amount, bar_pay, finance_pay, created_at) VALUES(?1, ?2, ?3, ?4, 'income', ?5, ?6, 0.0, 0.0, ?7)",
            params![id, date_ymd, shift, employee, item, it.amount, now],
        ).map_err(|e| format!("insert income: {e}"))?;
        inserted += 1;
    }

    tx.commit().map_err(|e| format!("commit: {e}"))?;
    Ok(inserted)
}

#[tauri::command]
pub fn sales_order_create_from_shift(
    app: AppHandle,
    input: SalesOrderCreateFromShiftInput,
) -> Result<String, String> {
    let mut conn = open_db(&app)?;
    let now = now_ts()?;

    let date_ymd = input.date_ymd.trim().to_string();
    let shift = input.shift.trim().to_string();
    let employee = input.employee.trim().to_string();
    if date_ymd.is_empty() || shift.is_empty() || employee.is_empty() {
        return Err(String::from("missing fields"));
    }

    let order_id = Uuid::new_v4().to_string();
    let tx = conn.transaction().map_err(|e| format!("tx: {e}"))?;

    let mut total_revenue: f64 = 0.0;
    let mut total_profit: f64 = 0.0;

    for it in input.items.iter() {
        let name = it.product_name.trim();
        if name.is_empty() { continue; }
        let revenue = it.revenue.unwrap_or(0.0);
        total_revenue += revenue;

        let sales_qty = it.sales.unwrap_or(0.0);
        let spec = it.spec.unwrap_or(1.0);
        let cost_price = it.cost_price.unwrap_or(0.0);
        let qty = if spec.abs() < 1e-9 { sales_qty } else { sales_qty / spec };
        total_profit += revenue - (qty * cost_price);
    }

    tx.execute(
        "INSERT INTO sales_orders(id, date_ymd, shift, employee, total_revenue, total_profit, created_at, updated_at) VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![order_id, date_ymd, shift, employee, total_revenue, total_profit, now, now],
    ).map_err(|e| format!("insert order: {e}"))?;

    for it in input.items.into_iter() {
        let product_name = it.product_name.trim().to_string();
        if product_name.is_empty() { continue; }
        let id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO sales_items(id, order_id, product_name, original, restock, remaining, redeem, redeem_mode, loss, purchase, stock_prev, stock, sales, revenue, unit_price, cost_price, spec, created_at)
             VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)",
            params![
                id, order_id, product_name, it.original, it.restock, it.remaining, 
                it.redeem, it.redeem_mode, it.loss, it.purchase, it.stock_prev, 
                it.stock, it.sales, it.revenue, it.unit_price, it.cost_price, it.spec, now
            ],
        ).map_err(|e| format!("insert item: {e}"))?;
    }

    tx.commit().map_err(|e| format!("commit: {e}"))?;
    Ok(order_id)
}

#[tauri::command]
pub fn pos_checkout(app: AppHandle, input: PosCheckoutInput) -> Result<String, String> {
    let mut conn = open_db(&app)?;
    let now = now_ts()?;
    let _actor_id = auth_resolve_account_id(&input.token).ok_or_else(|| String::from("unauthorized"))?;

    let tx = conn.transaction().map_err(|e| format!("tx: {e}"))?;
    let order_id = Uuid::new_v4().to_string();
    let mut total_revenue: f64 = 0.0;
    let mut total_profit: f64 = 0.0;

    for it in input.items.iter() {
        let product: ProductRow = tx.query_row(
            "SELECT id, name, category, unit_price, cost_price, spec, on_shelf, stock, is_active FROM products WHERE id = ?1",
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

        tx.execute("UPDATE products SET stock = stock - ?1, updated_at = ?2 WHERE id = ?3", params![it.quantity, now, it.product_id])
            .map_err(|e| format!("update stock: {e}"))?;

        let item_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO sales_items(id, order_id, product_name, sales, revenue, unit_price, cost_price, spec, created_at) VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![item_id, order_id, product.name, it.quantity, revenue, product.unit_price, product.cost_price, product.spec, now],
        ).map_err(|e| format!("insert_item: {e}"))?;
    }

    tx.execute(
        "INSERT INTO sales_orders(id, date_ymd, shift, employee, total_revenue, total_profit, created_at, updated_at) VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![order_id, input.date_ymd, input.shift, input.employee, total_revenue, total_profit, now, now],
    ).map_err(|e| format!("insert_order: {e}"))?;

    tx.commit().map_err(|e| format!("commit: {e}"))?;
    Ok(order_id)
}

#[tauri::command]
pub fn meituan_orders_import(app: AppHandle, input: MeituanOrdersImportInput) -> Result<usize, String> {
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

        if date_ymd.is_empty() || shift.is_empty() || employee.is_empty() || raw_text.is_empty() { continue; }

        let id = Uuid::new_v4().to_string();
        let n = tx.execute(
            "INSERT OR IGNORE INTO meituan_orders(id, date_ymd, shift, employee, coupon_no, raw_text, amount, discount, financial, bar_total, created_at) VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![id, date_ymd, shift, employee, coupon_no, raw_text, it.amount, it.discount, it.financial, it.bar_total, now],
        ).map_err(|e| format!("insert: {e}"))?;
        inserted += n as usize;
    }
    tx.commit().map_err(|e| format!("commit: {e}"))?;
    Ok(inserted)
}

#[tauri::command]
pub fn wallet_balance(app: AppHandle, token: String) -> Result<WalletBalance, String> {
    let conn = open_db(&app)?;
    let _ = auth_resolve_account_id(&token).ok_or_else(|| String::from("unauthorized"))?;

    let finance: f64 = conn.query_row("SELECT COALESCE(SUM(CASE WHEN entry_type = 'income' THEN amount ELSE -amount END), 0) FROM accounting_entries", [], |r| r.get(0)).unwrap_or(0.0);
    let meituan: f64 = conn.query_row("SELECT COALESCE(SUM(financial), 0) FROM meituan_orders", [], |r| r.get(0)).unwrap_or(0.0);

    Ok(WalletBalance {
        finance,
        meituan,
        amap: 0.0,
    })
}

#[tauri::command]
pub fn meituan_orders_pending(_app: AppHandle, token: String) -> Result<MeituanPending, String> {
    let _ = auth_resolve_account_id(&token).ok_or_else(|| String::from("unauthorized"))?;
    // Simplified: meituan pending orders can be those that are recently imported but not yet calculated in a shift
    Ok(MeituanPending { pending: 0.0 })
}

#[tauri::command]
pub fn shift_records_stats(app: AppHandle, token: String) -> Result<ShiftRecordsStats, String> {
    let conn = open_db(&app)?;
    let _ = auth_resolve_account_id(&token).ok_or_else(|| String::from("unauthorized"))?;

    let today = now_ymd()?;
    let today_count: i64 = conn.query_row("SELECT COUNT(1) FROM shift_records WHERE date_ymd = ?1", [&today], |r| r.get(0)).unwrap_or(0);
    let pending_count: i64 = conn.query_row("SELECT COUNT(1) FROM shift_records", [], |r| r.get(0)).unwrap_or(0);
    
    // Calculate total profit from sales_orders
    let total_profit: f64 = conn.query_row("SELECT COALESCE(SUM(total_profit), 0) FROM sales_orders", [], |r| r.get(0)).unwrap_or(0.0);
    
    // Month count
    let month_prefix = &today[0..7]; // YYYY-MM
    let month_count: i64 = conn.query_row("SELECT COUNT(1) FROM shift_records WHERE date_ymd LIKE ?1", [format!("{}%", month_prefix)], |r| r.get(0)).unwrap_or(0);

    Ok(ShiftRecordsStats {
        today: today_count,
        pending: pending_count,
        month: month_count,
        profit: total_profit,
    })
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct WalletBalance {
    pub finance: f64,
    pub meituan: f64,
    pub amap: f64,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct MeituanPending {
    pub pending: f64,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct ShiftRecordsStats {
    pub today: i64,
    pub pending: i64,
    pub month: i64,
    pub profit: f64,
}

use tauri::AppHandle;
use rusqlite::params;
use crate::db::open_db;
use crate::state::require_admin;
use crate::models::DbReplaceFromCloudInput;

#[tauri::command]
pub fn db_replace_from_cloud(app: AppHandle, input: DbReplaceFromCloudInput) -> Result<(), String> {
    let mut conn = open_db(&app)?;
    let _ = require_admin(&conn, input.token.trim())?;

    let tx = conn.transaction().map_err(|e| format!("tx: {e}"))?;

    tx.execute_batch(
        "DELETE FROM products;\
         DELETE FROM sales_items;\
         DELETE FROM sales_orders;\
         DELETE FROM accounting_entries;\
         DELETE FROM meituan_orders;\
         DELETE FROM shift_snapshots;\
         DELETE FROM shift_records;",
    )
    .map_err(|e| format!("delete: {e}"))?;

    if !input.auth_accounts.is_empty() {
        let mut stmt = tx
            .prepare(
                "INSERT INTO auth_accounts(id, pick_name, pass_salt, pass_hash, role, identity, display_name, equity, is_active, created_at, updated_at)\
                 VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11) ON CONFLICT(pick_name) DO UPDATE SET pass_salt=excluded.pass_salt, pass_hash=excluded.pass_hash, display_name=excluded.display_name, updated_at=excluded.updated_at",
            )
            .map_err(|e| format!("prepare auth_accounts: {e}"))?;
        for a in input.auth_accounts.iter() {
            if a.pass_hash != crate::constants::EMPTY_SHA256 {
                stmt.execute(params![
                    a.id, a.pick_name, a.pass_salt, a.pass_hash, a.role, a.identity,
                    a.display_name, a.equity, a.is_active, a.created_at, a.updated_at,
                ])
                .map_err(|e| format!("upsert auth_accounts: {e}"))?;
            }
        }
    }

    {
        let mut stmt = tx
            .prepare(
                "INSERT INTO products(id, name, category, unit_price, cost_price, spec, on_shelf, stock, is_active, created_at, updated_at)\
                 VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            )
            .map_err(|e| format!("prepare products: {e}"))?;
        for p in input.products.iter() {
            stmt.execute(params![
                p.id, p.name, p.category, p.unit_price, p.cost_price, p.spec,
                p.on_shelf, p.stock, if p.is_active { 1i64 } else { 0i64 },
                p.created_at, p.updated_at,
            ])
            .map_err(|e| format!("insert products: {e}"))?;
        }
    }

    {
        let mut stmt = tx
            .prepare(
                "INSERT INTO shift_records(id, date_ymd, shift, employee, wangfei, shouhuo, meituan, zhichu, income, yingjiao, created_at)\
                 VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            )
            .map_err(|e| format!("prepare shift_records: {e}"))?;
        for r in input.shift_records.iter() {
            stmt.execute(params![
                r.id, r.date_ymd, r.shift, r.employee, r.wangfei, r.shouhuo,
                r.meituan, r.zhichu, r.income, r.yingjiao, r.created_at,
            ])
            .map_err(|e| format!("insert shift_records: {e}"))?;
        }
    }

    {
        let mut stmt = tx
            .prepare(
                "INSERT INTO sales_orders(id, date_ymd, shift, employee, total_revenue, total_profit, created_at, updated_at)\
                 VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            )
            .map_err(|e| format!("prepare sales_orders: {e}"))?;
        for o in input.sales_orders.iter() {
            stmt.execute(params![
                o.id, o.date_ymd, o.shift, o.employee, o.total_revenue, o.total_profit,
                o.created_at, o.updated_at,
            ])
            .map_err(|e| format!("insert sales_orders: {e}"))?;
        }
    }

    {
        let mut stmt = tx
            .prepare(
                "INSERT INTO sales_items(id, order_id, product_name, original, restock, remaining, redeem, redeem_mode, loss, purchase, stock_prev, stock, sales, revenue, unit_price, cost_price, spec, created_at)\
                 VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)",
            )
            .map_err(|e| format!("prepare sales_items: {e}"))?;
        for it in input.sales_items.iter() {
            stmt.execute(params![
                it.id, it.order_id, it.product_name, it.original, it.restock, it.remaining,
                it.redeem, it.redeem_mode, it.loss, it.purchase, it.stock_prev, it.stock,
                it.sales, it.revenue, it.unit_price, it.cost_price, it.spec, it.created_at,
            ])
            .map_err(|e| format!("insert sales_items: {e}"))?;
        }
    }

    {
        let mut stmt = tx
            .prepare(
                "INSERT INTO accounting_entries(id, date_ymd, shift, employee, entry_type, item, amount, bar_pay, finance_pay, created_at)\
                 VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            )
            .map_err(|e| format!("prepare accounting_entries: {e}"))?;
        for it in input.accounting_entries.iter() {
            stmt.execute(params![
                it.id, it.date_ymd, it.shift, it.employee, it.entry_type, it.item,
                it.amount, it.bar_pay, it.finance_pay, it.created_at,
            ])
            .map_err(|e| format!("insert accounting_entries: {e}"))?;
        }
    }

    {
        let mut stmt = tx
            .prepare(
                "INSERT INTO meituan_orders(id, date_ymd, shift, employee, coupon_no, raw_text, amount, discount, financial, bar_total, created_at)\
                 VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            )
            .map_err(|e| format!("prepare meituan_orders: {e}"))?;
        for it in input.meituan_orders.iter() {
            stmt.execute(params![
                it.id, it.date_ymd, it.shift, it.employee, it.coupon_no, it.raw_text,
                it.amount, it.discount, it.financial, it.bar_total, it.created_at,
            ])
            .map_err(|e| format!("insert meituan_orders: {e}"))?;
        }
    }

    tx.commit().map_err(|e| format!("commit: {e}"))?;
    Ok(())
}

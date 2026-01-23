use tauri::AppHandle;
use rusqlite::params;
use uuid::Uuid;
use crate::db::{open_db, now_ts};
use crate::models::{ProductRow, ProductUpsertInput, MigrationStats};
use crate::commands::kv::load_kv_json;
use serde_json::Value;

#[tauri::command]
pub fn products_list(app: AppHandle, q: Option<String>, include_inactive: Option<bool>) -> Result<Vec<ProductRow>, String> {
    products_list_internal(app, q, include_inactive)
}

pub fn products_list_internal(app: AppHandle, q: Option<String>, include_inactive: Option<bool>) -> Result<Vec<ProductRow>, String> {
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
    let mut out = Vec::new();
    
    if qn.is_empty() {
        let rows = stmt
            .query_map([], map_product_row)
            .map_err(|e| format!("query_map: {e}"))?;
        for r in rows {
            out.push(r.map_err(|e| format!("row: {e}"))?);
        }
    } else {
        let rows = stmt
            .query_map([qn], map_product_row)
            .map_err(|e| format!("query_map: {e}"))?;
        for r in rows {
            out.push(r.map_err(|e| format!("row: {e}"))?);
        }
    }
    Ok(out)
}

#[tauri::command]
pub fn product_upsert(app: AppHandle, input: ProductUpsertInput) -> Result<ProductRow, String> {
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

    let category = input.category.unwrap_or_default().trim().to_string();
    let category = if category.is_empty() { crate::constants::DEFAULT_CATEGORY.to_string() } else { category };

    conn.execute(
        "INSERT INTO products(id, name, category, unit_price, cost_price, spec, on_shelf, stock, is_active, created_at, updated_at) 
         VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11) 
         ON CONFLICT(name) DO UPDATE SET 
            category=excluded.category, 
            unit_price=excluded.unit_price, 
            cost_price=excluded.cost_price, 
            spec=excluded.spec, 
            on_shelf=excluded.on_shelf, 
            stock=excluded.stock, 
            is_active=excluded.is_active, 
            updated_at=excluded.updated_at",
        params![
            id,
            name,
            category,
            input.unit_price,
            input.cost_price,
            input.spec,
            input.on_shelf,
            input.stock,
            if input.is_active.unwrap_or(true) { 1i64 } else { 0i64 },
            now,
            now
        ],
    )
    .map_err(|e| format!("execute: {e}"))?;

    let mut stmt = conn
        .prepare("SELECT id, name, category, unit_price, cost_price, spec, on_shelf, stock, is_active FROM products WHERE name = ?1")
        .map_err(|e| format!("prepare: {e}"))?;
    let row = stmt
        .query_row([name], |r| {
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
pub fn product_delete(app: AppHandle, id: String) -> Result<(), String> {
    let conn = open_db(&app)?;
    conn.execute("DELETE FROM products WHERE id = ?1", [id])
        .map_err(|e| format!("execute: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn migrate_products_from_kv(app: AppHandle) -> Result<MigrationStats, String> {
    let mut conn = open_db(&app)?;

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
        let on_shelf = obj.get("onShelf").and_then(|v| v.as_f64()).unwrap_or(1.0);
        let stock = obj.get("stock").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let category = obj
            .get("category")
            .and_then(|v| v.as_str())
            .unwrap_or("饮品")
            .trim()
            .to_string();
        let is_active = true;

        let id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO products(id, name, category, unit_price, cost_price, spec, on_shelf, stock, is_active, created_at, updated_at) 
             VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11) 
             ON CONFLICT(name) DO UPDATE SET 
                category=excluded.category, 
                unit_price=excluded.unit_price, 
                cost_price=excluded.cost_price, 
                spec=excluded.spec, 
                on_shelf=excluded.on_shelf, 
                stock=excluded.stock, 
                is_active=excluded.is_active, 
                updated_at=excluded.updated_at",
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

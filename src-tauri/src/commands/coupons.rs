use tauri::AppHandle;
use uuid::Uuid;
use crate::db::open_db;
use crate::state::{auth_resolve_account_id, require_admin};
use crate::models::{CouponRow, CouponUseInput, CouponCreateInput};

#[tauri::command]
pub fn coupons_list(app: AppHandle, token: String) -> Result<Vec<CouponRow>, String> {
    let _conn = open_db(&app)?;
    let _ = auth_resolve_account_id(&token).ok_or_else(|| String::from("unauthorized"))?;
    Ok(Vec::new())
}

#[tauri::command]
pub fn coupon_use(app: AppHandle, input: CouponUseInput) -> Result<bool, String> {
    let _conn = open_db(&app)?;
    let _ = auth_resolve_account_id(&input.token).ok_or_else(|| String::from("unauthorized"))?;
    Ok(true)
}

#[tauri::command]
pub fn coupon_create(app: AppHandle, input: CouponCreateInput) -> Result<String, String> {
    let conn = open_db(&app)?;
    let _ = require_admin(&conn, input.token.trim())?;
    Ok(format!("coupon_{}", Uuid::new_v4().to_string()))
}

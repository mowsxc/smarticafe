// Smarticafe V2.0.0
// Main Logic Entry Point

pub mod models;
pub mod db;
pub mod state;
pub mod commands;
pub mod http_server;
pub mod constants;

use crate::commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // 启动HTTP API服务器
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
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
            // System Commands
            open_external_webview,
            system_logs_list,
            system_log_add,
            system_log_clear,
            db_tables_info,
            api_stats,
            system_info,

            // Auth Commands
            auth_login,
            auth_employee_login,
            auth_bootstrap_required,
            auth_bootstrap_admin,
            auth_pick_list,
            auth_accounts_list,
            auth_set_password,
            auth_account_set_active,
            employees_list,
            employee_upsert,
            employee_set_active,
            roles_list,
            modules_list,
            api_list,
            operation_logs_list,

            // Product Commands
            products_list,
            product_upsert,
            product_delete,
            migrate_products_from_kv,

            // Sales & Shift Commands
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
            wallet_balance,
            meituan_orders_pending,
            shift_records_stats,

            // KV Commands
            kv_get,
            kv_set,
            kv_remove,
            kv_dump,

            // Coupon Commands
            coupons_list,
            coupon_use,
            coupon_create,

            // Finance Commands
            finance_daily_report,
            finance_weekly_report,
            finance_monthly_report,
            finance_dividend_report,

            // Cloud Sync Commands
            db_replace_from_cloud,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

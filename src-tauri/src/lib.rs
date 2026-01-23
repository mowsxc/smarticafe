// Smarticafe V2.0.0
// Main Logic Entry Point

pub mod models;
pub mod db;
pub mod state;
pub mod commands;
pub mod http_server;
pub mod constants;
pub mod cipher;

use crate::commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // 🔒 强制隐藏主窗口（防止"双层叠加"）
            use tauri::Manager;
            if let Some(main_window) = app.get_webview_window("main") {
                let _ = main_window.hide();
            }

            // ⏰ 兜底：5秒后强制关闭Splash，防止前端崩溃导致卡死
            let app_handle_clone = app.handle().clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(5000));
                use tauri::Manager;
                if let Some(splash) = app_handle_clone.get_webview_window("splashscreen") {
                    // 如果它还开着，就关了它
                    if splash.is_visible().unwrap_or(false) {
                        let _ = splash.close();
                        if let Some(main) = app_handle_clone.get_webview_window("main") {
                            let _ = main.show();
                            let _ = main.set_focus();
                        }
                    }
                }
            });

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
            close_splash,

            // Auth Commands
            auth_login,
            auth_employee_login,
            auth_bootstrap_required,
            auth_bootstrap_admin,
            auth_complete_setup,
            auth_save_setup_step,
            auth_get_setup_step,
            auth_dbg_fully_reset_accounts,
            debug_seed_full_data,
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
            auth_get_brand_settings,
            auth_update_brand_settings,
            auth_account_update_profile,

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

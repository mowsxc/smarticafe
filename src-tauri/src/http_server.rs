// HTTP API Server for Smarticafe
// 提供REST API，让浏览器也能访问真实数据

use axum::{
    extract::{Query, State, Path},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use rusqlite::OptionalExtension;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};

pub const API_HOST: [u8; 4] = [0, 0, 0, 0];
pub const API_PORT: u16 = 32520;

// 共享的AppHandle
pub struct AppState {
    pub app: tauri::AppHandle,
}

// API响应包装
#[derive(Serialize, Debug)]
struct ApiResponse<T> {
    success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

impl<T> ApiResponse<T> {
    fn ok(data: T) -> Json<Self> {
        Json(ApiResponse {
            success: true,
            data: Some(data),
            error: None,
        })
    }

    fn err(msg: String) -> (StatusCode, Json<Self>) {
        (
            StatusCode::BAD_REQUEST,
            Json(ApiResponse {
                success: false,
                data: None,
                error: Some(msg),
            }),
        )
    }
}

// ==================== API路由处理 ====================

// GET /api/products
#[derive(Deserialize)]
struct ProductsQuery {
    q: Option<String>,
    include_inactive: Option<bool>,
}

async fn api_products_list(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ProductsQuery>,
) -> Result<Json<ApiResponse<Value>>, (StatusCode, Json<ApiResponse<Value>>)> {
    match crate::commands::products::products_list_internal(state.app.clone(), params.q, params.include_inactive) {
        Ok(products) => {
            let json_value = serde_json::to_value(products).unwrap_or(Value::Null);
            Ok(ApiResponse::ok(json_value))
        }
        Err(e) => Err(ApiResponse::err(e)),
    }
}

// GET /api/meituan/orders
#[derive(Deserialize)]
struct MeituanQuery {
    date: Option<String>,
    limit: Option<i64>,
}

async fn api_meituan_orders(
    State(state): State<Arc<AppState>>,
    Query(params): Query<MeituanQuery>,
) -> Result<Json<ApiResponse<Value>>, (StatusCode, Json<ApiResponse<Value>>)> {
    let conn = crate::db::open_db(&state.app).map_err(|e| ApiResponse::<Value>::err(e))?;
    let date = params.date.unwrap_or_else(|| crate::db::now_ymd().unwrap_or_default());
    let limit = params.limit.unwrap_or(200);

    let mut stmt = conn
        .prepare("SELECT raw_text, amount, discount, financial, bar_total FROM meituan_orders WHERE date_ymd = ?1 ORDER BY created_at DESC LIMIT ?2")
        .map_err(|e| ApiResponse::<Value>::err(format!("prepare: {e}")))?;

    let orders = stmt
        .query_map([&date, &limit.to_string()], |row| {
            Ok(serde_json::json!({
                "raw_text": row.get::<_, String>(0)?,
                "amount": row.get::<_, f64>(1)?,
                "discount": row.get::<_, f64>(2)?,
                "financial": row.get::<_, f64>(3)?,
                "barPrice": row.get::<_, f64>(4)?,
            }))
        })
        .map_err(|e| ApiResponse::<Value>::err(format!("query: {e}")))?;

    let mut list = Vec::new();
    for o in orders {
        if let Ok(val) = o {
            list.push(val);
        }
    }

    Ok(ApiResponse::ok(serde_json::to_value(list).unwrap()))
}

#[derive(Deserialize)]
struct ShiftQuery {
    date: Option<String>,
    shift: Option<String>,
}

async fn api_shift_calculation(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ShiftQuery>,
) -> Result<Json<ApiResponse<Value>>, (StatusCode, Json<ApiResponse<Value>>)> {
    let conn = crate::db::open_db(&state.app).map_err(|e| ApiResponse::<Value>::err(e))?;
    let date = params.date.unwrap_or_else(|| crate::db::now_ymd().unwrap_or_default());
    let shift = params.shift.unwrap_or_else(|| String::from("白班"));

    let sales_total: f64 = conn
        .query_row(
            "SELECT SUM(total_revenue) FROM sales_orders WHERE date_ymd = ?1 AND shift = ?2",
            [&date, &shift],
            |r| r.get(0),
        )
        .optional()
        .map_err(|e| ApiResponse::<Value>::err(format!("sales: {e}")))?
        .unwrap_or(0.0);

    let meituan_total: f64 = conn
        .query_row(
            "SELECT SUM(bar_total) FROM meituan_orders WHERE date_ymd = ?1 AND shift = ?2",
            [&date, &shift],
            |r| r.get(0),
        )
        .optional()
        .map_err(|e| ApiResponse::<Value>::err(format!("meituan: {e}")))?
        .unwrap_or(0.0);

    let bar_pay: f64 = conn
        .query_row(
            "SELECT SUM(bar_pay) FROM accounting_entries WHERE date_ymd = ?1 AND shift = ?2 AND entry_type = '支出'",
            [&date, &shift],
            |r| r.get(0),
        )
        .optional()
        .map_err(|e| ApiResponse::<Value>::err(format!("bar_pay: {e}")))?
        .unwrap_or(0.0);

    let income: f64 = conn
        .query_row(
            "SELECT SUM(amount) FROM accounting_entries WHERE date_ymd = ?1 AND shift = ?2 AND entry_type = '入账'",
            [&date, &shift],
            |r| r.get(0),
        )
        .optional()
        .map_err(|e| ApiResponse::<Value>::err(format!("income: {e}")))?
        .unwrap_or(0.0);

    let internet_fee: f64 = 0.0; 
    let amount_due: f64 = internet_fee + sales_total - meituan_total - bar_pay;

    let result = serde_json::json!({
        "internetFee": internet_fee,
        "salesRevenue": sales_total,
        "meituanRevenue": meituan_total,
        "expenditure": bar_pay,
        "income": income,
        "barPay": bar_pay,
        "amountDue": amount_due
    });

    Ok(ApiResponse::ok(result))
}

async fn api_finance_accounting(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ShiftQuery>,
) -> Result<Json<ApiResponse<Value>>, (StatusCode, Json<ApiResponse<Value>>)> {
    let conn = crate::db::open_db(&state.app).map_err(|e| ApiResponse::<Value>::err(e))?;
    let date = params.date.unwrap_or_else(|| crate::db::now_ymd().unwrap_or_default());
    let shift = params.shift.unwrap_or_else(|| String::from("白班"));

    let mut stmt_exp = conn
        .prepare("SELECT item, amount, bar_pay, finance_pay FROM accounting_entries WHERE date_ymd = ?1 AND shift = ?2 AND (entry_type = '支出' OR entry_type = 'expense') ORDER BY created_at ASC")
        .map_err(|e| ApiResponse::<Value>::err(format!("prepare exp: {e}")))?;

    let expenses: Vec<Value> = stmt_exp
        .query_map([&date, &shift], |r| {
            Ok(serde_json::json!({
                "item": r.get::<_, String>(0)?,
                "amount": r.get::<_, f64>(1)?,
                "barPay": r.get::<_, f64>(2)?,
                "financePay": r.get::<_, f64>(3)?,
            }))
        })
        .map_err(|e| ApiResponse::<Value>::err(format!("query exp: {e}")))?
        .filter_map(|r| r.ok())
        .collect();

    let mut stmt_inc = conn
        .prepare("SELECT item, amount FROM accounting_entries WHERE date_ymd = ?1 AND shift = ?2 AND (entry_type = '入账' OR entry_type = 'income') ORDER BY created_at ASC")
        .map_err(|e| ApiResponse::<Value>::err(format!("prepare inc: {e}")))?;

    let incomes: Vec<Value> = stmt_inc
        .query_map([&date, &shift], |r| {
            Ok(serde_json::json!({
                "item": r.get::<_, String>(0)?,
                "amount": r.get::<_, f64>(1)?,
            }))
        })
        .map_err(|e| ApiResponse::<Value>::err(format!("query inc: {e}")))?
        .filter_map(|r| r.ok())
        .collect();

    let total_exp: f64 = expenses.iter().map(|v| v["amount"].as_f64().unwrap_or(0.0)).sum();
    let total_inc: f64 = incomes.iter().map(|v| v["amount"].as_f64().unwrap_or(0.0)).sum();
    let total_bar: f64 = expenses.iter().map(|v| v["barPay"].as_f64().unwrap_or(0.0)).sum();

    let result = serde_json::json!({
        "expenses": expenses,
        "incomes": incomes,
        "totalExpenditure": total_exp,
        "totalIncome": total_inc,
        "totalBarPay": total_bar
    });

    Ok(ApiResponse::ok(result))
}

// POST 接口：处理来自移动端的数据录入
async fn api_pos_checkout(
    State(state): State<Arc<AppState>>,
    Json(input): Json<crate::models::PosCheckoutInput>,
) -> Result<Json<ApiResponse<String>>, (StatusCode, Json<ApiResponse<String>>)> {
    match crate::commands::sales::pos_checkout(state.app.clone(), input) {
        Ok(order_id) => Ok(ApiResponse::ok(order_id)),
        Err(e) => Err(ApiResponse::err(e)),
    }
}

async fn api_shift_record_insert(
    State(state): State<Arc<AppState>>,
    Json(input): Json<crate::models::ShiftRecordInsertInput>,
) -> Result<Json<ApiResponse<String>>, (StatusCode, Json<ApiResponse<String>>)> {
    match crate::commands::sales::shift_record_insert(state.app.clone(), input) {
        Ok(id) => Ok(ApiResponse::ok(id)),
        Err(e) => Err(ApiResponse::err(e)),
    }
}

async fn api_accounting_create(
    State(state): State<Arc<AppState>>,
    Json(input): Json<crate::models::AccountingEntriesCreateFromShiftInput>,
) -> Result<Json<ApiResponse<usize>>, (StatusCode, Json<ApiResponse<usize>>)> {
    match crate::commands::sales::accounting_entries_create_from_shift(state.app.clone(), input) {
        Ok(count) => Ok(ApiResponse::ok(count)),
        Err(e) => Err(ApiResponse::err(e)),
    }
}

#[derive(Deserialize)]
struct AuthLoginPayload {
    input: crate::models::AuthLoginInput,
}

async fn api_auth_login(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<AuthLoginPayload>,
) -> Result<Json<ApiResponse<Value>>, (StatusCode, Json<ApiResponse<Value>>)> {
    match crate::commands::auth::auth_login(state.app.clone(), payload.input) {
        Ok(session) => Ok(ApiResponse::ok(serde_json::to_value(session).unwrap())),
        Err(e) => Err(ApiResponse::err(e)),
    }
}

async fn api_auth_employee_login(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<Value>,
) -> Result<Json<ApiResponse<Value>>, (StatusCode, Json<ApiResponse<Value>>)> {
    let pick_name = payload["pick_name"].as_str().unwrap_or_default().to_string();
    match crate::commands::auth::auth_employee_login(state.app.clone(), pick_name) {
        Ok(session) => Ok(ApiResponse::ok(serde_json::to_value(session).unwrap())),
        Err(e) => Err(ApiResponse::err(e)),
    }
}

async fn api_auth_pick_list(
    State(state): State<Arc<AppState>>,
) -> Result<Json<ApiResponse<Value>>, (StatusCode, Json<ApiResponse<Value>>)> {
    match crate::commands::auth::auth_pick_list(state.app.clone()) {
        Ok(list) => Ok(ApiResponse::ok(serde_json::to_value(list).unwrap())),
        Err(e) => Err(ApiResponse::err(e)),
    }
}

// 通用的 RPC 桥接处理函数 (处理那些没有显式定义路由的简单命令)
async fn api_rpc_handler(
    State(state): State<Arc<AppState>>,
    Path(cmd): Path<String>,
    Json(_args): Json<Value>,
) -> Result<Json<ApiResponse<Value>>, (StatusCode, Json<ApiResponse<Value>>)> {
    // 这里可以根据 cmd 进行路由分发，目前作为一种兜底方案
    match cmd.as_str() {
        "auth_bootstrap_required" => {
            match crate::commands::auth::auth_bootstrap_required(state.app.clone()) {
                Ok(v) => Ok(ApiResponse::ok(Value::Bool(v))),
                Err(e) => Err(ApiResponse::err(e)),
            }
        },
        "auth_bootstrap_admin" => {
            let input: crate::models::AuthBootstrapAdminInput = match serde_json::from_value(_args) {
                Ok(v) => v,
                Err(e) => return Err(ApiResponse::<Value>::err(format!("invalid_args: {}", e))),
            };
            
            match crate::commands::auth::auth_bootstrap_admin(state.app.clone(), input) {
                Ok(session) => Ok(ApiResponse::ok(serde_json::to_value(session).unwrap())),
                Err(e) => Err(ApiResponse::err(e)),
            }
        },
        "auth_get_brand_settings" => {
            match crate::commands::auth::auth_get_brand_settings(state.app.clone()) {
                Ok(v) => Ok(ApiResponse::ok(serde_json::to_value(v).unwrap())),
                Err(e) => Err(ApiResponse::err(e)),
            }
        },
        "kv_get" => {
             // kv_get takes a key string.
             let k = _args["key"].as_str().unwrap_or("").to_string();
             if k.is_empty() {
                 return Err(ApiResponse::err("missing_key".to_string()));
             }
             match crate::commands::kv::kv_get(state.app.clone(), k) {
                Ok(v) => Ok(ApiResponse::ok(serde_json::to_value(v).unwrap())),
                Err(e) => Err(ApiResponse::err(e)),
             }
        },
        "debug_seed_full_data" => {
            match crate::commands::auth::debug_seed_full_data(state.app.clone()) {
                Ok(msg) => Ok(ApiResponse::ok(Value::String(msg))),
                Err(e) => Err(ApiResponse::err(e)),
            }
        },
        "close_splash" => {
            match crate::commands::system::close_splash(state.app.clone()).await {
                Ok(_) => Ok(ApiResponse::ok(Value::Null)),
                Err(e) => Err(ApiResponse::err(e)),
            }
        },
        "auth_get_setup_step" => {
            match crate::commands::auth::auth_get_setup_step(state.app.clone()) {
                Ok(v) => Ok(ApiResponse::ok(serde_json::to_value(v).unwrap())),
                Err(e) => Err(ApiResponse::err(e)),
            }
        },
        "auth_save_setup_step" => {
            let step = _args["step"].as_i64().unwrap_or(1) as i32;
            match crate::commands::auth::auth_save_setup_step(state.app.clone(), step) {
                Ok(_) => Ok(ApiResponse::ok(Value::Null)),
                Err(e) => Err(ApiResponse::err(e)),
            }
        },
        "auth_save_setup_data" => {
            let key = _args["key"].as_str().unwrap_or("").to_string();
            let data = _args["data"].as_str().unwrap_or("").to_string();
            match crate::commands::auth::auth_save_setup_data(state.app.clone(), key, data) {
                Ok(_) => Ok(ApiResponse::ok(Value::Null)),
                Err(e) => Err(ApiResponse::err(e)),
            }
        },
        "auth_get_setup_data" => {
            let key = _args["key"].as_str().unwrap_or("").to_string();
            match crate::commands::auth::auth_get_setup_data(state.app.clone(), key) {
                Ok(v) => Ok(ApiResponse::ok(serde_json::to_value(v).unwrap())),
                Err(e) => Err(ApiResponse::err(e)),
            }
        },
        "auth_complete_setup" => {
            match crate::commands::auth::auth_complete_setup(state.app.clone()) {
                Ok(_) => Ok(ApiResponse::ok(Value::Null)),
                Err(e) => Err(ApiResponse::err(e)),
            }
        },
        "auth_dbg_fully_reset_accounts" => {
            match crate::commands::auth::auth_dbg_fully_reset_accounts(state.app.clone()) {
                Ok(_) => Ok(ApiResponse::ok(Value::Null)),
                Err(e) => Err(ApiResponse::err(e)),
            }
        },

        _ => Err(ApiResponse::err(format!("unsupported_rpc_cmd: {}", cmd))),
    }
}

// ==================== 服务器启动 ====================

pub async fn start_http_server(app: tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let state = Arc::new(AppState { app: app.clone() });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let api_routes = Router::new()
        .route("/products", get(api_products_list))
        .route("/meituan/orders", get(api_meituan_orders))
        .route("/shift/calculation", get(api_shift_calculation))
        .route("/shift/record", post(api_shift_record_insert))
        .route("/finance/accounting", get(api_finance_accounting).post(api_accounting_create))
        .route("/pos/checkout", post(api_pos_checkout))
        .route("/auth/login", post(api_auth_login))
        .route("/auth/employee_login", post(api_auth_employee_login))
        .route("/auth/pick_list", get(api_auth_pick_list))
        .route("/rpc/:cmd", post(api_rpc_handler));

    let app_router = Router::new()
        .route("/", get(|| async { "🚀 Smarticafe API Hub is running!" }))
        .nest("/api", api_routes)
        .layer(cors)
        .with_state(state);

    let addr = SocketAddr::from((API_HOST, API_PORT));
    println!("🚀 HTTP API Server started at http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app_router).await?;

    Ok(())
}

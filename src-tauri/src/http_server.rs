// HTTP API Server for Smarticafe Pro
// 提供REST API，让浏览器也能访问真实数据

use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use rusqlite::OptionalExtension;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};

pub const API_HOST: [u8; 4] = [127, 0, 0, 1];
pub const API_PORT: u16 = 32521;

// 共享的AppHandle
pub struct AppState {
    pub app: tauri::AppHandle,
}

// API响应包装
#[derive(Serialize)]
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

// ==================== API路由 ====================

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

// GET /api/shift/calculation
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

// GET /api/finance/accounting
async fn api_finance_accounting(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ShiftQuery>,
) -> Result<Json<ApiResponse<Value>>, (StatusCode, Json<ApiResponse<Value>>)> {
    let conn = crate::db::open_db(&state.app).map_err(|e| ApiResponse::<Value>::err(e))?;
    let date = params.date.unwrap_or_else(|| crate::db::now_ymd().unwrap_or_default());
    let shift = params.shift.unwrap_or_else(|| String::from("白班"));

    let mut stmt_exp = conn
        .prepare("SELECT item, amount, bar_pay, finance_pay FROM accounting_entries WHERE date_ymd = ?1 AND shift = ?2 AND entry_type = '支出' ORDER BY created_at ASC")
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
        .prepare("SELECT item, amount FROM accounting_entries WHERE date_ymd = ?1 AND shift = ?2 AND entry_type = '入账' ORDER BY created_at ASC")
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
        .route("/finance/accounting", get(api_finance_accounting));

    let app_router = Router::new()
        .nest("/api", api_routes)
        .layer(cors)
        .with_state(state);

    let addr = SocketAddr::from((API_HOST, API_PORT));
    println!("🚀 HTTP API Server started at http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app_router).await?;

    Ok(())
}

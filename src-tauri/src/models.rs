use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthSession {
    pub account_id: String,
    pub role: String,
    pub identity: String,
    pub name: String,
    pub equity: f64,
    pub token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthLoginInput {
    pub pick_name: String,
    pub password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthSetPasswordInput {
    pub token: String,
    pub id: String,
    pub new_password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthBootstrapAdminInput {
    pub pick_name: String,
    pub display_name: String,
    pub password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthPickList {
    pub employees: Vec<String>,
    pub bosses: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthAccountRow {
    pub id: String,
    pub pick_name: String,
    pub display_name: String,
    pub role: String,
    pub identity: String,
    pub equity: f64,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmployeeRow {
    pub id: String,
    pub name: String,
    pub sort_order: i64,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmployeeUpsertInput {
    pub token: String,
    pub id: Option<String>,
    pub name: String,
    pub sort_order: Option<i64>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmployeeSetActiveInput {
    pub token: String,
    pub id: String,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthAccountSetActiveInput {
    pub token: String,
    pub id: String,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemLog {
    pub id: i64,
    pub timestamp: String,
    pub level: String,
    pub module: String,
    pub message: String,
    pub details: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemLogInput {
    pub token: String,
    pub level: String,
    pub module: String,
    pub message: String,
    pub details: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductRow {
    pub id: String,
    pub name: String,
    pub category: String,
    pub unit_price: f64,
    pub cost_price: f64,
    pub spec: f64,
    pub on_shelf: f64,
    pub stock: f64,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductUpsertInput {
    pub id: Option<String>,
    pub name: String,
    pub category: Option<String>,
    pub unit_price: f64,
    pub cost_price: f64,
    pub spec: f64,
    pub on_shelf: f64,
    pub stock: f64,
    pub is_active: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShiftRecordInsertInput {
    pub date_ymd: String,
    pub shift: String,
    pub employee: String,
    pub wangfei: f64,
    pub shouhuo: f64,
    pub meituan: f64,
    pub zhichu: f64,
    pub income: f64,
    pub yingjiao: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShiftRecordRow {
    pub id: String,
    pub date_ymd: String,
    pub shift: String,
    pub employee: String,
    pub wangfei: f64,
    pub shouhuo: f64,
    pub meituan: f64,
    pub zhichu: f64,
    pub income: f64,
    pub yingjiao: f64,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShiftSnapshotInsertInput {
    pub shift_record_id: String,
    pub date_ymd: String,
    pub shift: String,
    pub employee: String,
    pub html: String,
    pub sha256: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShiftSnapshotRow {
    pub id: String,
    pub shift_record_id: String,
    pub date_ymd: String,
    pub shift: String,
    pub employee: String,
    pub html: String,
    pub sha256: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SalesOrderRow {
    pub id: String,
    pub date_ymd: String,
    pub shift: String,
    pub employee: String,
    pub total_revenue: f64,
    pub total_profit: f64,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SalesItemRow {
    pub id: String,
    pub order_id: String,
    pub product_name: String,
    pub original: Option<f64>,
    pub restock: Option<f64>,
    pub remaining: Option<f64>,
    pub redeem: Option<f64>,
    pub redeem_mode: Option<i64>,
    pub loss: Option<f64>,
    pub purchase: Option<f64>,
    pub stock_prev: Option<f64>,
    pub stock: Option<f64>,
    pub sales: Option<f64>,
    pub revenue: Option<f64>,
    pub unit_price: Option<f64>,
    pub cost_price: Option<f64>,
    pub spec: Option<f64>,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountingEntryRow {
    pub id: String,
    pub date_ymd: String,
    pub shift: String,
    pub employee: String,
    pub entry_type: String,
    pub item: String,
    pub amount: f64,
    pub bar_pay: f64,
    pub finance_pay: f64,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeituanOrderRow {
    pub id: String,
    pub date_ymd: String,
    pub shift: String,
    pub employee: String,
    pub coupon_no: Option<String>,
    pub raw_text: String,
    pub amount: f64,
    pub discount: f64,
    pub financial: f64,
    pub bar_total: f64,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeituanOrdersImportInput {
    pub items: Vec<MeituanOrderImportItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeituanOrderImportItem {
    pub date_ymd: String,
    pub shift: String,
    pub employee: String,
    pub coupon_no: Option<String>,
    pub raw_text: String,
    pub amount: f64,
    pub discount: f64,
    pub financial: f64,
    pub bar_total: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountingEntriesCreateFromShiftInput {
    pub date_ymd: String,
    pub shift: String,
    pub employee: String,
    pub expenses: Vec<AccountingEntryInput>,
    pub incomes: Vec<AccountingEntryInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountingEntryInput {
    pub item: String,
    pub amount: f64,
    pub bar_pay: f64,
    pub finance_pay: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SalesOrderCreateFromShiftInput {
    pub date_ymd: String,
    pub shift: String,
    pub employee: String,
    pub items: Vec<SalesItemInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SalesItemInput {
    pub product_name: String,
    pub original: Option<f64>,
    pub restock: Option<f64>,
    pub remaining: Option<f64>,
    pub redeem: Option<f64>,
    pub redeem_mode: Option<i64>,
    pub loss: Option<f64>,
    pub purchase: Option<f64>,
    pub stock_prev: Option<f64>,
    pub stock: Option<f64>,
    pub sales: Option<f64>,
    pub revenue: Option<f64>,
    pub unit_price: Option<f64>,
    pub cost_price: Option<f64>,
    pub spec: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PosCheckoutInput {
    pub token: String,
    pub date_ymd: String,
    pub shift: String,
    pub employee: String,
    pub items: Vec<PosItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PosItem {
    pub product_id: String,
    pub quantity: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MigrationStats {
    pub source_key: String,
    pub total: usize,
    pub imported: usize,
    pub skipped: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinanceDailyReport {
    pub date_ymd: String,
    pub total_income: f64,
    pub total_expense: f64,
    pub net_profit: f64,
    pub shift_count: i64,
    pub details: Vec<FinanceEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinanceEntry {
    pub item: String,
    pub amount: f64,
    pub type_: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinanceWeeklyReport {
    pub week_start: String,
    pub week_end: String,
    pub total_income: f64,
    pub total_expense: f64,
    pub net_profit: f64,
    pub daily_stats: Vec<DailyStat>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinanceMonthlyReport {
    pub month: String,
    pub total_income: f64,
    pub total_expense: f64,
    pub net_profit: f64,
    pub daily_stats: Vec<DailyStat>,
    pub category_stats: Vec<CategoryStat>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyStat {
    pub date_ymd: String,
    pub income: f64,
    pub expense: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryStat {
    pub category: String,
    pub income: f64,
    pub expense: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DividendReport {
    pub month: String,
    pub total_profit: f64,
    pub shareholders: Vec<ShareholderDividend>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShareholderDividend {
    pub name: String,
    pub equity: f64,
    pub dividend: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CouponRow {
    pub id: String,
    pub code: String,
    pub name: String,
    pub face_value: f64,
    pub status: String,
    pub created_at: i64,
    pub used_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CouponUseInput {
    pub token: String,
    pub code: String,
    pub order_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CouponCreateInput {
    pub token: String,
    pub name: String,
    pub face_value: f64,
    pub code: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DbReplaceFromCloudInput {
    pub token: String,
    pub auth_accounts: Vec<AuthAccountRowCloud>,
    pub products: Vec<ProductRowCloud>,
    pub shift_records: Vec<ShiftRecordRow>,
    pub sales_orders: Vec<SalesOrderRowCloud>,
    pub sales_items: Vec<SalesItemRow>,
    pub accounting_entries: Vec<AccountingEntryRow>,
    pub meituan_orders: Vec<MeituanOrderRow>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthAccountRowCloud {
    pub id: String,
    pub pick_name: String,
    pub pass_salt: String,
    pub pass_hash: String,
    pub role: String,
    pub identity: String,
    pub display_name: String,
    pub equity: f64,
    pub is_active: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductRowCloud {
    pub id: String,
    pub name: String,
    pub category: String,
    pub unit_price: f64,
    pub cost_price: f64,
    pub spec: f64,
    pub on_shelf: f64,
    pub stock: f64,
    pub is_active: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SalesOrderRowCloud {
    pub id: String,
    pub date_ymd: String,
    pub shift: String,
    pub employee: String,
    pub total_revenue: f64,
    pub total_profit: f64,
    pub created_at: i64,
    pub updated_at: i64,
}

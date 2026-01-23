use tauri::AppHandle;
use crate::db::open_db;
use crate::state::{auth_resolve_account_id};
use crate::models::{DailyStat, FinanceDailyReport, FinanceEntry, FinanceWeeklyReport, FinanceMonthlyReport, CategoryStat, DividendReport, ShareholderDividend};

#[tauri::command]
pub fn finance_daily_report(app: AppHandle, token: String, date_ymd: String) -> Result<FinanceDailyReport, String> {
    let conn = open_db(&app)?;
    let _ = auth_resolve_account_id(&token).ok_or_else(|| String::from("unauthorized"))?;

    let income: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM accounting_entries WHERE date_ymd = ?1 AND entry_type = 'income'",
        [date_ymd.clone()],
        |r| r.get(0)
    ).unwrap_or(0.0);

    let expense: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM accounting_entries WHERE date_ymd = ?1 AND entry_type = 'expense'",
        [date_ymd.clone()],
        |r| r.get(0)
    ).unwrap_or(0.0);

    let shift_count: i64 = conn.query_row(
        "SELECT COUNT(1) FROM shift_records WHERE date_ymd = ?1",
        [date_ymd.clone()],
        |r| r.get(0)
    ).unwrap_or(0);

    let mut details = Vec::new();
    let mut stmt = conn.prepare(
        "SELECT item, amount, entry_type FROM accounting_entries WHERE date_ymd = ?1 ORDER BY created_at DESC"
    ).map_err(|e| format!("prepare: {e}"))?;
    let mut rows = stmt.query([date_ymd.clone()]).map_err(|e| format!("query: {e}"))?;
    while let Some(r) = rows.next().map_err(|e| format!("next: {e}"))? {
        details.push(FinanceEntry {
            item: r.get(0).unwrap_or_default(),
            amount: r.get(1).unwrap_or(0.0),
            type_: r.get(2).unwrap_or_default(),
        });
    }

    Ok(FinanceDailyReport {
        date_ymd,
        total_income: income,
        total_expense: expense,
        net_profit: income - expense,
        shift_count,
        details,
    })
}

#[tauri::command]
pub fn finance_weekly_report(app: AppHandle, token: String, week_start: String) -> Result<FinanceWeeklyReport, String> {
    let conn = open_db(&app)?;
    let _ = auth_resolve_account_id(&token).ok_or_else(|| String::from("unauthorized"))?;

    let mut total_income = 0.0;
    let mut total_expense = 0.0;
    let mut daily_stats = Vec::new();

    let parts: Vec<&str> = week_start.split('-').collect();
    if parts.len() != 3 {
        return Err(String::from("invalid date format"));
    }
    let year: i32 = parts[0].parse().map_err(|_| String::from("invalid year"))?;
    let month: i32 = parts[1].parse().map_err(|_| String::from("invalid month"))?;
    let day: i32 = parts[2].parse().map_err(|_| String::from("invalid day"))?;

    for i in 0..7 {
        let mut current_day = day + i;
        let mut current_month = month;
        let mut current_year = year;

        while current_day > 28 {
            if current_month == 12 {
                current_month = 1;
                current_year += 1;
            } else {
                current_month += 1;
            }
            current_day -= 28;
        }

        let date_ymd = format!("{:04}-{:02}-{:02}", current_year, current_month, current_day);

        let income: f64 = conn.query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM accounting_entries WHERE date_ymd = ?1 AND entry_type = 'income'",
            [date_ymd.clone()],
            |r| r.get(0)
        ).unwrap_or(0.0);

        let expense: f64 = conn.query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM accounting_entries WHERE date_ymd = ?1 AND entry_type = 'expense'",
            [date_ymd.clone()],
            |r| r.get(0)
        ).unwrap_or(0.0);

        total_income += income;
        total_expense += expense;

        daily_stats.push(DailyStat {
            date_ymd,
            income,
            expense,
        });
    }

    let p = week_start.split('-').collect::<Vec<&str>>();
    let year: i32 = p[0].parse().unwrap();
    let month: i32 = p[1].parse().unwrap();
    let day: i32 = p[2].parse().unwrap();
    let mut end_day = day + 6;
    let mut end_month = month;
    let mut end_year = year;
    while end_day > 28 {
        if end_month == 12 { end_month = 1; end_year += 1; } else { end_month += 1; }
        end_day -= 28;
    }
    let week_end = format!("{:04}-{:02}-{:02}", end_year, end_month, end_day);

    Ok(FinanceWeeklyReport {
        week_start,
        week_end,
        total_income,
        total_expense,
        net_profit: total_income - total_expense,
        daily_stats,
    })
}

#[tauri::command]
pub fn finance_monthly_report(app: AppHandle, token: String, month: String) -> Result<FinanceMonthlyReport, String> {
    let conn = open_db(&app)?;
    let _ = auth_resolve_account_id(&token).ok_or_else(|| String::from("unauthorized"))?;

    let month_start = format!("{}-01", month);
    let month_end = format!("{}-31", month);

    let total_income: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM accounting_entries WHERE date_ymd >= ?1 AND date_ymd <= ?2 AND entry_type = 'income'",
        [month_start.clone(), month_end.clone()],
        |r| r.get(0)
    ).unwrap_or(0.0);

    let total_expense: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM accounting_entries WHERE date_ymd >= ?1 AND date_ymd <= ?2 AND entry_type = 'expense'",
        [month_start.clone(), month_end.clone()],
        |r| r.get(0)
    ).unwrap_or(0.0);

    let mut daily_stats = Vec::new();
    let mut stmt = conn.prepare(
        "SELECT date_ymd, COALESCE(SUM(CASE WHEN entry_type = 'income' THEN amount ELSE 0 END), 0), COALESCE(SUM(CASE WHEN entry_type = 'expense' THEN amount ELSE 0 END), 0) \
         FROM accounting_entries WHERE date_ymd >= ?1 AND date_ymd <= ?2 GROUP BY date_ymd ORDER BY date_ymd DESC"
    ).map_err(|e| format!("prepare: {e}"))?;
    let mut rows = stmt.query([month_start.clone(), month_end.clone()]).map_err(|e| format!("query: {e}"))?;
    while let Some(r) = rows.next().map_err(|e| format!("next: {e}"))? {
        daily_stats.push(DailyStat {
            date_ymd: r.get(0).unwrap_or_default(),
            income: r.get(1).unwrap_or(0.0),
            expense: r.get(2).unwrap_or(0.0),
        });
    }

    let mut category_stats = Vec::new();
    let mut stmt = conn.prepare(
        "SELECT item, COALESCE(SUM(CASE WHEN entry_type = 'income' THEN amount ELSE 0 END), 0), COALESCE(SUM(CASE WHEN entry_type = 'expense' THEN amount ELSE 0 END), 0) \
         FROM accounting_entries WHERE date_ymd >= ?1 AND date_ymd <= ?2 GROUP BY item ORDER BY SUM(amount) DESC"
    ).map_err(|e| format!("prepare: {e}"))?;
    let mut rows = stmt.query([month_start.clone(), month_end.clone()]).map_err(|e| format!("query: {e}"))?;
    while let Some(r) = rows.next().map_err(|e| format!("next: {e}"))? {
        let income = r.get(1).unwrap_or(0.0);
        let expense = r.get(2).unwrap_or(0.0);
        if income > 0.0 || expense > 0.0 {
            category_stats.push(CategoryStat {
                category: r.get(0).unwrap_or_default(),
                income,
                expense,
            });
        }
    }

    Ok(FinanceMonthlyReport {
        month,
        total_income,
        total_expense,
        net_profit: total_income - total_expense,
        daily_stats,
        category_stats,
    })
}

#[tauri::command]
pub fn finance_dividend_report(app: AppHandle, token: String, month: String) -> Result<DividendReport, String> {
    let conn = open_db(&app)?;
    let _ = auth_resolve_account_id(&token).ok_or_else(|| String::from("unauthorized"))?;

    let month_start = format!("{}-01", month);
    let month_end = format!("{}-31", month);

    let total_income: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM accounting_entries WHERE date_ymd >= ?1 AND date_ymd <= ?2 AND entry_type = 'income'",
        [month_start.clone(), month_end.clone()],
        |r| r.get(0)
    ).unwrap_or(0.0);

    let total_expense: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM accounting_entries WHERE date_ymd >= ?1 AND date_ymd <= ?2 AND entry_type = 'expense'",
        [month_start.clone(), month_end.clone()],
        |r| r.get(0)
    ).unwrap_or(0.0);

    let total_profit = total_income - total_expense;

    let mut shareholders: Vec<ShareholderDividend> = Vec::new();
    let mut stmt = conn.prepare(
        "SELECT display_name, equity FROM auth_accounts WHERE role = 'boss' AND is_active = 1 ORDER BY equity DESC, display_name ASC",
    ).map_err(|e| format!("prepare: {e}"))?;

    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?))
    }).map_err(|e| format!("query: {e}"))?;

    for r in rows {
        let (name, equity) = r.map_err(|e| format!("row: {e}"))?;
        let equity_safe = if equity.is_finite() && equity > 0.0 { equity } else { 0.0 };
        shareholders.push(ShareholderDividend {
            name,
            equity: equity_safe,
            dividend: total_profit * equity_safe,
        });
    }

    Ok(DividendReport {
        month,
        total_profit,
        shareholders,
    })
}

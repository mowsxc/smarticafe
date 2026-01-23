use rusqlite::Connection;
use std::path::PathBuf;

fn main() {
    let app_data = std::env::var("APPDATA").unwrap();
    let db_path = PathBuf::from(app_data).join("com.aszeromo.smarticafe").join("smarticafe.db");
    
    println!("Checking DB at: {:?}", db_path);
    
    if !db_path.exists() {
        println!("RESULT: DB_NOT_FOUND (Initialization will be required)");
        return;
    }

    let conn = Connection::open(&db_path).unwrap();
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM auth_accounts WHERE role='admin'", [], |r| r.get(0)).unwrap();
    
    println!("RESULT: ADMIN_COUNT={}", count);
    if count == 0 {
        println!("RESULT: BOOTSTRAP_REQUIRED=TRUE");
    } else {
        println!("RESULT: BOOTSTRAP_REQUIRED=FALSE");
    }
}

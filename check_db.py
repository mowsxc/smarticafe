import sqlite3
import os

db_path = os.path.join(os.environ['APPDATA'], 'com.aszeromo.smarticafe', 'smarticafe.db')
print(f"Checking database: {db_path}")

if not os.path.exists(db_path):
    print("Database file not found!")
    exit(0)

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check admin count
    cursor.execute("SELECT COUNT(*) FROM auth_accounts WHERE role='admin'")
    admin_count = cursor.fetchone()[0]
    print(f"ADMIN_COUNT: {admin_count}")
    
    # Check KV settings
    cursor.execute("SELECT k, v FROM kv")
    settings = cursor.fetchall()
    print(f"KV_SETTINGS: {settings}")
    
    conn.close()
except Exception as e:
    print(f"Error: {e}")

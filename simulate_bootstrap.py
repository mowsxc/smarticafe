import sqlite3
import os
import uuid
import time

db_path = os.path.join(os.environ['APPDATA'], 'com.aszeromo.smarticafe', 'smarticafe.db')

def bootstrap():
    print(f"Simulating bootstrap on: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    now = int(time.time())
    admin_id = str(uuid.uuid4())
    salt = str(uuid.uuid4())
    # Note: In real app, we use sha256_hex(salt:password)
    # This is just a test to see if insertion works
    password_hash = "mock_hash" 
    
    try:
        # Insert admin
        cursor.execute("""
            INSERT INTO auth_accounts(id, pick_name, pass_salt, pass_hash, role, identity, display_name, equity, is_active, created_at, updated_at)
            VALUES(?, ?, ?, ?, 'admin', 'admin', ?, 0, 1, ?, ?)
        """, (admin_id, 'admin', salt, password_hash, '超级管理员', now, now))
        
        # Insert brand settings
        cursor.execute("INSERT OR REPLACE INTO kv(k, v, updated_at) VALUES('brand_name', ?, ?)", ('创新意电竞', now))
        cursor.execute("INSERT OR REPLACE INTO kv(k, v, updated_at) VALUES('store_name', ?, ?)", ('广州总店', now))
        
        conn.commit()
        print("Bootstrap simulation SUCCESSFUL")
    except Exception as e:
        print(f"Bootstrap simulation FAILED: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    bootstrap()

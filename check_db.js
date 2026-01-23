const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.env.APPDATA, 'com.aszeromo.smarticafe', 'smarticafe.db');
console.log('Checking database at:', dbPath);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  db.get("SELECT COUNT(*) as count FROM auth_accounts WHERE role='admin'", [], (err, row) => {
    if (err) {
      console.error('Error querying auth_accounts:', err.message);
    } else {
      console.log('ADMIN_COUNT:', row.count);
      if (row.count === 0) {
        console.log('STATUS: BOOTSTRAP_REQUIRED');
      } else {
        console.log('STATUS: READY');
      }
    }
  });

  db.all("SELECT k, v FROM kv", [], (err, rows) => {
    if (err) {
      console.error('Error querying kv:', err.message);
    } else {
      console.log('KV_SETTINGS:', rows);
    }
    db.close();
  });
});

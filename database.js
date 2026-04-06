import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'aksharam.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
function initDb() {
  db.exec(`
    -- Items/Inventory
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      base_price REAL NOT NULL,
      shop_a_price REAL NOT NULL,
      shop_b_price REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Customers
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      email TEXT,
      mobile TEXT,
      gst_no TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(name, address)
    );

    -- Grants (advance payments)
    CREATE TABLE IF NOT EXISTS grants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      grant_date TEXT NOT NULL,
      amount REAL NOT NULL,
      notes TEXT,
      bill_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    -- Bills
    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_number TEXT NOT NULL UNIQUE,
      bill_date TEXT NOT NULL,
      customer_id INTEGER NOT NULL,
      subtotal REAL NOT NULL,
      grand_total REAL NOT NULL,
      origin TEXT DEFAULT 'direct',
      grant_id INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (grant_id) REFERENCES grants(id)
    );

    -- Bill Items
    CREATE TABLE IF NOT EXISTS bill_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      rate REAL NOT NULL,
      amount REAL NOT NULL,
      FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
    );

    -- Settings
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Insert default settings if they don't exist
  const defaultSettings = {
    shop_name: 'AKSHARAM STATIONERY AND MART',
    tagline: '',
    address: '',
    contact_number: '',
    gst_number: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    logo_base64: ''
  };

  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  const insertMany = db.transaction((settings) => {
    for (const [key, value] of Object.entries(settings)) {
      insertSetting.run(key, value);
    }
  });

  insertMany(defaultSettings);
}

initDb();

export default db;

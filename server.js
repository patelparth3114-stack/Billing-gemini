import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import db from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Helper functions
function generateShopPrices(basePrice) {
  const shopA = basePrice + Math.floor(Math.random() * 6) + 5;
  const shopB = basePrice + Math.floor(Math.random() * 6) + 10;
  return { shopA, shopB };
}

function getNextBillNumber(date) {
  const [year, month, day] = date.split('-');
  const prefix = \`B-\${day}\${month}\${year.slice(2)}\`;
  
  const stmt = db.prepare(\`
    SELECT bill_number FROM bills 
    WHERE bill_number LIKE ? 
    ORDER BY bill_number DESC LIMIT 1
  \`);
  const result = stmt.get(\`\${prefix}-%\`);
  
  let nextSeq = 1;
  if (result) {
    const lastSeq = parseInt(result.bill_number.split('-')[2], 10);
    nextSeq = lastSeq + 1;
  }
  
  return \`\${prefix}-\${nextSeq.toString().padStart(3, '0')}\`;
}

// --- API ROUTES ---

// Items
app.get('/api/items', (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM items ORDER BY name ASC').all();
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/items', (req, res) => {
  try {
    const { name, base_price } = req.body;
    const { shopA, shopB } = generateShopPrices(parseFloat(base_price));
    
    const stmt = db.prepare('INSERT INTO items (name, base_price, shop_a_price, shop_b_price) VALUES (?, ?, ?, ?)');
    const info = stmt.run(name, base_price, shopA, shopB);
    
    res.json({ success: true, data: { id: info.lastInsertRowid, name, base_price, shop_a_price: shopA, shop_b_price: shopB } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/items/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, base_price, shop_a_price, shop_b_price, regenerate } = req.body;
    
    let finalShopA = shop_a_price;
    let finalShopB = shop_b_price;
    
    if (regenerate) {
      const prices = generateShopPrices(parseFloat(base_price));
      finalShopA = prices.shopA;
      finalShopB = prices.shopB;
    }
    
    const stmt = db.prepare('UPDATE items SET name = ?, base_price = ?, shop_a_price = ?, shop_b_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(name, base_price, finalShopA, finalShopB, id);
    
    res.json({ success: true, data: { id, name, base_price, shop_a_price: finalShopA, shop_b_price: finalShopB } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/items/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if item is used in bills
    const checkStmt = db.prepare('SELECT COUNT(*) as count FROM bill_items WHERE item_name = (SELECT name FROM items WHERE id = ?)');
    const checkResult = checkStmt.get(id);
    
    if (checkResult.count > 0 && !req.query.force) {
      return res.status(400).json({ success: false, error: \`This item appears in \${checkResult.count} bills. Delete anyway?\`, requiresForce: true });
    }
    
    const stmt = db.prepare('DELETE FROM items WHERE id = ?');
    stmt.run(id);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Customers
app.get('/api/customers', (req, res) => {
  try {
    const customers = db.prepare('SELECT * FROM customers ORDER BY name ASC').all();
    res.json({ success: true, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/customers', (req, res) => {
  try {
    const { name, address, email, mobile, gst_no } = req.body;
    
    const stmt = db.prepare('INSERT INTO customers (name, address, email, mobile, gst_no) VALUES (?, ?, ?, ?, ?)');
    const info = stmt.run(name, address, email, mobile, gst_no);
    
    res.json({ success: true, data: { id: info.lastInsertRowid, name, address, email, mobile, gst_no } });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ success: false, error: 'Customer with this name and address already exists' });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

app.put('/api/customers/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, email, mobile, gst_no } = req.body;
    
    const stmt = db.prepare('UPDATE customers SET name = ?, address = ?, email = ?, mobile = ?, gst_no = ? WHERE id = ?');
    stmt.run(name, address, email, mobile, gst_no, id);
    
    res.json({ success: true });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ success: false, error: 'Customer with this name and address already exists' });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

app.delete('/api/customers/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM customers WHERE id = ?');
    stmt.run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bills
app.get('/api/bills', (req, res) => {
  try {
    const bills = db.prepare(\`
      SELECT b.*, c.name as customer_name 
      FROM bills b 
      JOIN customers c ON b.customer_id = c.id 
      ORDER BY b.created_at DESC
    \`).all();
    res.json({ success: true, data: bills });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/bills/next-number', (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ success: false, error: 'Date is required' });
    
    const nextNumber = getNextBillNumber(date);
    res.json({ success: true, data: { bill_number: nextNumber } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/bills/:id', (req, res) => {
  try {
    const { id } = req.params;
    const bill = db.prepare(\`
      SELECT b.*, c.name as customer_name, c.address as customer_address, c.gst_no as customer_gst, c.mobile as customer_mobile
      FROM bills b 
      JOIN customers c ON b.customer_id = c.id 
      WHERE b.id = ?
    \`).get(id);
    
    if (!bill) return res.status(404).json({ success: false, error: 'Bill not found' });
    
    const items = db.prepare('SELECT * FROM bill_items WHERE bill_id = ?').all(id);
    bill.items = items;
    
    res.json({ success: true, data: bill });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/bills', (req, res) => {
  const { bill_date, customer_id, subtotal, grand_total, origin, grant_id, notes, items } = req.body;
  
  const insertBill = db.transaction(() => {
    const bill_number = getNextBillNumber(bill_date);
    
    const stmt = db.prepare(\`
      INSERT INTO bills (bill_number, bill_date, customer_id, subtotal, grand_total, origin, grant_id, notes) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    \`);
    const info = stmt.run(bill_number, bill_date, customer_id, subtotal, grand_total, origin || 'direct', grant_id || null, notes || null);
    const billId = info.lastInsertRowid;
    
    const itemStmt = db.prepare('INSERT INTO bill_items (bill_id, item_name, quantity, rate, amount) VALUES (?, ?, ?, ?, ?)');
    for (const item of items) {
      itemStmt.run(billId, item.item_name, item.quantity, item.rate, item.amount);
    }
    
    if (grant_id) {
      db.prepare('UPDATE grants SET bill_id = ? WHERE id = ?').run(billId, grant_id);
    }
    
    return { id: billId, bill_number };
  });

  try {
    const result = insertBill();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/bills/:id', (req, res) => {
  const { id } = req.params;
  const { bill_date, customer_id, subtotal, grand_total, notes, items } = req.body;
  
  const updateBill = db.transaction(() => {
    // We don't change bill number on edit, even if date changes, to maintain record consistency unless requested
    const stmt = db.prepare(\`
      UPDATE bills SET bill_date = ?, customer_id = ?, subtotal = ?, grand_total = ?, notes = ? 
      WHERE id = ?
    \`);
    stmt.run(bill_date, customer_id, subtotal, grand_total, notes || null, id);
    
    // Delete old items and insert new ones
    db.prepare('DELETE FROM bill_items WHERE bill_id = ?').run(id);
    
    const itemStmt = db.prepare('INSERT INTO bill_items (bill_id, item_name, quantity, rate, amount) VALUES (?, ?, ?, ?, ?)');
    for (const item of items) {
      itemStmt.run(id, item.item_name, item.quantity, item.rate, item.amount);
    }
  });

  try {
    updateBill();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/bills/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // If it was from a grant, unlink it
    db.prepare('UPDATE grants SET bill_id = NULL WHERE bill_id = ?').run(id);
    
    const stmt = db.prepare('DELETE FROM bills WHERE id = ?');
    stmt.run(id);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/bills/:id/duplicate', (req, res) => {
  const { id } = req.params;
  const { date } = req.body;
  
  try {
    const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(id);
    if (!bill) return res.status(404).json({ success: false, error: 'Bill not found' });
    
    const items = db.prepare('SELECT * FROM bill_items WHERE bill_id = ?').all(id);
    
    const duplicateBill = db.transaction(() => {
      const bill_number = getNextBillNumber(date);
      
      const stmt = db.prepare(\`
        INSERT INTO bills (bill_number, bill_date, customer_id, subtotal, grand_total, origin, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      \`);
      const info = stmt.run(bill_number, date, bill.customer_id, bill.subtotal, bill.grand_total, 'direct', \`Duplicated from \${bill.bill_number}\`);
      const newBillId = info.lastInsertRowid;
      
      const itemStmt = db.prepare('INSERT INTO bill_items (bill_id, item_name, quantity, rate, amount) VALUES (?, ?, ?, ?, ?)');
      for (const item of items) {
        itemStmt.run(newBillId, item.item_name, item.quantity, item.rate, item.amount);
      }
      
      return { id: newBillId, bill_number };
    });
    
    const result = duplicateBill();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Grants
app.get('/api/grants', (req, res) => {
  try {
    const grants = db.prepare(\`
      SELECT g.*, c.name as customer_name 
      FROM grants g 
      JOIN customers c ON g.customer_id = c.id 
      ORDER BY g.created_at DESC
    \`).all();
    res.json({ success: true, data: grants });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/grants', (req, res) => {
  try {
    const { customer_id, grant_date, amount, notes } = req.body;
    
    const stmt = db.prepare('INSERT INTO grants (customer_id, grant_date, amount, notes) VALUES (?, ?, ?, ?)');
    const info = stmt.run(customer_id, grant_date, amount, notes);
    
    res.json({ success: true, data: { id: info.lastInsertRowid } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/grants/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { customer_id, grant_date, amount, notes } = req.body;
    
    const stmt = db.prepare('UPDATE grants SET customer_id = ?, grant_date = ?, amount = ?, notes = ? WHERE id = ?');
    stmt.run(customer_id, grant_date, amount, notes, id);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/grants/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM grants WHERE id = ?');
    stmt.run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Settings
app.get('/api/settings', (req, res) => {
  try {
    const settingsRows = db.prepare('SELECT * FROM settings').all();
    const settings = {};
    settingsRows.forEach(row => {
      settings[row.key] = row.value;
    });
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/settings', (req, res) => {
  try {
    const settings = req.body;
    const stmt = db.prepare('UPDATE settings SET value = ? WHERE key = ?');
    
    const updateSettings = db.transaction((settingsObj) => {
      for (const [key, value] of Object.entries(settingsObj)) {
        stmt.run(value, key);
      }
    });
    
    updateSettings(settings);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Catch-all route to serve index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(\`✅ Aksharam Billing Server running at http://localhost:\${PORT}\`);
  
  // Get local IP
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(\`📡 On your network: http://\${iface.address}:\${PORT}\`);
      }
    }
  }
});

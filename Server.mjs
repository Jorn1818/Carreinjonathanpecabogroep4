import "dotenv/config";
import express from 'express';
import path from 'path';
import fs from 'fs';
import sqlite3 from 'sqlite3';
import Stripe from 'stripe';
const __dirname = import.meta.dirname;

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;
const bookingsAdminKey = String(process.env.BOOKINGS_ADMIN_KEY || '').trim();

const db = new sqlite3.Database('database.db', (err) => {
  if (err) {
    console.error('Database error:', err)
    return
  }
  console.log('Database connected')

  db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      booking_id INTEGER PRIMARY KEY AUTOINCREMENT,
      machine_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      stripe_session_id TEXT,
      customer_name TEXT,
      customer_email TEXT,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creating bookings table:', err)
  })

  db.run(`ALTER TABLE bookings ADD COLUMN customer_name TEXT`, () => { });
  db.run(`ALTER TABLE bookings ADD COLUMN customer_email TEXT`, () => { });
})

function isValidIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function hasDateOverlap(machineId, startDate, endDate) {
  return new Promise((resolve, reject) => {
    db.get(
      `
      SELECT COUNT(1) AS count
      FROM bookings
      WHERE machine_id = ?
        AND (status = 'paid' OR (status = 'pending' AND expires_at > datetime('now')))
        AND NOT (end_date <= ? OR start_date >= ?)
      `,
      [machineId, startDate, endDate],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(Number(row?.count || 0) > 0);
      }
    );
  });
}

function loadSelectedOptionsForMachine(machineId, optionIds) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(optionIds) || optionIds.length === 0) {
      resolve([]);
      return;
    }

    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='machine_options'", (tableErr, tableRow) => {
      if (tableErr) {
        reject(tableErr);
        return;
      }

      const hasMachineOptions = !!tableRow;
      const placeholders = optionIds.map(() => '?').join(',');
      let sql = '';
      let params = [];

      if (hasMachineOptions) {
        sql = `
          SELECT DISTINCT
            o.option_id,
            o.name,
            o.extra_price,
            mo.machine_id
          FROM options o
          INNER JOIN machine_options mo ON mo.option_id = o.option_id
          WHERE mo.machine_id = ? AND o.option_id IN (${placeholders})
          ORDER BY o.option_id
        `;
        params = [machineId, ...optionIds];
      } else {
        sql = `
          SELECT *
          FROM options
          WHERE machine_id = ? AND option_id IN (${placeholders})
          ORDER BY option_id
        `;
        params = [machineId, ...optionIds];
      }

      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows || []);
      });
    });
  });
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'Public')));

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ error: 'STRIPE_SECRET_KEY is missing on the server.' });

    const payload = req.body || {};
    const machineId = Number(payload.machine_id);
    const days = Math.max(1, Number.parseInt(payload.days, 10) || 1);
    const startDate = String(payload.start_date || '').trim();
    const endDate = String(payload.end_date || '').trim();
    const customerName = String(payload.customer_name || '').trim();
    const customerEmail = String(payload.customer_email || '').trim();
    const optionIds = Array.isArray(payload.option_ids)
      ? payload.option_ids.map(id => Number(id)).filter(Number.isFinite)
      : [];

    if (!isValidIsoDate(startDate) || !isValidIsoDate(endDate) || endDate <= startDate) {
      return res.status(400).json({ error: 'Invalid rental dates. Please choose a valid start and end date.' });
    }

    if (!customerName || !customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return res.status(400).json({ error: 'Valid customer name and email are required.' });
    }

    const machine = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM machines WHERE machine_id = ?', [machineId], (err, row) => {
        if (err) reject(err); else resolve(row);
      });
    });

    if (!machine) return res.status(404).json({ error: 'Machine not found.' });

    const blocked = await hasDateOverlap(machineId, startDate, endDate);
    if (blocked) return res.status(409).json({ error: 'Machine is already booked for these dates.' });

    const validOptions = await loadSelectedOptionsForMachine(machineId, optionIds);
    const machinePrice = Math.round(Number(machine.price_per_day || 0) * 100);
    const optionsTotal = validOptions.reduce((sum, opt) => sum + Math.round(Number(opt.extra_price || 0) * 100), 0);
    const totalPrice = machinePrice * days + optionsTotal;

    const successUrl = payload.success_url || `${req.headers.origin || `http://${req.headers.host}`}/betaal.html?success=1&machine_id=${machineId}`;
    const cancelUrl = payload.cancel_url || `${req.headers.origin || `http://${req.headers.host}`}/betaal.html?machine_id=${machineId}`;

    const lineItems = [
      {
        quantity: days,
        price_data: {
          currency: 'eur',
          unit_amount: machinePrice,
          product_data: {
            name: `${machine.name} huur`,
            description: `${days} dag${days === 1 ? '' : 'en'} huren`,
          },
        },
      },
      ...validOptions.map(opt => ({
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: Math.round(Number(opt.extra_price || 0) * 100),
          product_data: { name: opt.name },
        },
      })),
    ];

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
      line_items: lineItems,
      metadata: {
        machine_id: String(machineId),
        days: String(days),
        start_date: startDate,
        end_date: endDate,
        customer_name: customerName,
        customer_email: customerEmail,
        total_price: String(totalPrice),
        selected_options: JSON.stringify(validOptions.map(opt => opt.option_id)),
      },
    });

    await new Promise((resolve, reject) => {
      db.run(
        `
        INSERT INTO bookings (machine_id, start_date, end_date, status, stripe_session_id, customer_name, customer_email, expires_at)
        VALUES (?, ?, ?, 'pending', ?, ?, ?, datetime('now', '+30 minutes'))
        `,
        [machineId, startDate, endDate, session.id, customerName, customerEmail],
        (insertErr) => { if (insertErr) reject(insertErr); else resolve(); }
      );
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ error: error.message || 'Failed to create checkout session.' });
  }
});

app.post('/api/confirm-booking', (req, res) => {
  const sessionId = String(req.body.session_id || '').trim();
  if (!sessionId) return res.status(400).json({ error: 'Missing session_id.' });

  db.get('SELECT * FROM bookings WHERE stripe_session_id = ?', [sessionId], (findErr, booking) => {
    if (findErr) return res.status(500).json({ error: 'Database error: ' + findErr.message });
    if (!booking) return res.status(404).json({ error: 'Booking not found for this session.' });

    const finalizeBooking = (customerName = '', customerEmail = '') => {
      db.run(
        `
        UPDATE bookings
        SET status = 'paid',
            expires_at = NULL,
            customer_name = ?,
            customer_email = ?
        WHERE stripe_session_id = ?
        `,
        [customerName, customerEmail, sessionId],
        (updateErr) => {
          if (updateErr) return res.status(500).json({ error: 'Database error: ' + updateErr.message });
          res.json({ ok: true });
        }
      );
    };

    if (!stripe) return finalizeBooking(booking.customer_name || '', booking.customer_email || '');

    stripe.checkout.sessions.retrieve(sessionId)
      .then((session) => {
        const customerName = String(
          session?.customer_details?.name ||
          session?.metadata?.customer_name ||
          booking.customer_name ||
          ''
        ).trim();
        const customerEmail = String(
          session?.customer_details?.email ||
          session?.customer_email ||
          session?.metadata?.customer_email ||
          booking.customer_email ||
          ''
        ).trim();
        finalizeBooking(customerName, customerEmail);
      })
      .catch((stripeErr) => {
        console.error('Stripe session fetch error (confirm-booking):', stripeErr);
        finalizeBooking(booking.customer_name || '', booking.customer_email || '');
      });
  });
});

app.get('/api/machines', (req, res) => {
  const category = req.query.category;
  let sql = 'SELECT * FROM machines';
  const params = [];
  if (category && category !== 'all') {
    sql += ' WHERE LOWER(TRIM(type)) = LOWER(TRIM(?))';
    params.push((category || '').trim());
  }
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error: ' + err.message });
    const result = (rows || []).map(r => ({ ...r, id: r.machine_id }));
    res.json(result);
  });
});


app.get('/api/options', (req, res) => {
  const machineId = req.query.machine_id;
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='machine_options'", (tableErr, tableRow) => {
    if (tableErr) return res.status(500).json({ error: 'Database error: ' + tableErr.message });

    const hasMachineOptions = !!tableRow;
    let sql = '';
    const params = [];

    if (hasMachineOptions) {
      sql = `
        SELECT DISTINCT
          o.option_id,
          o.name,
          o.extra_price,
          mo.machine_id
        FROM options o
        INNER JOIN machine_options mo ON mo.option_id = o.option_id
      `;
      if (machineId) { sql += ' WHERE mo.machine_id = ?'; params.push(machineId); }
      sql += ' ORDER BY o.option_id';
    } else {
      sql = 'SELECT * FROM options';
      if (machineId) { sql += ' WHERE machine_id = ?'; params.push(machineId); }
      sql += ' ORDER BY option_id';
    }

    db.all(sql, params, (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error: ' + err.message });
      res.json(rows || []);
    });
  });
});

app.get('/api/payment-summary', (req, res) => {
  const machineId = Number(req.query.machine_id);
  const days = Math.max(1, Number.parseInt(req.query.days || '1', 10) || 1);
  const optionIdsParam = req.query.options || '[]';

  db.get('SELECT * FROM machines WHERE machine_id = ?', [machineId], (machineErr, machine) => {
    if (machineErr) return res.status(500).json({ error: 'Database error: ' + machineErr.message });
    if (!machine) return res.status(404).json({ error: 'Machine not found.' });

    let optionIds = [];
    try { const parsed = JSON.parse(optionIdsParam); optionIds = Array.isArray(parsed) ? parsed.map(id => Number(id)).filter(Number.isFinite) : []; } catch { optionIds = []; }

    if (optionIds.length === 0) {
      const basePrice = Math.round(Number(machine.price_per_day || 0) * days);
      return res.json({ machine, days, selectedOptions: [], basePrice, optionsPrice: 0, totalPrice: basePrice });
    }

    loadSelectedOptionsForMachine(machineId, optionIds)
      .then((validOptions) => {
        const basePrice = Math.round(Number(machine.price_per_day || 0) * days);
        const optionsPrice = validOptions.reduce((sum, opt) => sum + Number(opt.extra_price || 0), 0);
        const totalPrice = Math.round(basePrice + optionsPrice);
        res.json({ machine, days, selectedOptions: validOptions, basePrice, optionsPrice, totalPrice });
      })
      .catch((optionsErr) => res.status(500).json({ error: 'Database error: ' + optionsErr.message }));
  });
});

app.get('/api/categories', (req, res) => {
  db.all('SELECT DISTINCT type FROM machines ORDER BY type', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error: ' + err.message });
    const categories = (rows || []).map(r => (r.type || '').toString().trim()).filter(Boolean);
    res.json(categories);
  });
});

app.get('/api/machine-availability', (req, res) => {
  const machineId = Number(req.query.machine_id);
  const startDate = String(req.query.start_date || '').trim();
  const endDate = String(req.query.end_date || '').trim();

  if (!Number.isFinite(machineId) || machineId <= 0) return res.status(400).json({ error: 'Invalid machine_id.' });
  if (!isValidIsoDate(startDate) || !isValidIsoDate(endDate) || endDate <= startDate) return res.status(400).json({ error: 'Invalid date range.' });

  hasDateOverlap(machineId, startDate, endDate)
    .then((blocked) => res.json({ machine_id: machineId, start_date: startDate, end_date: endDate, available: !blocked }))
    .catch((availabilityErr) => res.status(500).json({ error: 'Database error: ' + availabilityErr.message }));
});

app.get('/api/machine-booked-dates', (req, res) => {
  const machineId = Number(req.query.machine_id);
  if (!Number.isFinite(machineId) || machineId <= 0) return res.status(400).json({ error: 'Invalid machine_id.' });

  db.all(
    `SELECT start_date, end_date, customer_name FROM bookings WHERE machine_id = ? AND status = 'paid' ORDER BY start_date ASC`,
    [machineId],
    (err, rows) => { if (err) return res.status(500).json({ error: 'Database error: ' + err.message }); res.json(rows || []); }
  );
});

app.get('/api/admin/bookings', (req, res) => {
  const providedKey = String(req.headers['x-admin-key'] || '').trim();
  if (!bookingsAdminKey || providedKey !== bookingsAdminKey) return res.status(401).json({ error: 'Unauthorized' });

  db.all(
    `
    SELECT
      b.booking_id,
      b.machine_id,
      m.name AS machine_name,
      b.start_date,
      b.end_date,
      b.status,
      b.customer_name,
      b.customer_email,
      b.created_at
    FROM bookings b
    LEFT JOIN machines m ON m.machine_id = b.machine_id
    WHERE b.status = 'paid'
    ORDER BY b.start_date ASC, b.machine_id ASC
    `,
    (err, rows) => { if (err) return res.status(500).json({ error: 'Database error: ' + err.message }); res.json(rows || []); }
  );
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Public', 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server luistert op http://localhost:${port}`));
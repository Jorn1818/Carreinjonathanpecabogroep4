import "dotenv/config";
import http from "http"
import path from "path";
import fs from "fs";
import sqlite3 from "sqlite3";
import Stripe from "stripe";
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
    if (err) {
      console.error('Error creating bookings table:', err)
    } else {
      console.log('Bookings table ready')
    }
  })

  db.run(`ALTER TABLE bookings ADD COLUMN customer_name TEXT`, () => {});
  db.run(`ALTER TABLE bookings ADD COLUMN customer_email TEXT`, () => {});
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

const server = http.createServer((req, res) => {
  if (req.method === 'POST') {
    try {
      const urlObj = new URL(req.url, `http://${req.headers.host}`);

      if (urlObj.pathname === '/api/create-checkout-session') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', () => {
          (async () => {
            try {
              if (!stripe) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'STRIPE_SECRET_KEY is missing on the server.' }));
                return;
              }

              const payload = body ? JSON.parse(body) : {};
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
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Invalid rental dates. Please choose a valid start and end date.' }));
                return;
              }

              if (!customerName || !customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Valid customer name and email are required.' }));
                return;
              }

              const machine = await new Promise((resolve, reject) => {
                db.get('SELECT * FROM machines WHERE machine_id = ?', [machineId], (err, row) => {
                  if (err) reject(err);
                  else resolve(row);
                });
              });

              if (!machine) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Machine not found.' }));
                return;
              }

              const blocked = await hasDateOverlap(machineId, startDate, endDate);
              if (blocked) {
                res.statusCode = 409;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Machine is already booked for these dates.' }));
                return;
              }

              const validOptions = await loadSelectedOptionsForMachine(machineId, optionIds);
              const machinePrice = Math.round(Number(machine.price_per_day || 0) * 100);
              // Options are charged once per booking (not per day)
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
                  // one-time option fee
                  quantity: 1,
                  price_data: {
                    currency: 'eur',
                    unit_amount: Math.round(Number(opt.extra_price || 0) * 100),
                    product_data: {
                      name: opt.name,
                    },
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
                  (insertErr) => {
                    if (insertErr) reject(insertErr);
                    else resolve();
                  }
                );
              });

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ url: session.url }));
            } catch (error) {
              console.error('Stripe checkout error:', error);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error.message || 'Failed to create checkout session.' }));
            }
          })();
        });
        return;
      }

      if (urlObj.pathname === '/api/confirm-booking') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', () => {
          let payload = {};
          try {
            payload = body ? JSON.parse(body) : {};
          } catch {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Invalid JSON body.' }));
            return;
          }

          const sessionId = String(payload.session_id || '').trim();
          if (!sessionId) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Missing session_id.' }));
            return;
          }

          db.get('SELECT * FROM bookings WHERE stripe_session_id = ?', [sessionId], (findErr, booking) => {
            if (findErr) {
              console.error('Database query error (confirm-booking find):', findErr)
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Database error: ' + findErr.message }))
              return
            }

            if (!booking) {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Booking not found for this session.' }));
              return;
            }

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
                  if (updateErr) {
                    console.error('Database query error (confirm-booking update):', updateErr)
                    res.statusCode = 500
                    res.setHeader('Content-Type', 'application/json')
                    res.end(JSON.stringify({ error: 'Database error: ' + updateErr.message }))
                    return
                  }

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ ok: true }));
                }
              );
            };

            if (!stripe) {
              finalizeBooking(booking.customer_name || '', booking.customer_email || '');
              return;
            }

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
        return;
      }
    } catch (e) {
      console.error('POST URL parse error:', e);
    }
  }

  if (req.method === 'GET') {
    try {
      const urlObj = new URL(req.url, `http://${req.headers.host}`);
      if (urlObj.pathname === '/api/machines') {
        const category = urlObj.searchParams.get('category');
        let sql = 'SELECT * FROM machines';
        const params = [];
        if (category && category !== 'all') {
          sql += ' WHERE LOWER(TRIM(type)) = LOWER(TRIM(?))';
          params.push((category || '').trim());
          console.log('Machines query with category (normalized):', (category || '').trim());
        }
        db.all(sql, params, (err, rows) => {
          if (err) {
            console.error('Database query error:', err)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Database error: ' + err.message }))
            return
          }
          const result = (rows || []).map(r => ({ ...r, id: r.machine_id }));
          console.log('Machines retrieved:', result)
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(result))
        })
        return
      }

      if (urlObj.pathname === '/api/options') {
        const machineId = urlObj.searchParams.get('machine_id');
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='machine_options'", (tableErr, tableRow) => {
          if (tableErr) {
            console.error('Database query error (options/table check):', tableErr)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Database error: ' + tableErr.message }))
            return
          }

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
            if (machineId) {
              sql += ' WHERE mo.machine_id = ?';
              params.push(machineId);
            }
            sql += ' ORDER BY o.option_id';
          } else {
            sql = 'SELECT * FROM options';
            if (machineId) {
              sql += ' WHERE machine_id = ?';
              params.push(machineId);
            }
            sql += ' ORDER BY option_id';
          }

          db.all(sql, params, (err, rows) => {
            if (err) {
              console.error('Database query error (options):', err)
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Database error: ' + err.message }))
              return
            }
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(rows || []))
          })
        })
        return
      }

      if (urlObj.pathname === '/api/payment-summary') {
        const machineId = Number(urlObj.searchParams.get('machine_id'));
        const days = Math.max(1, Number.parseInt(urlObj.searchParams.get('days') || '1', 10) || 1);
        const optionIdsParam = urlObj.searchParams.get('options') || '[]';

        db.get('SELECT * FROM machines WHERE machine_id = ?', [machineId], (machineErr, machine) => {
          if (machineErr) {
            console.error('Database query error (payment-summary machine):', machineErr)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Database error: ' + machineErr.message }))
            return
          }

          if (!machine) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Machine not found.' }));
            return;
          }

          let optionIds = [];
          try {
            const parsed = JSON.parse(optionIdsParam);
            optionIds = Array.isArray(parsed) ? parsed.map(id => Number(id)).filter(Number.isFinite) : [];
          } catch {
            optionIds = [];
          }

          if (optionIds.length === 0) {
            const basePrice = Math.round(Number(machine.price_per_day || 0) * days);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              machine,
              days,
              selectedOptions: [],
              basePrice,
              optionsPrice: 0,
              totalPrice: basePrice,
            }));
            return;
          }

          loadSelectedOptionsForMachine(machineId, optionIds)
            .then((validOptions) => {
              const basePrice = Math.round(Number(machine.price_per_day || 0) * days);
              // Options are one-time fees, not per-day
              const optionsPrice = validOptions.reduce((sum, opt) => sum + Number(opt.extra_price || 0), 0);
              const totalPrice = Math.round(basePrice + optionsPrice);

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                machine,
                days,
                selectedOptions: validOptions,
                basePrice,
                optionsPrice,
                totalPrice,
              }));
            })
            .catch((optionsErr) => {
              console.error('Database query error (payment-summary options):', optionsErr)
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Database error: ' + optionsErr.message }))
            });
        });
        return;
      }

      if (urlObj.pathname === '/api/categories') {
        db.all('SELECT DISTINCT type FROM machines ORDER BY type', (err, rows) => {
          if (err) {
            console.error('Database query error (categories):', err)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Database error: ' + err.message }))
            return
          }
          const categories = (rows || [])
            .map(r => (r.type || '').toString().trim())
            .filter(Boolean);
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(categories))
        })
        return
      }

      if (urlObj.pathname === '/api/machine-availability') {
        const machineId = Number(urlObj.searchParams.get('machine_id'));
        const startDate = String(urlObj.searchParams.get('start_date') || '').trim();
        const endDate = String(urlObj.searchParams.get('end_date') || '').trim();

        if (!Number.isFinite(machineId) || machineId <= 0) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Invalid machine_id.' }));
          return;
        }

        if (!isValidIsoDate(startDate) || !isValidIsoDate(endDate) || endDate <= startDate) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Invalid date range.' }));
          return;
        }

        hasDateOverlap(machineId, startDate, endDate)
          .then((blocked) => {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              machine_id: machineId,
              start_date: startDate,
              end_date: endDate,
              available: !blocked,
            }));
          })
          .catch((availabilityErr) => {
            console.error('Database query error (machine-availability):', availabilityErr)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Database error: ' + availabilityErr.message }))
          });
        return;
      }

      if (urlObj.pathname === '/api/machine-booked-dates') {
        const machineId = Number(urlObj.searchParams.get('machine_id'));

        if (!Number.isFinite(machineId) || machineId <= 0) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Invalid machine_id.' }));
          return;
        }

        db.all(
          `
          SELECT start_date, end_date, customer_name
          FROM bookings
          WHERE machine_id = ? AND status = 'paid'
          ORDER BY start_date ASC
          `,
          [machineId],
          (err, rows) => {
            if (err) {
              console.error('Database query error (machine-booked-dates):', err)
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Database error: ' + err.message }))
              return
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(rows || []));
          }
        );
        return;
      }

      if (urlObj.pathname === '/api/admin/bookings') {
        const providedKey = String(req.headers['x-admin-key'] || '').trim();
        if (!bookingsAdminKey || providedKey !== bookingsAdminKey) {
          res.statusCode = 401;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }

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
          (err, rows) => {
            if (err) {
              console.error('Database query error (admin bookings):', err)
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Database error: ' + err.message }))
              return
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(rows || []));
          }
        );
        return;
      }
    } catch (e) {
      console.error('URL parse error:', e)
    }
  }

  if (req.method === 'GET' && req.url === '/') {
    const filePath = path.join(__dirname, 'Public', 'index.html')
    fs.readFile(filePath, 'utf8', (err, inhoud) => {
      if (err) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.end('Fout bij het lezen van het bestand.')
        return
      }
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.end(inhoud)
    })
  } else if (req.method === 'GET') {
    const rawUrl = decodeURIComponent(req.url.split('?')[0].split('#')[0] || '');
    const requestedPath = rawUrl.replace(/^\/+/, '');
    const filePath = path.join(__dirname, 'Public', requestedPath || '');
    fs.readFile(filePath, (err, inhoud) => {
      if (err) {
        res.statusCode = 404
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.end('Bestand niet gevonden')
        return
      }
      
      let contentType = 'text/plain'
      if (rawUrl.endsWith('.css')) contentType = 'text/css'
      else if (rawUrl.endsWith('.js')) contentType = 'application/javascript'
      else if (rawUrl.endsWith('.html')) contentType = 'text/html'
      else if (rawUrl.endsWith('.jpg') || rawUrl.endsWith('.jpeg')) contentType = 'image/jpeg'
      else if (rawUrl.endsWith('.png')) contentType = 'image/png'
      else if (rawUrl.endsWith('.webp')) contentType = 'image/webp'
      else if (rawUrl.endsWith('.gif')) contentType = 'image/gif'
      else
      {
        contentType = 'text/html'

      }

      res.statusCode = 200
      res.setHeader('Content-Type', contentType)
      res.end(inhoud)
    })
  } else {
    res.statusCode = 404
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end('Pagina niet gevonden')
  }
});
server.listen(3000, () => {
  console.log('Server luistert op http://localhost:3000');
});
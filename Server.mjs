import http from "http"
import path from "path";
import fs from "fs";
import sqlite3 from "sqlite3";
const __dirname = import.meta.dirname;

const db = new sqlite3.Database('database.db', (err) => {
  if (err) {
    console.error('Database error:', err)
    return
  }
  console.log('Database connected')
})

const server = http.createServer((req, res) => {
  // API endpoint voor machines (ondersteunt optionele ?category=)
  if (req.method === 'GET') {
    try {
      const urlObj = new URL(req.url, `http://${req.headers.host}`);
      if (urlObj.pathname === '/api/machines') {
        const category = urlObj.searchParams.get('category');
        let sql = 'SELECT * FROM machines';
        const params = [];
        if (category && category !== 'all') {
          // Use case-insensitive, trimmed comparison on the 'type' column instead of the
          // nonexistent 'categorie' field.
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
          // map machine_id to id for convenience in the client
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
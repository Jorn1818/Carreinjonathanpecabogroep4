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
          // Use case-insensitive, trimmed comparison to tolerate DB inconsistencies
          sql += ' WHERE LOWER(TRIM(categorie)) = LOWER(TRIM(?))';
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
          console.log('Machines retrieved:', rows)
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(rows || []))
        })
        return
      }

      if (urlObj.pathname === '/api/categories') {
        db.all('SELECT DISTINCT categorie FROM machines ORDER BY categorie', (err, rows) => {
          if (err) {
            console.error('Database query error (categories):', err)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Database error: ' + err.message }))
            return
          }
          const categories = (rows || [])
            .map(r => (r.categorie || '').toString().trim())
            .filter(Boolean);
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(categories))
        })
        return
      }
    } catch (e) {
      // If URL parsing fails, fall through to static handling below
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
    // Serve static files
    // Normalize the request URL so a leading slash doesn't escape the Public folder
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
      
      // Set correct content type
      let contentType = 'text/plain'
      if (req.url.endsWith('.css')) contentType = 'text/css'
      else if (req.url.endsWith('.js')) contentType = 'application/javascript'
      else if (req.url.endsWith('.html')) contentType = 'text/html'
      else if (req.url.endsWith('.jpg') || req.url.endsWith('.jpeg')) contentType = 'image/jpeg'
      else if (req.url.endsWith('.png')) contentType = 'image/png'
      else if (req.url.endsWith('.gif')) contentType = 'image/gif'
      
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
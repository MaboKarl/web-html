const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const BASE_PATH = path.join(__dirname, '..');

// MIME types mapping
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  // Parse the requested file path
  let requestedPath = req.url === '/' ? '/Frontend/index.html' : req.url;
  
  // Remove query strings
  requestedPath = requestedPath.split('?')[0];
  
  // Build full file path
  let filePath = path.join(BASE_PATH, requestedPath);
  
  // Prevent directory traversal attacks
  if (!filePath.startsWith(BASE_PATH)) {
    res.writeHead(403, { 'Content-Type': 'text/html' });
    res.end('<h1>403 - Forbidden</h1>', 'utf-8');
    return;
  }
  
  // Get file extension
  const extname = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';
  
  // Try to read the file
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // File not found
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(`<h1>404 - File Not Found</h1><p>Requested: ${requestedPath}</p>`, 'utf-8');
        console.log(`❌ 404: ${requestedPath}`);
      } else if (err.code === 'EISDIR') {
        // Is a directory, try index.html
        const indexPath = path.join(filePath, 'index.html');
        fs.readFile(indexPath, (err, data) => {
          if (err) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 - Not Found</h1>', 'utf-8');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
            console.log(`✅ GET ${requestedPath}index.html`);
          }
        });
      } else {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('<h1>500 - Server Error</h1>', 'utf-8');
        console.error('Server error:', err);
      }
    } else {
      // File found - serve it with correct MIME type
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      res.end(data);
      console.log(`✅ GET ${requestedPath} (${contentType})`);
    }
  });
});

server.listen(PORT, () => {
  console.log('\n=== Checking paths ===');
  console.log(`Base path: ${BASE_PATH}`);
  console.log(`Frontend folder exists? ${fs.existsSync(path.join(BASE_PATH, 'Frontend'))}`);
  console.log(`CSS folder exists? ${fs.existsSync(path.join(BASE_PATH, 'css'))}`);
  console.log(`JS folder exists? ${fs.existsSync(path.join(BASE_PATH, 'js'))}`);
  console.log(`index.html exists? ${fs.existsSync(path.join(BASE_PATH, 'Frontend', 'index.html'))}`);
  console.log('======================\n');
  
  console.log(`✅ Frontend server running at http://localhost:${PORT}`);
  console.log(`📁 Base directory: ${BASE_PATH}`);
  console.log(`🌐 Open in browser: http://localhost:${PORT}`);
  console.log(`📝 Press Ctrl+C to stop the server\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down frontend server...');
  server.close(() => {
    console.log('Frontend server closed');
    process.exit(0);
  });
});
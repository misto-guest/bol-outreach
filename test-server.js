/**
 * Minimal test server for Railway debugging
 */

const http = require('http');

const PORT = process.env.PORT || 3000;

console.log('Starting minimal test server...');
console.log('PORT from environment:', process.env.PORT);
console.log('Using PORT:', PORT);

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  if (req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bol.com Outreach Tool - Minimal Test Server\n');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server listening on 0.0.0.0:${PORT}`);
  console.log(`✅ Health endpoint: http://0.0.0.0:${PORT}/api/health`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});

// Keep the process alive
console.log('✅ Server started successfully');

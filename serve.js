import { createServer } from 'http';
import { watch, readFile } from 'fs';
import { join, extname } from 'path';

const ROOT = join(__dirname, 'src');
const PORT = 5500;

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

const RELOAD_SCRIPT = `<script>
  new EventSource('/__reload').onmessage = () => location.reload();
</script>`;

let clients = [];

watch(ROOT, { recursive: true }, () => {
  clients.forEach(res => res.write('data: reload\n\n'));
  clients = [];
});

createServer((req, res) => {
  if (req.url === '/__reload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    });
    clients.push(res);
    req.on('close', () => clients = clients.filter(c => c !== res));
    return;
  }

  let urlPath = req.url.split('?')[0];
  if (urlPath.endsWith('/')) urlPath += 'index.html';

  const filePath = join(ROOT, urlPath);
  const ext = extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  const headers = {
    'Content-Type': contentType,
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  };

  const serve = (file, type) => {
    readFile(file, (err, data) => {
      if (err) { res.writeHead(404, headers); res.end('Not found'); return; }
      const isHtml = (type || ext) === '.html';
      if (isHtml) data = Buffer.from(data.toString().replace('</body>', RELOAD_SCRIPT + '</body>'));
      res.writeHead(200, { ...headers, 'Content-Type': isHtml ? 'text/html' : contentType });
      res.end(data);
    });
  };

  if (!ext) {
    readFile(filePath + '/index.html', (err, data) => {
      if (err) { res.writeHead(404, headers); res.end('Not found'); return; }
      data = Buffer.from(data.toString().replace('</body>', RELOAD_SCRIPT + '</body>'));
      res.writeHead(200, { ...headers, 'Content-Type': 'text/html' });
      res.end(data);
    });
    return;
  }

  serve(filePath, ext);

}).listen(PORT, () => console.log(`Serving http://localhost:${PORT}`));

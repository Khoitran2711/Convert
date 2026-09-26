import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Hệ thống Xử lý Dữ liệu SMS - Bệnh viện Đa khoa Ninh Thuận',
      timestamp: new Date().toISOString(),
    });
  });

  // Server-side Shorten Proxy to completely bypass browser CORS
  app.post('/api/shorten', async (req, res) => {
    try {
      const { url, service = 'tinyurl' } = req.body;

      if (!url || typeof url !== 'string') {
        res.status(400).json({ error: 'URL không hợp lệ' });
        return;
      }

      const trimmedUrl = url.trim();
      let targetApiUrl = '';

      if (service === 'isgd') {
        targetApiUrl = `https://is.gd/create.php?format=simple&url=${encodeURIComponent(trimmedUrl)}`;
      } else {
        // default tinyurl
        targetApiUrl = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(trimmedUrl)}`;
      }

      const response = await fetch(targetApiUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BVDK-NinhThuan-SMS/1.0)',
        },
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      if (!response.ok) {
        throw new Error(`Dịch vụ rút gọn trả về mã lỗi: ${response.status}`);
      }

      const shortUrl = await response.text();
      const cleanShortUrl = shortUrl.trim();

      if (!cleanShortUrl.startsWith('http')) {
        throw new Error(`Kết quả không hợp lệ: ${cleanShortUrl}`);
      }

      res.json({ shortUrl: cleanShortUrl });
    } catch (err: any) {
      console.error('Lỗi rút gọn link:', err.message);
      res.status(500).json({ error: err.message || 'Không thể rút gọn link' });
    }
  });

  // Batch shorten API
  app.post('/api/shorten/batch', async (req, res) => {
    try {
      const { urls, service = 'tinyurl' } = req.body;

      if (!Array.isArray(urls)) {
        res.status(400).json({ error: 'Dữ liệu urls phải là danh sách' });
        return;
      }

      const results = await Promise.all(
        urls.map(async (item: { id: string; url: string }) => {
          try {
            if (!item.url || !item.url.trim().startsWith('http')) {
              return { id: item.id, shortUrl: item.url, success: false, error: 'URL không bắt đầu bằng http/https' };
            }
            const targetApiUrl = service === 'isgd'
              ? `https://is.gd/create.php?format=simple&url=${encodeURIComponent(item.url.trim())}`
              : `https://tinyurl.com/api-create.php?url=${encodeURIComponent(item.url.trim())}`;

            const response = await fetch(targetApiUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BVDK-NinhThuan-SMS/1.0)' },
              signal: AbortSignal.timeout(8000),
            });

            if (!response.ok) {
              return { id: item.id, shortUrl: '', success: false, error: `Lỗi HTTP ${response.status}` };
            }

            const shortUrl = (await response.text()).trim();
            if (shortUrl.startsWith('http')) {
              return { id: item.id, shortUrl, success: true };
            }
            return { id: item.id, shortUrl: '', success: false, error: shortUrl };
          } catch (e: any) {
            return { id: item.id, shortUrl: '', success: false, error: e.message };
          }
        })
      );

      res.json({ results });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Dev server vs Production static server
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();

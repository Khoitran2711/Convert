export interface ShortenOptions {
  service?: 'tinyurl' | 'isgd';
  signal?: AbortSignal;
}

/**
 * Rút gọn một đường link đơn lẻ với chiến lược đa tầng:
 * 1. Thử gọi qua Backend Proxy nội bộ `/api/shorten` (không bao giờ bị CORS)
 * 2. Nếu Backend không phản hồi, fallback qua CORS proxy công cộng
 * 3. Nếu người dùng nhập link đã ngắn (dưới 30 ký tự hoặc tinyurl/is.gd), giữ nguyên
 */
export async function shortenUrl(
  originalUrl: string,
  options: ShortenOptions = {}
): Promise<string> {
  const url = originalUrl.trim();
  if (!url) {
    throw new Error('Đường link rỗng');
  }

  // Nếu link không có schema, tự động thêm https://
  let normalizedUrl = url;
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  // Nếu link vốn đã là link rút gọn tinyurl hoặc is.gd
  if (/^(https?:\/\/)?(tinyurl\.com|is\.gd|bit\.ly|t\.co)\//i.test(normalizedUrl)) {
    return normalizedUrl;
  }

  const service = options.service || 'tinyurl';

  // 1. Thử gọi backend proxy trước
  try {
    const res = await fetch('/api/shorten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: normalizedUrl, service }),
      signal: options.signal,
    });

    if (res.ok) {
      const data = await res.json();
      if (data.shortUrl && typeof data.shortUrl === 'string' && data.shortUrl.startsWith('http')) {
        return data.shortUrl;
      }
    }
  } catch (backendError: any) {
    // Nếu bị hủy bởi người dùng
    if (options.signal?.aborted) {
      throw new Error('Tiến trình đã bị dừng bởi người dùng');
    }
    // Ngược lại tiếp tục thử fallback
    console.warn('Backend proxy chưa sẵn sàng hoặc lỗi, chuyển sang fallback CORS:', backendError.message);
  }

  // 2. Fallback: Dùng TinyURL qua CORS Proxy công cộng
  const targetUrl = service === 'isgd'
    ? `https://is.gd/create.php?format=simple&url=${encodeURIComponent(normalizedUrl)}`
    : `https://tinyurl.com/api-create.php?url=${encodeURIComponent(normalizedUrl)}`;

  const corsProxies = [
    (target: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
    (target: string) => `https://corsproxy.io/?${encodeURIComponent(target)}`,
  ];

  for (const proxyBuilder of corsProxies) {
    try {
      const proxyUrl = proxyBuilder(targetUrl);
      const res = await fetch(proxyUrl, {
        signal: options.signal,
        headers: { Accept: 'text/plain' },
      });

      if (res.ok) {
        const text = (await res.text()).trim();
        if (text.startsWith('http')) {
          return text;
        }
      }
    } catch (err: any) {
      if (options.signal?.aborted) {
        throw new Error('Tiến trình đã bị dừng');
      }
    }
  }

  throw new Error('Không thể rút gọn link (Kiểm tra lại kết nối mạng hoặc định dạng URL)');
}

/**
 * Xử lý rút gọn hàng loạt theo nhóm (batch) với kiểm soát số lượng luồng đồng thời
 */
export async function batchShortenUrls(
  items: { id: string; url: string }[],
  options: {
    concurrency?: number;
    service?: 'tinyurl' | 'isgd';
    signal?: AbortSignal;
    onProgress?: (completed: number, total: number, currentItem: { id: string; success: boolean; result?: string; error?: string }) => void;
  }
): Promise<Map<string, { success: boolean; shortUrl?: string; error?: string }>> {
  const results = new Map<string, { success: boolean; shortUrl?: string; error?: string }>();
  const concurrency = Math.max(1, Math.min(options.concurrency || 3, 6)); // Giới hạn 3-6 luồng để tránh rate limit
  const total = items.length;
  let completed = 0;
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      if (options.signal?.aborted) {
        break;
      }
      const itemIndex = currentIndex++;
      const item = items[itemIndex];

      try {
        const shortUrl = await shortenUrl(item.url, {
          service: options.service,
          signal: options.signal,
        });
        results.set(item.id, { success: true, shortUrl });
        completed++;
        options.onProgress?.(completed, total, { id: item.id, success: true, result: shortUrl });
      } catch (err: any) {
        const errorMsg = err.message || 'Lỗi khi rút gọn';
        results.set(item.id, { success: false, error: errorMsg });
        completed++;
        options.onProgress?.(completed, total, { id: item.id, success: false, error: errorMsg });
      }

      // Giãn cách nhỏ 150ms để tôn trọng rate limit của TinyURL / is.gd
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);

  return results;
}

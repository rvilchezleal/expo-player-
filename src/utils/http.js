const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 300;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchText(url, { timeoutMs = DEFAULT_TIMEOUT_MS, bustCache = false } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const target = bustCache ? `${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}` : url;
  try {
    const response = await fetch(target, {
      signal: controller.signal,
      headers: bustCache ? { 'Cache-Control': 'no-cache' } : undefined,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function withRetry(task, { attempts = DEFAULT_ATTEMPTS, delayMs = DEFAULT_RETRY_DELAY_MS } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await task();
    } catch (error) {
      if (attempt >= attempts) throw error;
      await wait(delayMs * attempt);
    }
  }
}

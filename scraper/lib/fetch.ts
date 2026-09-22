// ============================================================
// Fetch avec retries, timeout et user-agent (Node 18+ global fetch)
// ============================================================

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

export async function fetchWithRetry(
  url: string,
  retries = 3,
  timeoutMs = 30_000,
): Promise<Response> {
  let lastErr: unknown = new Error(`fetch failed for ${url}`);
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/json, text/html;q=0.9, */*;q=0.8',
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) return res;
      lastErr = new Error(`HTTP ${res.status} pour ${url}`);
    } catch (err) {
      lastErr = err;
    }
    if (attempt < retries) await sleep(1000 * attempt);
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
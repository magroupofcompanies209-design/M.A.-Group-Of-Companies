/**
 * Safe JSON response parser for frontend API calls.
 * Prevents "Failed to execute 'json' on 'Response': Unexpected end of JSON input"
 * when serverless functions or proxy errors return empty responses or HTML.
 */
export async function safeJsonResponse<T = any>(
  res: Response,
  fallback?: any
): Promise<T> {
  try {
    const text = await res.text();
    if (!text || !text.trim()) {
      return fallback as T;
    }
    return JSON.parse(text) as T;
  } catch (err) {
    console.warn('[API] Non-JSON response received:', res.status, res.url);
    return fallback as T;
  }
}

export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit,
  fallback?: any
): Promise<{ ok: boolean; status: number; data: T }> {
  try {
    const res = await fetch(input, init);
    const data = await safeJsonResponse<T>(res, fallback);
    return { ok: res.ok, status: res.status, data };
  } catch (err: any) {
    console.error('[API Fetch Error]:', input, err);
    return { ok: false, status: 0, data: fallback as T };
  }
}

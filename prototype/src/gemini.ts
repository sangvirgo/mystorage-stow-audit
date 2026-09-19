const BASE = 'https://generativelanguage.googleapis.com/v1beta';

export interface GeminiConfig {
  apiKey: string;
  model: string;
  /** Minimum gap between requests, to stay under the API's per-minute quota. */
  minIntervalMs: number;
}

/** The key is read from the environment only. It is never logged or written to disk. */
export function configFromEnv(): GeminiConfig {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set. Put it in prototype/.env, or run `npm run baseline` which needs no key.');
  }
  return {
    apiKey,
    model: process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite',
    minIntervalMs: Number(process.env.GEMINI_MIN_INTERVAL_MS ?? 4500),
  };
}

let lastCall = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function request(cfg: GeminiConfig, body: unknown): Promise<Response> {
  const wait = lastCall + cfg.minIntervalMs - Date.now();
  if (wait > 0) await sleep(wait);
  lastCall = Date.now();
  return fetch(`${BASE}/models/${cfg.model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': cfg.apiKey },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000),
  });
}

/** One call, with a single retry after a timeout, rate limit or temporary server error. */
export async function generate(cfg: GeminiConfig, system: string, user: string): Promise<string> {
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: { temperature: 0 },
  };
  // A timeout or network error gets the same single retry as a rate limit.
  let res = await request(cfg, body).catch(() => null);
  if (!res || res.status === 429 || res.status >= 500) {
    await sleep(20_000);
    res = await request(cfg, body);
  }
  if (!res.ok) throw new Error(`Gemini request failed: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);

  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] };
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts.filter((p) => !p.thought).map((p) => p.text ?? '').join('').trim();
  if (!text) throw new Error('Gemini returned no text');
  return text;
}

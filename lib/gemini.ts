/**
 * Server-side Gemini caller. Ported from the old tool's browser logic, but the
 * key now lives in the server env (GEMINI_API_KEY) and never reaches the client.
 *
 * Keeps the model-fallback chain: if the chosen model is throttled/overloaded,
 * fall through to the next automatically.
 */
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function modelChain(): string[] {
  const prefs = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash-lite"];
  const chain = [DEFAULT_MODEL];
  for (const m of prefs) if (!chain.includes(m)) chain.push(m);
  return chain;
}

type Schema = Record<string, unknown>;

async function callOnce(model: string, prompt: string, schema?: Schema): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set on the server.");

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.6 } as Record<string, unknown>,
  };
  if (schema) {
    (body.generationConfig as Record<string, unknown>).responseMimeType = "application/json";
    (body.generationConfig as Record<string, unknown>).responseSchema = schema;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
    key
  )}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = `API error ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error?.message) msg = j.error.message;
    } catch {
      /* ignore */
    }
    const e = new Error(msg) as Error & { status?: number };
    e.status = res.status;
    throw e;
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export async function gemini(prompt: string, schema?: Schema): Promise<string> {
  const chain = modelChain();
  let lastErr: unknown;
  for (const model of chain) {
    try {
      return await callOnce(model, prompt, schema);
    } catch (e) {
      lastErr = e;
      const err = e as Error & { status?: number };
      const skip =
        err.status === 429 ||
        err.status === 503 ||
        err.status === 404 ||
        /quota|rate.?limit|overload|high demand|exhausted|not found|not supported/i.test(err.message || "");
      if (!skip) throw e; // real error (bad key, blocked) — surface it
    }
  }
  throw lastErr;
}

/** Parse a JSON answer that may be fenced in ```json blocks. */
export function parseJson<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return JSON.parse(raw.replace(/```json|```/g, "").trim()) as T;
  }
}

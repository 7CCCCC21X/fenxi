// GET /api/predict — 代理 Predict.fun 官方 /v1/orders/matches，x-api-key 从环境变量注入
export default async function handler(req, res) {
  const key = process.env.PREDICT_API_KEY;
  if (!key) return res.status(500).json({ error: "PREDICT_API_KEY 未在 Vercel 环境变量中设置" });

  const u = new URL("https://api.predict.fun/v1/orders/matches");
  for (const [k, v] of Object.entries(req.query)) {
    u.searchParams.set(k, Array.isArray(v) ? v[0] : String(v));
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(u.toString(), {
      signal: ctrl.signal,
      headers: { "x-api-key": key, "Accept": "application/json" },
    });
    const text = await r.text();
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.setHeader("cache-control", "no-store");
    res.status(r.status).send(text);
  } catch (e) {
    const msg = e && e.name === "AbortError" ? "上游超时（15s）" : String(e && e.message || e);
    res.status(502).json({ error: msg });
  } finally {
    clearTimeout(timer);
  }
}

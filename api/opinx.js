// GET /api/opinx?wallet=&...
// 代理 predalpha indexer 成交接口（免 Key）。服务端带 Origin/Referer，绕过其浏览器来源校验
// （前端 fetch 无法伪造这些头）。支持两种上游：
//   · 带 days   → 新接口 /api/predict/orders/{wallet}?days=N（单次、免分页，优先）
//   · 不带 days → 旧接口 /api/predict/trades/{wallet}/history?limit=&offset=&sort=&start_time=&end_time=
// 加固：对 days/limit/offset/时间戳做范围钳制，只透传已知参数，并给上游 fetch 加超时。
const TRADES_BASE = process.env.OPINX_BASE || "https://indexer.predalpha.xyz/api/predict/trades";
const ORDERS_BASE = process.env.OPINX_ORDERS_BASE || "https://indexer.predalpha.xyz/api/predict/orders";
const TIMEOUT_MS = 15000;

function intParam(v, fallback, min, max) {
  const n = Number.parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export default async function handler(req, res) {
  const wallet = String(req.query.wallet || "");
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) return res.status(400).json({ error: "invalid wallet" });

  let u;
  if (req.query.days != null) {
    // 新接口：/orders/{wallet}?days=N（钳到 1..366）
    u = new URL(`${ORDERS_BASE.replace(/\/$/, "")}/${wallet}`);
    u.searchParams.set("days", String(intParam(req.query.days, 30, 1, 366)));
  } else {
    // 旧接口：/trades/{wallet}/history（分页 + 时间范围）
    u = new URL(`${TRADES_BASE.replace(/\/$/, "")}/${wallet}/history`);
    u.searchParams.set("limit", String(intParam(req.query.limit, 50, 1, 100)));
    u.searchParams.set("offset", String(intParam(req.query.offset, 0, 0, 10_000_000)));
    u.searchParams.set("sort", req.query.sort == null ? "time" : String(req.query.sort).slice(0, 20));
    for (const k of ["start_time", "end_time"]) {
      if (req.query[k] != null) u.searchParams.set(k, String(intParam(req.query[k], 0, 0, 10_000_000_000_000)));
    }
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(u.toString(), {
      signal: ctrl.signal,
      headers: {
        "Origin": "https://predalpha.xyz",
        "Referer": "https://predalpha.xyz/",
        "User-Agent": "Mozilla/5.0 (compatible; PredictTradeViewer/1.0)",
        "Accept": "application/json",
      },
    });
    const text = await r.text();
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.setHeader("cache-control", "no-store");
    res.status(r.status).send(text);
  } catch (e) {
    const msg = e && e.name === "AbortError" ? `上游超时（${TIMEOUT_MS / 1000}s）` : String(e && e.message || e);
    res.status(502).json({ error: msg });
  } finally {
    clearTimeout(timer);
  }
}

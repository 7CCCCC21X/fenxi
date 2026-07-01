// GET /api/opinx?wallet=&...
// 代理 predalpha indexer 成交接口（免 Key）。服务端带 Origin/Referer，绕过其浏览器来源校验
// （前端 fetch 无法伪造这些头）。支持两种上游：
//   · 带 days   → 新接口 /api/predict/orders/{wallet}?days=N（单次、免分页，优先）
//   · 不带 days → 旧接口 /api/predict/trades/{wallet}/history?limit=&offset=&sort=&start_time=&end_time=
const TRADES_BASE = process.env.OPINX_BASE || "https://indexer.predalpha.xyz/api/predict/trades";
const ORDERS_BASE = process.env.OPINX_ORDERS_BASE || "https://indexer.predalpha.xyz/api/predict/orders";

export default async function handler(req, res) {
  const wallet = String(req.query.wallet || "");
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) return res.status(400).json({ error: "invalid wallet" });

  let u;
  if (req.query.days != null) {
    // 新接口：/orders/{wallet}?days=N
    u = new URL(`${ORDERS_BASE.replace(/\/$/, "")}/${wallet}`);
    u.searchParams.set("days", String(req.query.days));
  } else {
    // 旧接口：/trades/{wallet}/history（分页 + 时间范围）
    u = new URL(`${TRADES_BASE.replace(/\/$/, "")}/${wallet}/history`);
    for (const k of ["limit", "offset", "sort", "start_time", "end_time"]) {
      if (req.query[k] != null) u.searchParams.set(k, String(req.query[k]));
    }
    if (!u.searchParams.has("limit")) u.searchParams.set("limit", "50");
    if (!u.searchParams.has("sort")) u.searchParams.set("sort", "time");
  }

  try {
    const r = await fetch(u.toString(), {
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
    res.status(502).json({ error: String(e && e.message || e) });
  }
}

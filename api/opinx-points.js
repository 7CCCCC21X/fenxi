// GET /api/opinx-points?wallet= — 代理 predalpha indexer 积分接口（免 Key），服务端带 Origin/Referer
const POINTS_BASE = process.env.OPINX_POINTS_BASE || "https://indexer.predalpha.xyz/api/predict/points";

export default async function handler(req, res) {
  const wallet = String(req.query.wallet || "");
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) return res.status(400).json({ error: "invalid wallet" });
  const url = `${POINTS_BASE.replace(/\/$/, "")}/${wallet}`;
  try {
    const r = await fetch(url, {
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

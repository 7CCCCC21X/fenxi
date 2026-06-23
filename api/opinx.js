// GET /api/opinx?wallet=&days= — 代理 OPinX/predalpha 免 Key 接口
// 服务端带上 Origin/Referer，绕过其浏览器来源校验（前端 fetch 无法伪造这些头）。
const OPINX_BASE = process.env.OPINX_BASE || "https://tool.opinx.app/api/predict/orders";

export default async function handler(req, res) {
  const wallet = String(req.query.wallet || "");
  const days = String(req.query.days || "1");
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) return res.status(400).json({ error: "invalid wallet" });

  const url = `${OPINX_BASE.replace(/\/$/, "")}/${wallet}?days=${encodeURIComponent(days)}`;
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

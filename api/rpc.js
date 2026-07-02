// POST /api/rpc — 代理 BSC JSON-RPC（URL 从环境变量 BSC_RPC_URL 读取）
// 上游返回 401/403（key 未开通本链/配额用尽/白名单拦截）时自动降级到公共节点重发，
// 避免前端拿到一堆 403、交易静默缺 receipt。
const FALLBACK_RPC = "https://bsc-dataseed.bnbchain.org";

export default async function handler(req, res) {
  const rpc = process.env.BSC_RPC_URL;
  if (!rpc) return res.status(500).json({ error: "BSC_RPC_URL 未在 Vercel 环境变量中设置" });
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
  const post = url => fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
  try {
    let r = await post(rpc);
    if ((r.status === 401 || r.status === 403) && rpc !== FALLBACK_RPC) {
      r = await post(FALLBACK_RPC);
    }
    const text = await r.text();
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.setHeader("cache-control", "no-store");
    res.status(r.status).send(text);
  } catch (e) {
    res.status(502).json({ error: String(e && e.message || e) });
  }
}

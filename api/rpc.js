// POST /api/rpc — 代理 BSC JSON-RPC（URL 从环境变量 BSC_RPC_URL 读取）
export default async function handler(req, res) {
  const rpc = process.env.BSC_RPC_URL;
  if (!rpc) return res.status(500).json({ error: "BSC_RPC_URL 未在 Vercel 环境变量中设置" });
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
  try {
    const r = await fetch(rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    const text = await r.text();
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.setHeader("cache-control", "no-store");
    res.status(r.status).send(text);
  } catch (e) {
    res.status(502).json({ error: String(e && e.message || e) });
  }
}

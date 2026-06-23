// GET /api/bsc — Etherscan V2 代理（BSC / chainid=56），key 从环境变量注入
// 仅放行只读模块，避免被当成开放代理滥用。
const ALLOWED = new Set(["proxy", "logs", "block", "account", "contract", "token"]);

export default async function handler(req, res) {
  const key = process.env.BSC_API_KEY || process.env.ETHERSCAN_API_KEY;
  if (!key) return res.status(500).json({ error: "BSC_API_KEY (或 ETHERSCAN_API_KEY) 未在 Vercel 环境变量中设置" });

  const module = String(req.query.module || "");
  if (!ALLOWED.has(module)) return res.status(400).json({ error: `module 不允许: ${module}` });

  const u = new URL("https://api.etherscan.io/v2/api");
  for (const [k, v] of Object.entries(req.query)) {
    if (k === "apikey" || k === "chainid") continue; // 强制使用服务端的 key 与链
    u.searchParams.set(k, Array.isArray(v) ? v[0] : String(v));
  }
  u.searchParams.set("chainid", "56");
  u.searchParams.set("apikey", key);

  try {
    const r = await fetch(u.toString());
    const text = await r.text();
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.setHeader("cache-control", "no-store");
    res.status(r.status).send(text);
  } catch (e) {
    res.status(502).json({ error: String(e && e.message || e) });
  }
}

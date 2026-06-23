// GET /api/bsc — BSC 浏览器 API 代理，key 从环境变量注入，仅放行只读模块。
// 默认 Etherscan V2（chainid=56）；可用 BSC_API_BASE 换成其它兼容接口
//（如 https://api.bscscan.com/api）。注意：Etherscan V2 免费档不覆盖 BSC，
// getLogs 等需要付费 key；纯看交易请在前端改用 RPC，无需本接口。
const ALLOWED = new Set(["proxy", "logs", "block", "account", "contract", "token"]);
const API_BASE = process.env.BSC_API_BASE || "https://api.etherscan.io/v2/api";
const IS_V2 = /etherscan\.io\/v2/i.test(API_BASE);

export default async function handler(req, res) {
  const key = process.env.BSC_API_KEY || process.env.ETHERSCAN_API_KEY;
  if (!key) return res.status(500).json({ error: "BSC_API_KEY (或 ETHERSCAN_API_KEY) 未在 Vercel 环境变量中设置" });

  const module = String(req.query.module || "");
  if (!ALLOWED.has(module)) return res.status(400).json({ error: `module 不允许: ${module}` });

  const u = new URL(API_BASE);
  for (const [k, v] of Object.entries(req.query)) {
    if (k === "apikey" || k === "chainid") continue; // 强制使用服务端的 key 与链
    u.searchParams.set(k, Array.isArray(v) ? v[0] : String(v));
  }
  if (IS_V2) u.searchParams.set("chainid", "56"); // 仅 Etherscan V2 需要 chainid
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

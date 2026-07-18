// POST /api/rpc — 代理 BSC JSON-RPC（URL 从环境变量 BSC_RPC_URL 读取）
// 上游返回 401/403（key 未开通本链/配额用尽/白名单拦截）或 429/-32005（限流）时
// 自动降级到公共节点重发，避免前端拿到一堆 403 / limit exceeded、交易静默缺 receipt。
const FALLBACK_RPCS = [
  "https://bsc-dataseed.bnbchain.org",
  "https://bsc.publicnode.com",
  "https://1rpc.io/bnb",
];

// 限流：HTTP 429，或响应体里出现 -32005 / limit exceeded / rate limit 等
const isRateLimited = (status, text) =>
  status === 429 ||
  /"code"\s*:\s*-32005|limit exceeded|rate ?limit|too many request/i.test(text || "");

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

  const targets = [rpc, ...FALLBACK_RPCS.filter(u => u !== rpc)];
  let last = null; // 全部目标都失败时，把最后一次响应原样返回给前端（保留错误信息）
  for (const url of targets) {
    try {
      const r = await post(url);
      const text = await r.text();
      last = { status: r.status, text };
      const denied = r.status === 401 || r.status === 403;
      if (denied || isRateLimited(r.status, text)) continue; // 换下一个节点
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.setHeader("cache-control", "no-store");
      return res.status(r.status).send(text);
    } catch (e) {
      last = last || { status: 502, text: JSON.stringify({ error: String(e && e.message || e) }) };
    }
  }
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.status(last ? last.status : 502).send(last ? last.text : JSON.stringify({ error: "RPC 不可用" }));
}

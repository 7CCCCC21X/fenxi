// POST /api/rpc — 代理 BSC JSON-RPC（URL 从环境变量 BSC_RPC_URL 读取）。
// 安全加固：只放行只读方法、支持单条与批量（数组）请求、限制批量大小、加超时，
// 避免把你的私有 RPC 变成任何人可用的通用开放代理（否则可被拿去攻击/滥用）。
const ALLOWED_METHODS = new Set([
  "eth_blockNumber",
  "eth_getBlockByNumber",
  "eth_getLogs",
  "eth_getTransactionReceipt",
  "eth_getTransactionByHash",
  "eth_chainId",
  "eth_call",
  "net_version",
]);
const MAX_BATCH = 50;   // 前端批量拉 receipt 每批 20，这里留足余量
const TIMEOUT_MS = 20000;

const methodOf = x => (x && typeof x === "object" ? x.method : undefined);

export default async function handler(req, res) {
  const rpc = process.env.BSC_RPC_URL;
  if (!rpc) return res.status(500).json({ error: "BSC_RPC_URL 未在 Vercel 环境变量中设置" });
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  // body 可能是字符串（未解析）或对象/数组（已被平台解析）
  let payload;
  try {
    payload = typeof req.body === "string" ? JSON.parse(req.body || "null") : (req.body ?? null);
  } catch (_) {
    return res.status(400).json({ error: "invalid JSON body" });
  }

  const isBatch = Array.isArray(payload);
  const items = isBatch ? payload : [payload];
  if (!items.length) return res.status(400).json({ error: "empty request" });
  if (isBatch && items.length > MAX_BATCH)
    return res.status(400).json({ error: `批量请求过多（最多 ${MAX_BATCH} 条）` });
  for (const it of items) {
    const m = methodOf(it);
    if (!m || !ALLOWED_METHODS.has(m))
      return res.status(400).json({ error: `method 不允许: ${m ?? "(缺失)"}` });
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    const text = await r.text();
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.setHeader("cache-control", "no-store");
    res.status(r.status).send(text);
  } catch (e) {
    const msg = e && e.name === "AbortError" ? `RPC 超时（${TIMEOUT_MS / 1000}s）` : String(e && e.message || e);
    res.status(502).json({ error: msg });
  } finally {
    clearTimeout(timer);
  }
}

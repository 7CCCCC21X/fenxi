// POST /api/graphql — Predict.fun GraphQL 代理（解析钱包→用户名、conditionId→市场名/网站）
//
// 关键经验（对照可用的 predict_whale_bot）：account(address).name 只在「最简服务端请求」下才返回，
// 即仅带 content-type、不带 origin/referer、也不带 x-api-key。早前本代理附加了
// origin/referer/x-accept-language/x-api-key（冒充网站来源 + 带 key），会让 account.name 被当作
// 需登录态的浏览器请求而门控、返回空 → 用户名查不到。故这里去掉这些头，与 bot 的可用实现一致。
// 仅在显式配置登录态时附加 Authorization / Cookie（用于 PNL/持仓等确需登录的字段）。
const GRAPHQL_URL = process.env.PREDICT_GRAPHQL_URL || "https://graphql.predict.fun/graphql";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const headers = { "content-type": "application/json" };
  if (process.env.PREDICT_GRAPHQL_AUTH) headers["authorization"] = process.env.PREDICT_GRAPHQL_AUTH;
  if (process.env.PREDICT_GRAPHQL_COOKIE) headers["cookie"] = process.env.PREDICT_GRAPHQL_COOKIE;

  const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
  try {
    const r = await fetch(GRAPHQL_URL, { method: "POST", headers, body });
    const text = await r.text();
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.setHeader("cache-control", "no-store");
    res.status(r.status).send(text);
  } catch (e) {
    res.status(502).json({ error: String(e && e.message || e) });
  }
}

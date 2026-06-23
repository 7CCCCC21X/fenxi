// POST /api/graphql — Predict.fun GraphQL 代理（解析钱包→用户名、conditionId→市场名/网站）
// 服务端带 Origin/Referer（GraphQL 端点校验来源；浏览器无法伪造）。
// 可选透传 Authorization / Cookie / x-api-key（部分字段需要登录态时）。
const GRAPHQL_URL = process.env.PREDICT_GRAPHQL_URL || "https://graphql.predict.fun/graphql";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const headers = {
    "content-type": "application/json",
    "accept": "application/json",
    "origin": "https://predict.fun",
    "referer": "https://predict.fun/",
    "x-accept-language": "zh-CN",
  };
  if (process.env.PREDICT_GRAPHQL_AUTH) headers["authorization"] = process.env.PREDICT_GRAPHQL_AUTH;
  if (process.env.PREDICT_GRAPHQL_COOKIE) headers["cookie"] = process.env.PREDICT_GRAPHQL_COOKIE;
  if (process.env.PREDICT_API_KEY) headers["x-api-key"] = process.env.PREDICT_API_KEY;

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

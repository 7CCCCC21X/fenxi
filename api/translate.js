// GET /api/translate?q=&tl=zh-CN — 标题翻译代理。
// 默认用 Google 免 Key 的 gtx 接口；可用 TRANSLATE_URL 环境变量自定义（含 {q} {tl} 占位）。
export default async function handler(req, res) {
  const q = String(req.query.q || "");
  const tl = String(req.query.tl || "zh-CN");
  if (!q) return res.status(400).json({ error: "missing q" });

  const tpl = process.env.TRANSLATE_URL;
  const url = tpl
    ? tpl.replace("{q}", encodeURIComponent(q)).replace("{tl}", encodeURIComponent(tl))
    : `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(q)}`;

  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } });
    const text = await r.text();
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.setHeader("cache-control", "public, max-age=86400");
    res.status(r.status).send(text);
  } catch (e) {
    res.status(502).json({ error: String(e && e.message || e) });
  }
}

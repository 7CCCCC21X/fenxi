# Predict.fun 交易查看器（BSC / BNB Smart Chain）

单页工具：查某钱包在 Predict.fun（BNB Chain）的成交记录，并解析每笔交易的**真实对手方**和**邀请人**。

- 交易列表来源：OPinX/predalpha（免 Key）、Predict.fun 官方 `/v1/orders/matches`、或直接扫 BSC `OrderFilled` 日志。
- 链上解析：Etherscan V2（`chainid=56` = BSC）receipt 或 BSC RPC。
- 对手方 = 同一 tx 内 `OrderFilled` 的 maker/taker，剔除本钱包与 Exchange 合约。
- 邀请人 = `ReferralFeeDistributed.referrer`；当同 tx `FeeRefunded.to==本钱包` 且 `feeCharged>0` 时标「本钱包」。

## 部署到 Vercel

直接导入仓库即可（纯静态 + Serverless 函数，无需构建）。
- 根路径 `/` 由 `index.html` 提供（`vercel.json` 已配置）。
- `api/*.js` 是 Serverless 代理，从**环境变量**读取 API Key，前端不接触 key。

### 环境变量（在 Vercel → Project → Settings → Environment Variables 设置）

| 变量名 | 用途 | 必填 |
|---|---|---|
| `BSC_API_KEY` | Etherscan V2 API Key（查 BSC，`chainid=56`）。也可用 `ETHERSCAN_API_KEY` | 识别对手方/邀请人需要 |
| `PREDICT_API_KEY` | Predict.fun 官方 `x-api-key`（用官方来源时；也会附加到 GraphQL） | 选填 |
| `PREDICT_GRAPHQL_AUTH` / `PREDICT_GRAPHQL_COOKIE` | Predict.fun GraphQL 登录态（个别字段需要时） | 选填 |
| `BSC_RPC_URL` | BSC JSON-RPC 地址（用 RPC 解析时） | 选填 |
| `OPINX_BASE` | 覆盖 OPinX 接口前缀，默认 `https://tool.opinx.app/api/predict/orders` | 选填 |
| `BSC_API_BASE` | 覆盖 BSC 浏览器 API（默认 Etherscan V2）。Etherscan **免费档不覆盖 BSC**，看交易请改用 RPC；getLogs 类功能需付费 key 或换接口 | 选填 |

> 设置/修改环境变量后需 **Redeploy** 才生效。

页面加载时会自动探测 `/api/config`：
- 检测到服务端代理 → 顶部显示绿色横幅，key 输入框可留空（用 Vercel 环境变量）。
- 未检测到（本地 `file://` 或纯静态）→ 在页面手填 API Key。

## 为什么需要 `/api` 代理

静态 HTML 在浏览器里运行，**读不到 Vercel 环境变量**（那是服务端的）。所以由 `api/*.js` 在服务端注入 key 并转发：

- `GET /api/config` — 返回哪些 key 已配置（只返回布尔值）。
- `GET /api/bsc` — Etherscan V2 代理（强制 `chainid=56` + 注入 key）。
- `GET /api/opinx` — 代理 OPinX，并带 `Origin: predalpha.xyz`，绕过其来源校验（浏览器 `fetch` 无法伪造该头，这也是直连常 404 的原因）。
- `GET /api/predict` — 代理 Predict.fun，注入 `x-api-key`。
- `POST /api/rpc` — 代理 BSC RPC（`BSC_RPC_URL`）。
- `POST /api/graphql` — 代理 Predict.fun GraphQL（带 Origin/Referer），解析**对手方/邀请人用户名**（`account(address).name`）、**市场名/网站**（`market(id).slug`）、以及**积分/持仓/PNL/排名**（`leaderboard.totalPoints`/`statistics.positionsValueUsd`/`pnlUsd`）。地址自动转 EIP-55 校验和（小写会返回 null）。
- `GET /api/opinx-points` — 代理 OPinX 积分接口 `…/api/predict/points/{wallet}`（免 Key）。

### 积分查询

页面顶部「积分查询」卡片，或点击成交记录里的 `@用户名`，即可查该钱包的 OPINX 积分、Predict 积分/排名、持仓价值、PNL。
- 表格里地址点击 → 跳转 `https://predict.fun/zh-cn/portfolio/<地址>`。

### 邀请关系查询

「邀请关系 · Referral」卡片，链上解析（有 BSC API Key 走 API；否则自动用免费 **RPC 分块 `eth_getLogs`** 兜底，较慢）：
- **查邀请人**：扫该钱包的 `FeeRefunded(to=wallet, feeCharged>0)`，取同 tx 的 `ReferralFeeDistributed.referrer`。
- **查下线**：扫 `ReferralFeeDistributed(referrer=address)`，对每笔 tx 取 `FeeRefunded.to`（feeCharged>0）即被邀请用户，按返佣笔数排序。
- 可调回溯天数；结果里地址可点开 portfolio、用户名可点查积分。
- **持仓价值 / PNL** 这些字段常需登录态，若显示「—」，在 Vercel 设 `PREDICT_GRAPHQL_AUTH` 或 `PREDICT_GRAPHQL_COOKIE`（从浏览器登录 predict.fun 后的请求里复制）。

## 本地使用

直接用浏览器打开 `predict_fun_trade_viewer.html`（或 `index.html`），在页面手填 API Key 即可（本地没有 `/api` 代理）。

## 关于 `api.etherscan.io` 查的是 BSC

默认接口 `https://api.etherscan.io/v2/api?chainid=56` 看着像以太坊，其实 Etherscan V2 是统一多链接口，`chainid=56` 就是 **BNB Smart Chain**。一个免费 Etherscan key 即可查 BSC（旧的 `api.bscscan.com` 已并入 V2）。

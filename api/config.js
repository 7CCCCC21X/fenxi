// GET /api/config — 告诉前端服务端配置了哪些 key（只返回布尔值，绝不回传 key 本身）
export default function handler(req, res) {
  res.setHeader("cache-control", "no-store");
  res.status(200).json({
    predict: !!process.env.PREDICT_API_KEY,
    bsc: !!(process.env.BSC_API_KEY || process.env.ETHERSCAN_API_KEY),
    rpc: !!process.env.BSC_RPC_URL,
  });
}

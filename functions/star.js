// /star —— 站内一键 Star（代理到 mox-id 后端的 /star）。
// 复用 api-proxy 的 CORS / 转发逻辑，同源请求无需额外跨域处理。
export { pgOptions as onRequestOptions, pgGet as onRequestGet, pgPost as onRequestPost } from './api-proxy.js';

// /fan/* —— 专属权益（issue 签发 / verify 联网校验 / status 灰度状态）反代到 mox-id。
// 专属页同源调用，勿让浏览器直连 workers.dev（与 /auth /me 同套路）。
export { pgOptions as onRequestOptions, pgGet as onRequestGet, pgPost as onRequestPost } from '../api-proxy.js';

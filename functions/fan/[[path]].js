// /fan/* —— 粉丝专属（issue 签发 / verify 联网校验 / status 灰度状态）反代到 mox-id。
// 粉丝页 fan.html 同源调用，勿让浏览器直连 workers.dev（与 /auth /me 同套路）。
export { pgOptions as onRequestOptions, pgGet as onRequestGet, pgPost as onRequestPost } from '../api-proxy.js';

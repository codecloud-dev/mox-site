// /entitlement/* —— 设备授权校验（proot/moxsh 启动时查；无登录，token 即凭据）
export { pgOptions as onRequestOptions, pgGet as onRequestGet, pgPost as onRequestPost } from '../api-proxy.js';

// /me —— 登录态恢复与后端探测（带 Bearer 返回 user/admin_path；匿名 401 JSON = 服务在线）
export { pgOptions as onRequestOptions, pgGet as onRequestGet, pgPost as onRequestPost } from './api-proxy.js';

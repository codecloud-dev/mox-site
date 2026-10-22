// /account/* —— 账号绑定（identities 查询 / unbind 解绑），与 /auth/* 同链路反代到 mox-id 身份后端。
// 前端在「账号绑定」区拉取已绑身份、发起解绑；OAuth 绑定发起走 /auth/gitee/start?bind=1。
export { pgOptions as onRequestOptions, pgGet as onRequestGet, pgPost as onRequestPost } from '../api-proxy.js';

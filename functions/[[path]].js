// 顶层 catch-all（兜底路由）：
//   1. 先尝试静态资源（ASSETS）——/、/app.js、/index.css 等全部原样返回，
//      _headers 的安全头照常生效；
//   2. 静态层 404 时转发 mox-id worker——覆盖「隐蔽管理后台秘径」
//      （/{24+位随机串} 及其 /api/*、/setup-oauth 子路径，路径即钥匙，
//      Pages 侧不可能预知，只能靠未知路径转发）。
// Pages 路由取最具体匹配：/me、/health、/auth/*、/membership/* 等专属
// Function 优先于本文件；本文件只接管其余路径。
import { proxy, CORS_HEADERS } from './api-proxy.js';

export async function onRequestGet(context) {
  // 静态资源命中（200/301/304…）原样返回；404 视为「可能走 worker」
  let assetsRes = null;
  try {
    assetsRes = await context.env.ASSETS.fetch(context.request.url, { redirect: 'manual' });
    if (assetsRes && assetsRes.status !== 404) return assetsRes;
  } catch (e) {
    /* ASSETS 异常时继续走 worker 转发，至少管理后台仍可用 */
  }
  return proxy(context);
}

// 静态站没有任何 POST 目标：POST 一律转发 worker（管理后台 assistant 等 API）
export const onRequestPost = (ctx) => proxy(ctx);
export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS_HEADERS });

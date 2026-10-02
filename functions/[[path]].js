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
  const url = new URL(context.request.url);
  // 后台秘径下的 /api/* 一定是 worker 接口，绝无静态资源：直接转发，
  // 跳过 ASSETS 预检，避免静态层误拦截导致「已登录却判未授权 → 再登录」。
  if (url.pathname.includes('/api/')) {
    const wres = await proxy(context);
    if (wres.status === 404 && context.env.ASSETS) {
      try {
        const p404 = await context.env.ASSETS.fetch(new URL('/404.html', url).toString());
        if (p404 && p404.status === 200) {
          return new Response(p404.body, { status: 404, headers: p404.headers });
        }
      } catch (e) { /* 缺失 404.html 时原样返回 worker 404 */ }
    }
    return wres;
  }
  // 静态资源命中（200/301/304…）原样返回；404 视为「可能走 worker」。
  // 注意：项目根带 404.html 时 Pages 不做 SPA fallback，未知路径才是真 404，
  // 否则 ASSETS 会对一切未知路径回 200 index.html，转发逻辑永远不触发。
  let assetsRes = null;
  try {
    assetsRes = await context.env.ASSETS.fetch(context.request.url, { redirect: 'manual' });
    if (assetsRes && assetsRes.status !== 404) return assetsRes;
  } catch (e) {
    /* ASSETS 异常时继续走 worker 转发，至少管理后台仍可用 */
  }
  const wres = await proxy(context);
  // worker 也 404（非秘径/未知 API）：回退到站内 404 页，保持体验一致
  if (wres.status === 404 && assetsRes) {
    try {
      const p404 = await context.env.ASSETS.fetch(new URL('/404.html', context.request.url).toString());
      if (p404 && p404.status === 200) {
        return new Response(p404.body, { status: 404, headers: p404.headers });
      }
    } catch (e) { /* 404.html 不可用时原样返回 worker 404 */ }
  }
  return wres;
}

// 静态站没有任何 POST 目标：POST 一律转发 worker（管理后台 assistant 等 API）
export const onRequestPost = (ctx) => proxy(ctx);
export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS_HEADERS });

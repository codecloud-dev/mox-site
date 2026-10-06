// 官网同域 API 反代（共享逻辑），路由文件只做薄转发：
//   auth/[[path]].js       → /auth/*        登录全链路（start/callback/token/logout）
//   me.js                  → /me            登录态恢复与探测
//   health.js              → /health        健康探针
//   membership/[[path]].js → /membership/*  会员档位（查 D1，可作 DB 健康探针）
//   marketplace/[[path]].js→ /marketplace/* 插件市场
//   afdian/[[path]].js     → /afdian/*      赞助
//
// 为什么必须有 /me 反代：此前 Function 只覆盖 /auth/*，前端刷新后调
// pages.dev/me 会落进静态站 fallback 返回 index.html（200 + HTML），
// JSON 解析失败 → 永远走 renderLogin —— 这就是「登过后还能再登」的根因。
//
// worker 侧通过 X-Forwarded-Host 生成与之匹配的 redirect_uri（见 mox-id publicBase）。
// 本 Function 必须应答 CORS：同源（官网镜像、本地开发等）的前端把登录请求发到这里——
//   - GET /me（探测）等简单请求：响应透传 worker 的 CORS 头
//   - POST /auth/token、带 Authorization 的 GET /me：触发 preflight，
//     由 onRequestOptions 以 204 + CORS 头应答（缺了它跨域 fetch 直接失败）
//
// ⚠️ 上游连接终点：mox-id 身份后端（私有仓库 codecloud-dev/mox-id 部署）。
// 正常情况下应使用中性自定义域 mox-id-email.moxsh.app；该域在 Cloudflare 上被摘、
// 且 CI 令牌缺 Workers Custom Domains:Edit 权限（10405）无法自动重建，登录全断。
// 临时回退到 Worker 标准地址 workers.dev（2026-10-06），待 Cloudflare 侧恢复
// mox-id-email.moxsh.app 自定义域后【必须改回中性域】，否则会暴露站长 QQ 号。
// OAuth 回调用官网域名（X-Forwarded-Host），与此终点无关，故仅需改这里即可恢复登录。
const UPSTREAM = 'https://mox-id.3042980037.workers.dev';

// 允许的跨域来源白名单：仅官网同域、GitHub Pages 镜像与本地开发可调用本反代。
// 此前用 '*' 且同时透传会话 Cookie，构成 CSRF 向量；现收紧为显式白名单，
// 命中来源才回显 access-control-allow-origin 并允许凭证，未命中则不发 CORS 头。
const ALLOWED_ORIGINS = new Set([
  'https://moxsh.app',
  'https://www.moxsh.app',
  'https://mox-site.pages.dev',
  'https://codecloud-dev.github.io',
]);

function resolveCorsOrigin(origin) {
  if (!origin) return null;
  if (ALLOWED_ORIGINS.has(origin)) return origin;
  // 本地开发：localhost / 127.0.0.1 任意端口
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return null;
}

export function corsHeaders(origin) {
  const allowed = resolveCorsOrigin(origin);
  const h = {
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-max-age': '86400',
  };
  if (allowed) {
    h['access-control-allow-origin'] = allowed;
    h['access-control-allow-credentials'] = 'true';
  }
  return h;
}

export async function proxy(context) {
  const { request } = context;
  const url = new URL(request.url);
  const upstream = UPSTREAM + url.pathname + url.search;
  try {
    const req = new Request(upstream, request);
    // 显式透传会话 Cookie（mox_sid），确保后台 /api/* 能识别已登录管理员，
    // 避免「官网已登录、进后台却要再登录」。
    const ck = request.headers.get('Cookie');
    if (ck) req.headers.set('Cookie', ck);
    req.headers.set('X-Forwarded-Host', url.host);
    const res = await fetch(req, { redirect: 'manual' });
    const out = new Response(res.body, res);
    out.headers.set('X-Content-Type-Options', 'nosniff');
    out.headers.delete('X-Frame-Options'); // 302 跳转与 API 无框架风险，保留官网 _headers 的 DENY 于页面即可
    // CORS：按请求来源回显白名单内的 origin（未命中则不发 CORS 头，避免 CSRF）
    for (const [k, v] of Object.entries(corsHeaders(request.headers.get('origin')))) {
      if (!out.headers.has(k)) out.headers.set(k, v);
    }
    return out;
  } catch (e) {
    // 后端不可达时返回可读 JSON 错误，避免裸 404/HTML 让前端误判
    return new Response(
      JSON.stringify({ error: 'auth_proxy_unavailable', path: url.pathname, detail: String(e) }),
      { status: 502, headers: { 'content-type': 'application/json; charset=utf-8', ...corsHeaders(request.headers.get('origin')) } }
    );
  }
}

export const pgOptions = (ctx) =>
  new Response(null, { status: 204, headers: corsHeaders(ctx?.request?.headers?.get('origin')) });
export const pgGet = (ctx) => proxy(ctx);
export const pgPost = (ctx) => proxy(ctx);

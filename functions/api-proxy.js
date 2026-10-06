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
// 本 Function 必须应答 CORS：任意域名（github.io 镜像、本地开发等）的前端都把
// 登录请求发到这里——
//   - GET /me（探测）等简单请求：响应透传 worker 的 access-control-allow-origin: *
//   - POST /auth/token、带 Authorization 的 GET /me：触发 preflight，
//     由 onRequestOptions 以 204 + CORS 头应答（缺了它跨域 fetch 直接失败）
//
// ⚠️ 注意：原 upstream 曾写为 mox-id-email.3042980037.workers.dev，其中 3042980037 是站长 QQ 号，
// 会把私人联系方式绑进基础设施域名、公开泄露。现已改为中性自定义域 mox-id-email.moxsh.app。
// 部署前请在 Cloudflare 把该自定义域（或你自有域的某子域）绑定到 mox-id-email Worker，
// 否则请改回你实际可达的地址；切勿再使用含 QQ 号的 *.workers.dev 子域。
const UPSTREAM = 'https://mox-id-email.moxsh.app';

export const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-max-age': '86400',
};

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
    // CORS：worker 已回 allow-origin:*，这里兜底补齐（含跨域 fetch 可读的自定义错误头）
    for (const [k, v] of Object.entries(CORS_HEADERS)) {
      if (!out.headers.has(k)) out.headers.set(k, v);
    }
    return out;
  } catch (e) {
    // 后端不可达时返回可读 JSON 错误，避免裸 404/HTML 让前端误判
    return new Response(
      JSON.stringify({ error: 'auth_proxy_unavailable', path: url.pathname, detail: String(e) }),
      { status: 502, headers: { 'content-type': 'application/json; charset=utf-8', ...CORS_HEADERS } }
    );
  }
}

export const pgOptions = () => new Response(null, { status: 204, headers: CORS_HEADERS });
export const pgGet = (ctx) => proxy(ctx);
export const pgPost = (ctx) => proxy(ctx);

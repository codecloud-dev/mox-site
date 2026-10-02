// 官网同域反代：登录链路（start/callback/token/me/logout）走官网域名，
// 避免 *.workers.dev 在部分网络（含中国大陆）不可达导致「点登录没反应」。
// worker 侧通过 X-Forwarded-Host 生成与之匹配的 redirect_uri（见 mox-id publicBase）。
//
// 前端（app.js / app.en.js）在任意域名（github.io 镜像、本地开发等）都把
// 登录请求发到这里——所以本 Function 必须应答 CORS：
//   - GET /me（探测）等简单请求：响应透传 worker 的 access-control-allow-origin: *
//   - POST /auth/token、带 Authorization 的 GET /me：触发 preflight，
//     由 onRequestOptions 以 204 + CORS 头应答（缺了它跨域 fetch 直接失败）
const UPSTREAM = 'https://mox-id.3042980037.workers.dev';

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-max-age': '86400',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const upstream = UPSTREAM + url.pathname + url.search;
  try {
    const req = new Request(upstream, request);
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
    // 后端不可达时返回可读错误，避免裸 404/500 让用户一脸懵
    return new Response(
      JSON.stringify({ error: 'auth_proxy_unavailable', path: url.pathname, detail: String(e) }),
      { status: 502, headers: { 'content-type': 'application/json; charset=utf-8', ...CORS_HEADERS } }
    );
  }
}

export const onRequestPost = onRequestGet;

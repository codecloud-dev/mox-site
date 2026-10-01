// 官网同域反代：登录链路（start/callback/token/me/logout）走官网域名，
// 避免 *.workers.dev 在部分网络（含中国大陆）不可达导致「点登录没反应」。
// worker 侧通过 X-Forwarded-Host 生成与之匹配的 redirect_uri（见 mox-id publicBase）。
const UPSTREAM = 'https://mox-id.3042980037.workers.dev';

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
    return out;
  } catch (e) {
    // 后端不可达时返回可读错误，避免裸 404/500 让用户一脸懵
    return new Response(
      JSON.stringify({ error: 'auth_proxy_unavailable', path: url.pathname, detail: String(e) }),
      { status: 502, headers: { 'content-type': 'application/json; charset=utf-8' } }
    );
  }
}

export const onRequestPost = onRequestGet;

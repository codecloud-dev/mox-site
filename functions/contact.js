// /contact —— 联系方式服务端「门禁」
//
// 仅在「已登录会话(mox-id /me) + 通过 Turnstile 真人验证」后，才下发 QQ / 邮箱。
// 原始联系方式不再下发到前端 JS（app.js 已移除明文常量），纯爬虫读不到源码也拿不到。
//
// 依赖 Cloudflare 环境变量（控制台 / wrangler.toml 配置）：
//   TURNSTILE_SECRET    Turnstile 服务端密钥（必填，否则 500）
//   TURNSTILE_SITEKEY   前端挂件站点密钥（也可直接写在 index.html 的 data-sitekey）
//   CONTACT_QQ / CONTACT_MAIL  可选，缺省用下方常量
import { corsHeaders } from './api-proxy.js';

// mox-id 后端（与 api-proxy.js 的 UPSTREAM 一致）
const UPSTREAM = 'https://mox-id-email.moxsh.app';

// 服务端常量：仅运行在 Worker 内，绝不进浏览器 JS，爬虫无法从静态资源获取。
const FALLBACK_QQ = '3042980037';
const FALLBACK_MAIL = 'z6666666662026@163.com';

function json(status, data, extra) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(extra || {}),
    },
  });
}

export async function onRequestPost(ctx) {
  const { request, env } = ctx;
  let body = {};
  try {
    body = await request.json();
  } catch (_) {
    /* 空 body 走缺失校验 */
  }

  // 1) 真人验证：Turnstile（服务端校验，绝不是可绕过的纯前端滑块）
  const token = body.token || body['cf-turnstile-response'];
  if (!token) return json(400, { error: 'missing_captcha' });
  const secret = env.TURNSTILE_SECRET;
  if (!secret) return json(500, { error: 'captcha_not_configured' });
  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for') ||
    '';
  let captchaOk = false;
  try {
    const v = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret,
          response: token,
          remoteip: ip,
        }).toString(),
      },
    );
    const vr = await v.json();
    captchaOk = !!vr.success;
  } catch (_) {
    captchaOk = false;
  }
  if (!captchaOk) return json(403, { error: 'captcha_failed' });

  // 2) 登录会话：复用 mox-id /me（前端把 localStorage 的 mox_token 作为 Bearer 带上来）
  const auth = request.headers.get('authorization') || '';
  const cookie = request.headers.get('cookie') || '';
  let authed = false;
  try {
    const me = await fetch(UPSTREAM + '/me', {
      method: 'GET',
      headers: {
        ...(auth ? { authorization: auth } : {}),
        ...(cookie ? { cookie } : {}),
      },
    });
    authed = me.status === 200;
  } catch (_) {
    authed = false;
  }
  if (!authed) return json(403, { error: 'login_required' });

  // 3) 通过：下发联系方式
  return json(200, {
    qq: env.CONTACT_QQ || FALLBACK_QQ,
    mail: env.CONTACT_MAIL || FALLBACK_MAIL,
  });
}

export const onRequestOptions = (c) =>
  new Response(null, {
    status: 204,
    headers: corsHeaders(c?.request?.headers?.get('origin')),
  });

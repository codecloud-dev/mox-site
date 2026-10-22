// 国内外自动分流（Cloudflare Pages 边缘中间件）：
//   - 按 Cloudflare 边缘的 CF-IPCountry 头判定访客网络：CN = 国内，其余 = 国外
//   - 国内：把页面里指向 GitHub 主仓库的链接（仓库/issue/PR/release）改写为 Gitee 镜像，
//     并注入 window.__mox_region='cn' 供前端做登录入口/下载源分流
//   - 国外：保持 GitHub 原链，注入 window.__mox_region='global'
// 架构约定：GitHub 是唯一主源（issue/PR/主页都在 GitHub），Gitee 只做国内只读镜像，
// 双向同步互串问题从根上杜绝（镜像方向永远 GitHub → Gitee）。
//
// ⚠️ CSP 是 script-src 'self'（禁 inline），故 region 标记走同源动态文件 /region.js，
// 页面只插 <script src="/region.js">——既满足 CSP 又拿到动态值。
// ⚠️ HTMLRewriter 注入必须用 element 处理器 + append：实测 endTag 处理器里的 append
// 会被静默丢弃（wrangler@3 本地 + Pages 线上均复现：链接改写了但脚本标记没了），
// element 里的 append 语义即「end tag 前插入」，同样落在 </body> 前且可靠生效。
// ⚠️ 改写后的 HTML 一律 no-store：CF 边缘缓存 key 不含国家头，
// 若让改写结果进缓存会把国内版页面发给国外用户（串国）。

const GH_PREFIX = 'https://github.com/codecloud-dev/';
const GE_PREFIX = 'https://gitee.com/thousand-code-crafts/';

function toGitee(url) {
  if (url.startsWith(GH_PREFIX)) return GE_PREFIX + url.slice(GH_PREFIX.length);
  return null;
}

function regionScriptTag() {
  // 同源外部脚本（CSP script-src 'self' 合规）
  return '<script src="/region.js"></script>';
}

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // 国家判定：CF-IPCountry 由 Cloudflare 边缘免费提供（本地开发时可用 ?region=cn 覆盖，便于测试）
  const override = url.searchParams.get('region');
  let country = (request.headers.get('CF-IPCountry') || '').toUpperCase();
  if (override === 'cn' || override === 'global') country = override === 'cn' ? 'CN' : 'US';
  const region = country === 'CN' ? 'cn' : 'global';

  // 1) 动态 region 文件（前端读 window.__mox_region 做分流）
  if (url.pathname === '/region.js') {
    return new Response(`window.__mox_region=${JSON.stringify(region)};`, {
      status: 200,
      headers: {
        'content-type': 'application/javascript; charset=utf-8',
        'cache-control': 'no-store',
        'access-control-allow-origin': '*',
      },
    });
  }

  const res = await next();

  // 2) 只处理 HTML（有 content-type 判断，静态 JS/CSS/图片直通）
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('text/html')) return res;

  // ⚠️ 禁止 new Response(res.body, res)——workerd 实测吞 Set-Cookie（踩坑记录 §5.3，SSO 断链根因）
  // 逐头拷贝（跳过 set-cookie），再用 getSetCookie 补种，保证会话 Cookie 不丢
  const headers = new Headers();
  for (const [k, v] of res.headers) {
    if (k.toLowerCase() !== 'set-cookie') headers.set(k, v);
  }
  const setCookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  for (const c of setCookies) headers.append('set-cookie', c);
  headers.set('cache-control', 'no-store'); // 防串国（见文件头注释）
  const withNoStore = new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });

  if (region === 'global') {
    // 国外：不碰链接，仅注入 region 标记
    return new HTMLRewriter()
      .on('body', {
        element(el) {
          el.append(regionScriptTag(), { html: true });
        },
      })
      .transform(withNoStore);
  }

  // 国内：改写 GitHub 主仓链接 → Gitee 镜像 + 注入 region 标记
  return new HTMLRewriter()
    .on('a[href^="' + GH_PREFIX + '"]', {
      element(el) {
        const href = el.getAttribute('href') || '';
        const ge = toGitee(href);
        if (ge) el.setAttribute('href', ge);
      },
    })
    .on('body', {
      element(el) {
        el.append(regionScriptTag(), { html: true });
      },
    })
    .transform(withNoStore);
}

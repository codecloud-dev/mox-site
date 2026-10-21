// moxsh 官网·粉丝专区（隐藏页）—— 前端逻辑（无构建、零依赖）
//
// v2 流程（与 moxsh-proot src/proot/fan.rs + mox-id src/fan.ts 三方对齐）：
//   1. 手机终端 `mox fan login` → 引擎起 127.0.0.1 回环 → 唤起浏览器打开本页，
//      URL 带 ?redirect=<回环地址>&state=<随机串>；
//   2. 未登录 → 引导 GitHub 登录（/auth/github/start?redirect=<本页完整URL>），
//      登录后回到本页（redirect/state 原样保留，token 由后端追加并即时清除）；
//   3. 点「确认领取」→ POST /fan/issue（服务端 HS256 签发激活码，幂等）；
//   4. 有 redirect 参数（脚本场景）→ 带 code+state 跳回转环，脚本自动收码 +
//      联网校验 + 落盘解锁；无 redirect（桌面 Linux 手动打开本页）→ 直接展示
//      兑换码，用户回终端 `mox fan redeem <code>`（同样联网验）。
//
// 灰度：/fan/status 的 whitelisted 决定「确认领取」是否可用（后端白名单 +
// 脚本侧 MOXSH_FAN_ENABLE 双保险）；已领取（claimed）时官网账户区也会出现
// 粉丝入口（主站 app.js 读同一 /fan/status）。
(function () {
  "use strict";

  const CFG = Object.assign({ apiBase: "" }, window.MOX_CONFIG || {});
  // 自动后端地址：pages.dev 同源反代；其他域走官网 pages.dev 反代（CORS 已放行 github.io）。
  const AUTO_API = location.hostname.endsWith(".pages.dev") ? "" : "https://mox-site.pages.dev";
  const API = (CFG.apiBase || AUTO_API).replace(/\/+$/, "");

  // ---- 本页 URL 参数（脚本回环场景）----
  // redirect：回环地址 http://127.0.0.1:<port>/done；state：脚本随机串（回传须一致）。
  const Q0 = new URLSearchParams(location.search);
  const REDIRECT = Q0.get("redirect") || "";
  const STATE = Q0.get("state") || "";

  // ---- 会话：从 ?token= 捕获 sid（保留 redirect/state，只清 token）----
  let SID = null;
  function captureSessionFromUrl() {
    const q = new URLSearchParams(location.search);
    const t = q.get("token");
    if (t) {
      SID = t;
      try {
        sessionStorage.setItem("mox_sid", t);
      } catch (_) {}
      q.delete("token");
      const clean = location.pathname + (q.toString() ? "?" + q.toString() : "") + location.hash;
      history.replaceState(null, "", clean);
    } else {
      try {
        SID = sessionStorage.getItem("mox_sid");
      } catch (_) {}
    }
  }

  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  // ---- API ----
  async function api(path, opts = {}) {
    const headers = Object.assign({}, opts.headers);
    if (opts.body) headers["Content-Type"] = "application/json";
    if (SID) headers["Authorization"] = "Bearer " + SID;
    const res = await fetch(API + path, Object.assign({}, opts, { headers, credentials: "include" }));
    let data = null;
    const ct = res.headers.get("Content-Type") || "";
    if (ct.includes("application/json")) data = await res.json();
    else data = { text: await res.text() };
    return { ok: res.ok, status: res.status, data };
  }

  // ---- 登录链接：带回本页完整 URL（redirect/state 不丢），登录后回到粉丝页 ----
  function loginHref() {
    const u = new URL(location.href);
    u.searchParams.delete("token");
    return API + "/auth/github/start?redirect=" + encodeURIComponent(u.toString());
  }

  // ---- 渲染：未登录 ----
  function showLoggedOut() {
    $("#auth-area").innerHTML = "";
    const card = el("div", "glass card");
    card.innerHTML = `
      <h2>登录后领取粉丝专属</h2>
      <p class="muted">用 GitHub 账号登录（粉丝权益与 GitHub 账号绑定）。必须登录才能领取。</p>
      <a class="btn primary" href="${loginHref()}">使用 GitHub 登录</a>`;
    $("#auth-area").appendChild(card);
    $("#fan-area").hidden = true;
  }

  function avatar(user) {
    return user && user.avatar_url
      ? `<img class="avatar" src="${user.avatar_url}" alt="" referrerpolicy="no-referrer">`
      : "";
  }

  // ---- 渲染：已登录 ----
  async function showLoggedIn() {
    const me = await api("/me");
    if (!me.ok) {
      SID = null;
      try {
        sessionStorage.removeItem("mox_sid");
      } catch (_) {}
      showLoggedOut();
      return;
    }
    const d = me.data;
    const user = d.user || {};
    const membership = d.membership || { tier: "free", status: "none" };
    const isFan = membership.tier && membership.tier !== "free" && membership.status !== "none";

    const card = el("div", "glass card");
    card.innerHTML = `
      <div class="me">
        ${avatar(user)}
        <div>
          <div class="me-name">${user.name || user.login || "已登录"}</div>
          <div class="muted">@${user.login || ""} · 钱包 ¥${((d.wallet_cents || 0) / 100).toFixed(2)}</div>
        </div>
      </div>
      <div class="badge ${isFan ? "badge-fan" : "badge-free"}">
        ${isFan ? "粉丝会员：" + membership.tier : "普通用户（未开通会员）"}
      </div>
      <div class="row"><a class="btn ghost" href="#" id="btn-logout">退出登录</a></div>`;
    const auth = $("#auth-area");
    auth.innerHTML = "";
    auth.appendChild(card);
    const lo = $("#btn-logout");
    if (lo)
      lo.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
          await api("/auth/logout", { method: "POST", body: "{}" });
        } catch (_) {}
        SID = null;
        try {
          sessionStorage.removeItem("mox_sid");
        } catch (_) {}
        showLoggedOut();
      });

    $("#fan-area").hidden = false;
    renderFanState();
  }

  // ---- 渲染：粉丝灰度状态 + 领取 ----
  async function renderFanState() {
    const box = $("#claim-area");
    box.innerHTML = "";
    const loading = el("div", "muted", "正在确认粉丝资格…");
    box.appendChild(loading);

    let st;
    try {
      const r = await api("/fan/status");
      if (!r.ok) {
        // 会话失效 → 回登录态
        SID = null;
        try {
          sessionStorage.removeItem("mox_sid");
        } catch (_) {}
        showLoggedOut();
        return;
      }
      st = r.data;
    } catch (_) {
      box.innerHTML = "";
      box.appendChild(el("div", "msg", "网络错误：暂时连不上官方服务，请稍后重试。"));
      return;
    }
    box.innerHTML = "";

    if (!st.whitelisted) {
      // 灰度白名单外（强制登录已过，但不在首批灰度）
      const c = el("div", "glass card");
      c.innerHTML = `
        <h3>粉丝福利 · 灰度测试中</h3>
        <p class="muted">你已通过登录校验。当前为首批灰度（白名单制），正式开放后此处即可一键领取。
        关注公众号可第一时间收到开放通知。</p>`;
      box.appendChild(c);
      return;
    }

    if (st.claimed) {
      renderClaimed(st);
    } else {
      renderClaimButton();
    }
  }

  function renderClaimButton() {
    const box = $("#claim-area");
    box.innerHTML = "";
    const c = el("div", "glass card");
    c.innerHTML = `
      <h3>① 领取粉丝专属</h3>
      <p class="muted">点击「确认领取」即由官方服务端签发激活码（绑定当前 GitHub 账号，可随时在后台吊销）。</p>
      <button id="btn-claim" class="btn primary">确认领取</button>
      <div id="claim-msg" class="msg"></div>`;
    box.appendChild(c);
    $("#btn-claim").addEventListener("click", claim);
  }

  function renderClaimed(st) {
    const box = $("#claim-area");
    box.innerHTML = "";
    const c = el("div", "glass card");
    const expText = st.exp ? new Date(st.exp * 1000).toLocaleString() : "永久";
    c.innerHTML = `
      <h3>✅ 已领取粉丝专属</h3>
      <p class="muted">档位 <b>${st.tier || "fan"}</b> · 有效期 ${expText}。激活码由官方服务端签发与校验。</p>
      <div class="code-out">
        <code id="fan-code"></code>
        <div class="row">
          <button id="btn-copy" class="btn ghost">复制兑换码</button>
          ${REDIRECT ? '<button id="btn-resend" class="btn">再次发送到终端</button>' : ""}
        </div>
        <div class="muted">${
          REDIRECT
            ? "在手机终端执行 <b>mox fan login</b> 即可自动收码并解锁（无需手动输入）。"
            : "在手机终端执行 <b>mox fan redeem &lt;上面的兑换码&gt;</b> 解锁粉丝专属配方（需联网校验）。"
        }</div>
      </div>`;
    box.appendChild(c);
    $("#fan-code").textContent = st.code || "";
    $("#btn-copy").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(st.code || "");
        $("#btn-copy").textContent = "已复制";
      } catch (_) {
        $("#btn-copy").textContent = "复制失败，请手动选";
      }
      setTimeout(() => ($("#btn-copy").textContent = "复制兑换码"), 1500);
    });
    const rs = $("#btn-resend");
    if (rs) rs.addEventListener("click", () => bounceToLoopback(st.code));
  }

  // ---- 领取：POST /fan/issue → 跳回转环（脚本场景）或展示码（桌面场景）----
  async function claim() {
    const msg = $("#claim-msg");
    if (msg) msg.textContent = "领取中…";
    let r;
    try {
      r = await api("/fan/issue", { method: "POST", body: "{}" });
    } catch (_) {
      if (msg) msg.textContent = "网络错误：暂时连不上官方服务，请稍后重试。";
      return;
    }
    if (r.ok && r.data && r.data.ok) {
      if (REDIRECT) {
        bounceToLoopback(r.data.code);
      } else {
        renderClaimed({ code: r.data.code, tier: r.data.tier, exp: r.data.exp });
      }
    } else {
      const e = (r.data && r.data.error) || "HTTP " + r.status;
      if (msg) msg.textContent = "领取失败：" + friendlyErr(e);
    }
  }

  // 带 code+state 跳转脚本的回环监听（127.0.0.1）——脚本收到即自动验码落盘
  function bounceToLoopback(code) {
    const sep = REDIRECT.includes("?") ? "&" : "?";
    location.href = REDIRECT + sep + "code=" + encodeURIComponent(code) + "&state=" + encodeURIComponent(STATE);
  }

  function friendlyErr(e) {
    const map = {
      not_in_canary: "不在当前灰度名单（首批白名单制，正式开放后即可领取）",
      oauth_not_configured: "后端未配置登录，请联系管理",
      unauthorized: "登录已失效，请刷新页面重新登录",
    };
    return map[e] || e;
  }

  // ---- 公开信息：公告 / 赞助 / 档位 ----
  async function loadPublic() {
    try {
      const n = await api("/notices");
      if (n.ok && n.data && n.data.notices) {
        const box = $("#notices");
        box.innerHTML = "";
        for (const no of n.data.notices) {
          box.appendChild(el("div", "notice " + (no.level || "info"), `${no.title} — ${no.body || ""}`));
        }
      }
    } catch (_) {}
    try {
      const t = await api("/afdian/total");
      if (t.ok && t.data) {
        const cents = t.data.total_cents ?? t.data.total ?? 0;
        $("#sponsor-total").textContent = "累计赞助 ¥" + (cents / 100).toFixed(2);
      }
    } catch (_) {}
    try {
      const s = await api("/afdian/sponsors");
      if (s.ok && s.data) {
        const list = s.data.sponsors || s.data.list || [];
        const wall = $("#sponsor-wall");
        wall.innerHTML = "";
        for (const sp of list.slice(0, 50)) {
          wall.appendChild(
            el("span", "sponsor-chip", (sp.user_name || sp.name || sp.user || "匿名") + (sp.amount_cents ? " ¥" + (sp.amount_cents / 100).toFixed(0) : ""))
          );
        }
      }
    } catch (_) {}
    try {
      const tiers = await api("/membership/tiers");
      if (tiers.ok && tiers.data && tiers.data.tiers) {
        const box = $("#tiers");
        box.innerHTML = "";
        for (const [id, t] of Object.entries(tiers.data.tiers)) {
          if (id === "free") continue;
          const price = (t.priceCents / 100).toFixed(t.priceCents % 100 ? 2 : 0);
          box.appendChild(
            el("div", "tier glass", `${t.name || id} · ¥${price}${t.perks ? " · " + (Array.isArray(t.perks) ? t.perks.join(" / ") : t.perks) : ""}`)
          );
        }
      }
    } catch (_) {}
  }

  // ---- 启动 ----
  async function boot() {
    if (!API) {
      $("#config-warn").hidden = false;
    }
    captureSessionFromUrl();
    await loadPublic();
    if (SID) {
      await showLoggedIn();
    } else {
      showLoggedOut();
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();

// moxsh 官网·设备绑定页（隐藏功能页）—— 前端逻辑（无构建、零依赖）
//
// 流程（与 moxsh-proot src/proot/redeem.rs + mox-id /devices/register 三方对齐）：
//   1. 手机终端 `mox redeem login` → 引擎起 127.0.0.1 回环 → 唤起浏览器打开本页，
//      URL 带 ?redirect=<回环地址>&state=<随机串>&device_token=<本机令牌>&name=&platform=；
//   2. 未登录 → 引导 GitHub 登录（/auth/github/start?redirect=<本页完整URL>），
//      登录后回到本页（redirect/state/device_token 原样保留，token 由后端追加并即时清除）；
//   3. 点「绑定此设备」→ POST /devices/register { device_token, name, platform }；
//   4. 有 redirect 参数（脚本场景）→ 带 ok=1&state 跳回转环，脚本自动收确认 +
//      联网拉取授权；无 redirect（桌面手动打开本页）→ 直接展示绑定结果。
//
// 幂等：同一账号重复绑定同一设备 = 刷新名称/平台（200）；令牌被他人占用 → 403。
(function () {
  "use strict";

  const CFG = Object.assign({ apiBase: "" }, window.MOX_CONFIG || {});
  const AUTO_API = location.hostname.endsWith(".pages.dev") ? "" : "https://mox-site.pages.dev";
  const API = (CFG.apiBase || AUTO_API).replace(/\/+$/, "");

  // ---- 本页 URL 参数（脚本回环场景）----
  const Q0 = new URLSearchParams(location.search);
  const REDIRECT = Q0.get("redirect") || "";
  const STATE = Q0.get("state") || "";
  const DEVICE_TOKEN = Q0.get("device_token") || "";
  const DEV_NAME = Q0.get("name") || "";
  const DEV_PLATFORM = Q0.get("platform") || "";

  // ---- 双语（?lang=en）----
  const LANG = Q0.get("lang") === "en" ? "en" : "zh";
  const T = {
    zh: {
      brand: "设备绑定",
      tagline: "把本机设备绑定到你的账号 · 兑换商品授权的前提",
      loginTitle: "登录后绑定设备",
      loginHint: "用 GitHub 账号登录（设备与授权归属以此账号为准）。必须登录才能绑定。",
      loginBtn: "使用 GitHub 登录",
      logout: "退出登录",
      deviceTitle: "待绑定设备",
      confirmTitle: "确认绑定",
      confirmHint: "点击「绑定此设备」后，本机设备令牌即与当前 GitHub 账号关联。之后可在官网兑换页把商品授权赋予这台设备。",
      bindBtn: "绑定此设备",
      goRedeem: "去兑换页",
      binding: "绑定中…",
      bound: "✅ 绑定成功！设备已关联到当前账号。",
      boundNoRedirect: "绑定成功。回到终端继续（mox redeem status 查看授权），或去兑换页选购。",
      missingToken: "缺少设备令牌参数。请回到终端执行 <b>mox redeem login</b> 重新打开本页。",
      errTaken: "该设备已被其他账号绑定（每个设备令牌只能归属一个账号）。请换一台设备，或联系管理。",
      errBadToken: "设备令牌格式不正确，请在终端重新执行 mox redeem login。",
      errUnauth: "登录已失效，请刷新页面重新登录。",
      errNet: "网络错误：暂时连不上官方服务，请稍后重试。",
      langSwitch: "English",
      platform: { android: "Android / Termux", linux: "Linux", macos: "macOS", windows: "Windows", unknown: "未知平台" },
    },
    en: {
      brand: "Device Binding",
      tagline: "Bind this device to your account — required before redeeming product entitlements",
      loginTitle: "Sign in to bind this device",
      loginHint: "Sign in with GitHub (your account owns the device and its entitlements). Sign-in is required.",
      loginBtn: "Sign in with GitHub",
      logout: "Sign out",
      deviceTitle: "Device to bind",
      confirmTitle: "Confirm",
      confirmHint: 'Click "Bind this device" to link this device token to your GitHub account. You can then grant product entitlements to it on the redeem page.',
      bindBtn: "Bind this device",
      goRedeem: "Go to redeem",
      binding: "Binding…",
      bound: "✅ Bound! This device is now linked to your account.",
      boundNoRedirect: "Bound. Return to the terminal (mox redeem status) or head to the redeem page.",
      missingToken: "Missing device token. Please run <b>mox redeem login</b> in your terminal to reopen this page.",
      errTaken: "This device is already bound to another account (one token, one account). Use another device or contact support.",
      errBadToken: "Invalid device token. Please run mox redeem login again from the terminal.",
      errUnauth: "Session expired. Please refresh and sign in again.",
      errNet: "Network error: cannot reach the service. Please retry later.",
      langSwitch: "中文",
      platform: { android: "Android / Termux", linux: "Linux", macos: "macOS", windows: "Windows", unknown: "Unknown" },
    },
  };
  const t = (k) => (T[LANG] && T[LANG][k]) || T.zh[k] || k;

  function applyI18n() {
    document.querySelectorAll("[data-i18n]").forEach((n) => {
      n.textContent = t(n.dataset.i18n);
    });
    const ls = document.getElementById("langSwitch");
    if (ls) {
      ls.textContent = t("langSwitch");
      const u = new URL(location.href);
      u.searchParams.set("lang", LANG === "en" ? "zh" : "en");
      ls.href = u.toString();
    }
    document.documentElement.lang = LANG === "en" ? "en" : "zh-CN";
  }

  // ---- 会话：从 ?token= 捕获 sid（保留其余参数，只清 token）----
  let SID = null;
  function captureSessionFromUrl() {
    const q = new URLSearchParams(location.search);
    const tk = q.get("token");
    if (tk) {
      SID = tk;
      try {
        sessionStorage.setItem("mox_sid", tk);
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

  function loginHref() {
    const u = new URL(location.href);
    u.searchParams.delete("token");
    return API + "/auth/github/start?redirect=" + encodeURIComponent(u.toString());
  }

  function showLoggedOut() {
    $("#auth-area").innerHTML = "";
    const card = el("div", "glass card");
    card.innerHTML = `
      <h2>${t("loginTitle")}</h2>
      <p class="muted">${t("loginHint")}</p>
      <a class="btn primary" href="${loginHref()}">${t("loginBtn")}</a>`;
    $("#auth-area").appendChild(card);
    $("#bind-area").hidden = true;
  }

  function avatar(user) {
    return user && user.avatar_url
      ? `<img class="avatar" src="${user.avatar_url}" alt="" referrerpolicy="no-referrer">`
      : "";
  }

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
    const card = el("div", "glass card");
    card.innerHTML = `
      <div class="me">
        ${avatar(user)}
        <div>
          <div class="me-name">${user.name || user.login || "已登录"}</div>
          <div class="muted">@${user.login || ""}</div>
        </div>
      </div>
      <div class="row"><a class="btn ghost" href="#" id="btn-logout">${t("logout")}</a></div>`;
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
    renderBindArea();
  }

  function renderBindArea() {
    $("#bind-area").hidden = false;
    const dc = $("#device-card");
    if (!DEVICE_TOKEN) {
      dc.innerHTML = `<div class="msg">${t("missingToken")}</div>`;
      $("#btn-bind").style.display = "none";
      return;
    }
    const plat = t("platform")[DEV_PLATFORM] || t("platform").unknown;
    dc.innerHTML = `
      <div class="kv"><span>${LANG === "en" ? "Device name" : "设备名"}</span><span>${DEV_NAME || "—"}</span></div>
      <div class="kv"><span>${LANG === "en" ? "Platform" : "平台"}</span><span>${plat}</span></div>
      <div class="kv"><span>${LANG === "en" ? "Device token" : "设备令牌"}</span><span><code>${DEVICE_TOKEN.slice(0, 8)}…${DEVICE_TOKEN.slice(-4)}</code></span></div>
      <p class="muted" style="margin-top:8px;font-size:12px">${
        LANG === "en"
          ? "The full token stays on this device and is only sent to the official backend over this page."
          : "完整令牌只保存在本机，仅通过本页发送给官方后端。"
      }</p>`;
    $("#btn-bind").style.display = "";
    $("#btn-bind").addEventListener("click", bind);
  }

  async function bind() {
    const msg = $("#bind-msg");
    const btn = $("#btn-bind");
    btn.disabled = true;
    if (msg) msg.textContent = t("binding");
    let r;
    try {
      r = await api("/devices/register", {
        method: "POST",
        body: JSON.stringify({ device_token: DEVICE_TOKEN, name: DEV_NAME, platform: DEV_PLATFORM }),
      });
    } catch (_) {
      btn.disabled = false;
      if (msg) msg.textContent = t("errNet");
      return;
    }
    btn.disabled = false;
    if (r.ok && r.data && r.data.ok) {
      if (msg) {
        msg.textContent = REDIRECT ? t("bound") : t("boundNoRedirect");
        msg.classList.add("ok");
      }
      if (REDIRECT) {
        const sep = REDIRECT.includes("?") ? "&" : "?";
        setTimeout(() => {
          location.href = REDIRECT + sep + "ok=1&state=" + encodeURIComponent(STATE);
        }, 600);
      }
      return;
    }
    const e = (r.data && r.data.error) || "HTTP " + r.status;
    const map = {
      device_token_taken: t("errTaken"),
      bad_device_token: t("errBadToken"),
      unauthorized: t("errUnauth"),
    };
    if (msg) msg.textContent = map[e] || e;
  }

  async function boot() {
    if (!API) {
      $("#config-warn").hidden = false;
    }
    applyI18n();
    captureSessionFromUrl();
    if (SID) {
      await showLoggedIn();
    } else {
      showLoggedOut();
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();

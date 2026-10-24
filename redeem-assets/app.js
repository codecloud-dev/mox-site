// moxsh 官网·商品兑换页 —— 前端逻辑（无构建、零依赖）
//
// 流程（与 mox-id /products/* + /devices/* 对齐）：
//   1. GitHub 登录（会话 sid，OAuth token 永不出浏览器）；
//   2. ① 选择设备（GET /devices；未绑定 → 引导去终端执行 mox redeem login）；
//   3. ② 输兑换码或爱发电订单号（二选一）→ POST /products/redeem { code|out_trade_no, device_token }；
//   4. 授权即时生效：到账设备上 `mox redeem status` 可见；本页「我的授权」可换绑（每月 1 次）。
(function () {
  "use strict";

  const CFG = Object.assign({ apiBase: "" }, window.MOX_CONFIG || {});
  const AUTO_API = location.hostname.endsWith(".pages.dev") ? "" : "https://mox-site.pages.dev";
  const API = (CFG.apiBase || AUTO_API).replace(/\/+$/, "");

  const Q0 = new URLSearchParams(location.search);
  const LANG = Q0.get("lang") === "en" ? "en" : "zh";

  const T = {
    zh: {
      brand: "商品兑换",
      tagline: "兑换码 / 爱发电订单号 → 赋予到你的设备",
      loginTitle: "登录后兑换",
      loginHint: "用 GitHub 账号登录（授权与账号绑定，可随时在服务端吊销）。必须登录才能兑换。",
      loginBtn: "使用 GitHub 登录",
      logout: "退出登录",
      step1: "① 选择设备",
      step2: "② 输入兑换码或订单号",
      codeLabel: "兑换码（爱发电自动回复里领取）",
      orderLabel: "或爱发电订单号（二选一）",
      redeemBtn: "立即兑换",
      redeemHint: "兑换成功后授权即时生效：在选了的那台设备上执行 mox redeem status 即可看到。每个账号对每个商品只保留一条授权；换设备每月可操作 1 次。",
      myEnt: "我的授权",
      catalog: "商品目录",
      noDevice: "尚未绑定任何设备",
      noDeviceHint: "在安装了 proot 引擎的那台设备上打开终端，执行 <b>mox redeem login</b>，按浏览器提示完成绑定后，回来刷新本页即可选择它。",
      refresh: "刷新",
      deviceCol: "设备",
      statusCol: "状态",
      expCol: "到期",
      rebindCol: "换绑",
      rebindBtn: "换绑设备",
      rebindPick: "换绑到哪台设备？",
      rebinding: "换绑中…",
      rebound: "✅ 已换绑，授权已转移到所选设备。",
      noEnts: "暂无授权记录。购买后在下方输入兑换码或订单号即可兑换。",
      noProducts: "暂无在售商品。",
      buying: "兑换中…",
      redeemed: "🎉 兑换成功！授权已赋予所选设备，即时生效。",
      needOne: "请先选择一台设备，并输入兑换码或订单号（二选一）。",
      needDevice: "请先选择一台设备。",
      needInput: "请输入兑换码或订单号（二选一）。",
      errMap: {
        code_not_found: "兑换码不存在，请检查后重试（注意区分大小写）。",
        already_redeemed: "该兑换码 / 订单已兑换过。",
        code_revoked: "该兑换码已被吊销，请联系管理。",
        order_not_found: "未查到该订单（可能未支付或订单号有误）。爱发电订单需已支付后才能兑换。",
        order_not_product: "该订单不是商品订单（可能是会员/赞助订单）。",
        product_unavailable: "商品已下架，暂时无法兑换。",
        entitlement_revoked: "你在此商品上的授权已被吊销，请联系管理。",
        device_not_yours: "所选设备不属于当前账号（请先在本账号下绑定该设备）。",
        rebind_limit_monthly: "本月已换绑过（每商品每月限 1 次），下月再试。",
        entitlement_not_found: "授权记录不存在。",
        missing_device_token: "缺少设备参数。",
        missing_code: "缺少兑换码。",
        missing_out_trade_no: "缺少订单号。",
        unauthorized: "登录已失效，请刷新页面重新登录。",
        invalid_json: "请求格式错误。",
      },
      langSwitch: "English",
    },
    en: {
      brand: "Redeem",
      tagline: "Redeem code or afdian order number → grant to your device",
      loginTitle: "Sign in to redeem",
      loginHint: "Sign in with GitHub (entitlements are bound to your account and can be revoked server-side). Sign-in is required.",
      loginBtn: "Sign in with GitHub",
      logout: "Sign out",
      step1: "① Choose a device",
      step2: "② Enter redeem code or order number",
      codeLabel: "Redeem code (from the afdian auto-reply)",
      orderLabel: "or afdian order number (either one)",
      redeemBtn: "Redeem now",
      redeemHint: "Entitlements take effect immediately: run mox redeem status on the chosen device. One entitlement per product per account; rebinding is limited to once a month.",
      myEnt: "My entitlements",
      catalog: "Catalog",
      noDevice: "No devices bound yet",
      noDeviceHint: "On the device running the proot engine, open a terminal and run <b>mox redeem login</b>, complete binding in the browser, then refresh this page.",
      refresh: "Refresh",
      deviceCol: "Device",
      statusCol: "Status",
      expCol: "Expires",
      rebindCol: "Rebind",
      rebindBtn: "Rebind device",
      rebindPick: "Rebind to which device?",
      rebinding: "Rebinding…",
      rebound: "✅ Rebound. The entitlement now belongs to the chosen device.",
      noEnts: "No entitlements yet. After purchase, enter a redeem code or order number below.",
      noProducts: "No products on sale.",
      buying: "Redeeming…",
      redeemed: "🎉 Redeemed! The entitlement is granted to the chosen device and effective immediately.",
      needOne: "Choose a device and enter a redeem code or order number (either one).",
      needDevice: "Please choose a device first.",
      needInput: "Please enter a redeem code or order number.",
      errMap: {
        code_not_found: "Redeem code not found. Check it and retry (case-sensitive).",
        already_redeemed: "This code / order has already been redeemed.",
        code_revoked: "This code has been revoked. Contact support.",
        order_not_found: "Order not found (unpaid or wrong number). Only paid afdian orders can be redeemed.",
        order_not_product: "This order is not a product order (membership/sponsor?).",
        product_unavailable: "Product is off-sale and cannot be redeemed right now.",
        entitlement_revoked: "Your entitlement for this product was revoked. Contact support.",
        device_not_yours: "The chosen device does not belong to this account (bind it first).",
        rebind_limit_monthly: "Already rebound this month (once per product per month). Try next month.",
        entitlement_not_found: "Entitlement not found.",
        missing_device_token: "Missing device parameter.",
        missing_code: "Missing redeem code.",
        missing_out_trade_no: "Missing order number.",
        unauthorized: "Session expired. Please refresh and sign in again.",
        invalid_json: "Bad request format.",
      },
      langSwitch: "中文",
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

  // ---- 会话 ----
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

  function friendly(e) {
    const m = T[LANG].errMap;
    const key = String(e || "").split(":")[0];
    return (m && m[key]) || e;
  }

  function showLoggedOut() {
    $("#auth-area").innerHTML = "";
    const card = el("div", "glass card");
    card.innerHTML = `
      <h2>${t("loginTitle")}</h2>
      <p class="muted">${t("loginHint")}</p>
      <a class="btn primary" href="${loginHref()}">${t("loginBtn")}</a>`;
    $("#auth-area").appendChild(card);
    $("#redeem-area").hidden = true;
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
    $("#redeem-area").hidden = false;
    await Promise.all([loadDevices(), loadCatalog(), loadMyEnts()]);
  }

  // ---- 设备下拉 ----
  let DEVICES = [];
  let picked = null;
  async function loadDevices() {
    const box = $("#device-pick");
    box.innerHTML = `<p class="muted">${LANG === "en" ? "Loading…" : "加载中…"}</p>`;
    let r;
    try {
      r = await api("/devices");
    } catch (_) {
      box.innerHTML = `<div class="msg">${LANG === "en" ? "Network error, please retry." : "网络错误，请稍后重试。"}</div>`;
      return;
    }
    if (!r.ok) {
      if (r.status === 401) {
        SID = null;
        try {
          sessionStorage.removeItem("mox_sid");
        } catch (_) {}
        showLoggedOut();
        return;
      }
      box.innerHTML = `<div class="msg">${friendly((r.data && r.data.error) || "HTTP " + r.status)}</div>`;
      return;
    }
    DEVICES = (r.data && r.data.devices) || [];
    if (!DEVICES.length) {
      box.innerHTML = `
        <h3>${t("noDevice")}</h3>
        <p class="muted">${t("noDeviceHint")}</p>
        <div class="row"><button class="btn ghost" id="btn-refresh-dev">${t("refresh")}</button></div>`;
      const rb = $("#btn-refresh-dev");
      if (rb) rb.addEventListener("click", loadDevices);
      picked = null;
      return;
    }
    const rows = DEVICES.map((d, i) => {
      const label = (d.name || (LANG === "en" ? "Unnamed device" : "未命名设备")) +
        " · " + (d.platform || "?") +
        ' · <code>' + String(d.device_token).slice(0, 8) + "…</code>";
      return `<label class="form-check"><input type="radio" name="dev" value="${d.device_token}" ${i === 0 ? "checked" : ""}/> <span>${label}</span></label>`;
    }).join("");
    box.innerHTML = `<div class="kv-list">${rows}</div>
      <div class="row"><button class="btn ghost" id="btn-refresh-dev">${t("refresh")}</button></div>`;
    const rb = $("#btn-refresh-dev");
    if (rb) rb.addEventListener("click", loadDevices);
    box.querySelectorAll("input[name=dev]").forEach((r2) =>
      r2.addEventListener("change", () => {
        picked = r2.value;
      })
    );
    picked = DEVICES[0].device_token;
  }

  // ---- 商品目录 ----
  async function loadCatalog() {
    const box = $("#catalog");
    let r;
    try {
      r = await api("/products");
    } catch (_) {
      box.innerHTML = "";
      return;
    }
    if (!r.ok || !r.data || !r.data.products) {
      box.innerHTML = "";
      return;
    }
    const ps = r.data.products;
    if (!ps.length) {
      box.innerHTML = `<div class="glass card"><p class="muted">${t("noProducts")}</p></div>`;
      return;
    }
    box.innerHTML = ps
      .map((p) => {
        const price = ((p.price_cents || 0) / 100).toFixed(p.price_cents % 100 ? 2 : 0);
        return `<div class="glass card" style="margin-bottom:12px">
          <div class="row" style="justify-content:space-between;align-items:center">
            <h3 style="margin:0">${p.name || p.id}</h3>
            <span class="badge b-info">¥${price}</span>
          </div>
          <p class="muted" style="margin:8px 0 0">${p.descr || ""}</p>
        </div>`;
      })
      .join("");
  }

  // ---- 我的授权 ----
  async function loadMyEnts() {
    const box = $("#my-ents");
    let r;
    try {
      r = await api("/products/entitlements");
    } catch (_) {
      box.innerHTML = `<div class="msg">${LANG === "en" ? "Network error." : "网络错误。"}</div>`;
      return;
    }
    if (!r.ok) {
      if (r.status === 401) return;
      box.innerHTML = `<div class="msg">${friendly((r.data && r.data.error) || "HTTP " + r.status)}</div>`;
      return;
    }
    const ents = (r.data && r.data.entitlements) || [];
    if (!ents.length) {
      box.innerHTML = `<p class="muted">${t("noEnts")}</p>`;
      return;
    }
    const rows = ents
      .map((e) => {
        const active = e.status === "active";
        const exp = e.exp ? new Date(e.exp * 1000).toLocaleString() : (LANG === "en" ? "forever" : "永久");
        const dev = e.device_name || (e.device_token ? String(e.device_token).slice(0, 8) + "…" : "—");
        const st = active
          ? `<span class="badge b-ok">${LANG === "en" ? "active" : "有效"}</span>`
          : `<span class="badge b-mut">${LANG === "en" ? "revoked" : "已吊销"}</span>`;
        const rebind = active
          ? `<button class="btn btn-outline-secondary btn-sm" data-rebind="${e.product_id}">${t("rebindBtn")}</button>`
          : "";
        return `<tr>
          <td>${e.product_name || e.product_id}</td>
          <td><span class="badge b-info">${e.tier || ""}</span></td>
          <td>${dev}</td>
          <td>${st}</td>
          <td>${exp}</td>
          <td class="text-end">${rebind}</td>
        </tr>`;
      })
      .join("");
    box.innerHTML = `<div class="table-responsive"><table class="table table-vcenter card-table">
      <thead><tr><th>${LANG === "en" ? "Product" : "商品"}</th><th>${LANG === "en" ? "Tier" : "档位"}</th><th>${t("deviceCol")}</th><th>${t("statusCol")}</th><th>${t("expCol")}</th><th class="text-end">${t("rebindCol")}</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
    box.querySelectorAll("button[data-rebind]").forEach((b) =>
      b.addEventListener("click", () => rebind(b.dataset.rebind))
    );
  }

  // ---- 换绑 ----
  async function rebind(productId) {
    if (!DEVICES.length) {
      alert(t("noDevice"));
      return;
    }
    const opts = DEVICES.map(
      (d, i) => `${i}: ${(d.name || d.platform || d.device_token.slice(0, 8))} (${String(d.device_token).slice(0, 8)}…)`
    ).join("\n");
    const pick = prompt(t("rebindPick") + "\n\n" + opts + "\n\n0-" + (DEVICES.length - 1), "0");
    if (pick == null) return;
    const idx = parseInt(pick, 10);
    if (!Number.isFinite(idx) || idx < 0 || idx >= DEVICES.length) {
      alert(t("needDevice"));
      return;
    }
    const msg = $("#redeem-msg");
    if (msg) msg.textContent = t("rebinding");
    let r;
    try {
      r = await api("/products/rebind", {
        method: "POST",
        body: JSON.stringify({ product_id: productId, device_token: DEVICES[idx].device_token }),
      });
    } catch (_) {
      if (msg) msg.textContent = LANG === "en" ? "Network error." : "网络错误。";
      return;
    }
    if (r.ok && r.data && r.data.ok) {
      if (msg) {
        msg.textContent = t("rebound");
        msg.classList.add("ok");
      }
      loadMyEnts();
    } else {
      if (msg) msg.textContent = friendly((r.data && r.data.error) || "HTTP " + r.status);
    }
  }

  // ---- 兑换 ----
  async function redeem() {
    const msg = $("#redeem-msg");
    msg.classList.remove("ok");
    const code = $("#rdCode").value.trim();
    const order = $("#rdOrder").value.trim();
    if (!picked) {
      msg.textContent = t("needDevice");
      return;
    }
    if (!code && !order) {
      msg.textContent = t("needInput");
      return;
    }
    if (code && order) {
      msg.textContent = t("needOne");
      return;
    }
    const btn = $("#btn-redeem");
    btn.disabled = true;
    msg.textContent = t("buying");
    let r;
    try {
      r = await api("/products/redeem", {
        method: "POST",
        body: JSON.stringify(
          code ? { code: code, device_token: picked } : { out_trade_no: order, device_token: picked }
        ),
      });
    } catch (_) {
      btn.disabled = false;
      msg.textContent = LANG === "en" ? "Network error: cannot reach the service. Please retry later." : "网络错误：暂时连不上官方服务，请稍后重试。";
      return;
    }
    btn.disabled = false;
    if (r.ok && r.data && r.data.ok) {
      msg.textContent = t("redeemed");
      msg.classList.add("ok");
      $("#rdCode").value = "";
      $("#rdOrder").value = "";
      loadMyEnts();
      loadCatalog();
    } else {
      const e = (r.data && r.data.error) || "HTTP " + r.status;
      if (e === "unauthorized" || r.status === 401) {
        SID = null;
        try {
          sessionStorage.removeItem("mox_sid");
        } catch (_) {}
        showLoggedOut();
        return;
      }
      msg.textContent = friendly(e);
    }
  }

  async function boot() {
    if (!API) {
      $("#config-warn").hidden = false;
    }
    applyI18n();
    captureSessionFromUrl();
    $("#btn-redeem").addEventListener("click", redeem);
    if (SID) {
      await showLoggedIn();
    } else {
      showLoggedOut();
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();

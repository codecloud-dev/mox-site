/* site-star.js —— 官网「站内一键 Star」前端逻辑（无依赖）。
 *
 * 行为：
 *  - 已登录 MoX（localStorage 有 mox_token）：点击 ★ 调同源 /star（经 Pages Function 代理到 mox-id 后端），
 *    后端用你授权过的 GitHub token 实际给仓库点 Star，你全程不离开官网。
 *  - 未登录 / 后端不可用 / 令牌无 public_repo 权限：自动回退到在 GitHub 打开仓库 Star 页（不破坏体验）。
 * 这样即便后端 /star 尚未上线，按钮也只是优雅降级，绝不会卡死。
 */
(function () {
  "use strict";
  var REPO = "codecloud-dev/moxsh-terminal";
  var GH_URL = "https://github.com/" + REPO;

  function getTok() {
    try { return localStorage.getItem("mox_token") || ""; } catch (e) { return ""; }
  }
  function toast(m) {
    if (typeof showToast === "function") { try { showToast(m); } catch (e) {} }
  }
  function markStarred(on) {
    ["starBtn", "ghStar"].forEach(function (id) {
      var b = document.getElementById(id);
      if (!b) return;
      if (on) {
        if (id === "starBtn") b.textContent = "★ 已 Star";
        b.classList.add("starred");
      }
    });
  }

  function reflect() {
    var t = getTok();
    if (!t) return;
    fetch("/star?repo=" + encodeURIComponent(REPO), {
      headers: { Authorization: "Bearer " + t },
      cache: "no-store",
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.starred) markStarred(true); })
      .catch(function () {});
  }

  function doStar(e) {
    e.preventDefault();
    var t = getTok();
    if (!t) { window.open(GH_URL, "_blank", "noopener"); return; }
    fetch("/star?repo=" + encodeURIComponent(REPO), {
      method: "POST",
      headers: { Authorization: "Bearer " + t, "Content-Type": "application/json" },
      cache: "no-store",
    })
      .then(function (r) {
        if (r.ok) { markStarred(true); toast("已为 " + REPO + " 点 Star ★"); return; }
        if (r.status === 401 || r.status === 403) {
          toast("GitHub 令牌权限不足，请重新登录授权后重试");
        }
        window.open(GH_URL, "_blank", "noopener");
      })
      .catch(function () { window.open(GH_URL, "_blank", "noopener"); });
  }

  function bind() {
    ["starBtn", "ghStar"].forEach(function (id) {
      var b = document.getElementById(id);
      if (b) {
        b.removeAttribute("target");
        b.removeAttribute("rel");
        b.addEventListener("click", doStar);
      }
    });
    reflect();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();

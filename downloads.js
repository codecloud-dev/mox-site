/* downloads.js —— 下载页逻辑：读取 /downloads.json，渲染多镜像版本列表。
 * 中英文案通过 document.documentElement.lang 自动切换。
 * 无需任何第三方库。
 */
(function () {
  "use strict";

  var LANG = (document.documentElement.lang || "zh").toLowerCase().indexOf("zh") === 0 ? "zh" : "en";

  var I18N = {
    zh: {
      brand: "MoX",
      home: "首页",
      exp: "在线体验",
      download: "下载",
      github: "GitHub",
      en: "EN",
      title: "下载 moxsh 终端",
      subtitle: "安卓液态玻璃 Linux 终端 · 全部历史版本",
      desc: "每个版本都提供多个国内加速镜像，任选其一即可下载。镜像为第三方公益服务，若某个打不开请换一个。",
      latest: "最新版本",
      all: "全部版本",
      date: "发布",
      size: "大小",
      notes: "更新说明",
      get: "下载",
      official: "官方原链",
      mirror: "镜像",
      copy: "复制链接",
      copied: "已复制",
      loading: "正在加载版本列表…",
      empty: "暂无可下载版本。",
      tip: "APK 仍存储在 GitHub，官网只做加速分发，无需注册登录。",
      back: "← 返回首页",
      starCta: "顺手在官网点个 Star ★",
      starSub: "已登录 MoX 账号？在官网就能给仓库点 Star，不用跳 GitHub。"
    },
    en: {
      brand: "MoX",
      home: "Home",
      exp: "Try online",
      download: "Download",
      github: "GitHub",
      en: "中",
      title: "Download moxsh Terminal",
      subtitle: "Liquid-glass Linux terminal for Android · all versions",
      desc: "Every version ships with several China-friendly mirrors — pick any one. Mirrors are community services; if one fails, try another.",
      latest: "Latest",
      all: "All versions",
      date: "Released",
      size: "Size",
      notes: "Release notes",
      get: "Download",
      official: "Official",
      mirror: "Mirror",
      copy: "Copy link",
      copied: "Copied",
      loading: "Loading versions…",
      empty: "No downloadable versions yet.",
      tip: "APKs stay on GitHub; the site only accelerates delivery. No sign-up needed.",
      back: "← Back home",
      starCta: "Star it right here ★",
      starSub: "Signed in to MoX? Star the repo from the site — no need to leave for GitHub."
    }
  };

  // 多个国内 GitHub 加速镜像（顺序即展示顺序；任一失效可换下一个）
  var GH_PROXIES = [
    { name: "ghproxy.com", base: "https://ghproxy.com/" },
    { name: "ghproxy.net", base: "https://ghproxy.net/" },
    { name: "mirror.ghproxy.com", base: "https://mirror.ghproxy.com/" },
    { name: "gh.api.99988866.xyz", base: "https://gh.api.99988866.xyz/" },
    { name: "github.moeyy.xyz", base: "https://github.moeyy.xyz/" }
  ];

  var T = I18N[LANG];
  var REPO = "codecloud-dev/moxsh-terminal";

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function proxied(url, base) {
    // 多数镜像接受 base + 完整 github 链接
    return base + url;
  }

  function assetRow(asset, isLatest) {
    var row = el("div", "asset glass");
    var head = el("div", "asset-head");
    head.appendChild(el("div", "asset-name", asset.name + (isLatest ? ' <span class="tag-latest">' + T.latest + "</span>" : "")));
    head.appendChild(el("div", "asset-size", asset.sizeText));
    row.appendChild(head);

    var chips = el("div", "chips");
    GH_PROXIES.forEach(function (p, i) {
      var b = el("a", "chip" + (i === 0 ? " primary" : ""));
      b.href = proxied(asset.url, p.base);
      b.target = "_blank";
      b.rel = "noopener";
      b.textContent = T.mirror + " " + (i + 1) + " · " + p.name;
      chips.appendChild(b);
    });
    var off = el("a", "chip ghost");
    off.href = asset.url;
    off.target = "_blank";
    off.rel = "noopener";
    off.textContent = "✦ " + T.official;
    chips.appendChild(off);
    row.appendChild(chips);
    return row;
  }

  function releaseCard(r, isLatest) {
    var card = el("div", "rel glass" + (isLatest ? " is-latest" : ""));
    var head = el("div", "rel-head");
    head.appendChild(el("div", "rel-tag", r.tag));
    head.appendChild(el("div", "rel-date", T.date + " " + r.date));
    card.appendChild(head);
    card.appendChild(el("div", "rel-name", r.name));
    if (r.notes) card.appendChild(el("div", "rel-notes", r.notes));
    r.assets.forEach(function (a) { card.appendChild(assetRow(a, isLatest)); });
    return card;
  }

  function render(data) {
    document.title = T.title + " · MoX";
    var meta = data.repos[data.primary] || {};
    var hTitle = document.getElementById("dlTitle");
    var hSub = document.getElementById("dlSub");
    if (hTitle) hTitle.textContent = T.title;
    if (hSub) hSub.textContent = meta.subtitle || T.subtitle;

    var list = document.getElementById("releaseList");
    list.innerHTML = "";
    if (!data.releases || !data.releases.length) {
      list.appendChild(el("div", "empty", T.empty));
      return;
    }
    data.releases.forEach(function (r, i) {
      list.appendChild(releaseCard(r, i === 0));
    });
  }

  function load() {
    var list = document.getElementById("releaseList");
    if (list) list.appendChild(el("div", "loading", T.loading));
    var url = "/downloads.json";
    fetch(url, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(render)
      .catch(function () {
        // 退回相对路径（本地预览等情况）
        return fetch("./downloads.json", { cache: "no-store" })
          .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
          .then(render);
      })
      .catch(function () {
        if (list) list.innerHTML = '<div class="empty">' + T.empty + "</div>";
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();

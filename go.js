/* 跳转网页（隐藏工具页）：仓库文档里的 GitHub 链接统一指向这里，
   用户自选 Gitee（国内镜像）或 GitHub（原站），不强制自动跳转。
   参数：?r=仓库名&p=路径 ｜ ?o=1 组织主页 ｜ ?u=原始URL（仅放行自家 GitHub 链接）
   兼容：CSP script-src 'self'——全部外链脚本，无 inline。 */
(function () {
  'use strict';

  var params = new URLSearchParams(location.search);
  var r = (params.get('r') || '').replace(/[^a-zA-Z0-9._-]/g, '');
  var p = (params.get('p') || '').replace(/[^a-zA-Z0-9._/-]/g, '').replace(/^\/+|\/+$/g, '');
  var org = params.get('o') === '1';
  var raw = params.get('u') || '';

  var gh, ge, label;

  if (raw) {
    // 原链模式：只放行自家 GitHub 链接；非自家不拦，直接放行
    if (/^https:\/\/github\.com\/codecloud-dev\/[a-zA-Z0-9._/-]+$/.test(raw)) {
      gh = raw;
      ge = raw.replace('https://github.com/codecloud-dev/', 'https://gitee.com/thousand-code-crafts/');
    } else {
      location.replace(raw);
      return;
    }
  } else if (r) {
    gh = 'https://github.com/codecloud-dev/' + r + (p ? '/' + p : '');
    ge = 'https://gitee.com/thousand-code-crafts/' + r + (p ? '/' + p : '');
  } else {
    gh = 'https://github.com/codecloud-dev';
    ge = 'https://gitee.com/thousand-code-crafts';
    label = org ? 'codecloud-dev 组织主页' : 'codecloud-dev 组织主页';
  }
  if (!label) label = r + (p ? ' · ' + p : '');

  document.getElementById('goTarget').textContent = label;
  document.title = '选择线路 · ' + label + ' · MoX';

  var btnG = document.getElementById('btnGitee');
  var btnH = document.getElementById('btnGithub');
  btnG.href = ge;
  btnH.href = gh;

  /* ---- 区域推荐（region.js 由分流中间件提供，失败静默跳过）---- */
  var reg = null;
  try { reg = window.__mox_region || null; } catch (e) { /* ignore */ }
  var regionEl = document.getElementById('goRegion');
  if (reg === 'cn') {
    document.getElementById('recGitee').hidden = false;
    regionEl.innerHTML = '检测到你在国内网络，推荐 <b>Gitee</b>——也可以自行选择 GitHub';
  } else if (reg === 'global') {
    document.getElementById('recGithub').hidden = false;
    regionEl.innerHTML = '检测你在国外网络，推荐 <b>GitHub</b>——也可以自行选择 Gitee';
  }

  /* ---- 记住选择：勾选后写 localStorage，下次带偏好直接倒计时 ---- */
  var KEY = 'mox_go_pref';
  var remember = document.getElementById('goRemember');
  var pref = null;
  try { pref = localStorage.getItem(KEY); } catch (e) { /* ignore */ }
  if (pref === 'gitee' || pref === 'github') remember.checked = true;

  function jump(url, which) {
    if (remember.checked) {
      try { localStorage.setItem(KEY, which); } catch (e) { /* ignore */ }
    }
    location.replace(url);
  }
  btnG.addEventListener('click', function () { jump(ge, 'gitee'); });
  btnH.addEventListener('click', function () { jump(gh, 'github'); });

  /* ---- 有记忆偏好 → 3 秒倒计时自动前往（可取消）---- */
  if (pref === 'gitee' || pref === 'github') {
    var target = pref === 'gitee' ? ge : gh;
    var cd = document.getElementById('goCountdown');
    var n = 3;
    cd.hidden = false;
    cd.innerHTML = '按你上次的选择前往 ' + (pref === 'gitee' ? 'Gitee' : 'GitHub') +
      ' · <span id="cdN">3</span> 秒后跳转<button id="cdCancel" type="button">取消</button>';
    var timer = setInterval(function () {
      n -= 1;
      var el = document.getElementById('cdN');
      if (el) el.textContent = String(n);
      if (n <= 0) { clearInterval(timer); location.replace(target); }
    }, 1000);
    document.getElementById('cdCancel').addEventListener('click', function () {
      clearInterval(timer);
      cd.hidden = true;
    });
  }
})();

/* 个人中心（me.html）自包含逻辑：登录判定 + 资料读写 + 头像压缩上传（≤128KB）
   + 30 天冷却 / 隔天待生效提示 + 账号绑定 + 退出。
   与 app.js 共享 localStorage 的 mox_token（本机凭证），因此官网登录态互通。 */
(function () {
  var LOGIN_API = location.hostname.endsWith('.pages.dev') ? '' : (window.PAGES_ORIGIN || '');
  var DAY = 24 * 3600 * 1000;

  function getTok() { try { return localStorage.getItem('mox_token') || ''; } catch (e) { return ''; } }
  function setTok(t) { try { localStorage.setItem('mox_token', t); } catch (e) {} }
  function delTok() { try { localStorage.removeItem('mox_token'); } catch (e) {} }
  function showToast(m) {
    var t = document.getElementById('toast'); if (!t) return;
    t.textContent = m; t.classList.add('show');
    clearTimeout(t._tm); t._tm = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmt(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function $(id) { return document.getElementById(id); }

  var state = { user: null, profile: null };

  /* ===== 登录态 ===== */
  function ensureLogin() {
    var t = getTok();
    if (!t || localStorage.getItem('mox_logged_out') === '1') { renderLoggedOut(); return; }
    fetch(LOGIN_API + '/me', { headers: { 'Authorization': 'Bearer ' + t }, cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) { if (!d || !d.user) throw 0; state.user = d.user; renderLoggedIn(); loadProfile(); })
      .catch(function () { delTok(); renderLoggedOut(); });
  }
  function renderLoggedOut() {
    $('mePanel').style.display = 'none';
    $('loginPrompt').style.display = '';
    $('authSlot').innerHTML = '';
  }
  function renderLoggedIn() {
    $('loginPrompt').style.display = 'none';
    $('mePanel').style.display = '';
    var slot = $('authSlot');
    slot.innerHTML = '';
    var a = document.createElement('a');
    a.href = '#'; a.textContent = '退出';
    a.addEventListener('click', function (e) { e.preventDefault(); doLogout(); });
    slot.appendChild(a);
  }
  function doLogout() {
    // 软退出：保留本机凭证（与官网一致），下次打开官网免 GitHub
    try { localStorage.setItem('mox_logged_out', '1'); } catch (e) {}
    window.location.href = 'index.html';
  }

  /* ===== 资料 ===== */
  function loadProfile() {
    var t = getTok();
    fetch(LOGIN_API + '/me/profile', { headers: { 'Authorization': 'Bearer ' + t }, cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) { if (d && d.ok) { state.profile = d.profile; renderProfile(d.profile); } })
      .catch(function () { showToast('读取资料失败'); });
  }
  function renderProfile(p) {
    $('meAvatar').src = p.avatar_data ? p.avatar_data : (p.avatar_url || '');
    $('fName').value = p.name || '';
    $('fBio').value = p.bio || '';
    $('meLogin').textContent = p.login || '';
    $('meEmail').textContent = p.email || '未设置';
    renderAvatarStatus(p);
    renderIdentities(p.identities || []);
    // 用本机凭证登录后清掉退出标记（已确认在线）
    try { localStorage.removeItem('mox_logged_out'); } catch (e) {}
  }
  function renderAvatarStatus(p) {
    var el = $('avatarStatus'), now = Date.now();
    if (p.avatar_pending) {
      el.textContent = '新头像将于 ' + fmt(new Date(p.avatar_applied_at)) + ' 生效（隔天生效机制）';
      el.className = 'st pending';
      $('avaFile').disabled = true; $('avaApply').style.display = 'none';
    } else if (p.avatar_next_change_at && p.avatar_next_change_at > now) {
      var d = Math.ceil((p.avatar_next_change_at - now) / DAY);
      el.textContent = '头像 30 天内已更换，' + d + ' 天后可再次更换';
      el.className = 'st cooldown';
      $('avaFile').disabled = true; $('avaApply').style.display = 'none';
    } else {
      el.textContent = '可随时更换头像（30 天冷却 · 隔天生效）';
      el.className = 'st ok';
      $('avaFile').disabled = false;
    }
  }

  /* ===== 基本信息保存 ===== */
  function saveBasic() {
    var t = getTok();
    var name = $('fName').value.trim();
    var bio = $('fBio').value.trim();
    if (name.length > 40) { showToast('昵称不能超过 40 字'); return; }
    fetch(LOGIN_API + '/me/profile', {
      method: 'PUT', headers: { 'Authorization': 'Bearer ' + t, 'content-type': 'application/json' },
      body: JSON.stringify({ name: name, bio: bio })
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (x) {
        if (!x.ok) { showToast('保存失败：' + ((x.d && x.d.error) || '未知')); return; }
        state.profile = x.d.profile; renderProfile(x.d.profile);
        showToast('资料已保存');
      })
      .catch(function () { showToast('网络错误'); });
  }

  /* ===== 头像：选图 → 压缩 → 预览 → 提交 ===== */
  var pendingDataUrl = null;
  function onAvatarPick(e) {
    var f = e.target.files && e.target.files[0]; if (!f) return;
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(f.type)) { showToast('仅支持 PNG / JPEG / WebP / GIF'); return; }
    var reader = new FileReader();
    reader.onload = function () {
      compressImage(reader.result, function (dataUrl) {
        if (!dataUrl) return;
        pendingDataUrl = dataUrl;
        $('meAvatar').src = dataUrl;
        $('avaApply').style.display = '';
      });
    };
    reader.readAsDataURL(f);
  }
  // canvas 等比缩放 + 逐步降质，压缩到 ≤128KB 的 JPEG dataURL
  function compressImage(src, cb) {
    var img = new Image();
    img.onload = function () {
      var max = 720, w = img.width, h = img.height;
      if (w > max || h > max) { var r = Math.min(max / w, max / h); w = Math.round(w * r); h = Math.round(h * r); }
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      var q = 0.92;
      function step() {
        var out = c.toDataURL('image/jpeg', q);
        if (out.length * 0.75 > 128 * 1024 && q > 0.4) { q -= 0.08; step(); } else cb(out);
      }
      step();
    };
    img.onerror = function () { showToast('图片读取失败'); cb(null); };
    img.src = src;
  }
  function submitAvatar() {
    if (!pendingDataUrl) return;
    var t = getTok();
    fetch(LOGIN_API + '/me/profile', {
      method: 'PUT', headers: { 'Authorization': 'Bearer ' + t, 'content-type': 'application/json' },
      body: JSON.stringify({ avatar_data: pendingDataUrl })
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (x) {
        if (!x.ok) {
          if (x.d && x.d.error === 'avatar_cooldown') showToast('头像 30 天冷却中，暂不能更换');
          else if (x.d && x.d.error === 'avatar_pending_exists') showToast('已有待生效头像，请等待生效');
          else showToast('更换失败：' + ((x.d && x.d.error) || '未知'));
          return;
        }
        pendingDataUrl = null; $('avaApply').style.display = 'none';
        state.profile = x.d.profile; renderProfile(x.d.profile);
        showToast(x.d.pending ? '已提交，新头像将于隔天生效' : '头像已更新');
      })
      .catch(function () { showToast('网络错误'); });
  }

  /* ===== 账号绑定（GitHub / Gitee，至少保留一个） ===== */
  function renderIdentities(ids) {
    var list = $('bindList'); if (!list) return;
    var have = {}; ids.forEach(function (i) { have[i.provider] = i; });
    list.innerHTML = '';
    ['github', 'gitee'].forEach(function (p) {
      var bound = have[p];
      var row = document.createElement('div'); row.className = 'bind-row';
      var name = document.createElement('span'); name.className = 'bi';
      name.textContent = p === 'github' ? 'GitHub' : 'Gitee'; row.appendChild(name);
      var who = document.createElement('span');
      if (bound) who.innerHTML = '<span class="bn"></span> <span class="tag">已绑定</span>';
      else who.innerHTML = '<span style="color:var(--faint)">未绑定</span>';
      row.appendChild(who);
      if (bound) who.querySelector('.bn').textContent = bound.login || ('ID ' + bound.provider_uid);
      var act = document.createElement('span'); act.className = 'bs';
      if (bound) {
        var ub = document.createElement('button'); ub.textContent = '解绑';
        ub.addEventListener('click', function () {
          ub.disabled = true; ub.textContent = '解绑中…';
          fetch(LOGIN_API + '/account/unbind', {
            method: 'POST', headers: { 'Authorization': 'Bearer ' + getTok(), 'content-type': 'application/json' },
            body: JSON.stringify({ provider: p })
          })
            .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
            .then(function (x) {
              if (x.ok && x.d && x.d.ok) { showToast('已解绑 ' + name.textContent); loadProfile(); }
              else if (x.d && x.d.error === 'last_identity') { showToast('至少保留一个登录方式'); ub.disabled = false; ub.textContent = '解绑'; }
              else { showToast('解绑失败：' + ((x.d && x.d.error) || '未知')); ub.disabled = false; ub.textContent = '解绑'; }
            })
            .catch(function () { showToast('网络错误'); ub.disabled = false; ub.textContent = '解绑'; });
        });
        act.appendChild(ub);
      } else {
        var a = document.createElement('a');
        a.href = LOGIN_API + '/auth/' + p + '/start?bind=1&redirect=' + encodeURIComponent(location.href);
        a.textContent = '绑定'; a.addEventListener('click', function () { a.classList.add('busy'); });
        act.appendChild(a);
        if (p === 'gitee') {
          fetch(a.href, { redirect: 'manual' }).then(function (r) { if (r.status === 503) act.style.display = 'none'; }).catch(function () {});
        }
      }
      row.appendChild(act); list.appendChild(row);
    });
  }

  /* ===== 本机凭证登录（未登录提示里的按钮） ===== */
  function loginWithLocalToken() {
    var t = getTok(); if (!t) { window.location.href = 'index.html?redirect=me.html'; return; }
    fetch(LOGIN_API + '/me', { headers: { 'Authorization': 'Bearer ' + t }, cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) { if (!d || !d.user) throw 0; state.user = d.user; renderLoggedIn(); loadProfile(); })
      .catch(function () { delTok(); showToast('本机凭证已失效，请重新登录'); window.location.href = 'index.html?redirect=me.html'; });
  }

  /* ===== 事件绑定 ===== */
  $('saveBasic').addEventListener('click', saveBasic);
  $('avaFile').addEventListener('change', onAvatarPick);
  $('avaApply').addEventListener('click', submitAvatar);
  $('logoutBtn').addEventListener('click', doLogout);
  $('localCredBtn').addEventListener('click', loginWithLocalToken);

  ensureLogin();
})();

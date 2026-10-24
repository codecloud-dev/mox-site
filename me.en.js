/* Account center (me.en.html) — self-contained, mirrors me.js with English strings.
   Shares the mox_token (local credential) with app.en.js so sign-in state is in sync. */
(function () {
  var LOGIN_API = location.hostname.endsWith('.pages.dev') ? '' : (window.PAGES_ORIGIN || '');
  var DAY = 24 * 3600 * 1000;

  function getTok() { try { return localStorage.getItem('mox_token') || ''; } catch (e) { return ''; } }
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
    a.href = '#'; a.textContent = 'Sign out';
    a.addEventListener('click', function (e) { e.preventDefault(); doLogout(); });
    slot.appendChild(a);
  }
  function doLogout() {
    try { localStorage.setItem('mox_logged_out', '1'); } catch (e) {}
    window.location.href = 'index.en.html';
  }

  function loadProfile() {
    var t = getTok();
    fetch(LOGIN_API + '/me/profile', { headers: { 'Authorization': 'Bearer ' + t }, cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) { if (d && d.ok) { state.profile = d.profile; renderProfile(d.profile); } })
      .catch(function () { showToast('Failed to load profile'); });
  }
  function renderProfile(p) {
    $('meAvatar').src = p.avatar_data ? p.avatar_data : (p.avatar_url || '');
    $('fName').value = p.name || '';
    $('fBio').value = p.bio || '';
    $('meLogin').textContent = p.login || '';
    $('meEmail').textContent = p.email || 'not set';
    renderAvatarStatus(p);
    renderIdentities(p.identities || []);
    try { localStorage.removeItem('mox_logged_out'); } catch (e) {}
  }
  function renderAvatarStatus(p) {
    var el = $('avatarStatus'), now = Date.now();
    if (p.avatar_pending) {
      el.textContent = 'New avatar applies at ' + fmt(new Date(p.avatar_applied_at)) + ' (next-day rule)';
      el.className = 'st pending';
      $('avaFile').disabled = true; $('avaApply').style.display = 'none';
    } else if (p.avatar_next_change_at && p.avatar_next_change_at > now) {
      var d = Math.ceil((p.avatar_next_change_at - now) / DAY);
      el.textContent = 'Avatar already changed within 30 days — ' + d + ' day(s) until next change';
      el.className = 'st cooldown';
      $('avaFile').disabled = true; $('avaApply').style.display = 'none';
    } else {
      el.textContent = 'Change your avatar anytime (30-day cooldown · applies next day)';
      el.className = 'st ok';
      $('avaFile').disabled = false;
    }
  }

  function saveBasic() {
    var t = getTok();
    var name = $('fName').value.trim();
    var bio = $('fBio').value.trim();
    if (name.length > 40) { showToast('Name must be ≤40 chars'); return; }
    fetch(LOGIN_API + '/me/profile', {
      method: 'PUT', headers: { 'Authorization': 'Bearer ' + t, 'content-type': 'application/json' },
      body: JSON.stringify({ name: name, bio: bio })
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (x) {
        if (!x.ok) { showToast('Save failed: ' + ((x.d && x.d.error) || 'unknown')); return; }
        state.profile = x.d.profile; renderProfile(x.d.profile);
        showToast('Profile saved');
      })
      .catch(function () { showToast('Network error'); });
  }

  var pendingDataUrl = null;
  function onAvatarPick(e) {
    var f = e.target.files && e.target.files[0]; if (!f) return;
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(f.type)) { showToast('Only PNG / JPEG / WebP / GIF'); return; }
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
    img.onerror = function () { showToast('Failed to read image'); cb(null); };
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
          if (x.d && x.d.error === 'avatar_cooldown') showToast('Avatar is in 30-day cooldown');
          else if (x.d && x.d.error === 'avatar_pending_exists') showToast('An avatar is already pending');
          else showToast('Change failed: ' + ((x.d && x.d.error) || 'unknown'));
          return;
        }
        pendingDataUrl = null; $('avaApply').style.display = 'none';
        state.profile = x.d.profile; renderProfile(x.d.profile);
        showToast(x.d.pending ? 'Submitted — new avatar applies next day' : 'Avatar updated');
      })
      .catch(function () { showToast('Network error'); });
  }

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
      if (bound) who.innerHTML = '<span class="bn"></span> <span class="tag">Linked</span>';
      else who.innerHTML = '<span style="color:var(--faint)">Not linked</span>';
      row.appendChild(who);
      if (bound) who.querySelector('.bn').textContent = bound.login || ('ID ' + bound.provider_uid);
      var act = document.createElement('span'); act.className = 'bs';
      if (bound) {
        var ub = document.createElement('button'); ub.textContent = 'Unlink';
        ub.addEventListener('click', function () {
          ub.disabled = true; ub.textContent = 'Unlinking…';
          fetch(LOGIN_API + '/account/unbind', {
            method: 'POST', headers: { 'Authorization': 'Bearer ' + getTok(), 'content-type': 'application/json' },
            body: JSON.stringify({ provider: p })
          })
            .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
            .then(function (x) {
              if (x.ok && x.d && x.d.ok) { showToast('Unlinked ' + name.textContent); loadProfile(); }
              else if (x.d && x.d.error === 'last_identity') { showToast('Keep at least one sign-in method'); ub.disabled = false; ub.textContent = 'Unlink'; }
              else { showToast('Unlink failed: ' + ((x.d && x.d.error) || 'unknown')); ub.disabled = false; ub.textContent = 'Unlink'; }
            })
            .catch(function () { showToast('Network error'); ub.disabled = false; ub.textContent = 'Unlink'; });
        });
        act.appendChild(ub);
      } else {
        var a = document.createElement('a');
        a.href = LOGIN_API + '/auth/' + p + '/start?bind=1&redirect=' + encodeURIComponent(location.href);
        a.textContent = 'Link'; a.addEventListener('click', function () { a.classList.add('busy'); });
        act.appendChild(a);
        if (p === 'gitee') {
          fetch(a.href, { redirect: 'manual' }).then(function (r) { if (r.status === 503) act.style.display = 'none'; }).catch(function () {});
        }
      }
      row.appendChild(act); list.appendChild(row);
    });
  }

  function loginWithLocalToken() {
    var t = getTok(); if (!t) { window.location.href = 'index.en.html?redirect=me.en.html'; return; }
    fetch(LOGIN_API + '/me', { headers: { 'Authorization': 'Bearer ' + t }, cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) { if (!d || !d.user) throw 0; state.user = d.user; renderLoggedIn(); loadProfile(); })
      .catch(function () { delTok(); showToast('Local credential expired — please sign in'); window.location.href = 'index.en.html?redirect=me.en.html'; });
  }

  $('saveBasic').addEventListener('click', saveBasic);
  $('avaFile').addEventListener('change', onAvatarPick);
  $('avaApply').addEventListener('click', submitAvatar);
  $('logoutBtn').addEventListener('click', doLogout);
  $('localCredBtn').addEventListener('click', loginWithLocalToken);

  ensureLogin();
})();

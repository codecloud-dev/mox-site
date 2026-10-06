/* GitHub 地址 base64 分段，避免源码明文账号 */
var GH_BASE = (function(){var seg=['aHR0cHM6Ly9naXRodWIuY29tLw==','Y29kZWNsb3VkLWRldg==','bW94c2gtdGVybWluYWw='];return seg.map(function(x){return atob(x);}).join('');})();

/* Contact (QQ / email) raw values moved server-side to functions/contact.js:
   only returned after "logged-in session + passing Turnstile" — never as a plaintext
   constant in client JS, so scrapers can't harvest them. */
/* Pointer glow (rAF-throttled; the glow layer is transform-composited, updates cause zero repaints) */
var _lr=0,_lx=0,_ly=0,_le=null;
function bindLight(el){el.addEventListener('pointermove',function(e){var r=el.getBoundingClientRect();
  _lx=(e.clientX-r.left)/r.width*100;_ly=(e.clientY-r.top)/r.height*100;_le=el;
  if(!_lr){_lr=requestAnimationFrame(function(){_lr=0;if(!_le)return;
    _le.style.setProperty('--mx',_lx.toFixed(2)+'%');_le.style.setProperty('--my',_ly.toFixed(2)+'%');});}}, {passive:true});}
document.querySelectorAll('.glass').forEach(bindLight);
/* 复制 */
function copyVal(id){var t=document.getElementById(id).textContent;
  var done=function(){showToast('Copied: '+t);};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(done,function(){f(t);done();});
  else{f(t);done();}}
function f(t){var ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';
  document.body.appendChild(ta);ta.select();try{document.execCommand('copy');}catch(e){}document.body.removeChild(ta);}
var tt=null;function showToast(m){var t=document.getElementById('toast');t.textContent=m;t.classList.add('show');
  clearTimeout(tt);tt=setTimeout(function(){t.classList.remove('show');},2200);}

/* 链接：下载 / GitHub / Star */
document.getElementById('dlLatest').href=GH_BASE+'/releases/latest';
document.getElementById('ghLink').href=GH_BASE;
document.getElementById('starBtn').href=GH_BASE;
document.getElementById('ghStar').href=GH_BASE;

/* Shared slider (anti-bot gate / email gate), fires onPass when dragged to the far right */
function makeSlider(root,onPass){
  var knob=root.querySelector('.slider-knob'),fill=root.querySelector('.slider-fill'),text=root.querySelector('.slider-text');
  if(!knob)return null;
  function range(){return Math.max(0,root.clientWidth-knob.offsetWidth-8);}
  function setX(x){x=Math.max(0,Math.min(range(),x));knob.style.left=(x+4)+'px';fill.style.width=(x+knob.offsetWidth/2)+'px';return x;}
  var drag=false;
  knob.addEventListener('pointerdown',function(e){drag=true;try{knob.setPointerCapture(e.pointerId);}catch(_){}});
  window.addEventListener('pointermove',function(e){if(!drag)return;var r=root.getBoundingClientRect();setX(e.clientX-r.left-knob.offsetWidth/2);},{passive:true});
  window.addEventListener('pointerup',function(){if(!drag)return;drag=false;
    if(parseFloat(knob.style.left||'0')>=range()*0.96){setX(range());if(text)text.textContent='Verified ✓';knob.querySelector('span').textContent='✓';setTimeout(onPass,400);}
    else setX(0);});
  return {reset:function(){setX(0);}};
}

/* 手机预览：指针 + 陀螺仪 视差倾斜（rAF 节流，transform 合成无重排） */
(function(){
  var dev=document.getElementById('device');if(!dev)return;
  function setTilt(rx,ry){dev.style.setProperty('--rx',rx.toFixed(2)+'deg');dev.style.setProperty('--ry',ry.toFixed(2)+'deg');}
  var stage=dev.parentElement,pr=0,pnx=0,pny=0;
  stage.addEventListener('pointermove',function(e){var r=stage.getBoundingClientRect();
    pnx=(e.clientX-r.left)/r.width-0.5; pny=(e.clientY-r.top)/r.height-0.5;
    if(!pr){pr=requestAnimationFrame(function(){pr=0;setTilt(4-pny*10,-7+pnx*14);});}},{passive:true});
  stage.addEventListener('pointerleave',function(){setTilt(4,-7);});
  function onTilt(e){var b=(e.gamma||0), a=(e.beta||0);
    setTilt(4+Math.max(-12,Math.min(12,a*0.12)), -7+Math.max(-14,Math.min(14,b*0.18)));}
  if(window.DeviceOrientationEvent){
    if(typeof DeviceOrientationEvent.requestPermission==='function'){
      dev.addEventListener('click',function once(){DeviceOrientationEvent.requestPermission().then(function(s){if(s==='granted')window.addEventListener('deviceorientation',onTilt);});dev.removeEventListener('click',once);});
    } else { window.addEventListener('deviceorientation',onTilt); }
  }
})();

/* 人机验证闸：异常访问时弹出，滑动即过（无需答题） */
(function(){
  var gate=document.getElementById('gate');
  var slider=document.getElementById('slider');
  if(!gate||!slider||!slider.querySelector('.slider-knob'))return;
  var VERIFY_KEY='mox_verified';
  function show(){document.body.classList.add('locked');gate.classList.add('on');gate.setAttribute('aria-hidden','false');}
  function hide(){document.body.classList.remove('locked');gate.classList.remove('on');gate.setAttribute('aria-hidden','true');
    try{sessionStorage.setItem(VERIFY_KEY,'1');}catch(e){}}
  var verified=false;try{verified=sessionStorage.getItem(VERIFY_KEY)==='1';}catch(e){}
  // Only deterministic bot signals count: navigator.webdriver (headless/automation) or obvious crawler UA.
  function risk(){var s=0;
    if(navigator.webdriver===true)s+=10;
    var ua=(navigator.userAgent||'').toLowerCase();
    if(/headless|phantomjs|scrapy|python-requests|go-http|java\/|curl\/|wget|okhttp|bot\b|spider|crawl/i.test(ua))s+=10;
    return s;}
  if(!verified && (risk()>0 || /[?&]verify=1/.test(location.search))){show();}
  makeSlider(slider,hide);
  var why=document.getElementById('gateWhy');
  if(why)why.addEventListener('click',function(e){e.preventDefault();
    document.getElementById('gateMsg').textContent='To stop bulk scraping, unusual traffic must prove it is human. One swipe only — it will not appear again this session.';});
  var skip=document.getElementById('gateSkip');
  if(skip)skip.addEventListener('click',function(e){e.preventDefault();hide();});
})();

/* 滚动入场 */
(function(){var els=document.querySelectorAll('.fadeup');
  if(!('IntersectionObserver'in window)){els.forEach(function(e){e.classList.add('in');});return;}
  var io=new IntersectionObserver(function(en){en.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:.12});
  els.forEach(function(e){io.observe(e);});})();

/* ===== Contacts: revealed only after login + Turnstile, fetched from /contact ===== */
(function(){
  var mailVal=document.getElementById('mailVal'),mailSlider=document.getElementById('mailSlider'),
      mailCopy=document.getElementById('mailCopyBtn');
  var qqVal=document.getElementById('qqVal'),askBtn=document.getElementById('qqAskBtn'),
      form=document.getElementById('qqForm'),fromEl=document.getElementById('qqFrom'),
      whyEl=document.getElementById('qqWhy'),submitBtn=document.getElementById('qqSubmitBtn'),
      done=document.getElementById('qqDone'),brief=document.getElementById('qqBrief');
  var loginHint=document.getElementById('contactLoginHint');

  function getTok(){try{return localStorage.getItem('mox_token')||'';}catch(e){return '';}}
  function showLoginRequired(){ if(loginHint)loginHint.style.display=''; if(mailSlider)mailSlider.style.display='none'; }
  window.onContactCaptcha = function(token){
    var t=getTok();
    if(!t){ showLoginRequired(); showToast('Please sign in first to view contacts'); return; }
    fetch('/contact',{
      method:'POST',
      headers:{'content-type':'application/json','authorization':'Bearer '+t},
      body:JSON.stringify({token:token})
    }).then(function(r){
      if(r.status===403) return r.json().then(function(d){throw d;});
      if(!r.ok) throw {error:'network'};
      return r.json();
    }).then(function(d){
      if(mailVal)mailVal.textContent=d.mail||'';
      if(mailSlider)mailSlider.style.display='none';
      if(mailCopy)mailCopy.style.display='';
      if(loginHint)loginHint.style.display='none';
      window.__contactQQ = d.qq||'';
      if(askBtn)askBtn.style.display='';
    }).catch(function(err){
      if(err&&err.error==='login_required'){ showLoginRequired(); showToast('Session expired, please sign in again'); }
      else if(err&&err.error==='captcha_failed'){ showToast('Verification failed, retry'); if(window.turnstile)window.turnstile.reset(); }
      else { showToast('Contacts unavailable right now, try later'); }
    });
  };
  window.onContactExpired = function(){};
  var loginBtn=document.getElementById('contactLoginBtn');
  if(loginBtn)loginBtn.addEventListener('click',function(e){e.preventDefault();
    var cta=document.getElementById('loginCta'); if(cta)cta.click();});

  if(!askBtn)return;
  function passQQ(){
    var qq=window.__contactQQ||'';
    if(!qq){ showToast('Please complete verification first'); return; }
    qqVal.textContent=qq; if(form)form.style.display='none'; if(done)done.style.display='';
    if(brief)brief.textContent='I am '+fromEl.value.trim()+'; I want to '+whyEl.value.trim()+'. (from the MoX website)';
    showToast('Request note ready — copy it when adding');
  }
  askBtn.addEventListener('click',function(){askBtn.style.display='none'; if(form)form.style.display='';
    try{var s=JSON.parse(sessionStorage.getItem('mox_qq_info')||'null');
      if(s){fromEl.value=s.f;whyEl.value=s.w;}}catch(e){}
    if(fromEl)fromEl.focus();});
  submitBtn.addEventListener('click',function(){
    var fr=(fromEl.value||'').trim(),wk=(whyEl.value||'').trim();
    if(fr.length<12){showToast('Please describe your background in detail (12+ chars)');fromEl.focus();return;}
    if(wk.length<6){showToast('Please state what you want (6+ chars)');whyEl.focus();return;}
    try{sessionStorage.setItem('mox_qq_info',JSON.stringify({f:fr,w:wk}));}catch(e){}
    passQQ();
  });
})();

/* ===== 登录 / 用户态（对接 mox-id 后端）===== */
(function(){
  /* Sign-in always goes through the pages.dev edge proxy — never straight to workers.dev.
     Sign-in / sign-out are fully reload-free: renderUser / renderLogin switch the nav,
     CTA and modal in place — no white-screen location.reload. */
  var PAGES_ORIGIN = 'https://mox-site.pages.dev';
  var LOGIN_API = location.hostname.endsWith('.pages.dev') ? '' : PAGES_ORIGIN;
  var slot=document.getElementById('authSlot');
  var mask=document.getElementById('loginMask');
  var statusEl=document.getElementById('loginStatus');
  var statusText=document.getElementById('loginStatusText');
  var hintEl=document.getElementById('loginHint');
  var cta=document.getElementById('loginCta');
  var currentUser=null; /* null = signed out; drives nav / CTA / modal UI in sync once signed in */
  var adminHref='';     /* Admin console secret path, delivered only to admins via /me */
  var probeState='';    /* ''unknown on online off offline — skip probing once online */
  function getTok(){try{return localStorage.getItem('mox_token')||'';}catch(e){return '';}}
  function setTok(t){try{localStorage.setItem('mox_token',t);}catch(e){}}
  function delTok(){try{localStorage.removeItem('mox_token');}catch(e){}}
  (function(){var u=new URL(location.href);var t=u.searchParams.get('token');
    if(t){setTok(t);u.searchParams.delete('token');history.replaceState(null,'',u.pathname+u.search+u.hash);}
  })();

  function setStatus(cls,text){ if(!statusEl)return; statusEl.className='login-status '+cls; if(statusText)statusText.textContent=text; }

  /* Backend probe (JSON guard + cached result): an HTML fallback no longer fakes "online" */
  function probeBackend(force){
    if(probeState==='on'&&!force)return;
    fetch(LOGIN_API+'/me',{method:'GET',cache:'no-store'})
      .then(function(r){
        if((r.headers.get('content-type')||'').indexOf('json')<0)throw new Error('not_json');
        probeState='on';setStatus('on','Sign-in service online');
      })
      .catch(function(){
        probeState='off';setStatus('off','Sign-in service temporarily unreachable');
        if(hintEl)hintEl.innerHTML='Cannot reach the sign-in service right now (network restrictions or maintenance). Retry later, or use the primary site: <a href="https://mox-site.pages.dev/" target="_blank" rel="noopener">mox-site.pages.dev</a>';
      });
  }

  /* ===== Signed-in UI: nav slot + account CTA + modal, kept in sync ===== */
  function renderUser(u){
    currentUser=u;
    if(cta)cta.textContent='Signed in · '+(u.name||u.login||'user');
    slot.textContent='';
    var img=document.createElement('img');img.className='av';img.alt='';
    if(u.avatar_url)img.src=u.avatar_url;
    img.addEventListener('error',function(){img.style.display='none';});
    var out=document.createElement('a');out.href='#';out.textContent='Sign out';
    out.addEventListener('click',function(e){e.preventDefault();doLogout();});
    slot.appendChild(img);slot.appendChild(out);
  }
  function renderAdmin(path){
    adminHref=LOGIN_API+path;
    var a=document.createElement('a');a.href=adminHref;a.textContent='Console';
    slot.insertBefore(a,slot.firstChild);
  }
  function renderLogin(){
    currentUser=null;adminHref='';
    if(cta)cta.textContent='Sign in to MoX';
    slot.innerHTML='<a href="#" id="loginBtn">Sign in</a>';
    var b=document.getElementById('loginBtn');
    if(b)b.addEventListener('click',function(e){e.preventDefault();openLogin();});
  }

  /* Sign out must also revoke the server session (30-day mox_sid cookie), then drop the
     local token — reload-free: renderLogin switches back instantly with a toast */
  function doLogout(){
    var t=getTok();
    try{
      fetch(LOGIN_API+'/auth/logout',{method:'POST',credentials:'include',
        headers:t?{'Authorization':'Bearer '+t}:{}}).catch(function(){});
    }catch(e){}
    delTok();
    mask.classList.remove('show');
    renderLogin();
    showToast('Signed out');
  }

  function openLogin(){
    mask.classList.add('show');
    var m=document.getElementById('loginMsg');if(m){m.className='msg';m.textContent='';}
    if(hintEl)hintEl.textContent='';
    var lb=document.getElementById('loginBox');
    var ib=document.getElementById('loggedInBox');
    if(currentUser){
      /* Clicking "sign in" while signed in: show the current account + sign-out, never re-prompt */
      if(lb)lb.style.display='none';
      if(ib){ib.style.display='';
        var nm=document.getElementById('meName');
        if(nm)nm.textContent=currentUser.name||currentUser.login||'';
        var adm=document.getElementById('meAdminBtn');
        if(adm){adm.style.display=adminHref?'':'none';adm.href=adminHref;}
      }
      return;
    }
    if(lb)lb.style.display='';
    if(ib)ib.style.display='none';
    var gh=document.getElementById('ghLoginBtn');
    if(gh)gh.href=LOGIN_API+'/auth/github/start?redirect='+encodeURIComponent(location.href);
    probeBackend();
  }
  if(cta)cta.addEventListener('click',function(e){e.preventDefault();openLogin();});

  document.getElementById('tokCancelBtn').addEventListener('click',function(){mask.classList.remove('show');});
  var meCloseBtn=document.getElementById('meCloseBtn');
  if(meCloseBtn)meCloseBtn.addEventListener('click',function(){mask.classList.remove('show');});
  var meLogoutBtn=document.getElementById('meLogoutBtn');
  if(meLogoutBtn)meLogoutBtn.addEventListener('click',doLogout);
  mask.addEventListener('click',function(e){if(e.target===mask)mask.classList.remove('show');});
  /* GitHub button instant feedback: response the moment it is tapped, no waiting on the network */
  var ghBtn=document.getElementById('ghLoginBtn');
  if(ghBtn){
    ghBtn.addEventListener('click',function(){ghBtn.classList.add('busy');ghBtn.textContent='Opening GitHub…';});
    window.addEventListener('pageshow',function(ev){if(ev.persisted){ghBtn.classList.remove('busy');ghBtn.textContent='Sign in with GitHub';}});
  }
  document.getElementById('tokLoginBtn').addEventListener('click',function(){
    var t=document.getElementById('tokInput').value.trim();if(!t)return;
    var m=document.getElementById('loginMsg');m.className='msg';m.textContent='Signing in…';
    fetch(LOGIN_API+'/auth/token',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:t})})
      .then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};});})
      .then(function(x){
        if(!x.ok){m.className='msg err';m.textContent='Failed: '+(x.d.error||'unknown');return;}
        /* Reload-free sign-in: switch state in place + toast; console entry filled in async (/me only) */
        setTok(t);mask.classList.remove('show');
        renderUser(x.d.user);
        showToast('Signed in · '+((x.d.user&&(x.d.user.name||x.d.user.login))||'welcome'));
        fetch(LOGIN_API+'/me',{headers:{'Authorization':'Bearer '+t}})
          .then(function(r){return r.ok?r.json():null;})
          .then(function(d){if(d&&d.admin_path)renderAdmin(d.admin_path);})
          .catch(function(){});
      }).catch(function(){m.className='msg err';m.textContent='Network error.';});
  });

  // Init: probe backend + restore session (three states: signed in / token dead / service down)
  (function(){
    probeBackend();
    var t=getTok();
    if(!t){renderLogin();return;}
    fetch(LOGIN_API+'/me',{headers:{'Authorization':'Bearer '+t}})
      .then(function(r){
        var ct=(r.headers.get('content-type')||'');
        if(!r.ok)return{authed:false};              /* 401/403 = token no longer valid */
        if(ct.indexOf('json')<0)return{down:true};  /* HTML fallback = proxy down, keep token */
        return r.json().then(function(d){return{authed:true,d:d};});
      })
      .then(function(x){
        if(x.authed&&x.d&&x.d.user){
          renderUser(x.d.user);
          if(x.d.admin_path)renderAdmin(x.d.admin_path);
        }else if(x.down){
          renderLogin();setStatus('off','Sign-in service temporarily unreachable');
        }else{
          delTok();renderLogin(); /* drop dead tokens so we don't retry them every reload */
        }
      })
      .catch(function(){ renderLogin(); setStatus('off','Sign-in service temporarily unreachable'); });
  })();
})();

/* Unified event delegation (replaces inline onclick after CSP hardening) */
document.querySelectorAll('[data-act]').forEach(function(el){
  el.addEventListener('click',function(){
    var a=el.getAttribute('data-act');
    if(a==='copy')copyVal(el.getAttribute('data-target'));
  });
});

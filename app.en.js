var GH_BASE = (function(){var seg=['aHR0cHM6Ly9naXRodWIuY29tLw==','Y29kZWNsb3VkLWRldg==','bW94c2gtdGVybWluYWw='];return seg.map(function(x){return atob(x);}).join('');})();
var _K=0x5d;
var _QA=[110,109,105,111,100,101,109,109,110,106];
var _MA=[39,107,107,107,107,107,107,107,107,107,107,29,108,107,110,115,62,50,48];
function _d(a){var s='';for(var i=0;i<a.length;i++)s+=String.fromCharCode(a[i]^_K);return s;}
function revealContact(){
  var c=document.getElementById('contactCards');c.classList.add('show');
  document.getElementById('qqVal').textContent=_d(_QA);
  document.getElementById('mailVal').textContent=_d(_MA);
  showToast('Contacts shown');
}
function bindLight(el){el.addEventListener('pointermove',function(e){var r=el.getBoundingClientRect();
  el.style.setProperty('--mx',((e.clientX-r.left)/r.width*100)+'%');
  el.style.setProperty('--my',((e.clientY-r.top)/r.height*100)+'%');});}
document.querySelectorAll('.glass').forEach(bindLight);
function copyVal(id){var t=document.getElementById(id).textContent;
  var done=function(){showToast('Copied: '+t);};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(done,function(){f(t);done();});
  else{f(t);done();}}
function f(t){var ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';
  document.body.appendChild(ta);ta.select();try{document.execCommand('copy');}catch(e){}document.body.removeChild(ta);}
var tt=null;function showToast(m){var t=document.getElementById('toast');t.textContent=m;t.classList.add('show');
  clearTimeout(tt);tt=setTimeout(function(){t.classList.remove('show');},2200);}
document.getElementById('dlLatest').href=GH_BASE+'/releases/latest';
document.getElementById('ghLink').href=GH_BASE;
document.getElementById('starBtn').href=GH_BASE;
document.getElementById('ghStar').href=GH_BASE;
(function(){
  var dev=document.getElementById('device');if(!dev)return;
  function setTilt(rx,ry){dev.style.setProperty('--rx',rx.toFixed(2)+'deg');dev.style.setProperty('--ry',ry.toFixed(2)+'deg');}
  var stage=dev.parentElement;
  stage.addEventListener('pointermove',function(e){var r=stage.getBoundingClientRect();
    var nx=(e.clientX-r.left)/r.width-0.5, ny=(e.clientY-r.top)/r.height-0.5;
    setTilt(4-ny*10, -7+nx*14);});
  stage.addEventListener('pointerleave',function(){setTilt(4,-7);});
  function onTilt(e){var b=(e.gamma||0), a=(e.beta||0);
    setTilt(4+Math.max(-12,Math.min(12,a*0.12)), -7+Math.max(-14,Math.min(14,b*0.18)));}
  if(window.DeviceOrientationEvent){
    if(typeof DeviceOrientationEvent.requestPermission==='function'){
      dev.addEventListener('click',function once(){DeviceOrientationEvent.requestPermission().then(function(s){if(s==='granted')window.addEventListener('deviceorientation',onTilt);});dev.removeEventListener('click',once);});
    } else { window.addEventListener('deviceorientation',onTilt); }
  }
})();
(function(){
  var gate=document.getElementById('gate'),knob=document.getElementById('sliderKnob'),
      fill=document.getElementById('sliderFill'),text=document.getElementById('sliderText'),slider=document.getElementById('slider');
  if(!gate||!knob)return;
  var VERIFY_KEY='mox_verified';
  function range(){return Math.max(0, slider.clientWidth - knob.offsetWidth - 8);}
  function setX(x){x=Math.max(0,Math.min(range(),x));knob.style.left=(x+4)+'px';fill.style.width=(x+knob.offsetWidth/2)+'px';return x;}
  // Only deterministic bot signals count: navigator.webdriver (headless/automation) or obvious crawler UA.
  // Real browsers (incl. private mode, mobile) are never mis-flagged → nav & download always work.
  function risk(){var s=0;
    if(navigator.webdriver===true)s+=10;
    var ua=(navigator.userAgent||'').toLowerCase();
    if(/headless|phantomjs|scrapy|python-requests|go-http|java\/|curl\/|wget|okhttp|bot\b|spider|crawl/i.test(ua))s+=10;
    return s;}
  function show(){document.body.classList.add('locked');gate.classList.add('on');gate.setAttribute('aria-hidden','false');}
  function hide(){document.body.classList.remove('locked');gate.classList.remove('on');gate.setAttribute('aria-hidden','true');
    try{sessionStorage.setItem(VERIFY_KEY,'1');}catch(e){}}
  var verified=false;try{verified=sessionStorage.getItem(VERIFY_KEY)==='1';}catch(e){}
  if(!verified && (risk()>0 || /[?&]verify=1/.test(location.search))){show();}
  var drag=false;
  knob.addEventListener('pointerdown',function(e){drag=true;try{knob.setPointerCapture(e.pointerId);}catch(_){}});
  window.addEventListener('pointermove',function(e){if(!drag)return;var r=slider.getBoundingClientRect();setX(e.clientX-r.left-knob.offsetWidth/2);});
  window.addEventListener('pointerup',function(){if(!drag)return;drag=false;
    if(parseFloat(knob.style.left||'0')>=range()*0.96){setX(range());text.textContent='Verified ✓';knob.querySelector('span').textContent='✓';setTimeout(hide,650);}
    else{setX(0);}});
  var why=document.getElementById('gateWhy');
  if(why)why.addEventListener('click',function(e){e.preventDefault();
    document.getElementById('gateMsg').textContent='To block scripted scraping and abuse, unusual traffic must prove it is human first. One time only — it will not show again this session.';});
  var skip=document.getElementById('gateSkip');
  if(skip)skip.addEventListener('click',function(e){e.preventDefault();hide();});
})();
(function(){var els=document.querySelectorAll('.fadeup');
  if(!('IntersectionObserver'in window)){els.forEach(function(e){e.classList.add('in');});return;}
  var io=new IntersectionObserver(function(en){en.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:.12});
  els.forEach(function(e){io.observe(e);});})();

/* ===== 登录 / 用户态（对接 mox-id 后端）===== */
(function(){
  /* All sign-in traffic goes through the pages.dev edge proxy — never let the
     browser hit workers.dev directly (*.workers.dev is unreachable on some
     networks incl. mainland China → clicking "Sign in" would do nothing):
     - on *.pages.dev: same-origin Functions proxy (LOGIN_API='')
     - elsewhere (github.io mirror, local dev, future custom domains):
       cross-origin via https://mox-site.pages.dev — CORS wide open and the
       Function answers preflights, so fetches with Authorization work too
     OAuth round trip: any domain → pages.dev/auth/github/start (302 → GitHub)
     → callback (on pages.dev) → 302 back to the redirect page ?token=...
     → that page stores the token in its own localStorage */
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
  function getTok(){try{return localStorage.getItem('mox_token')||'';}catch(e){return '';}}
  function setTok(t){try{localStorage.setItem('mox_token',t);}catch(e){}}
  function delTok(){try{localStorage.removeItem('mox_token');}catch(e){}}
  (function(){var u=new URL(location.href);var t=u.searchParams.get('token');
    if(t){setTok(t);u.searchParams.delete('token');history.replaceState(null,'',u.pathname+u.search+u.hash);}
  })();

  /* Backend reachability probe: drives the status dot; every domain goes through the pages.dev proxy.
     Must verify the response is JSON — when the proxy breaks, /me falls into the static-site
     fallback and returns HTML (200); without this guard we'd falsely report "online" */
  function setStatus(cls,text){ if(!statusEl)return; statusEl.className='login-status '+cls; if(statusText)statusText.textContent=text; }
  function probeBackend(){
    fetch(LOGIN_API+'/me',{method:'GET',cache:'no-store'})
      .then(function(r){
        if((r.headers.get('content-type')||'').indexOf('json')<0)throw new Error('not_json');
        setStatus('on','Sign-in service online');
      })
      .catch(function(){
        setStatus('off','Sign-in service temporarily unreachable');
        if(hintEl)hintEl.innerHTML='Cannot reach the sign-in service right now (network restrictions or maintenance). Retry later, or use the primary site: <a href="https://mox-site.pages.dev/" target="_blank" rel="noopener">mox-site.pages.dev</a>';
      });
  }

  /* ===== Signed-in UI: nav slot + account CTA + modal, kept in sync ===== */

  function renderUser(u){
    currentUser=u;
    if(cta)cta.textContent='Signed in · '+(u.name||u.login||'user');
    /* Safe DOM building: no HTML concatenation (XSS-proof); hide avatar on load error */
    slot.textContent='';
    var img=document.createElement('img');img.className='av';img.alt='';
    if(u.avatar_url)img.src=u.avatar_url;
    img.addEventListener('error',function(){img.style.display='none';});
    var out=document.createElement('a');out.href='#';out.textContent='Sign out';
    out.addEventListener('click',function(e){e.preventDefault();doLogout();});
    slot.appendChild(img);slot.appendChild(out);
  }
  function renderAdmin(path){
    /* Admin console lives on a secret path; the address is only delivered to admins via /me.
       Link goes through LOGIN_API (the pages.dev proxy), so it opens from any frontend domain */
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

  /* Sign out must also revoke the server session — the mox_sid cookie planted by the
     OAuth callback lasts 30 days; clearing only the local token would let /me fall
     back to cookie auth on next reload, making "sign out" a no-op */
  function doLogout(){
    var t=getTok();
    try{
      fetch(LOGIN_API+'/auth/logout',{method:'POST',credentials:'include',
        headers:t?{'Authorization':'Bearer '+t}:{}}).catch(function(){});
    }catch(e){}
    delTok();
    location.reload();
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
  // Both the nav "Sign in" and the account-section CTA open the modal (shows account state when signed in)
  if(cta)cta.addEventListener('click',function(e){e.preventDefault();openLogin();});

  document.getElementById('tokCancelBtn').addEventListener('click',function(){mask.classList.remove('show');});
  var meCloseBtn=document.getElementById('meCloseBtn');
  if(meCloseBtn)meCloseBtn.addEventListener('click',function(){mask.classList.remove('show');});
  var meLogoutBtn=document.getElementById('meLogoutBtn');
  if(meLogoutBtn)meLogoutBtn.addEventListener('click',function(){mask.classList.remove('show');doLogout();});
  mask.addEventListener('click',function(e){if(e.target===mask)mask.classList.remove('show');});
  document.getElementById('tokLoginBtn').addEventListener('click',function(){
    var t=document.getElementById('tokInput').value.trim();if(!t)return;
    var m=document.getElementById('loginMsg');m.className='msg';m.textContent='Signing in…';
    fetch(LOGIN_API+'/auth/token',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:t})})
      .then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};});})
      .then(function(x){
        if(!x.ok){m.className='msg err';m.textContent='Failed: '+(x.d.error||'unknown');return;}
        /* Any GitHub user (normal or admin) can sign in; only admins get the console entry */
        setTok(t);mask.classList.remove('show');location.reload();
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
    if(a==='revealContact')revealContact();
    else if(a==='copy')copyVal(el.getAttribute('data-target'));
  });
});

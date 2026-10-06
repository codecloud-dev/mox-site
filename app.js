/* GitHub 地址 base64 分段，避免源码明文账号 */
var GH_BASE = (function(){var seg=['aHR0cHM6Ly9naXRodWIuY29tLw==','Y29kZWNsb3VkLWRldg==','bW94c2gtdGVybWluYWw='];return seg.map(function(x){return atob(x);}).join('');})();

/* 联系方式（QQ / 邮箱）的原始值已移至服务端 functions/contact.js：
   仅当「已登录会话 + 通过 Turnstile 真人验证」后，由 /contact 下发到前端，
   不再以明文常量出现在任何客户端 JS 中，纯爬虫读不到。 */
/* 指针光斑（rAF 节流：光斑层由 transform 合成驱动，更新零重绘） */
var _lr=0,_lx=0,_ly=0,_le=null;
function bindLight(el){el.addEventListener('pointermove',function(e){var r=el.getBoundingClientRect();
  _lx=(e.clientX-r.left)/r.width*100;_ly=(e.clientY-r.top)/r.height*100;_le=el;
  if(!_lr){_lr=requestAnimationFrame(function(){_lr=0;if(!_le)return;
    _le.style.setProperty('--mx',_lx.toFixed(2)+'%');_le.style.setProperty('--my',_ly.toFixed(2)+'%');});}}, {passive:true});}
document.querySelectorAll('.glass').forEach(bindLight);
/* 复制 */
function copyVal(id){var t=document.getElementById(id).textContent;
  var done=function(){showToast('已复制：'+t);};
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

/* 通用滑块（人机验证闸 / 邮箱门槛共用），拖到最右触发 onPass */
function makeSlider(root,onPass){
  var knob=root.querySelector('.slider-knob'),fill=root.querySelector('.slider-fill'),text=root.querySelector('.slider-text');
  if(!knob)return null;
  function range(){return Math.max(0,root.clientWidth-knob.offsetWidth-8);}
  function setX(x){x=Math.max(0,Math.min(range(),x));knob.style.left=(x+4)+'px';fill.style.width=(x+knob.offsetWidth/2)+'px';return x;}
  var drag=false;
  knob.addEventListener('pointerdown',function(e){drag=true;try{knob.setPointerCapture(e.pointerId);}catch(_){}});
  window.addEventListener('pointermove',function(e){if(!drag)return;var r=root.getBoundingClientRect();setX(e.clientX-r.left-knob.offsetWidth/2);},{passive:true});
  window.addEventListener('pointerup',function(){if(!drag)return;drag=false;
    if(parseFloat(knob.style.left||'0')>=range()*0.96){setX(range());if(text)text.textContent='验证通过 ✓';knob.querySelector('span').textContent='✓';setTimeout(onPass,400);}
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
  // 仅把"确定性机器人信号"判为异常：navigator.webdriver（无头/自动化）或明显爬虫 UA。
  function risk(){var s=0;
    if(navigator.webdriver===true)s+=10;
    var ua=(navigator.userAgent||'').toLowerCase();
    if(/headless|phantomjs|scrapy|python-requests|go-http|java\/|curl\/|wget|okhttp|bot\b|spider|crawl/i.test(ua))s+=10;
    return s;}
  if(!verified && (risk()>0 || /[?&]verify=1/.test(location.search))){show();}
  makeSlider(slider,hide);
  var why=document.getElementById('gateWhy');
  if(why)why.addEventListener('click',function(e){e.preventDefault();
    document.getElementById('gateMsg').textContent='为避免脚本批量抓取与滥用，异常流量需先证明你是真人。过程仅一次，完成后本次会话不再弹出。';});
  var skip=document.getElementById('gateSkip');
  if(skip)skip.addEventListener('click',function(e){e.preventDefault();hide();});
})();

/* 滚动入场 */
(function(){var els=document.querySelectorAll('.fadeup');
  if(!('IntersectionObserver'in window)){els.forEach(function(e){e.classList.add('in');});return;}
  var io=new IntersectionObserver(function(en){en.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:.12});
  els.forEach(function(e){io.observe(e);});})();

/* ===== 联系方式：登录 + Turnstile 真人验证后，由服务端 /contact 下发 ===== */
(function(){
  /* 邮箱：通过 Turnstile 真人验证 + 已登录后，服务端下发真实邮箱 */
  var mailVal=document.getElementById('mailVal'),mailSlider=document.getElementById('mailSlider'),
      mailCopy=document.getElementById('mailCopyBtn');
  var qqVal=document.getElementById('qqVal'),askBtn=document.getElementById('qqAskBtn'),
      form=document.getElementById('qqForm'),fromEl=document.getElementById('qqFrom'),
      whyEl=document.getElementById('qqWhy'),submitBtn=document.getElementById('qqSubmitBtn'),
      done=document.getElementById('qqDone'),brief=document.getElementById('qqBrief');
  var loginHint=document.getElementById('contactLoginHint');

  function getTok(){try{return localStorage.getItem('mox_token')||'';}catch(e){return '';}}
  function showLoginRequired(){
    if(loginHint)loginHint.style.display='';
    if(mailSlider)mailSlider.style.display='none';
  }
  // Turnstile 回调（index.html 的 data-callback 指向 window.onContactCaptcha）
  window.onContactCaptcha = function(token){
    var t=getTok();
    if(!t){ showLoginRequired(); showToast('请先登录后再查看联系方式'); return; }
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
      window.__contactQQ = d.qq||'';   // QQ 值暂存，等用户填完「来历与用途」再显示
      if(askBtn)askBtn.style.display='';
    }).catch(function(err){
      if(err&&err.error==='login_required'){ showLoginRequired(); showToast('登录会话已失效，请重新登录'); }
      else if(err&&err.error==='captcha_failed'){ showToast('验证未通过，请重试'); if(window.turnstile)window.turnstile.reset(); }
      else { showToast('暂时无法获取联系方式，请稍后再试'); }
    });
  };
  window.onContactExpired = function(){ /* Turnstile 令牌过期，等待用户重做 */ };

  // 未登录时引导登录：点击触发已有的登录弹窗（#loginCta）
  var loginBtn=document.getElementById('contactLoginBtn');
  if(loginBtn)loginBtn.addEventListener('click',function(e){e.preventDefault();
    var cta=document.getElementById('loginCta'); if(cta)cta.click();});

  /* QQ：先详细登记来历 + 用途，通过后显示（值来自服务端下发） */
  if(!askBtn)return;
  function passQQ(){
    var qq=window.__contactQQ||'';
    if(!qq){ showToast('请先完成验证'); return; }
    qqVal.textContent=qq; if(form)form.style.display='none'; if(done)done.style.display='';
    if(brief)brief.textContent='我是'+fromEl.value.trim()+'，想'+whyEl.value.trim()+'。（来自 MoX 官网）';
    showToast('已生成申请说明，复制后添加即可');
  }
  askBtn.addEventListener('click',function(){askBtn.style.display='none'; if(form)form.style.display='';
    try{var s=JSON.parse(sessionStorage.getItem('mox_qq_info')||'null');
      if(s){fromEl.value=s.f;whyEl.value=s.w;}}catch(e){}
    if(fromEl)fromEl.focus();});
  submitBtn.addEventListener('click',function(){
    var fr=(fromEl.value||'').trim(),wk=(whyEl.value||'').trim();
    if(fr.length<12){showToast('来历请写详细一点（不少于 12 字）');fromEl.focus();return;}
    if(wk.length<6){showToast('想说清楚你想做什么（不少于 6 字）');whyEl.focus();return;}
    try{sessionStorage.setItem('mox_qq_info',JSON.stringify({f:fr,w:wk}));}catch(e){}
    passQQ();
  });
})();

/* ===== 登录 / 用户态（对接 mox-id 后端）===== */
(function(){
  /* 登录链路统一走 pages.dev 边缘反代，绝不让浏览器直连 workers.dev。
     登录/登出全部无刷新完成：renderUser / renderLogin 直接切换导航、
     CTA 与弹窗三处 UI，绝不 location.reload 白屏等待。 */
  var PAGES_ORIGIN = 'https://mox-site.pages.dev';
  var LOGIN_API = location.hostname.endsWith('.pages.dev') ? '' : PAGES_ORIGIN;
  var slot=document.getElementById('authSlot');
  var mask=document.getElementById('loginMask');
  var statusEl=document.getElementById('loginStatus');
  var statusText=document.getElementById('loginStatusText');
  var hintEl=document.getElementById('loginHint');
  var cta=document.getElementById('loginCta');
  var currentUser=null; /* null = 未登录；登录后驱动导航/CTA/弹窗三处 UI 同步 */
  var adminHref='';     /* 管理后台秘径，仅 /me 下发给管理员本人 */
  var probeState='';    /* ''未知 on在线 off离线 —— 在线后不再重复探测 */
  function getTok(){try{return localStorage.getItem('mox_token')||'';}catch(e){return '';}}
  function setTok(t){try{localStorage.setItem('mox_token',t);}catch(e){}}
  function delTok(){try{localStorage.removeItem('mox_token');}catch(e){}}

  // OAuth 回跳带 ?token= 时存下并清 URL（replaceState 无感，不刷新）
  (function(){var u=new URL(location.href);var t=u.searchParams.get('token');
    if(t){setTok(t);u.searchParams.delete('token');history.replaceState(null,'',u.pathname+u.search+u.hash);}
  })();

  function setStatus(cls,text){ if(!statusEl)return; statusEl.className='login-status '+cls; if(statusText)statusText.textContent=text; }

  /* 后端可达性探测（JSON 守卫 + 结果缓存）：HTML fallback 不再误报在线 */
  function probeBackend(force){
    if(probeState==='on'&&!force)return;
    fetch(LOGIN_API+'/me',{method:'GET',cache:'no-store'})
      .then(function(r){
        if((r.headers.get('content-type')||'').indexOf('json')<0)throw new Error('not_json');
        probeState='on';setStatus('on','登录服务在线');
      })
      .catch(function(){
        probeState='off';setStatus('off','登录服务暂时不可达');
        if(hintEl)hintEl.innerHTML='登录服务暂时连不上（网络限制或后端维护）。请稍后重试，或改用主站：<a href="https://mox-site.pages.dev/" target="_blank" rel="noopener">mox-site.pages.dev</a>';
      });
  }

  /* ===== 登录态 UI：导航 slot + 账号区 CTA + 弹窗，三处同步 ===== */
  function renderUser(u){
    currentUser=u;
    if(cta)cta.textContent='已登录 · '+(u.name||u.login||'用户');
    slot.textContent='';
    var img=document.createElement('img');img.className='av';img.alt='';
    if(u.avatar_url)img.src=u.avatar_url;
    img.addEventListener('error',function(){img.style.display='none';});
    var out=document.createElement('a');out.href='#';out.textContent='退出';
    out.addEventListener('click',function(e){e.preventDefault();doLogout();});
    slot.appendChild(img);slot.appendChild(out);
  }
  function renderAdmin(path){
    adminHref=LOGIN_API+path;
    var a=document.createElement('a');a.href=adminHref;a.textContent='管理后台';
    slot.insertBefore(a,slot.firstChild);
  }
  function renderLogin(){
    currentUser=null;adminHref='';
    if(cta)cta.textContent='登录 MoX 账号';
    slot.innerHTML='<a href="#" id="loginBtn">登录</a>';
    var b=document.getElementById('loginBtn');
    if(b)b.addEventListener('click',function(e){e.preventDefault();openLogin();});
  }

  /* 退出：POST /auth/logout 撤销 mox_sid 服务端会话（30 天 Cookie），再清本地 token。
     无刷新：renderLogin 直接切回未登录态，toast 即时反馈 */
  function doLogout(){
    var t=getTok();
    try{
      fetch(LOGIN_API+'/auth/logout',{method:'POST',credentials:'include',
        headers:t?{'Authorization':'Bearer '+t}:{}}).catch(function(){});
    }catch(e){}
    delTok();
    mask.classList.remove('show');
    renderLogin();
    showToast('已退出登录');
  }

  function openLogin(){
    mask.classList.add('show');
    var m=document.getElementById('loginMsg');if(m){m.className='msg';m.textContent='';}
    if(hintEl)hintEl.textContent='';
    var lb=document.getElementById('loginBox');
    var ib=document.getElementById('loggedInBox');
    if(currentUser){
      /* 已登录再点「登录」：展示当前账号 + 退出入口，绝不再次引导登录 */
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
  /* GitHub 按钮即时反馈：点击立刻有响应，不等网络 */
  var ghBtn=document.getElementById('ghLoginBtn');
  if(ghBtn){
    ghBtn.addEventListener('click',function(){ghBtn.classList.add('busy');ghBtn.textContent='正在打开 GitHub…';});
    window.addEventListener('pageshow',function(ev){if(ev.persisted){ghBtn.classList.remove('busy');ghBtn.textContent='使用 GitHub 登录';}});
  }
  document.getElementById('tokLoginBtn').addEventListener('click',function(){
    var t=document.getElementById('tokInput').value.trim();if(!t)return;
    var m=document.getElementById('loginMsg');m.className='msg';m.textContent='登录中…';
    fetch(LOGIN_API+'/auth/token',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:t})})
      .then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};});})
      .then(function(x){
        if(!x.ok){m.className='msg err';m.textContent='失败：'+(x.d.error||'未知');return;}
        /* 无刷新登录：直接切登录态 + toast；管理入口异步补齐（/me 才下发秘径） */
        setTok(x.d.sid || t);mask.classList.remove('show');
        renderUser(x.d.user);
        showToast('登录成功 · '+((x.d.user&&(x.d.user.name||x.d.user.login))||'欢迎'));
        fetch(LOGIN_API+'/me',{headers:{'Authorization':'Bearer '+(x.d.sid || t)}})
          .then(function(r){return r.ok?r.json():null;})
          .then(function(d){if(d&&d.admin_path)renderAdmin(d.admin_path);})
          .catch(function(){});
      }).catch(function(){m.className='msg err';m.textContent='网络错误，请确认能访问后端。';});
  });

  // 初始化：探测后端 + 恢复登录态（三态：已登录 / token 失效 / 服务不可达）
  (function(){
    probeBackend();
    var t=getTok();
    if(!t){renderLogin();return;}
    fetch(LOGIN_API+'/me',{headers:{'Authorization':'Bearer '+t}})
      .then(function(r){
        var ct=(r.headers.get('content-type')||'');
        if(!r.ok)return{authed:false};              /* 401/403 = token 已失效 */
        if(ct.indexOf('json')<0)return{down:true};  /* HTML fallback = 反代失灵，token 保留 */
        return r.json().then(function(d){return{authed:true,d:d};});
      })
      .then(function(x){
        if(x.authed&&x.d&&x.d.user){
          renderUser(x.d.user);
          if(x.d.admin_path)renderAdmin(x.d.admin_path);
        }else if(x.down){
          renderLogin();setStatus('off','登录服务暂时不可达');
        }else{
          delTok();renderLogin(); /* 死 token 清掉，避免每次刷新白跑一趟 */
        }
      })
      .catch(function(){ renderLogin(); setStatus('off','登录服务暂时不可达'); });
  })();
})();

/* CSP 收紧后统一事件委托：替代原内联 onclick */
document.querySelectorAll('[data-act]').forEach(function(el){
  el.addEventListener('click',function(){
    var a=el.getAttribute('data-act');
    if(a==='copy')copyVal(el.getAttribute('data-target'));
  });
});

/* ===== 站点公告：读取后端 /notices（公开只读），展示最新一条高优先级公告 =====
   后台「公告发布」页面写入，此处只读；无公告或接口不可用时整块隐藏，不影响首屏。 */
(function(){
  var PAGES_ORIGIN = 'https://mox-site.pages.dev';
  var API = location.hostname.endsWith('.pages.dev') ? '' : PAGES_ORIGIN;
  var sec = document.getElementById('noticeBar');
  if(!sec) return;
  fetch(API+'/notices',{method:'GET',cache:'no-store'})
    .then(function(r){
      var ct=(r.headers.get('content-type')||'');
      if(ct.indexOf('json')<0)throw new Error('not_json');
      return r.json();
    })
    .then(function(d){
      var ns=(d&&d.notices)||[];
      if(!ns.length)return;
      var order={critical:0,warn:1,info:2};
      ns.sort(function(a,b){return (order[a.level]===undefined?3:order[a.level])-(order[b.level]===undefined?3:order[b.level]);});
      var n=ns[0];
      var lv=document.getElementById('noticeLevel');
      var lvMap={critical:'🚨 紧急',warn:'⚠️ 重要',info:'📢 公告'};
      if(lv) lv.textContent=lvMap[n.level]||'📢 公告';
      document.getElementById('noticeTitle').textContent=n.title||'';
      document.getElementById('noticeBody').textContent=n.body||'';
      var t=document.getElementById('noticeTime');
      if(t&&n.created_at) t.textContent=new Date(n.created_at).toLocaleString('zh-CN',{hour12:false});
      sec.style.display='';
    })
    .catch(function(){ /* 静默：无公告或后端不可达时不打扰访客 */ });
})();

/* GitHub 地址 base64 分段，避免源码明文账号 */
var GH_BASE = (function(){var seg=['aHR0cHM6Ly9naXRodWIuY29tLw==','Y29kZWNsb3VkLWRldg==','bW94c2gtdGVybWluYWw='];return seg.map(function(x){return atob(x);}).join('');})();

/* 联系方式：混淆存储，明文不出现在页面源码中 */
var _K=0x5d;
var _QA=[110,109,105,111,100,101,109,109,110,106];
var _MA=[39,107,107,107,107,107,107,107,107,107,107,29,108,107,110,115,62,50,48];
function _d(a){var s='';for(var i=0;i<a.length;i++)s+=String.fromCharCode(a[i]^_K);return s;}
function revealContact(){
  var c=document.getElementById('contactCards');c.classList.add('show');
  document.getElementById('qqVal').textContent=_d(_QA);
  document.getElementById('mailVal').textContent=_d(_MA);
  showToast('联系方式已显示');
}
/* 指针光斑 */
function bindLight(el){el.addEventListener('pointermove',function(e){var r=el.getBoundingClientRect();
  el.style.setProperty('--mx',((e.clientX-r.left)/r.width*100)+'%');
  el.style.setProperty('--my',((e.clientY-r.top)/r.height*100)+'%');});}
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

/* 手机预览：指针 + 陀螺仪 视差倾斜 */
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

/* 人机验证闸：异常访问时弹出，滑动即过（无需答题） */
(function(){
  var gate=document.getElementById('gate');
  var knob=document.getElementById('sliderKnob');
  var fill=document.getElementById('sliderFill');
  var text=document.getElementById('sliderText');
  var slider=document.getElementById('slider');
  if(!gate||!knob)return;
  var VERIFY_KEY='mox_verified';
  function range(){return Math.max(0, slider.clientWidth - knob.offsetWidth - 8);}
  function setX(x){x=Math.max(0,Math.min(range(),x));knob.style.left=(x+4)+'px';fill.style.width=(x+knob.offsetWidth/2)+'px';return x;}
  // 仅把"确定性机器人信号"判为异常：navigator.webdriver（无头/自动化）或明显爬虫 UA。
  // 普通浏览器（含隐私模式、移动端）绝不会被误判 → 导航与下载永远可用，永不误锁真人。
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
    if(parseFloat(knob.style.left||'0')>=range()*0.96){setX(range());text.textContent='验证通过 ✓';knob.querySelector('span').textContent='✓';setTimeout(hide,650);}
    else{setX(0);}});
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

/* ===== 登录 / 用户态（对接 mox-id 后端）===== */
(function(){
  var API='https://mox-id.3042980037.workers.dev';
  /* 登录链路按部署域名自动选路：
     - Cloudflare Pages（*.pages.dev）有边缘函数 → 走同域 Functions 反代（LOGIN_API=''）
     - GitHub Pages（github.io）等无边缘函数环境 → 直连后端 workers.dev
     一份源码推到 main，pages.dev 与 github.io 两边都自动更新、都能登录 */
  var LOGIN_API = location.hostname.endsWith('.pages.dev') ? '' : API;
  var slot=document.getElementById('authSlot');
  var mask=document.getElementById('loginMask');
  var statusEl=document.getElementById('loginStatus');
  var statusText=document.getElementById('loginStatusText');
  var hintEl=document.getElementById('loginHint');
  function getTok(){try{return localStorage.getItem('mox_token')||'';}catch(e){return '';}}
  function setTok(t){try{localStorage.setItem('mox_token',t);}catch(e){}}
  function delTok(){try{localStorage.removeItem('mox_token');}catch(e){}}

  // OAuth 回跳带 ?token= 时存下并清 URL
  (function(){var u=new URL(location.href);var t=u.searchParams.get('token');
    if(t){setTok(t);u.searchParams.delete('token');history.replaceState(null,'',u.pathname+u.search+u.hash);}
  })();

  /* 后端可达性探测：决定状态点；github.io 不可达时引导去主站 pages.dev */
  function setStatus(cls,text){ if(!statusEl)return; statusEl.className='login-status '+cls; if(statusText)statusText.textContent=text; }
  function probeBackend(){
    fetch(LOGIN_API+'/me',{method:'GET',cache:'no-store'})
      .then(function(r){ setStatus('on','登录服务在线'); })
      .catch(function(){
        if(location.hostname.endsWith('.github.io')){
          setStatus('off','登录服务在当前域名不可达');
          if(hintEl)hintEl.innerHTML='当前域名（github.io）登录链路可能受网络限制。请改用主站登录：<a href="https://mox-site.pages.dev/" target="_blank" rel="noopener">mox-site.pages.dev</a>';
        } else {
          setStatus('warn','登录服务暂时不可达，可稍后重试');
        }
      });
  }

  function renderUser(u){
    /* 安全 DOM 构建：不拼 HTML，杜绝 XSS；头像加载失败隐藏 */
    slot.textContent='';
    var img=document.createElement('img');img.className='av';img.alt='';
    if(u.avatar_url)img.src=u.avatar_url;
    img.addEventListener('error',function(){img.style.display='none';});
    var out=document.createElement('a');out.href='#';out.textContent='退出';
    out.addEventListener('click',function(e){e.preventDefault();delTok();location.reload();});
    slot.appendChild(img);slot.appendChild(out);
  }
  function renderAdmin(path){
    /* 管理后台走秘径，地址只由 /me 下发给管理员本人，公开页面不含该路径。
       链接走 LOGIN_API：在 pages.dev 上经同域反代可达，在 github.io 直连后端 */
    var a=document.createElement('a');a.href=LOGIN_API+path;a.textContent='管理后台';
    slot.insertBefore(a,slot.firstChild);
  }
  function renderLogin(){
    slot.innerHTML='<a href="#" id="loginBtn">登录</a>';
    var b=document.getElementById('loginBtn');
    if(b)b.addEventListener('click',function(e){e.preventDefault();openLogin();});
  }
  function openLogin(){
    mask.classList.add('show');
    var m=document.getElementById('loginMsg');if(m){m.className='msg';m.textContent='';}
    if(hintEl)hintEl.textContent='';
    var gh=document.getElementById('ghLoginBtn');
    if(gh)gh.href=LOGIN_API+'/auth/github/start?redirect='+encodeURIComponent(location.href);
    probeBackend();
  }
  // 导航「登录」与账号区「登录 MoX 账号」都打开弹窗
  var cta=document.getElementById('loginCta');
  if(cta)cta.addEventListener('click',function(e){e.preventDefault();openLogin();});

  document.getElementById('tokCancelBtn').addEventListener('click',function(){mask.classList.remove('show');});
  mask.addEventListener('click',function(e){if(e.target===mask)mask.classList.remove('show');});
  document.getElementById('tokLoginBtn').addEventListener('click',function(){
    var t=document.getElementById('tokInput').value.trim();if(!t)return;
    var m=document.getElementById('loginMsg');m.className='msg';m.textContent='登录中…';
    fetch(LOGIN_API+'/auth/token',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:t})})
      .then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};});})
      .then(function(x){
        if(!x.ok){m.className='msg err';m.textContent='失败：'+(x.d.error||'未知');return;}
        /* 普通 GitHub 用户与管理员都能登录；仅管理员会额外出现「管理后台」入口 */
        setTok(t);mask.classList.remove('show');location.reload();
      }).catch(function(){m.className='msg err';m.textContent='网络错误，请确认能访问后端。';});
  });

  // 初始化：探测后端 + 探测登录态
  (function(){
    probeBackend();
    var t=getTok();
    if(!t){renderLogin();return;}
    fetch(LOGIN_API+'/me',{headers:{'Authorization':'Bearer '+t}})
      .then(function(r){return r.ok?r.json().then(function(d){return{ok:true,d:d};}):{ok:false};})
      .then(function(x){ if(x.ok&&x.d.user){ renderUser(x.d.user); if(x.d.admin_path) renderAdmin(x.d.admin_path); } else renderLogin(); })
      .catch(function(){renderLogin();});
  })();
})();

/* CSP 收紧后统一事件委托：替代原内联 onclick */
document.querySelectorAll('[data-act]').forEach(function(el){
  el.addEventListener('click',function(){
    var a=el.getAttribute('data-act');
    if(a==='revealContact')revealContact();
    else if(a==='copy')copyVal(el.getAttribute('data-target'));
  });
});

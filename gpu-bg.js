/* gpu-bg.js — 官网背景光晕的 GPU 计算（dogfooding：moxwebgpu）
 *
 * 原来 body::after 用 CSS filter:blur(16px) 对全屏（inset:-25%）每帧重算柔化——
 * 软件光栅/低端 GPU 下这是滚动卡顿的最大单点开销。
 * 现在换成 moxwebgpu kernel：在**本机 GPU** 上计算低分辨率（~160px 宽）光晕密度场，
 * 回读后 putImageData 到 canvas，再用 CSS 放大铺满全屏。柔边由低分辨率放大天然产生，
 * 外观与原 radial-gradient 光晕（两枚漂移光斑 + opacity .5）保持一致。
 *
 * 渐进增强（外观不变的保障）：
 *   - 无 WebGPU / SDK 未加载 / init 失败 / 运行时报错 → 静默退出，
 *     body::after 的 CSS 版背景继续生效，用户无感知；
 *   - 成功首帧后才淡入 canvas，并给 body 加 .gpu-bg（CSS 隐藏 ::after 版）。
 */
(function () {
  'use strict';

  var canvas = document.getElementById('gpuBg');
  if (!canvas) return;

  var ctx2d = canvas.getContext('2d', { alpha: true });
  if (!ctx2d) return;

  /* 场分辨率：按视口长宽比取 ~160px 宽（竖屏收窄），总像素封顶 ~24k，回读量可控 */
  function fieldSize() {
    var iw = window.innerWidth, ih = window.innerHeight;
    var BW = iw >= ih ? 160 : Math.max(96, Math.round((160 * iw) / ih));
    var BH = Math.max(1, Math.round((BW * ih) / iw));
    while (BW * BH > 24000 && BW > 64) { BW -= 8; BH = Math.max(1, Math.round((BW * ih) / iw)); }
    return { BW: BW, BH: BH };
  }

  /* 两枚漂移光斑：颜色/峰值/中心复刻 index.css 的 body::after；
     中心漂移复刻 drift 动画（32s 单程 alternate：-2%→+3% / -1%→+2%，scale 1.05→1.1） */
  var C1 = [0.25, 0.35], C2 = [0.78, 0.62];           // 视口比例坐标（径向 at 25% 35% / at 78% 62%）
  var PEAK = [0.16, 0.12];                            // rgba(129,140,248,.16) / rgba(94,234,212,.12)
  var COL1 = [0.506, 0.549, 0.973];                   // #818cf8
  var COL2 = [0.369, 0.918, 0.831];                   // #5eead4
  var PERIOD = 64;                                    // alternate 全周期（32s 单程）

  function smooth(x) { return x * x * (3 - 2 * x); }

  /* uniform 布局（5×vec2f = 40B，vec2f 对齐 8）：
     [0,1]=res(BW,BH) [2,3]=c1 [4,5]=c2 [6,7]=rad(rx,ry) [8,9]=peak */
  var UBO_FLOATS = 10;

  var WGSL = `
struct Params {
  res: vec2<f32>,
  c1: vec2<f32>,
  c2: vec2<f32>,
  rad: vec2<f32>,
  peak: vec2<f32>,
};
@group(0) @binding(0) var<uniform> p: Params;
@group(0) @binding(1) var<storage, read_write> out: array<f32>;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  let n = arrayLength(&out) / 4u;
  if (i >= n) { return; }
  let fx = f32(i % u32(p.res.x)) / p.res.x;
  let fy = f32(i / u32(p.res.x)) / p.res.y;
  let q1 = (vec2<f32>(fx, fy) - p.c1) / p.rad;
  let q2 = (vec2<f32>(fx, fy) - p.c2) / p.rad;
  let a1 = p.peak.x * exp(-dot(q1, q1) * 0.5);
  let a2 = p.peak.y * exp(-dot(q2, q2) * 0.5);
  let col = (vec3<f32>(0.506, 0.549, 0.973) * a1 + vec3<f32>(0.369, 0.918, 0.831) * a2)
            / max(a1 + a2, 1e-4);
  out[i * 4u + 0u] = col.x;
  out[i * 4u + 1u] = col.y;
  out[i * 4u + 2u] = col.z;
  out[i * 4u + 3u] = min(a1 + a2, 1.0);
}`;

  var gpu = null, kernel = null, out = null, ubo = null;
  var BW = 0, BH = 0, N = 0;
  var image = null, bytes = null;                     // ImageData + Uint8 视图
  var rafId = 0, reading = false, dead = false;
  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var startTs = performance.now();

  function fail() {
    /* 运行期异常：杀掉循环、隐藏 canvas，CSS 版背景无缝接回 */
    dead = true;
    if (rafId) cancelAnimationFrame(rafId);
    canvas.classList.remove('on');
    document.body.classList.remove('gpu-bg');
  }

  function allocField() {
    var s = fieldSize();
    BW = s.BW; BH = s.BH; N = BW * BH;
    canvas.width = BW; canvas.height = BH;
    image = ctx2d.createImageData(BW, BH);
    bytes = new Uint8Array(image.data.buffer);
    if (out) gpu.pool.release(out);
    out = gpu.pool.acquire(N * 4, 'f32');
  }

  function radNow() {
    /* 448px/416px 绝对半径（28rem/26rem）换算成视口比例，竖屏自动压扁；
       ×1.25 补偿 exp 衰减与 radial 线性过渡的观感差 */
    var iw = window.innerWidth, ih = window.innerHeight;
    return [560 / iw, 560 / ih];
  }

  function writeUniform(t) {
    var ph = (t / 1000) % PERIOD / PERIOD;
    var tri = ph < 0.5 ? ph * 2 : 2 - ph * 2;
    var e = smooth(tri);
    var rad = radNow();
    var sc = 1.05 + e * 0.05;                          // scale 1.05→1.1
    var u = new Float32Array(UBO_FLOATS);
    u[0] = BW; u[1] = BH;
    u[2] = C1[0] + (-0.02 + e * 0.05); u[3] = C1[1] + (-0.01 + e * 0.03);
    u[4] = C2[0] + (-0.02 + e * 0.05); u[5] = C2[1] + (-0.01 + e * 0.03);
    u[6] = rad[0] * sc; u[7] = rad[1] * sc;
    u[8] = PEAK[0]; u[9] = PEAK[1];
    gpu.queue.writeBuffer(ubo, 0, u.buffer);
  }

  function paint(arr) {
    var n = N * 4, j = 0;
    for (var i = 0; i < n; i++) { var v = arr[i] * 255; bytes[j++] = v < 0 ? 0 : v > 255 ? 255 : v; }
    ctx2d.putImageData(image, 0, 0);
    if (!canvas.classList.contains('on')) {
      canvas.classList.add('on');
      document.body.classList.add('gpu-bg');
    }
  }

  function frame() {
    if (dead) return;
    rafId = requestAnimationFrame(frame);
    if (document.hidden || reading) return;
    reading = true;
    try {
      writeUniform(performance.now() - startTs);
      kernel.dispatch([ubo, out], [Math.ceil(N / 64), 1, 1]);
    } catch (e) { fail(); return; }
    gpu.readback(out).then(function (arr) {
      reading = false;
      if (dead) return;
      try { paint(arr); } catch (e) { fail(); }
    }, function () { reading = false; fail(); });
  }

  var resizeTimer = 0;
  addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (dead) return;
      try { allocField(); } catch (e) { fail(); }
    }, 400);
  }, { passive: true });

  /* 启动：SDK（defer 先行加载）→ init → 建场 → 首帧 */
  var MWG = window.MoxWebGPU;
  if (!MWG || !MWG.mox || !navigator.gpu) return;
  MWG.mox.init().then(function (g) {
    gpu = g;
    if (!gpu || !gpu.kernel || !gpu.pool) return;
    kernel = gpu.kernel(WGSL, { workgroupSize: 64 });
    ubo = gpu.pool.acquireUniform(UBO_FLOATS * 4);
    allocField();
    if (reduceMotion) {
      /* 减少动效：只画一帧静态光晕 */
      try {
        writeUniform(0);
        kernel.dispatch([ubo, out], [Math.ceil(N / 64), 1, 1]);
        gpu.readback(out).then(paint, function () {});
      } catch (e) { fail(); }
      return;
    }
    frame();
  }, function () { /* init 失败：静默保留 CSS 版背景 */ });
})();

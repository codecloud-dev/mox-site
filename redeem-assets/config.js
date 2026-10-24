// moxsh 官网·粉丝专区 —— 运行配置（部署时改这里）
// 说明：本文件在 app.js 之前加载，写入 window.MOX_CONFIG。
//   apiBase : mox-id 后端地址。留空 = 自动：
//               · 部署在 *.pages.dev（如 mox-site.pages.dev）→ 同源反代（functions/fan/[[path]].js）
//               · 其他域（如 GitHub Pages 镜像）→ 走 https://mox-site.pages.dev 反代
//             独立部署（自有 CF Pages 项目）时填 Worker 直连地址或反代地址。
window.MOX_CONFIG = {
  apiBase: "",
};

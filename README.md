<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-8a7bff" alt="version">
  <img src="https://img.shields.io/badge/license-MIT-37d5d3" alt="license">
  <img src="https://img.shields.io/badge/host-Cloudflare%20Pages-2088FF?logo=cloudflare&logoColor=white" alt="Cloudflare Pages">
  <img src="https://img.shields.io/badge/style-Liquid%20Glass-37d5d3" alt="液态玻璃">
  <img src="https://img.shields.io/badge/lang-中文%20%2F%20EN-ff7ac3" alt="中英双语">
</p>

<h1 align="center">mox-site</h1>

<p align="center"><b>MoX 工具系列官方站</b> —— 产品展示、下载入口与社区，都在这里。</p>

<p align="center"><a href="index.html">中文官网</a> · <a href="index.en.html">English site</a> · <a href="README.en.md">English README</a></p>

<p align="center"><img src="assets/demo.svg" width="760" alt="mox-site 官机动图：agent-core / moxwebgpu / moxsh 三张卡片错峰亮起，汇入官方门户"></p>

<p align="center"><b>⭐ 如果你喜欢 MoX 工具系列,欢迎点个 <a href="https://github.com/codecloud-dev/mox-site">Star</a> —— 它能让更多人发现这些工具!</b></p>

---

<details>
<summary>📑 目录 · Contents</summary>

- [🔹 这是什么](#这是什么)
- [🌟 产品系列](#产品系列)
- [🏠 首页板块](#首页板块)
- [🗺️ 本次大版本升级（进度表）](#本次大版本升级进度表)
- [🎨 设计语言](#设计语言)
- [🔍 细节](#细节)
- [💻 本地预览](#本地预览)
- [📜 许可证](#许可证)

</details>

## 🔹 这是什么

[mox-site](https://codecloud-dev.github.io/mox-site/) 是 **MoX 工具系列**的统一门户：纯静态单页、零依赖、零构建，**主站部署在 Cloudflare Pages**（`mox-site.pages.dev`），GitHub Pages 仅作为镜像兜底。登录 / 云同步等动态能力由 `functions/`（Cloudflare Pages Functions）反代到 mox-id 后端，仅 Cloudflare 环境真正运行，GitHub Pages 镜像下相关接口会优雅降级。

第一款产品是 **moxsh** —— Android 液态玻璃终端：Rust 自研内核，配一整套玻璃质感界面。

## 🌟 产品系列

| 产品 | 状态 | 一句话定位 |
|:---:|:---:|---|
| **moxsh** | ✅ 已上线 | Android 液态玻璃终端，兼容 Termux 生态 |
| **mox-site** | ✅ 已上线 | 本系列官方门户（即本仓库） |
| **moxbox** | 🚧 规划中 · 待定 | 文件管理与系统套件，同款玻璃界面；可能做，也可能不做 |
| **moxcode** | 🚧 规划中 · 待定 | 移动端轻量 IDE：终端 + 编辑器 + 预览一体；可能做，也可能不做 |

## 🏠 首页板块

门户不只是「产品罗列」，它还承载了项目对外最核心的三块信息，均位于 `index.html` / `index.en.html`：

- **#roadmap 路线图**：MoX 生态的分阶段演进时间线（阶段一~六），已交付 / 进行中 / 规划中 / 待定 各有明确状态，不画大饼。
- **#vision 愿景**：四条核心理念——桌面级能力装进掌心、算力下推到你的设备、独立开发者 + AI 协作、开源透明可审计。
- **#community 社区与共建**：GitHub 组织、点 Star、提 Issue、爱发电赞助、QQ 群与邮箱入口，一处汇总。

## 🗺️ 本次大版本升级（进度表）

所有公开仓库统一升到 **1.0.0**，按各自路线图「多做一点、但留空间」。

| 仓库 | 大版本交付 | 状态 |
|:---:|---|:---:|
| **agent-core** | 通用 Agent 框架：新增 `MemoryStorage` / `NodeStorage` 适配器、可运行示例、完整开发者文档与进度表、npm 发布就绪（OIDC 免 token） | ✅ |
| **moxsh-plugins** | 统一 `catalog.json` / `plugins.json` 的 schema 键、加 `repoVersion` 标记、新增 `glass-terminal-theme` 主题示例、补 JSON Schema 校验、重写作者指南 | ✅ |
| **moxwebgpu** | 头号路线图项**自动微分**（反向模式叠加在惰性图上）、`expand` 算子、npm 首次发布、在线演示与文档站 | ✅ |
| **mox-site** | 补「路线图 / 愿景 / 社区」三大板块、中英文门面同步升级、视觉统一 | ✅ |
| **moxsh-terminal** | 性能（120Hz / atlas / NEON）、AI 端侧、`.mox` 生态、App 图标统一为仓库 logo、版本号升 1.0.0 | 🔄 进行中 |
| **moxsh-suite** | 子模块（`app`=moxsh-terminal、`site`=mox-site）指针 bump 到 1.0.0，收尾性 | ⏳ 末步 |

> 规划中·待定的 **moxbox / moxcode** 不在本次大版本范围，是否推进以实际发布为准。


## 🎨 设计语言

- **真·液态玻璃**：顶部高光反射 + 折射边 + 指针跟随光斑 + 缓慢漂移的环境光
- 克制配色：近黑底 + 单一青→靛强调色，大量留白
- 完整设计系统在 `style.css`，可作为独立样式表复用

## 🔍 细节

- 联系方式（QQ / 邮箱）为对外公开信息，页面默认折叠，需先通过滑块人机验证才显示，仅做轻度防爬；源码中直接以明文常量给出，不做「可逆混淆」假装隐藏
- 下载 / 仓库链接分段 base64 拼接，页面源码不含明文账号名
- 赞助通道：项目统一走爱发电（<https://afdian.com/a/cloudharbor>），仓库顶部 **Sponsor** 按钮已启用；官网「社区与共建」板块也已上线爱发电入口。

## 💻 本地预览

```bash
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080
```

## 📜 许可证

页面与内容由开发者 **Codecloud** 主导设计，AI 辅助生成并经人工审核。

## 🔒 安全基线

- **全站安全响应头**（Cloudflare Pages `_headers`）：`X-Frame-Options: DENY`（防点击劫持）、`nosniff`、`Referrer-Policy`、`Permissions-Policy`（禁摄像头/麦克风/定位等）、`COOP`、HSTS。
- **CSP**：生产页 `script-src 'self'` —— 全部脚本外链、内联脚本归零；所有内联 `onclick/onerror` 已改为事件委托；动态渲染走安全 DOM API（不拼 HTML）。登录态 token 出现在 URL 时立即 `history.replaceState` 清除。
- **后端**（mox-id）：CORS 白名单、全局 `nosniff/DENY/no-referrer/HSTS`、管理后台隐藏秘径（见 mox-id 仓库）。
- **CI 验证**：每次部署后自动断言安全头、CSP、资源完整性与无内联脚本，失败自动建 issue。

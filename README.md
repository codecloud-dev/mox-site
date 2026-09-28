<p align="center">
  <img src="https://img.shields.io/badge/Mox%20Series-官方门户-8a7bff" alt="Mox Series">
  <img src="https://img.shields.io/badge/Deploy-GitHub%20Pages-2088FF?logo=githubpages&logoColor=white" alt="GitHub Pages">
  <img src="https://img.shields.io/badge/Style-Liquid%20Glass-37d5d3" alt="液态玻璃">
</p>

<h1 align="center">mox-site</h1>

<p align="center"><b>MoX 工具系列官方站</b> —— 产品展示、下载入口与社区，都在这里。</p>

---

## 这是什么

[mox-site](https://codecloud-dev.github.io/mox-site/) 是 **MoX 工具系列**的统一门户：纯静态单页、零依赖、零构建，部署在 GitHub Pages。

第一款产品是 **moxsh** —— Android 液态玻璃终端：Rust 自研内核，配一整套玻璃质感界面。

## 产品系列

| 产品 | 状态 | 一句话定位 |
|:---:|:---:|---|
| **moxsh** | ✅ 已上线 | Android 液态玻璃终端，兼容 Termux 生态 |
| **mox-site** | ✅ 已上线 | 本系列官方门户（即本仓库） |
| **moxbox** | 🚧 规划中 · 待定 | 文件管理与系统套件，同款玻璃界面；可能做，也可能不做 |
| **moxcode** | 🚧 规划中 · 待定 | 移动端轻量 IDE：终端 + 编辑器 + 预览一体；可能做，也可能不做 |

## 设计语言

- **真·液态玻璃**：顶部高光反射 + 折射边 + 指针跟随光斑 + 缓慢漂移的环境光
- 克制配色：近黑底 + 单一青→靛强调色，大量留白
- 完整设计系统在 `style.css`，可作为独立样式表复用

## 细节

- 联系方式（QQ / 邮箱）默认隐藏，点击后由混淆值还原，源码中不含明文
- 下载 / 仓库链接分段 base64 拼接，页面源码不含明文账号名
- 赞助通道占位中（收款码待补）

## 本地预览

```bash
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080
```

## 许可证

页面与内容由开发者 **Codecloud** 主导设计，AI 辅助生成并经人工审核。

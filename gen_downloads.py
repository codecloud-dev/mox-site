#!/usr/bin/env python3
"""从 GitHub API 拉取 moxsh-terminal 的全部 Release，生成 downloads.json（下载页数据源）。
用法: python3 gen_downloads.py
无需任何第三方库，仅依赖 `gh` CLI（已登录 codecloud-dev）。
"""
import json
import subprocess
import sys
from datetime import datetime, timezone

REPO = "codecloud-dev/moxsh-terminal"
OUT = "downloads.json"

# 友好展示用：仓库元信息
META = {
    "moxsh-terminal": {
        "title": "moxsh 终端",
        "subtitle": "安卓液态玻璃 Linux 终端",
        "github": "https://github.com/codecloud-dev/moxsh-terminal",
        "desc": "随代码持续构建发布的正式签名 APK。下方每个版本都提供多个国内加速镜像，任选其一即可。",
    }
}


def gh(api_path):
    cmd = ["gh", "api", api_path, "--jq", "."]
    out = subprocess.run(cmd, capture_output=True, text=True)
    if out.returncode != 0:
        print(f"[WARN] gh 调用失败: {api_path} -> {out.stderr.strip()}", file=sys.stderr)
        return []
    try:
        return json.loads(out.stdout)
    except json.JSONDecodeError:
        return []


def human_size(n):
    n = int(n)
    for unit in ["B", "KB", "MB", "GB"]:
        if n < 1024:
            return f"{n:.0f} {unit}" if unit == "B" else f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} TB"


def main():
    releases = gh(f"repos/{REPO}/releases?per_page=100")
    # 过滤掉草稿与预发布（保留正式版本，按时间倒序）
    releases = [r for r in releases if not r.get("draft") and not r.get("prerelease")]
    releases.sort(key=lambda r: r.get("published_at", ""), reverse=True)

    out_releases = []
    for r in releases:
        assets = []
        for a in r.get("assets", []):
            # 只列 APK / 安装包类资产
            if a["name"].lower().endswith((".apk", ".aab", ".zip", ".apks")):
                assets.append({
                    "name": a["name"],
                    "size": a["size"],
                    "sizeText": human_size(a["size"]),
                    "url": a["browser_download_url"],
                })
        if not assets:
            continue
        out_releases.append({
            "tag": r.get("tag_name", ""),
            "name": r.get("name") or r.get("tag_name", ""),
            "date": (r.get("published_at") or "")[:10],
            "notes": (r.get("body") or "").strip()[:800],
            "assets": assets,
        })

    data = {
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "repos": META,
        "primary": "moxsh-terminal",
        "releases": out_releases,
        "latest": out_releases[0]["tag"] if out_releases else "",
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[OK] 写入 {OUT}: {len(out_releases)} 个版本, 最新 {data['latest']}")


if __name__ == "__main__":
    main()

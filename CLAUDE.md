# MDViewerHB

Markdown Viewer & Editor — iPhone PWA

## Quick Start

```bash
# ローカルで起動して確認
python -m http.server 8000
# または任意の静的ファイルサーバー
```

## Stack

- **UI**: Vanilla HTML + CSS + ESM JavaScript (no bundler)
- **Editor**: CodeMirror 6
- **Parser**: markdown-it + markdown-it-task-lists
- **Syntax HL**: highlight.js
- **Hosting**: GitHub Pages (推奨)

## Project Files

```
MDViewerHB/
├── index.html       # App shell + PWA meta tags
├── style.css        # CSS (Dark/Light, Safe Area, responsive)
├── main.js          # App logic (ESM imports from esm.sh)
├── manifest.json    # PWA manifest
├── sw.js            # Service Worker (offline support)
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

## iPhone への インストール方法

1. GitHub Pages で公開する (URLを取得)
2. iPhone の Safari でそのURLにアクセス
3. 共有ボタン (⬆️) → **「ホーム画面に追加」**
4. ホーム画面からアプリとして起動

## Deploy (GitHub Pages)

```bash
git add .
git commit -m "feat: initial MDViewerHB implementation"
git push origin main
# → Settings > Pages > Branch: main, / (root) で公開
```

## Features

- リアルタイム分割プレビュー (PC) / タブ切替 (iPhone)
- ダーク/ライトモード
- ツールバー (太字, 斜体, 見出し, リスト, コード, リンクなど)
- .md ファイルの保存・書き出し
- HTML エクスポート
- LocalStorage 自動保存
- オフライン動作 (Service Worker)
- Safe Area 対応 (ノッチ・ホームバー)

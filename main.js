/* ==============================================================
   MDViewerHB — main.js
   Uses: CodeMirror 5 (global), marked.js (global), hljs (global)
   All loaded via CDN <script> tags — no ESM, no bundler needed.
   ============================================================== */

/* ── Default content ──────────────────────────────────────── */
const DEFAULT_CONTENT = `# MDViewerHB へようこそ 👋

このアプリはMarkdown形式での**閲覧**と**編集**に対応しています。
iPhoneのホーム画面に追加することで、アプリとして使えます。

## 対応機能

- **リアルタイムプレビュー**
- **シンタックスハイライト** (コードブロック)
- **ダーク / ライトモード** 切替
- **ローカル自動保存** (LocalStorage)
- **ファイルの開く / 保存 / HTMLエクスポート**

## Markdown サンプル

### コードブロック

\`\`\`javascript
const greet = (name) => \`Hello, \${name}!\`;
console.log(greet('MDViewerHB'));
\`\`\`

### テーブル

| 機能         | 対応   |
| :----------- | :----: |
| テーブル     | ✅     |
| タスクリスト | ✅     |
| コードHL     | ✅     |

### タスクリスト

- [x] Markdown エディタ
- [x] リアルタイムプレビュー
- [ ] Mermaid 対応 (予定)

> 📱 iPhoneで「共有 → ホーム画面に追加」でアプリとして起動できます！
`;

/* ── App state ────────────────────────────────────────────── */
const state = {
    theme: localStorage.getItem('mdvhb-theme') || 'dark',
    content: localStorage.getItem('mdvhb-content') ?? DEFAULT_CONTENT,
    menuOpen: false,
};

/* ── DOM refs ─────────────────────────────────────────────── */
const $body         = document.body;
const $themeIcon    = document.getElementById('theme-icon');
const $previewEl    = document.getElementById('preview-content');
const $charCount    = document.getElementById('char-count');
const $wordCount    = document.getElementById('word-count');
const $editorPane   = document.getElementById('editor-pane');
const $previewPane  = document.getElementById('preview-pane');
const $tabEdit      = document.getElementById('tab-edit');
const $tabPreview   = document.getElementById('tab-preview');
const $resizer      = document.getElementById('resizer');
const $mainArea     = document.getElementById('main-area');
const $menuDropdown = document.getElementById('menu-dropdown');
const $fileInput    = document.getElementById('file-input');
const $hljsStyle    = document.getElementById('hljs-style');

/* ── marked.js setup ─────────────────────────────────────── */
marked.setOptions({
    breaks: true,
    gfm: true,
    highlight: function (code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
        }
        return hljs.highlightAuto(code).value;
    }
});

/* ── CodeMirror 5 setup ──────────────────────────────────── */
const cm = CodeMirror.fromTextArea(document.getElementById('editor-textarea'), {
    mode: 'markdown',
    theme: 'one-dark',
    lineNumbers: true,
    lineWrapping: true,
    autofocus: true,
    indentWithTabs: false,
    tabSize: 2,
    extraKeys: {
        'Ctrl-S': () => saveFile(),
        'Cmd-S':  () => saveFile(),
    },
});

cm.setValue(state.content);

cm.on('change', () => {
    const content = cm.getValue();
    renderPreview(content);
    updateStats(content);
    localStorage.setItem('mdvhb-content', content);
});

/* ── Preview rendering ────────────────────────────────────── */
function renderPreview(content) {
    $previewEl.innerHTML = marked.parse(content);
    // Re-run hljs on any un-highlighted code blocks
    $previewEl.querySelectorAll('pre code').forEach(el => hljs.highlightElement(el));
}

function updateStats(content) {
    $charCount.textContent = content.length + ' 文字';
    $wordCount.textContent = (content.trim() ? content.trim().split(/\s+/).length : 0) + ' 単語';
}

/* ── Theme ───────────────────────────────────────────────── */
const MOON_SVG = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
const SUN_SVG  = `<circle cx="12" cy="12" r="5"></circle>
<line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line>
<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
<line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line>
<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`;

function applyTheme(theme) {
    $body.setAttribute('data-theme', theme);
    cm.setOption('theme', theme === 'dark' ? 'one-dark' : 'default');
    $themeIcon.innerHTML = theme === 'dark' ? MOON_SVG : SUN_SVG;
    if ($hljsStyle) {
        $hljsStyle.href = theme === 'dark'
            ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css'
            : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
    }
    localStorage.setItem('mdvhb-theme', theme);
    renderPreview(cm.getValue());
}

document.getElementById('theme-toggle').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(state.theme);
    closeMenu();
});

/* ── Tabs (mobile) ───────────────────────────────────────── */
$tabEdit.addEventListener('click', () => {
    $editorPane.classList.add('active');
    $previewPane.classList.remove('active');
    $tabEdit.classList.add('active');
    $tabPreview.classList.remove('active');
    setTimeout(() => cm.refresh(), 10);
});

$tabPreview.addEventListener('click', () => {
    $previewPane.classList.add('active');
    $editorPane.classList.remove('active');
    $tabPreview.classList.add('active');
    $tabEdit.classList.remove('active');
});

/* ── Desktop resizer ─────────────────────────────────────── */
let resizing = false;

$resizer.addEventListener('mousedown', () => {
    resizing = true;
    $resizer.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
});

document.addEventListener('mousemove', (e) => {
    if (!resizing) return;
    const rect = $mainArea.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    if (pct > 15 && pct < 85) {
        $editorPane.style.flex = `0 0 ${pct}%`;
        $previewPane.style.flex = `0 0 ${100 - pct}%`;
    }
});

document.addEventListener('mouseup', () => {
    if (!resizing) return;
    resizing = false;
    $resizer.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    cm.refresh();
});

/* ── Toolbar ─────────────────────────────────────────────── */
document.querySelectorAll('.tool-btn[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
        applyFormat(btn.dataset.action);
        cm.focus();
    });
});

function applyFormat(action) {
    const sel  = cm.getSelection();
    const cur  = cm.getCursor();
    const line = cm.getLine(cur.line);

    const wrapMap = {
        bold:          { w: '**', fallback: '太字テキスト' },
        italic:        { w: '*',  fallback: '斜体テキスト' },
        strikethrough: { w: '~~', fallback: 'テキスト' },
    };

    const prefixMap = {
        h1:    '# ',
        h2:    '## ',
        h3:    '### ',
        ul:    '- ',
        ol:    '1. ',
        task:  '- [ ] ',
        quote: '> ',
    };

    if (wrapMap[action]) {
        const { w, fallback } = wrapMap[action];
        const text = sel || fallback;
        cm.replaceSelection(`${w}${text}${w}`);
    } else if (prefixMap[action]) {
        const p = prefixMap[action];
        if (line.startsWith(p)) {
            cm.replaceRange('', { line: cur.line, ch: 0 }, { line: cur.line, ch: p.length });
        } else {
            cm.replaceRange(p, { line: cur.line, ch: 0 });
        }
    } else if (action === 'code') {
        const code = sel || 'code';
        cm.replaceSelection(`\`\`\`\n${code}\n\`\`\``);
    } else if (action === 'link') {
        const text = sel || 'リンクテキスト';
        cm.replaceSelection(`[${text}](https://)`);
    } else if (action === 'hr') {
        cm.replaceSelection('\n---\n');
    }
}

/* ── File operations ─────────────────────────────────────── */
function saveFile() {
    const content = cm.getValue();
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'document.md' });
    a.click();
    URL.revokeObjectURL(url);
}

function exportHtml() {
    const html = `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8"><title>Exported</title>
<style>body{font-family:-apple-system,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.7}
pre{background:#f6f8fa;padding:16px;border-radius:8px;overflow:auto}
code{font-family:monospace}blockquote{border-left:4px solid #58a6ff;padding-left:1em;color:#666}
table{border-collapse:collapse;width:100%}th,td{padding:8px 12px;border:1px solid #d0d7de}img{max-width:100%}</style>
</head><body>${$previewEl.innerHTML}</body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'document.html' });
    a.click();
    URL.revokeObjectURL(url);
}

document.getElementById('save-btn').addEventListener('click', saveFile);

/* ── Dropdown menu ───────────────────────────────────────── */
function closeMenu() {
    state.menuOpen = false;
    $menuDropdown.hidden = true;
}

document.getElementById('menu-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    state.menuOpen = !state.menuOpen;
    $menuDropdown.hidden = !state.menuOpen;
});

document.addEventListener('click', closeMenu);
$menuDropdown.addEventListener('click', (e) => e.stopPropagation());

document.getElementById('menu-new').addEventListener('click', () => {
    closeMenu();
    if (confirm('現在の内容を破棄して新規作成しますか？')) {
        cm.setValue('# ');
        cm.focus();
    }
});

document.getElementById('menu-open').addEventListener('click', () => {
    closeMenu();
    $fileInput.click();
});

document.getElementById('menu-save-txt').addEventListener('click', () => {
    closeMenu();
    saveFile();
});

document.getElementById('menu-export').addEventListener('click', () => {
    closeMenu();
    exportHtml();
});

$fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        cm.setValue(evt.target.result);
        cm.focus();
    };
    reader.readAsText(file);
    e.target.value = '';
});

/* ── Keyboard shortcut ───────────────────────────────────── */
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveFile();
    }
});

/* ── Init ────────────────────────────────────────────────── */
applyTheme(state.theme);
renderPreview(state.content);
updateStats(state.content);
$editorPane.classList.add('active');
// Force CodeMirror layout after browser has painted
setTimeout(() => cm.refresh(), 100);

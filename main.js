import { EditorView, keymap, drawSelection, highlightActiveLine, lineNumbers } from 'https://esm.sh/@codemirror/view@6.26.3';
import { EditorState, Compartment } from 'https://esm.sh/@codemirror/state@6.4.1';
import { markdown, markdownLanguage } from 'https://esm.sh/@codemirror/lang-markdown@6.2.5';
import { languages } from 'https://esm.sh/@codemirror/language-data@6.5.1';
import { oneDark } from 'https://esm.sh/@codemirror/theme-one-dark@6.1.2';
import { defaultKeymap, history, historyKeymap } from 'https://esm.sh/@codemirror/commands@6.6.0';
import { indentOnInput, bracketMatching } from 'https://esm.sh/@codemirror/language@6.10.1';
import MarkdownIt from 'https://esm.sh/markdown-it@14.1.0';
import mdTaskLists from 'https://esm.sh/markdown-it-task-lists@2.1.1';
import hljs from 'https://esm.sh/highlight.js@11.9.0';

/* ============================================================
   App State
   ============================================================ */
const DEFAULT_CONTENT = `# MDViewerHB へようこそ 👋

このアプリはマークダウン形式での**閲覧**と**編集**に対応しています。
iPhoneのホーム画面に追加することで、アプリとして使えます。

## 対応機能

- **リアルタイムプレビュー**
- **シンタックスハイライト** (コードブロック)
- **ダーク / ライトモード**切替
- **ローカル自動保存** (LocalStorage)
- **ファイル書き出し** (.md)

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

> 📱 iPhoneで「共有 → ホーム画面に追加」でアプリとして使えます！
`;

const appState = {
    theme: localStorage.getItem('mdvhb-theme') || 'dark',
    content: localStorage.getItem('mdvhb-content') ?? DEFAULT_CONTENT,
    activeTab: 'edit',  // 'edit' | 'preview'
    menuOpen: false,
};

/* ============================================================
   Markdown Parser (markdown-it)
   ============================================================ */
const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    highlight(str, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`;
            } catch {}
        }
        return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
    }
}).use(mdTaskLists, { enabled: true, label: true });

/* ============================================================
   DOM refs
   ============================================================ */
const $body          = document.body;
const $editorEl      = document.getElementById('editor-container');
const $previewEl     = document.getElementById('preview-content');
const $charCount     = document.getElementById('char-count');
const $wordCount     = document.getElementById('word-count');
const $themeToggle   = document.getElementById('theme-toggle');
const $themeIcon     = document.getElementById('theme-icon');
const $tabEdit       = document.getElementById('tab-edit');
const $tabPreview    = document.getElementById('tab-preview');
const $editorPane    = document.getElementById('editor-pane');
const $previewPane   = document.getElementById('preview-pane');
const $resizer       = document.getElementById('resizer');
const $mainArea      = document.getElementById('main-area');
const $menuBtn       = document.getElementById('menu-btn');
const $menuDropdown  = document.getElementById('menu-dropdown');
const $menuNew       = document.getElementById('menu-new');
const $menuOpen      = document.getElementById('menu-open');
const $menuSaveTxt   = document.getElementById('menu-save-txt');
const $menuExport    = document.getElementById('menu-export');
const $fileInput     = document.getElementById('file-input');
const $saveBtn       = document.getElementById('save-btn');

/* ============================================================
   CodeMirror 6 setup
   ============================================================ */
const themeCompartment = new Compartment();

const lightTheme = EditorView.theme({
    '&': { background: '#f6f8fa', color: '#1f2328' },
    '.cm-gutters': { background: '#f0f2f4', borderRight: '1px solid #d0d7de' },
    '.cm-lineNumbers .cm-gutterElement': { color: '#8b949e' },
    '.cm-activeLine': { background: 'rgba(9,105,218,0.06)' },
    '.cm-selectionBackground': { background: 'rgba(9,105,218,0.15) !important' },
    '.cm-cursor': { borderLeftColor: '#0969da' },
});

const baseExtensions = [
    lineNumbers(),
    history(),
    drawSelection(),
    indentOnInput(),
    bracketMatching(),
    highlightActiveLine(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    EditorView.lineWrapping,
    EditorView.updateListener.of(update => {
        if (update.docChanged) onEditorChange(update.state.doc.toString());
    }),
    themeCompartment.of(oneDark),
];

const editorView = new EditorView({
    state: EditorState.create({
        doc: appState.content,
        extensions: baseExtensions,
    }),
    parent: $editorEl,
});

/* ============================================================
   Rendering helpers
   ============================================================ */
function renderPreview(content) {
    $previewEl.innerHTML = md.render(content);
}

function updateStats(content) {
    const chars = content.length;
    const words = content.trim() === '' ? 0 : content.trim().split(/\s+/).length;
    $charCount.textContent = `${chars} 文字`;
    $wordCount.textContent = `${words} 単語`;
}

function onEditorChange(content) {
    renderPreview(content);
    updateStats(content);
    localStorage.setItem('mdvhb-content', content);
}

/* ============================================================
   Theme management
   ============================================================ */
const MOON_ICON = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
const SUN_ICON  = `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`;

function applyTheme(theme) {
    $body.setAttribute('data-theme', theme);
    $themeIcon.innerHTML = theme === 'dark' ? MOON_ICON : SUN_ICON;
    editorView.dispatch({
        effects: themeCompartment.reconfigure(theme === 'dark' ? oneDark : lightTheme)
    });
    localStorage.setItem('mdvhb-theme', theme);
}

$themeToggle.addEventListener('click', () => {
    appState.theme = appState.theme === 'dark' ? 'light' : 'dark';
    applyTheme(appState.theme);
    closeMenu();
});

/* ============================================================
   Tab Bar (Mobile)
   ============================================================ */
function setTab(tab) {
    appState.activeTab = tab;
    if (tab === 'edit') {
        $editorPane.classList.add('active');
        $previewPane.classList.remove('active');
        $tabEdit.classList.add('active');
        $tabPreview.classList.remove('active');
        setTimeout(() => editorView.focus(), 50);
    } else {
        $previewPane.classList.add('active');
        $editorPane.classList.remove('active');
        $tabPreview.classList.add('active');
        $tabEdit.classList.remove('active');
    }
}

$tabEdit.addEventListener('click', () => setTab('edit'));
$tabPreview.addEventListener('click', () => setTab('preview'));

/* ============================================================
   Desktop Resizer
   ============================================================ */
let isResizing = false;

$resizer.addEventListener('mousedown', () => {
    isResizing = true;
    $resizer.classList.add('dragging');
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
});

function onDrag(e) {
    if (!isResizing) return;
    const rect = $mainArea.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    if (pct > 15 && pct < 85) {
        $editorPane.style.flex = `0 0 ${pct}%`;
        $previewPane.style.flex = `0 0 ${100 - pct}%`;
    }
}

function stopDrag() {
    isResizing = false;
    $resizer.classList.remove('dragging');
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
}

/* ============================================================
   Toolbar formatting actions
   ============================================================ */
document.querySelectorAll('.tool-btn[data-action]').forEach(btn => {
    btn.addEventListener('click', () => applyFormat(btn.dataset.action));
});

function applyFormat(action) {
    const sel = editorView.state.selection.main;
    const selected = editorView.state.doc.sliceString(sel.from, sel.to);

    const formats = {
        bold:          { wrap: '**', cursor: 2 },
        italic:        { wrap: '*',  cursor: 1 },
        strikethrough: { wrap: '~~', cursor: 2 },
    };

    const prefixes = {
        h1:    '# ',
        h2:    '## ',
        h3:    '### ',
        ul:    '- ',
        ol:    '1. ',
        task:  '- [ ] ',
        quote: '> ',
    };

    if (formats[action]) {
        const { wrap, cursor } = formats[action];
        const ins = `${wrap}${selected}${wrap}`;
        editorView.dispatch({
            changes: { from: sel.from, to: sel.to, insert: ins },
            selection: { anchor: selected ? sel.from + ins.length : sel.from + cursor }
        });
    } else if (prefixes[action]) {
        const line = editorView.state.doc.lineAt(sel.from);
        editorView.dispatch({
            changes: { from: line.from, to: line.from, insert: prefixes[action] },
        });
    } else if (action === 'code') {
        const ins = `\`\`\`\n${selected}\n\`\`\``;
        editorView.dispatch({
            changes: { from: sel.from, to: sel.to, insert: ins },
            selection: { anchor: sel.from + 4 }
        });
    } else if (action === 'link') {
        const ins = `[${selected || 'リンクテキスト'}](https://)`;
        editorView.dispatch({
            changes: { from: sel.from, to: sel.to, insert: ins },
        });
    }

    editorView.focus();
}

/* ============================================================
   Keyboard shortcut
   ============================================================ */
document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveFile();
    }
});

/* ============================================================
   File operations
   ============================================================ */
function saveFile() {
    const content = editorView.state.doc.toString();
    const blob = new Blob([content], { type: 'text/markdown; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    a.click();
    URL.revokeObjectURL(url);
}

function newDocument() {
    if (confirm('現在の内容を破棄して新規作成しますか？')) {
        editorView.dispatch({
            changes: { from: 0, to: editorView.state.doc.length, insert: '# ' }
        });
        editorView.focus();
    }
}

function exportHtml() {
    const rendered = $previewEl.innerHTML;
    const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>Exported Markdown</title>
<style>
  body { font-family: -apple-system, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.7; }
  pre { background: #f6f8fa; padding: 16px; border-radius: 8px; overflow: auto; }
  code { font-family: 'JetBrains Mono', monospace; }
  blockquote { border-left: 4px solid #58a6ff; padding-left: 1em; color: #666; }
  table { border-collapse: collapse; width: 100%; }
  th, td { padding: 8px 12px; border: 1px solid #d0d7de; }
  img { max-width: 100%; }
</style>
</head>
<body>${rendered}</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.html';
    a.click();
    URL.revokeObjectURL(url);
}

$saveBtn.addEventListener('click', saveFile);

/* ============================================================
   Dropdown menu
   ============================================================ */
function closeMenu() {
    appState.menuOpen = false;
    $menuDropdown.hidden = true;
}

$menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    appState.menuOpen = !appState.menuOpen;
    $menuDropdown.hidden = !appState.menuOpen;
});

document.addEventListener('click', () => closeMenu());
$menuDropdown.addEventListener('click', e => e.stopPropagation());

$menuNew.addEventListener('click', () => { closeMenu(); newDocument(); });
$menuOpen.addEventListener('click', () => { closeMenu(); $fileInput.click(); });
$menuSaveTxt.addEventListener('click', () => { closeMenu(); saveFile(); });
$menuExport.addEventListener('click', () => { closeMenu(); exportHtml(); });

$fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        const text = evt.target.result;
        editorView.dispatch({
            changes: { from: 0, to: editorView.state.doc.length, insert: text }
        });
        editorView.focus();
    };
    reader.readAsText(file);
    e.target.value = '';
});

/* ============================================================
   Initialization
   ============================================================ */
applyTheme(appState.theme);
renderPreview(appState.content);
updateStats(appState.content);

// Set initial tab active (editor)
$editorPane.classList.add('active');

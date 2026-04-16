/* ==============================================================
   MDViewerHB — main.js
   CDN globals: CodeMirror 5, marked, hljs
   Loaded at bottom of <body> so all CDN scripts are ready.
   ============================================================== */

/* ── Entry point ────────────────────────────────────────────── */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

function initApp() {

/* ── Storage keys ────────────────────────────────────────────── */
const STORAGE_THEME   = 'mdvhb-theme';
const STORAGE_CONTENT = 'mdvhb-content';

/* ── App state ──────────────────────────────────────────────── */
let appTheme = localStorage.getItem(STORAGE_THEME) || 'dark';
let menuOpen = false;

/* ── DOM refs ────────────────────────────────────────────────── */
const body          = document.body;
const themeIcon     = document.getElementById('theme-icon');
const previewEl     = document.getElementById('preview-content');
const charCount     = document.getElementById('char-count');
const wordCount     = document.getElementById('word-count');
const editorPane    = document.getElementById('editor-pane');
const previewPane   = document.getElementById('preview-pane');
const tabEdit       = document.getElementById('tab-edit');
const tabPreview    = document.getElementById('tab-preview');
const resizer       = document.getElementById('resizer');
const mainArea      = document.getElementById('main-area');
const menuDropdown  = document.getElementById('menu-dropdown');
const fileInput     = document.getElementById('file-input');
const hljsStyle     = document.getElementById('hljs-style');
const themeToggle   = document.getElementById('theme-toggle');
const saveBtn       = document.getElementById('save-btn');
const menuBtn       = document.getElementById('menu-btn');
const menuNewBtn    = document.getElementById('menu-new');
const menuOpenBtn   = document.getElementById('menu-open');
const menuSaveBtn   = document.getElementById('menu-save-txt');
const menuExportBtn = document.getElementById('menu-export');
const urlInput      = document.getElementById('url-input');
const urlLoadBtn    = document.getElementById('url-load-btn');
const urlBar        = document.getElementById('url-bar');
const urlStatus     = document.getElementById('url-status');

/* ── marked.js setup ─────────────────────────────────────────── */
marked.setOptions({ breaks: true, gfm: true });

/* ── CodeMirror 5 init ───────────────────────────────────────── */
const cm = CodeMirror.fromTextArea(document.getElementById('editor-textarea'), {
    mode: 'markdown',
    theme: appTheme === 'dark' ? 'dracula' : 'default',
    lineNumbers: true,
    lineWrapping: true,
    autofocus: false,
    indentWithTabs: false,
    tabSize: 2,
});

cm.setValue(localStorage.getItem(STORAGE_CONTENT) || '');

/* ── Rendering ───────────────────────────────────────────────── */
function renderPreview(content) {
    previewEl.innerHTML = marked.parse(content);
    previewEl.querySelectorAll('pre code').forEach(function(el) {
        hljs.highlightElement(el);
    });
}

function updateStats(content) {
    charCount.textContent = content.length + ' 文字';
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    wordCount.textContent = words + ' 単語';
}

let previewTimer;
cm.on('change', function() {
    const content = cm.getValue();
    updateStats(content);
    clearTimeout(previewTimer);
    previewTimer = setTimeout(function() {
        localStorage.setItem(STORAGE_CONTENT, content);
        renderPreview(content);
    }, 150);
});

/* ── URL fetch ───────────────────────────────────────────────── */
/* Supported URL patterns:
   - Google Drive: drive.google.com/file/d/{ID}/view  →  direct download via proxy
   - GitHub raw:   github.com/user/repo/blob/...      →  raw.githubusercontent.com
   - Raw URLs:     any .md URL via CORS proxy
*/
const CORS_PROXY = 'https://corsproxy.io/?url=';

function normalizeUrl(rawUrl) {
    rawUrl = rawUrl.trim();

    // Google Drive: /file/d/{ID}/view or /file/d/{ID}/edit
    const driveMatch = rawUrl.match(/drive\.google\.com\/file\/d\/([^\/\?]+)/);
    if (driveMatch) {
        return CORS_PROXY + encodeURIComponent(
            'https://drive.google.com/uc?export=download&id=' + driveMatch[1]
        );
    }

    // Google Drive uc?id= format (already a download link)
    const driveUcMatch = rawUrl.match(/drive\.google\.com\/uc\?.*[?&]id=([^&]+)/);
    if (driveUcMatch) {
        return CORS_PROXY + encodeURIComponent(
            'https://drive.google.com/uc?export=download&id=' + driveUcMatch[1]
        );
    }

    // GitHub blob → raw
    const ghMatch = rawUrl.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/(.+)$/);
    if (ghMatch) {
        return 'https://raw.githubusercontent.com/' + ghMatch[1] + '/' + ghMatch[2] + '/' + ghMatch[3];
    }

    // GitHub Gist
    if (/gist\.github\.com/.test(rawUrl) && !/\/raw\//.test(rawUrl)) {
        return CORS_PROXY + encodeURIComponent(rawUrl + '/raw');
    }

    // Raw GitHub URLs — no proxy needed
    if (/^https?:\/\/raw\.githubusercontent\.com/.test(rawUrl)) {
        return rawUrl;
    }

    // All other URLs: use CORS proxy
    return CORS_PROXY + encodeURIComponent(rawUrl);
}

function setUrlStatus(msg, isError) {
    if (!urlStatus) return;
    urlStatus.textContent = msg;
    urlStatus.className   = 'url-status' + (isError ? ' url-status--error' : ' url-status--ok');
    if (msg) {
        setTimeout(function() { urlStatus.textContent = ''; urlStatus.className = 'url-status'; }, 4000);
    }
}

function fetchFromUrl(rawUrl) {
    if (!rawUrl || !rawUrl.trim()) return;
    const fetchUrl = normalizeUrl(rawUrl);

    setUrlStatus('読み込み中…', false);
    urlBar.classList.add('loading');

    fetch(fetchUrl)
        .then(function(res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.text();
        })
        .then(function(text) {
            cm.setValue(text);
            cm.focus();
            // Cancel the debounce triggered by setValue — remote content should not be persisted
            clearTimeout(previewTimer);
            renderPreview(text);
            localStorage.removeItem(STORAGE_CONTENT);
            setUrlStatus('✓ 読み込み完了', false);
            urlBar.classList.remove('loading');
        })
        .catch(function(err) {
            setUrlStatus('エラー: ' + err.message + '（ファイルが公開共有されているか確認してください）', true);
            urlBar.classList.remove('loading');
        });
}

/* URL bar events */
if (urlLoadBtn) {
    urlLoadBtn.addEventListener('click', function() { fetchFromUrl(urlInput.value); });
}

if (urlInput) {
    urlInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') fetchFromUrl(urlInput.value);
    });
}

/* ── Theme ───────────────────────────────────────────────────── */
const MOON_SVG = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
const SUN_SVG  = '<circle cx="12" cy="12" r="5"></circle>'
    + '<line x1="12" y1="1" x2="12" y2="3"></line>'
    + '<line x1="12" y1="21" x2="12" y2="23"></line>'
    + '<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>'
    + '<line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>'
    + '<line x1="1" y1="12" x2="3" y2="12"></line>'
    + '<line x1="21" y1="12" x2="23" y2="12"></line>'
    + '<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>'
    + '<line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';

const HLJS_DARK  = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';
const HLJS_LIGHT = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';

function applyTheme(theme) {
    body.setAttribute('data-theme', theme);
    cm.setOption('theme', theme === 'dark' ? 'dracula' : 'default');
    themeIcon.innerHTML = theme === 'dark' ? MOON_SVG : SUN_SVG;
    if (hljsStyle) {
        hljsStyle.href = theme === 'dark' ? HLJS_DARK : HLJS_LIGHT;
    }
    localStorage.setItem(STORAGE_THEME, theme);
    renderPreview(cm.getValue());
}

themeToggle.addEventListener('click', function() {
    appTheme = appTheme === 'dark' ? 'light' : 'dark';
    applyTheme(appTheme);
    closeMenu();
});

/* ── Tabs (mobile) ───────────────────────────────────────────── */
tabEdit.addEventListener('click', function() {
    editorPane.classList.add('active');
    previewPane.classList.remove('active');
    tabEdit.classList.add('active');
    tabPreview.classList.remove('active');
    setTimeout(function() { cm.refresh(); }, 50);
});

tabPreview.addEventListener('click', function() {
    previewPane.classList.add('active');
    editorPane.classList.remove('active');
    tabPreview.classList.add('active');
    tabEdit.classList.remove('active');
});

/* ── Desktop resizer ─────────────────────────────────────────── */
let resizing = false;

resizer.addEventListener('mousedown', function() {
    resizing = true;
    resizer.classList.add('dragging');
    body.style.cursor = 'col-resize';
    body.style.userSelect = 'none';
});

document.addEventListener('mousemove', function(e) {
    if (!resizing) return;
    const rect = mainArea.getBoundingClientRect();
    const pct  = (e.clientX - rect.left) / rect.width * 100;
    if (pct > 15 && pct < 85) {
        editorPane.style.flex  = '0 0 ' + pct + '%';
        previewPane.style.flex = '0 0 ' + (100 - pct) + '%';
    }
});

document.addEventListener('mouseup', function() {
    if (!resizing) return;
    resizing = false;
    resizer.classList.remove('dragging');
    body.style.cursor = '';
    body.style.userSelect = '';
    cm.refresh();
});

/* ── Toolbar ─────────────────────────────────────────────────── */
const WRAP_MAP = {
    bold:          { w: '**', fallback: '太字テキスト' },
    italic:        { w: '*',  fallback: '斜体テキスト' },
    strikethrough: { w: '~~', fallback: 'テキスト' }
};
const PREFIX_MAP = {
    h1:    '# ',
    h2:    '## ',
    h3:    '### ',
    ul:    '- ',
    ol:    '1. ',
    task:  '- [ ] ',
    quote: '> '
};

document.querySelectorAll('.tool-btn[data-action]').forEach(function(btn) {
    btn.addEventListener('click', function() {
        applyFormat(btn.getAttribute('data-action'));
        cm.focus();
    });
});

function applyFormat(action) {
    const sel  = cm.getSelection();
    const cur  = cm.getCursor();
    const line = cm.getLine(cur.line) || '';

    if (WRAP_MAP[action]) {
        const w = WRAP_MAP[action].w;
        if (sel && sel.startsWith(w) && sel.endsWith(w) && sel.length > w.length * 2) {
            cm.replaceSelection(sel.slice(w.length, -w.length));
        } else {
            cm.replaceSelection(w + (sel || WRAP_MAP[action].fallback) + w);
        }
    } else if (PREFIX_MAP[action]) {
        const p = PREFIX_MAP[action];
        if (line.indexOf(p) === 0) {
            cm.replaceRange('', { line: cur.line, ch: 0 }, { line: cur.line, ch: p.length });
        } else {
            cm.replaceRange(p, { line: cur.line, ch: 0 });
        }
    } else if (action === 'code') {
        cm.replaceSelection('```\n' + (sel || 'code') + '\n```');
    } else if (action === 'link') {
        cm.replaceSelection('[' + (sel || 'リンクテキスト') + '](https://)');
    } else if (action === 'hr') {
        cm.replaceSelection('\n---\n');
    }
}

/* ── File operations ─────────────────────────────────────────── */
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function saveFile() {
    downloadBlob(
        new Blob([cm.getValue()], { type: 'text/markdown;charset=utf-8' }),
        'document.md'
    );
}

function exportHtml() {
    const html = '<!DOCTYPE html>\n<html lang="ja"><head><meta charset="UTF-8"><title>Exported</title>'
        + '<style>body{font-family:-apple-system,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.7}'
        + 'pre{background:#f6f8fa;padding:16px;border-radius:8px;overflow:auto}'
        + 'blockquote{border-left:4px solid #58a6ff;padding-left:1em;color:#666}'
        + 'table{border-collapse:collapse;width:100%}th,td{padding:8px 12px;border:1px solid #d0d7de}'
        + 'img{max-width:100%}</style></head><body>'
        + previewEl.innerHTML + '</body></html>';
    downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), 'document.html');
}

saveBtn.addEventListener('click', saveFile);

/* ── Dropdown menu ───────────────────────────────────────────── */
function closeMenu() {
    menuOpen = false;
    menuDropdown.hidden = true;
}

menuBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    menuOpen = !menuOpen;
    menuDropdown.hidden = !menuOpen;
});

document.addEventListener('click', closeMenu);
menuDropdown.addEventListener('click', function(e) { e.stopPropagation(); });

menuNewBtn.addEventListener('click', function() {
    closeMenu();
    if (confirm('現在の内容を破棄して新規作成しますか？')) {
        cm.setValue('# ');
        cm.focus();
    }
});

menuOpenBtn.addEventListener('click', function() {
    closeMenu();
    fileInput.click();
});

menuSaveBtn.addEventListener('click', function() {
    closeMenu();
    saveFile();
});

menuExportBtn.addEventListener('click', function() {
    closeMenu();
    exportHtml();
});

fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        cm.setValue(evt.target.result);
        cm.focus();
    };
    reader.onerror = function() {
        alert('ファイルの読み込みに失敗しました');
    };
    reader.readAsText(file);
    e.target.value = '';
});

/* ── Keyboard shortcuts ──────────────────────────────────────── */
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveFile();
    }
});

/* ── Init ────────────────────────────────────────────────────── */
applyTheme(appTheme);
updateStats(cm.getValue());
editorPane.classList.add('active');
setTimeout(function() { cm.refresh(); }, 300);

} /* end initApp() */

/* ── Service Worker ──────────────────────────────────────────── */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('sw.js').catch(function(e) {
            console.warn('SW registration failed', e);
        });
    });
}

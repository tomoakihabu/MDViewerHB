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

/* ── App state ──────────────────────────────────────────────── */
var appTheme   = localStorage.getItem('mdvhb-theme') || 'dark';
var appContent = localStorage.getItem('mdvhb-content') || '';
var menuOpen   = false;

/* ── DOM refs ────────────────────────────────────────────────── */
var body         = document.body;
var themeIcon    = document.getElementById('theme-icon');
var previewEl    = document.getElementById('preview-content');
var charCount    = document.getElementById('char-count');
var wordCount    = document.getElementById('word-count');
var editorPane   = document.getElementById('editor-pane');
var previewPane  = document.getElementById('preview-pane');
var tabEdit      = document.getElementById('tab-edit');
var tabPreview   = document.getElementById('tab-preview');
var resizer      = document.getElementById('resizer');
var mainArea     = document.getElementById('main-area');
var menuDropdown  = document.getElementById('menu-dropdown');
var fileInput     = document.getElementById('file-input');
var hljsStyle     = document.getElementById('hljs-style');
var themeToggle   = document.getElementById('theme-toggle');
var saveBtn       = document.getElementById('save-btn');
var menuBtn       = document.getElementById('menu-btn');
var menuNewBtn    = document.getElementById('menu-new');
var menuOpenBtn   = document.getElementById('menu-open');
var menuSaveBtn   = document.getElementById('menu-save-txt');
var menuExportBtn = document.getElementById('menu-export');
var urlInput      = document.getElementById('url-input');
var urlLoadBtn    = document.getElementById('url-load-btn');
var urlBar        = document.getElementById('url-bar');
var urlStatus     = document.getElementById('url-status');

/* ── marked.js setup ─────────────────────────────────────────── */
marked.setOptions({ breaks: true, gfm: true });

/* ── CodeMirror 5 init ───────────────────────────────────────── */
var cm = CodeMirror.fromTextArea(document.getElementById('editor-textarea'), {
    mode: 'markdown',
    theme: appTheme === 'dark' ? 'onedark' : 'default',
    lineNumbers: true,
    lineWrapping: true,
    autofocus: false,
    indentWithTabs: false,
    tabSize: 2,
    extraKeys: {
        'Ctrl-S': function() { saveFile(); },
        'Cmd-S':  function() { saveFile(); }
    }
});

cm.setValue(appContent);

cm.on('change', function() {
    var content = cm.getValue();
    renderPreview(content);
    updateStats(content);
    localStorage.setItem('mdvhb-content', content);
});

/* Force CodeMirror to recalculate layout */
setTimeout(function() { cm.refresh(); }, 200);

/* ── Rendering ───────────────────────────────────────────────── */
function renderPreview(content) {
    previewEl.innerHTML = marked.parse(content);
    previewEl.querySelectorAll('pre code').forEach(function(el) {
        hljs.highlightElement(el);
    });
}

function updateStats(content) {
    charCount.textContent = content.length + ' 文字';
    var words = content.trim() ? content.trim().split(/\s+/).length : 0;
    wordCount.textContent = words + ' 単語';
}

/* ── URL fetch ───────────────────────────────────────────────── */
/* Supported URL patterns:
   - Google Drive: drive.google.com/file/d/{ID}/view  →  direct download via proxy
   - GitHub raw:   github.com/user/repo/blob/...      →  raw.githubusercontent.com
   - Raw URLs:     any .md URL via CORS proxy
*/
var CORS_PROXY = 'https://corsproxy.io/?url=';

function normalizeUrl(rawUrl) {
    rawUrl = rawUrl.trim();

    // Google Drive: /file/d/{ID}/view or /file/d/{ID}/edit or ?id={ID}
    var driveMatch = rawUrl.match(/drive\.google\.com\/file\/d\/([^\/\?]+)/);
    if (driveMatch) {
        return CORS_PROXY + encodeURIComponent(
            'https://drive.google.com/uc?export=download&id=' + driveMatch[1]
        );
    }

    // Google Drive uc?id= format (already a download link)
    var driveUcMatch = rawUrl.match(/drive\.google\.com\/uc\?.*[?&]id=([^&]+)/);
    if (driveUcMatch) {
        return CORS_PROXY + encodeURIComponent(
            'https://drive.google.com/uc?export=download&id=' + driveUcMatch[1]
        );
    }

    // GitHub blob → raw
    var ghMatch = rawUrl.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/(.+)$/);
    if (ghMatch) {
        return 'https://raw.githubusercontent.com/' + ghMatch[1] + '/' + ghMatch[2] + '/' + ghMatch[3];
    }

    // GitHub Gist
    if (/gist\.github\.com/.test(rawUrl) && !/\/raw\//.test(rawUrl)) {
        return CORS_PROXY + encodeURIComponent(rawUrl + '/raw');
    }

    // Already a raw URL — add CORS proxy for non-raw external URLs
    if (/^https?:\/\/raw\.githubusercontent\.com/.test(rawUrl)) {
        return rawUrl; // no proxy needed
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
    var fetchUrl = normalizeUrl(rawUrl);

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
            setUrlStatus('✓ 読み込み完了', false);
            urlBar.classList.remove('loading');
            localStorage.removeItem('mdvhb-content'); // don't persist remote content
        })
        .catch(function(err) {
            setUrlStatus('エラー: ' + err.message + '（ファイルが公開共有されているか確認してください）', true);
            urlBar.classList.remove('loading');
        });
}

/* URL bar events */
if (urlLoadBtn) {
    urlLoadBtn.addEventListener('click', function() {
        fetchFromUrl(urlInput.value);
    });
}

if (urlInput) {
    urlInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') fetchFromUrl(urlInput.value);
    });
}

/* ── Theme ───────────────────────────────────────────────────── */
var MOON_SVG = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
var SUN_SVG  = '<circle cx="12" cy="12" r="5"></circle>'
    + '<line x1="12" y1="1" x2="12" y2="3"></line>'
    + '<line x1="12" y1="21" x2="12" y2="23"></line>'
    + '<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>'
    + '<line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>'
    + '<line x1="1" y1="12" x2="3" y2="12"></line>'
    + '<line x1="21" y1="12" x2="23" y2="12"></line>'
    + '<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>'
    + '<line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';

function applyTheme(theme) {
    body.setAttribute('data-theme', theme);
    cm.setOption('theme', theme === 'dark' ? 'onedark' : 'default');
    themeIcon.innerHTML = theme === 'dark' ? MOON_SVG : SUN_SVG;
    if (hljsStyle) {
        hljsStyle.href = theme === 'dark'
            ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css'
            : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
    }
    localStorage.setItem('mdvhb-theme', theme);
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
var resizing = false;

resizer.addEventListener('mousedown', function() {
    resizing = true;
    resizer.classList.add('dragging');
    body.style.cursor = 'col-resize';
    body.style.userSelect = 'none';
});

document.addEventListener('mousemove', function(e) {
    if (!resizing) return;
    var rect = mainArea.getBoundingClientRect();
    var pct  = (e.clientX - rect.left) / rect.width * 100;
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
document.querySelectorAll('.tool-btn[data-action]').forEach(function(btn) {
    btn.addEventListener('click', function() {
        applyFormat(btn.getAttribute('data-action'));
        cm.focus();
    });
});

function applyFormat(action) {
    var sel  = cm.getSelection();
    var cur  = cm.getCursor();
    var line = cm.getLine(cur.line) || '';

    var wrapMap = {
        bold:          { w: '**', fallback: '太字テキスト' },
        italic:        { w: '*',  fallback: '斜体テキスト' },
        strikethrough: { w: '~~', fallback: 'テキスト' }
    };
    var prefixMap = {
        h1:    '# ',
        h2:    '## ',
        h3:    '### ',
        ul:    '- ',
        ol:    '1. ',
        task:  '- [ ] ',
        quote: '> '
    };

    if (wrapMap[action]) {
        var w = wrapMap[action].w;
        var text = sel || wrapMap[action].fallback;
        cm.replaceSelection(w + text + w);
    } else if (prefixMap[action]) {
        var p = prefixMap[action];
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
function saveFile() {
    var content = cm.getValue();
    var blob    = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    var url     = URL.createObjectURL(blob);
    var a       = document.createElement('a');
    a.href      = url;
    a.download  = 'document.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function exportHtml() {
    var html = '<!DOCTYPE html>\n<html lang="ja"><head><meta charset="UTF-8"><title>Exported</title>'
        + '<style>body{font-family:-apple-system,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.7}'
        + 'pre{background:#f6f8fa;padding:16px;border-radius:8px;overflow:auto}'
        + 'blockquote{border-left:4px solid #58a6ff;padding-left:1em;color:#666}'
        + 'table{border-collapse:collapse;width:100%}th,td{padding:8px 12px;border:1px solid #d0d7de}'
        + 'img{max-width:100%}</style></head><body>'
        + previewEl.innerHTML + '</body></html>';
    var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href   = url;
    a.download = 'document.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(evt) {
        cm.setValue(evt.target.result);
        cm.focus();
    };
    reader.readAsText(file);
    e.target.value = '';
});

/* ── Keyboard shortcut ───────────────────────────────────────── */
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveFile();
    }
});

/* ── Init ────────────────────────────────────────────────────── */
applyTheme(appTheme);
renderPreview(appContent);
updateStats(appContent);
editorPane.classList.add('active');
setTimeout(function() { cm.refresh(); }, 300);

} /* end initApp() */

/* ══════════════════════════════════════════
   NoteFlow — App Logic
   ══════════════════════════════════════════ */

// ─── State ───────────────────────────────
const STORAGE_KEY = 'noteflow_notes';
let notes = [];
let activeNoteId = null;
let searchQuery = '';
let activeTag = null;
let saveTimeout = null;

// ─── DOM Elements ────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const els = {
    sidebar: $('#sidebar'),
    noteList: $('#noteList'),
    emptyState: $('#emptyState'),
    searchInput: $('#searchInput'),
    tagsFilter: $('#tagsFilter'),
    toolbar: $('#toolbar'),
    editorContainer: $('#editorContainer'),
    editor: $('#editor'),
    preview: $('#preview'),
    charCount: $('#charCount'),
    noteTitleInput: $('#noteTitleInput'),
    tagInput: $('#tagInput'),
    noteTags: $('#noteTags'),
    welcomeScreen: $('#welcomeScreen'),
    resizeHandle: $('#resizeHandle'),
    editorPane: $('#editorPane'),
    previewPane: $('#previewPane'),
    toastContainer: $('#toastContainer'),
    btnNewNote: $('#btnNewNote'),
    btnWelcomeNew: $('#btnWelcomeNew'),
    btnDelete: $('#btnDelete'),
    btnToggleSidebar: $('#btnToggleSidebar'),
};

// ─── Markdown Parser ─────────────────────
function parseMarkdown(md) {
    if (!md) return '';

    let html = md;

    // Escape HTML (but preserve our markdown constructs)
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Code blocks (fenced)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
        return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
    });

    // Inline code (must come after code blocks)
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headings
    html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

    // Horizontal rule
    html = html.replace(/^---+$/gm, '<hr>');

    // Blockquotes
    html = html.replace(/^&gt;\s+(.+)$/gm, '<blockquote><p>$1</p></blockquote>');

    // Bold + Italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');
    // Strikethrough
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Unordered lists
    html = html.replace(/^[\s]*[-*+]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

    // Ordered lists
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

    // Paragraphs (wrap remaining standalone lines)
    html = html.replace(/^(?!<[a-z/])((?!$).+)$/gm, '<p>$1</p>');

    // Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');

    // Merge consecutive blockquotes
    html = html.replace(/<\/blockquote>\s*<blockquote>/g, '');

    return html;
}

// ─── Note CRUD ───────────────────────────
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadNotes() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        notes = data ? JSON.parse(data) : [];
    } catch {
        notes = [];
    }
}

function saveNotes() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function createNote() {
    const note = {
        id: generateId(),
        title: '',
        content: '',
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
    notes.unshift(note);
    saveNotes();
    selectNote(note.id);
    renderNoteList();
    renderTagsFilter();
    els.noteTitleInput.focus();
    showToast('New note created', 'success');
    return note;
}

function updateNote(id, updates) {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    Object.assign(note, updates, { updatedAt: Date.now() });
    saveNotes();
}

function deleteNote(id) {
    const idx = notes.findIndex(n => n.id === id);
    if (idx === -1) return;
    notes.splice(idx, 1);
    saveNotes();

    if (activeNoteId === id) {
        if (notes.length > 0) {
            selectNote(notes[0].id);
        } else {
            activeNoteId = null;
            showWelcomeScreen();
        }
    }
    renderNoteList();
    renderTagsFilter();
    showToast('Note deleted', 'info');
}

function getActiveNote() {
    return notes.find(n => n.id === activeNoteId);
}

// ─── Selection & Display ─────────────────
function selectNote(id) {
    activeNoteId = id;
    const note = getActiveNote();

    if (!note) {
        showWelcomeScreen();
        return;
    }

    hideWelcomeScreen();
    els.editor.value = note.content;
    els.noteTitleInput.value = note.title;
    updatePreview();
    updateCharCount();
    renderNoteTags();
    renderNoteList();
}

function showWelcomeScreen() {
    els.welcomeScreen.classList.remove('hidden');
    els.toolbar.classList.add('hidden');
    els.editorContainer.classList.add('hidden');
}

function hideWelcomeScreen() {
    els.welcomeScreen.classList.add('hidden');
    els.toolbar.classList.remove('hidden');
    els.editorContainer.classList.remove('hidden');
}

// ─── Rendering ───────────────────────────
function renderNoteList() {
    const filtered = getFilteredNotes();

    // Keep empty state reference, clear the rest
    const items = els.noteList.querySelectorAll('.note-item');
    items.forEach(el => el.remove());

    if (filtered.length === 0) {
        els.emptyState.style.display = 'flex';
        return;
    }

    els.emptyState.style.display = 'none';

    filtered.forEach(note => {
        const div = document.createElement('div');
        div.className = `note-item${note.id === activeNoteId ? ' active' : ''}`;
        div.dataset.id = note.id;

        const title = note.title || 'Untitled Note';
        const preview = note.content
            ? note.content.replace(/[#*`>\[\]]/g, '').slice(0, 60)
            : 'No content';
        const date = formatDate(note.updatedAt);

        div.innerHTML = `
      <div class="note-item-title">${escapeHtml(title)}</div>
      <div class="note-item-preview">${escapeHtml(preview)}</div>
      <div class="note-item-meta">
        <span class="note-item-date">${date}</span>
        <div class="note-item-tags">
          ${note.tags.map(() => '<div class="note-item-tag"></div>').join('')}
        </div>
      </div>
    `;

        div.addEventListener('click', () => selectNote(note.id));
        els.noteList.insertBefore(div, els.emptyState);
    });
}

function renderNoteTags() {
    const note = getActiveNote();
    if (!note) return;

    els.noteTags.innerHTML = note.tags.map(tag => `
    <span class="tag-pill">
      ${escapeHtml(tag)}
      <span class="tag-remove" data-tag="${escapeHtml(tag)}">&times;</span>
    </span>
  `).join('');

    // Attach remove handlers
    els.noteTags.querySelectorAll('.tag-remove').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            const tag = el.dataset.tag;
            removeTagFromNote(tag);
        });
    });
}

function renderTagsFilter() {
    const allTags = new Set();
    notes.forEach(n => n.tags.forEach(t => allTags.add(t)));

    els.tagsFilter.innerHTML = '';
    if (allTags.size === 0) return;

    allTags.forEach(tag => {
        const pill = document.createElement('span');
        pill.className = `tag-pill${activeTag === tag ? ' active' : ''}`;
        pill.textContent = tag;
        pill.addEventListener('click', () => {
            activeTag = activeTag === tag ? null : tag;
            renderTagsFilter();
            renderNoteList();
        });
        els.tagsFilter.appendChild(pill);
    });
}

// ─── Tags ────────────────────────────────
function addTagToNote(tag) {
    const note = getActiveNote();
    if (!note || note.tags.includes(tag)) return;
    note.tags.push(tag);
    updateNote(note.id, { tags: note.tags });
    renderNoteTags();
    renderTagsFilter();
    renderNoteList();
}

function removeTagFromNote(tag) {
    const note = getActiveNote();
    if (!note) return;
    note.tags = note.tags.filter(t => t !== tag);
    updateNote(note.id, { tags: note.tags });
    renderNoteTags();
    renderTagsFilter();
    renderNoteList();
}

// ─── Search & Filter ─────────────────────
function getFilteredNotes() {
    return notes.filter(note => {
        // Tag filter
        if (activeTag && !note.tags.includes(activeTag)) return false;
        // Search filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const inTitle = (note.title || '').toLowerCase().includes(q);
            const inContent = (note.content || '').toLowerCase().includes(q);
            const inTags = note.tags.some(t => t.toLowerCase().includes(q));
            if (!inTitle && !inContent && !inTags) return false;
        }
        return true;
    });
}

// ─── Preview ─────────────────────────────
function updatePreview() {
    const content = els.editor.value;
    if (!content.trim()) {
        els.preview.innerHTML = '<div class="preview-empty"><p>Start typing to see your markdown rendered here...</p></div>';
        return;
    }
    els.preview.innerHTML = parseMarkdown(content);
}

function updateCharCount() {
    const len = els.editor.value.length;
    els.charCount.textContent = `${len.toLocaleString()} char${len !== 1 ? 's' : ''}`;
}

// ─── Auto-save ───────────────────────────
function debouncedSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        const note = getActiveNote();
        if (!note) return;
        updateNote(note.id, {
            content: els.editor.value,
            title: els.noteTitleInput.value,
        });
        renderNoteList();
    }, 400);
}

// ─── Split Pane Resize ──────────────────
function initResizeHandle() {
    let isDragging = false;
    let startX, startLeftWidth;

    els.resizeHandle.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startLeftWidth = els.editorPane.getBoundingClientRect().width;
        els.resizeHandle.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const containerWidth = els.editorContainer.getBoundingClientRect().width;
        const handleWidth = 6;
        const dx = e.clientX - startX;
        let newLeftWidth = startLeftWidth + dx;
        const minWidth = 200;
        newLeftWidth = Math.max(minWidth, Math.min(newLeftWidth, containerWidth - handleWidth - minWidth));
        const leftPercent = (newLeftWidth / containerWidth) * 100;
        const rightPercent = ((containerWidth - newLeftWidth - handleWidth) / containerWidth) * 100;
        els.editorPane.style.flex = `0 0 ${leftPercent}%`;
        els.previewPane.style.flex = `0 0 ${rightPercent}%`;
    });

    document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        els.resizeHandle.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    });
}

// ─── Toast Notifications ─────────────────
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    els.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 200);
    }, 2500);
}

// ─── Utilities ───────────────────────────
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatDate(ts) {
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

    if (d.getFullYear() === now.getFullYear()) {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Event Listeners ─────────────────────
function initEvents() {
    // Editor input → live preview + auto-save
    els.editor.addEventListener('input', () => {
        updatePreview();
        updateCharCount();
        debouncedSave();
    });

    // Title change → auto-save
    els.noteTitleInput.addEventListener('input', () => {
        debouncedSave();
    });

    // New note buttons
    els.btnNewNote.addEventListener('click', createNote);
    els.btnWelcomeNew.addEventListener('click', createNote);

    // Delete note
    els.btnDelete.addEventListener('click', () => {
        if (!activeNoteId) return;
        const note = getActiveNote();
        if (confirm(`Delete "${note.title || 'Untitled Note'}"?`)) {
            deleteNote(activeNoteId);
        }
    });

    // Toggle sidebar
    els.btnToggleSidebar.addEventListener('click', () => {
        els.sidebar.classList.toggle('collapsed');
    });

    // Search
    els.searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderNoteList();
    });

    // Tag input
    els.tagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const tag = els.tagInput.value.trim().toLowerCase();
            if (tag) {
                addTagToNote(tag);
                els.tagInput.value = '';
            }
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+N → New note
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            createNote();
        }
        // Ctrl+F → Focus search
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            els.searchInput.focus();
            els.searchInput.select();
        }
        // Tab support in editor
        if (e.key === 'Tab' && document.activeElement === els.editor) {
            e.preventDefault();
            const start = els.editor.selectionStart;
            const end = els.editor.selectionEnd;
            els.editor.value = els.editor.value.substring(0, start) + '  ' + els.editor.value.substring(end);
            els.editor.selectionStart = els.editor.selectionEnd = start + 2;
            updatePreview();
            debouncedSave();
        }
    });
}

// ─── Initialize ──────────────────────────
function init() {
    loadNotes();
    renderNoteList();
    renderTagsFilter();
    initResizeHandle();
    initEvents();

    if (notes.length > 0) {
        selectNote(notes[0].id);
    } else {
        showWelcomeScreen();
    }
}

// Start the app
init();

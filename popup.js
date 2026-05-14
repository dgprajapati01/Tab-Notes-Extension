let currentUrl = '';
let currentTabId = null;

const noteInput = document.getElementById('note-input');
const charCount = document.getElementById('char-count');
const btnSave = document.getElementById('btn-save');
const btnClear = document.getElementById('btn-clear');
const toast = document.getElementById('toast');
const tabUrlEl = document.getElementById('tab-url');
const notesList = document.getElementById('notes-list');
const noteCountEl = document.getElementById('note-count');

// Get current tab info
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]) {
    currentTabId = tabs[0].id;
    currentUrl = tabs[0].url || '';
    const displayUrl = currentUrl.replace(/^https?:\/\//, '').replace(/^www\./, '');
    tabUrlEl.textContent = displayUrl || 'Unknown tab';
    loadCurrentNote();
  }
});

// Load note for this tab
function loadCurrentNote() {
  if (!currentUrl) return;
  const key = urlToKey(currentUrl);
  chrome.storage.local.get([key], (result) => {
    const saved = result[key];
    if (saved) {
      noteInput.value = saved.note || '';
      updateCharCount();
    }
  });
  loadAllNotes();
}

// Convert URL to a storage-safe key
function urlToKey(url) {
  return 'tabnote_' + btoa(unescape(encodeURIComponent(url))).replace(/[^a-zA-Z0-9]/g, '').substring(0, 80);
}

// Update character counter
function updateCharCount() {
  const len = noteInput.value.length;
  charCount.textContent = `${len} / 200`;
  charCount.classList.toggle('warn', len > 160);
}

noteInput.addEventListener('input', updateCharCount);

// Save note
btnSave.addEventListener('click', () => {
  if (!currentUrl) return;
  const note = noteInput.value.trim();
  const key = urlToKey(currentUrl);

  if (!note) {
    // If empty, treat as clear
    chrome.storage.local.remove(key, () => {
      showToast('Note cleared!');
      loadAllNotes();
    });
    return;
  }

  const data = {
    note,
    url: currentUrl,
    savedAt: Date.now()
  };

  chrome.storage.local.set({ [key]: data }, () => {
    showToast('Note saved! 🎉');
    loadAllNotes();
  });
});

// Clear note
btnClear.addEventListener('click', () => {
  noteInput.value = '';
  updateCharCount();
  noteInput.focus();
});

// Show toast notification
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

// Load all notes for the "All Noted Tabs" section
function loadAllNotes() {
  chrome.storage.local.get(null, (allData) => {
    const notes = Object.values(allData).filter(v => v && v.note && v.url);
    notes.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));

    noteCountEl.textContent = `${notes.length} note${notes.length !== 1 ? 's' : ''}`;

    if (notes.length === 0) {
      notesList.innerHTML = `
        <div class="empty-state">
          <div class="big">🗒️</div>
          No notes yet. Start labelling your tabs!
        </div>`;
      return;
    }

    notesList.innerHTML = notes.map((item) => {
      const displayUrl = item.url.replace(/^https?:\/\//, '').replace(/^www\./, '');
      const isActive = item.url === currentUrl;
      return `
        <div class="note-item ${isActive ? 'active-note' : ''}" data-url="${escapeAttr(item.url)}" title="Click to open this tab">
          <div class="note-url">${escapeHtml(displayUrl)}</div>
          <div class="note-text">${escapeHtml(item.note)}</div>
        </div>`;
    }).join('');

    // Add active styling
    const style = document.createElement('style');
    style.textContent = `.active-note { border-color: var(--accent) !important; }`;
    notesList.appendChild(style);

    // Click on a note item → open that tab or create a new one
    notesList.querySelectorAll('.note-item').forEach(el => {
      el.addEventListener('click', () => {
        const url = el.dataset.url;
        if (url) {
          chrome.tabs.query({}, (tabs) => {
            const match = tabs.find(t => t.url === url);
            if (match) {
              chrome.tabs.update(match.id, { active: true });
              chrome.windows.update(match.windowId, { focused: true });
            } else {
              chrome.tabs.create({ url });
            }
          });
        }
      });
    });
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return str.replace(/"/g, '&quot;');
}

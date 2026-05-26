/**
 * Tillerstead Admin Panel - Premium Features
 * Auto-save, keyboard shortcuts, live preview, undo/redo
 */

// ===== THEME SYSTEM =====
class ThemeManager {
  constructor() {
    this.currentTheme = localStorage.getItem('admin-theme') || 'dark';
    this.init();
  }

  init() {
    this.applyTheme(this.currentTheme);
    this.createToggleButton();
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('admin-theme', theme);
    this.currentTheme = theme;
  }

  toggle() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(newTheme);
  }

  createToggleButton() {
    const button = document.createElement('button');
    button.className = 'theme-toggle';
    button.setAttribute('aria-label', 'Toggle theme');
    button.innerHTML = `
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    `;
    button.addEventListener('click', () => this.toggle());
    document.body.appendChild(button);
  }
}

// ===== AUTO-SAVE SYSTEM =====
class AutoSaveManager {
  constructor(saveCallback, delay = 2000) {
    this.saveCallback = saveCallback;
    this.delay = delay;
    this.timeout = null;
    this.indicator = this.createIndicator();
  }

  createIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'autosave-status';
    indicator.innerHTML = `
      <span class="autosave-status__spinner"></span>
      <span class="autosave-status__text">Saving...</span>
    `;
    document.body.appendChild(indicator);
    return indicator;
  }

  scheduleAuthor() {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => this.save(), this.delay);
  }

  async save() {
    this.showStatus('saving');
    try {
      await this.saveCallback();
      this.showStatus('saved');
      setTimeout(() => this.hideStatus(), 2000);
    } catch (error) {
      console.error('Auto-save error:', error);
      this.showStatus('error');
      setTimeout(() => this.hideStatus(), 3000);
    }
  }

  showStatus(state) {
    const text = this.indicator.querySelector('.autosave-status__text');
    this.indicator.className = 'autosave-status show autosave-status--' + state;

    switch (state) {
      case 'saving':
        text.textContent = 'Saving...';
        this.indicator.querySelector('.autosave-status__spinner').style.display = 'block';
        break;
      case 'saved':
        text.textContent = 'All changes saved';
        this.indicator.querySelector('.autosave-status__spinner').style.display = 'none';
        break;
      case 'error':
        text.textContent = 'Error saving changes';
        this.indicator.querySelector('.autosave-status__spinner').style.display = 'none';
        break;
    }
  }

  hideStatus() {
    this.indicator.classList.remove('show');
  }
}

// ===== KEYBOARD SHORTCUTS =====
class ShortcutManager {
  constructor() {
    this.shortcuts = {
      'ctrl+s': () => this.triggerSave(),
      'ctrl+z': () => this.triggerUndo(),
      'ctrl+shift+z': () => this.triggerRedo(),
      'ctrl+k': () => this.focusSearch(),
      'ctrl+/': () => this.toggleShortcutsPanel(),
      esc: () => this.closeModals(),
    };
    this.init();
  }

  init() {
    document.addEventListener('keydown', e => this.handleKeyPress(e));
    this.createShortcutsPanel();
  }

  handleKeyPress(e) {
    const key = this.getKeyCombo(e);
    if (this.shortcuts[key]) {
      e.preventDefault();
      this.shortcuts[key]();
    }
  }

  getKeyCombo(e) {
    const parts = [];
    if (e.ctrlKey || e.metaKey) parts.push('ctrl');
    if (e.shiftKey) parts.push('shift');
    if (e.altKey) parts.push('alt');
    parts.push(e.key.toLowerCase());
    return parts.join('+');
  }

  triggerSave() {
    const saveBtn =
      document.getElementById('saveCalculatorConfig') ||
      document.getElementById('saveContentFile') ||
      document.getElementById('saveSettings');
    if (saveBtn && !saveBtn.disabled) {
      saveBtn.click();
    }
  }

  triggerUndo() {
    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn && !undoBtn.disabled) {
      undoBtn.click();
    }
  }

  triggerRedo() {
    const redoBtn = document.getElementById('redoBtn');
    if (redoBtn && !redoBtn.disabled) {
      redoBtn.click();
    }
  }

  focusSearch() {
    const searchInput = document.querySelector('.content-search__input');
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }

  toggleShortcutsPanel() {
    const modal = document.getElementById('shortcuts-modal');
    if (modal) {
      modal.classList.toggle('active');
    }
  }

  closeModals() {
    document.querySelectorAll('.shortcuts-modal.active, .preview-panel.active').forEach(el => {
      el.classList.remove('active');
    });
  }

  createShortcutsPanel() {
    const modal = document.createElement('div');
    modal.id = 'shortcuts-modal';
    modal.className = 'shortcuts-modal';
    modal.innerHTML = `
      <div class="shortcuts-panel">
        <div class="shortcuts-header">
          <h3>Keyboard Shortcuts</h3>
          <button class="shortcuts-close" aria-label="Close">&times;</button>
        </div>
        <div class="shortcuts-body">
          <div class="shortcuts-section">
            <h4>General</h4>
            <div class="shortcut-item">
              <span class="shortcut-desc">Save changes</span>
              <div class="shortcut-keys">
                <kbd class="shortcut-key">Ctrl</kbd>
                <kbd class="shortcut-key">S</kbd>
              </div>
            </div>
            <div class="shortcut-item">
              <span class="shortcut-desc">Toggle shortcuts panel</span>
              <div class="shortcut-keys">
                <kbd class="shortcut-key">Ctrl</kbd>
                <kbd class="shortcut-key">/</kbd>
              </div>
            </div>
            <div class="shortcut-item">
              <span class="shortcut-desc">Close modals</span>
              <div class="shortcut-keys">
                <kbd class="shortcut-key">Esc</kbd>
              </div>
            </div>
          </div>
          <div class="shortcuts-section">
            <h4>Editing</h4>
            <div class="shortcut-item">
              <span class="shortcut-desc">Undo</span>
              <div class="shortcut-keys">
                <kbd class="shortcut-key">Ctrl</kbd>
                <kbd class="shortcut-key">Z</kbd>
              </div>
            </div>
            <div class="shortcut-item">
              <span class="shortcut-desc">Redo</span>
              <div class="shortcut-keys">
                <kbd class="shortcut-key">Ctrl</kbd>
                <kbd class="shortcut-key">Shift</kbd>
                <kbd class="shortcut-key">Z</kbd>
              </div>
            </div>
            <div class="shortcut-item">
              <span class="shortcut-desc">Focus search</span>
              <div class="shortcut-keys">
                <kbd class="shortcut-key">Ctrl</kbd>
                <kbd class="shortcut-key">K</kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Close on click outside
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });

    // Close button
    modal.querySelector('.shortcuts-close').addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }
}

// ===== UNDO/REDO SYSTEM =====
class HistoryManager {
  constructor(maxSize = 50) {
    this.history = [];
    this.currentIndex = -1;
    this.maxSize = maxSize;
    this.createControls();
  }

  push(state) {
    // Remove any states after current index
    this.history = this.history.slice(0, this.currentIndex + 1);

    // Add new state
    this.history.push(JSON.parse(JSON.stringify(state)));

    // Limit history size
    if (this.history.length > this.maxSize) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }

    this.updateButtons();
  }

  undo() {
    if (this.canUndo()) {
      this.currentIndex--;
      this.updateButtons();
      return this.history[this.currentIndex];
    }
    return null;
  }

  redo() {
    if (this.canRedo()) {
      this.currentIndex++;
      this.updateButtons();
      return this.history[this.currentIndex];
    }
    return null;
  }

  canUndo() {
    return this.currentIndex > 0;
  }

  canRedo() {
    return this.currentIndex < this.history.length - 1;
  }

  createControls() {
    const container = document.createElement('div');
    container.className = 'history-controls';
    container.innerHTML = `
      <button id="undoBtn" class="history-btn" aria-label="Undo" title="Undo (Ctrl+Z)" disabled>
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      </button>
      <button id="redoBtn" class="history-btn" aria-label="Redo" title="Redo (Ctrl+Shift+Z)" disabled>
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
        </svg>
      </button>
    `;

    // Insert before first form in content area
    const contentArea = document.querySelector('.content-area');
    if (contentArea) {
      contentArea.insertBefore(container, contentArea.firstChild);
    }

    document.getElementById('undoBtn').addEventListener('click', () => {
      const state = this.undo();
      if (state) {
        this.restoreState(state);
      }
    });

    document.getElementById('redoBtn').addEventListener('click', () => {
      const state = this.redo();
      if (state) {
        this.restoreState(state);
      }
    });
  }

  updateButtons() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');

    if (undoBtn) undoBtn.disabled = !this.canUndo();
    if (redoBtn) redoBtn.disabled = !this.canRedo();
  }

  restoreState(state) {
    // Override in implementation with actual state restoration logic
    console.log('Restoring state:', state);
  }
}

// ===== SEARCH & FILTER =====
class SearchManager {
  constructor(targetSelector) {
    this.target = document.querySelector(targetSelector);
    this.items = [];
    this.init();
  }

  init() {
    const searchContainer = document.createElement('div');
    searchContainer.className = 'content-search';
    searchContainer.innerHTML = `
      <svg class="content-search__icon" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input 
        type="search" 
        class="content-search__input" 
        placeholder="Search content (Ctrl+K)..." 
        aria-label="Search"
      />
      <button class="content-search__clear" aria-label="Clear search">&times;</button>
    `;

    if (this.target) {
      this.target.insertBefore(searchContainer, this.target.firstChild);

      const input = searchContainer.querySelector('.content-search__input');
      const clear = searchContainer.querySelector('.content-search__clear');

      input.addEventListener('input', e => this.search(e.target.value));
      clear.addEventListener('click', () => {
        input.value = '';
        this.search('');
      });
    }
  }

  search(query) {
    const items = this.target.querySelectorAll('[data-searchable]');
    const normalizedQuery = query.toLowerCase().trim();

    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      const matches = !normalizedQuery || text.includes(normalizedQuery);
      item.style.display = matches ? '' : 'none';
    });
  }
}

// ===== ACTIVITY LOGGER =====
class ActivityLogger {
  constructor() {
    this.activities = [];
    this.maxActivities = 50;
  }

  log(action, details = '') {
    const activity = {
      id: Date.now(),
      action,
      details,
      timestamp: new Date().toISOString(),
    };

    this.activities.unshift(activity);

    if (this.activities.length > this.maxActivities) {
      this.activities.pop();
    }

    this.persist();
    return activity;
  }

  getRecent(count = 10) {
    return this.activities.slice(0, count);
  }

  persist() {
    try {
      localStorage.setItem('admin-activity-log', JSON.stringify(this.activities));
    } catch (e) {
      console.error('Failed to persist activity log:', e);
    }
  }

  load() {
    try {
      const stored = localStorage.getItem('admin-activity-log');
      if (stored) {
        this.activities = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load activity log:', e);
    }
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return date.toLocaleDateString();
  }
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
  // Initialize theme system
  window.themeManager = new ThemeManager();

  // Initialize keyboard shortcuts
  window.shortcutManager = new ShortcutManager();

  // Initialize activity logger
  window.activityLogger = new ActivityLogger();
  window.activityLogger.load();

  // Initialize search if content area exists
  const contentArea = document.querySelector('.content-area');
  if (contentArea) {
    window.searchManager = new SearchManager('.content-area');
  }

  console.log('✨ Premium admin features loaded');
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ThemeManager,
    AutoSaveManager,
    ShortcutManager,
    HistoryManager,
    SearchManager,
    ActivityLogger,
  };
}

<!-- b1b082c7-2eed-422f-b5ac-a5814e369677 a927f5a9-8d97-4871-a0b5-3e512201c902 -->

# Electron to NW.js Migration Plan

## Overview

Full migration from Electron to NW.js to achieve full Chromium compatibility and fix Google login issues. Using iframe-based tabs and NW.js native extension API.

## Critical Architecture Changes

### 1. Context Model Shift

- **Electron**: Separate main/renderer processes, IPC communication required
- **NW.js**: Node.js and DOM in same context, direct function calls possible
- **Impact**: Remove all ipcMain/ipcRenderer, use direct imports/calls

### 2. Tab Implementation

- **From**: Electron `WebContentsView` (isolated processes per tab)
- **To**: `<iframe>` elements with NW.js frame navigation
- **Impact**: Rewrite `packages/shell/browser/tabs.js` completely

### 3. Extension System

- **From**: Custom `electron-chrome-extensions` package
- **To**: NW.js native `chrome.runtime` API
- **Impact**: Simplify extension loading, remove electron-chrome-extensions dependency

### 4. Window Management

- **From**: `BrowserWindow` with `contentView.addChildView()`
- **To**: `nw.Window.get()` with iframe container
- **Impact**: Rewrite main window initialization

## Implementation Steps

### Phase 1: Package Configuration (packages/shell/package.json)

```json
{
  "name": "shell",
  "main": "browser/ui/webui.html",
  "window": {
    "title": "Shell Browser",
    "width": 1280,
    "height": 720,
    "frame": false,
    "toolbar": false,
    "transparent": false
  },
  "chromium-args": "--enable-extensions --ignore-certificate-errors --allow-file-access-from-files --disable-web-security",
  "node-remote": "<all_urls>",
  "webkit": {
    "plugin": true
  }
}
```

**Verification**: Check package.json launches NW.js correctly with `npx nw packages/shell`

### Phase 2: Entry Point Restructure

**Current**: `index.js` → `browser/main.js` (Electron app.whenReady)

**New**: Direct HTML entry with embedded script

**File**: `packages/shell/browser/ui/webui.html`

- Add `<script src="./webui-main.js"></script>` at end of body
- This script will initialize browser (replaces main.js role)

**Verification**: Window opens with UI visible

### Phase 3: Convert Main Process Logic (browser/main.js)

**Key Changes**:

1. Remove `app`, `BrowserWindow` imports
2. Replace with `nw.Window.get()`, `nw.App`
3. Remove `session.defaultSession` → use `chrome.*` APIs directly
4. Convert command line switches to `chromium-args` in package.json
5. Keep extension loading logic, adapt to NW.js chrome.management API

**New Pattern**:

```javascript
// OLD: const { app, BrowserWindow } = require('electron')
// NEW: const nwWin = nw.Window.get()

// OLD: app.commandLine.appendSwitch(...)
// NEW: Already in chromium-args in package.json

// OLD: session.defaultSession.loadExtension(path)
// NEW: chrome.management.setEnabled(extensionId, true)
```

**Verification**: Extensions load, window initializes without errors

### Phase 4: Tabs System Rewrite (browser/tabs.js)

**Complete Rewrite Required**:

**Old `Tab` class** (WebContentsView):

```javascript
class Tab {
  constructor(parentWindow, wcvOpts) {
    this.view = new WebContentsView(wcvOpts)
    this.webContents = this.view.webContents
    this.window.contentView.addChildView(this.view)
  }
}
```

**New `Tab` class** (iframe):

```javascript
class Tab {
  constructor(parentContainer, options) {
    this.iframe = document.createElement('iframe')
    this.iframe.id = `tab-${Date.now()}`
    this.iframe.setAttribute('nwfaketop', '') // NW.js frame isolation
    this.iframe.setAttribute('nwdisable', '') // Disable Node in iframe initially
    this.iframe.setAttribute('nwUserAgent', CHROME_UA)
    parentContainer.appendChild(this.iframe)
    this.id = this.iframe.id
  }

  loadURL(url) {
    this.iframe.src = url
  }

  show() {
    this.iframe.style.display = 'block'
  }

  hide() {
    this.iframe.style.display = 'none'
  }
}
```

**Critical**: Add iframe container to webui.html:

```html
<div id="tab-container" style="position: absolute; top: 64px; left: 8px; right: 8px; bottom: 8px;">
  <!-- iframes injected here -->
</div>
```

**Verification**:

1. Create tab → iframe appears
2. Load URL → content loads
3. Switch tabs → correct iframe shows
4. Close tab → iframe removed

### Phase 5: IPC Removal & Direct Calls

**Pattern Conversion**:

**OLD (Electron IPC)**:

```javascript
// Main process
ipcMain.on('save-history', (event, { url, title }) => {
  db.insert(url, title)
})

// Renderer process
ipcRenderer.send('save-history', { url, title })
```

**NEW (NW.js Direct Call)**:

```javascript
// In same context, no IPC needed
const db = require('./browser/db')
db.insert(url, title)
```

**Files to Update**:

- Remove `packages/shell/browser/ui/preload.cjs` (not needed)
- Update `webui.js` to import db, menu, etc. directly
- Remove all `ipcMain.on()` and `ipcRenderer.send()` calls

**Verification**: History saves, bookmarks work, downloads track, themes apply

### Phase 6: Extension System Migration

**From**: electron-chrome-extensions custom implementation

**To**: NW.js built-in chrome.management API

**Extension Loading**:

```javascript
// OLD
const { ElectronChromeExtensions } = require('electron-chrome-extensions')
this.extensions = new ElectronChromeExtensions({ session: this.session })
await session.loadExtension(path)

// NEW
chrome.management.getAll((extensions) => {
  // Extensions auto-loaded from chrome://extensions
})
// Or manually install via chrome.management.install()
```

**WebUI Extension** (browser/ui as extension):

- Keep as extension for chrome-extension:// protocol access
- Load via manifest.json specification
- No changes needed to UI files

**Verification**:

1. Built-in extensions load
2. Custom extensions install
3. Browser actions show in toolbar
4. Extension APIs work (chrome.tabs, chrome.storage, etc.)

### Phase 7: Window Controls & Shortcuts

**Global Shortcuts**:

```javascript
// OLD: globalShortcut.register(accel, callback)
// NEW: Built into NW.js, configure in manifest or use nw.App.registerGlobalHotKey
```

**Window Frame**:

```javascript
// OLD: frame: false, titleBarOverlay: {...}
// NEW: In package.json window config, custom titlebar in HTML
```

**Verification**: Ctrl+T, Ctrl+W, Ctrl+L, etc. all work

### Phase 8: Session & User Agent Spoofing

**User Agent**:

```javascript
// OLD: session.setUserAgent(userAgent)
// NEW: Set in manifest per-frame or globally via nwUserAgent attribute
```

**Request Headers** (for Google login):

```javascript
// OLD: session.webRequest.onBeforeSendHeaders(...)
// NEW: chrome.webRequest.onBeforeSendHeaders(...)
// (Works identically in NW.js!)
```

**Verification**: Google login works, user agent correct

### Phase 9: Downloads, History, Bookmarks

**No Major Changes** - Keep existing:

- `browser/db.js` (SQLite)
- JSON file storage for downloads/bookmarks
- Polling mechanism for state sync

**Minor Updates**:

- Change file path references (no app.getPath('userData'), use nw.App.dataPath)
- Update protocol handler from `session.protocol.handle` to `chrome.webRequest`

**Verification**: All data persists, UI updates correctly

### Phase 10: AI Chatbot Panel

**No Changes Needed** - Pure DOM manipulation

- Keep existing `ai-chat.js`, `ai-chat.css`
- Panel toggle logic unchanged
- API calls via fetch() work identically

**Verification**: Panel opens/closes, chat works, settings save

### Phase 11: Themes & Backgrounds

**No Changes Needed** - File-based configuration

- Keep `theme-loader.js`, `background.js`
- JSON file updates work identically

**Verification**: Theme changes apply, backgrounds load

### Phase 12: Testing & Validation Checklist

**Core Functionality**:

- [ ] Window opens with correct size/frame
- [ ] Tabs create, switch, close
- [ ] Address bar navigation works
- [ ] Back/forward/reload buttons work
- [ ] Extensions load and function
- [ ] Keyboard shortcuts respond

**Google Login** (Critical):

- [ ] Navigate to accounts.google.com
- [ ] Login form appears
- [ ] OAuth flow completes
- [ ] Session persists

**Data Persistence**:

- [ ] History saves and displays
- [ ] Bookmarks add/remove/persist
- [ ] Downloads track and complete
- [ ] Themes/backgrounds save

**UI Features**:

- [ ] AI chatbot opens/responds
- [ ] Settings page works
- [ ] DevTools accessible (F12)
- [ ] Context menus work

**Advanced**:

- [ ] Drag-drop files to address bar
- [ ] Multiple windows
- [ ] Extension installation from web store
- [ ] Password autofill (if using keytar)

## Critical Files Modified

1. **packages/shell/package.json** - NW.js configuration
2. **packages/shell/browser/main.js** - Electron → NW.js conversion
3. **packages/shell/browser/tabs.js** - WebContentsView → iframe
4. **packages/shell/browser/ui/webui.html** - Add iframe container, initialization script
5. **packages/shell/browser/ui/webui.js** - Remove IPC, add direct imports
6. **packages/shell/browser/ui/preload.cjs** - DELETE (not needed)
7. **Root package.json** - Update nw version, scripts

## Risk Mitigation

**Backup Strategy**: Git commit before each phase

**Rollback Plan**: Each phase independently revertible

**Testing**: Manual verification after each phase before proceeding

## Expected Outcome

- Browser launches via `npx nw packages/shell`
- All UI identical to Electron version
- Google login works without issues
- Extensions function via NW.js native API
- Performance potentially better (full Chromium)
- No functionality loss

### To-dos

- [ ] Create git commit backup of current Electron implementation
- [ ] Update packages/shell/package.json with NW.js configuration (main, window, chromium-args, node-remote)
- [ ] Update root package.json scripts to use 'npx nw packages/shell'
- [ ] Add iframe container div to webui.html for tab rendering
- [ ] Completely rewrite browser/tabs.js to use iframe-based tabs instead of WebContentsView
- [ ] Convert browser/main.js from Electron (app, BrowserWindow) to NW.js (nw.Window, nw.App)
- [ ] Remove ipcMain/ipcRenderer calls, replace with direct function calls throughout codebase
- [ ] Remove packages/shell/browser/ui/preload.cjs (not needed in NW.js)
- [ ] Replace electron-chrome-extensions with NW.js native chrome.management API
- [ ] Add webui-main.js initialization script to replace Electron main process role
- [ ] Update all file paths from app.getPath() to nw.App.dataPath
- [ ] Test: Window opens with UI visible using 'npx nw packages/shell'
- [ ] Test: Create tab, load URL, switch tabs, close tab all work correctly
- [ ] Test: Address bar, back/forward, reload, keyboard shortcuts work
- [ ] Test: Navigate to accounts.google.com and complete OAuth login flow
- [ ] Test: History, bookmarks, downloads, themes all save and load correctly
- [ ] Test: Extensions load, browser actions show, extension APIs functional
- [ ] Test: AI panel opens, chat works, settings save
- [ ] Complete full testing checklist and verify no regressions from Electron version

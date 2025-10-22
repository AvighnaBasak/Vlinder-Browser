const path = require('path')
const {
  app,
  session,
  BrowserWindow,
  dialog,
  Menu,
  globalShortcut,
  ipcMain,
  webContents,
  clipboard,
  nativeImage,
} = require('electron')
let keytar
try {
  keytar = require('keytar')
} catch {}

const { Tabs } = require('./tabs')
const { ElectronChromeExtensions } = require('electron-chrome-extensions')
const { setupMenu } = require('./menu')
const { buildChromeContextMenu } = require('electron-chrome-context-menu')
const { installChromeWebStore, loadAllExtensions } = require('electron-chrome-web-store')
const db = require('./db')

// https://www.electronforge.io/config/plugins/webpack#main-process-code
// When webpack builds, __dirname is .webpack/main, so we need to go to packages/shell
const SHELL_ROOT_DIR = app.isPackaged
  ? path.join(__dirname, '../../')
  : path.join(__dirname, '../../../../packages/shell')
const ROOT_DIR = path.join(__dirname, '../../../../')
const PATHS = {
  WEBUI: app.isPackaged
    ? path.resolve(process.resourcesPath, 'ui')
    : path.resolve(SHELL_ROOT_DIR, 'browser', 'ui'),
  PRELOAD: path.join(__dirname, '../renderer/browser/preload.js'),
  WEBUI_PRELOAD: app.isPackaged
    ? path.join(path.resolve(process.resourcesPath, 'ui'), 'preload.cjs')
    : path.join(path.resolve(SHELL_ROOT_DIR, 'browser', 'ui'), 'preload.cjs'),
  LOCAL_EXTENSIONS: path.join(ROOT_DIR, 'extensions'),
  HISTORY: path.join(__dirname, 'ui', 'history.html'),
}

console.log('[Paths] SHELL_ROOT_DIR:', SHELL_ROOT_DIR)
console.log('[Paths] WEBUI path:', PATHS.WEBUI)

let webuiExtensionId

// ⚠️ CRITICAL: Enable OS-level drag-drop BEFORE app.whenReady()
// These switches must be set before Chromium initializes
app.commandLine.appendSwitch('allow-file-access-from-files')
app.commandLine.appendSwitch('enable-experimental-web-platform-features')
app.commandLine.appendSwitch('enable-features', 'NativeFileSystemAPI,FileHandlingAPI')
app.commandLine.appendSwitch('disable-features', 'CrossOriginOpenerPolicy')

// Register global shortcuts immediately when app is ready
app.whenReady().then(() => {
  // Remove the top menu
  Menu.setApplicationMenu(null)

  // Block Electron default accelerators that interfere with our tab model
  const blockers = [
    // Reload / Fullscreen (but allow DevTools F12 and Ctrl+Shift+I)
    'CommandOrControl+R',
    'CommandOrControl+Shift+R',
    'F5',
    'F11',
    // Window/quit/close/new
    // NOTE: CommandOrControl+W is NOT blocked globally - handled by per-window before-input-event
    'CommandOrControl+Shift+W',
    'Alt+F4',
    'CommandOrControl+Q',
    'CommandOrControl+N',
    // Zoom (optional blocks to avoid Electron handling)
    'CommandOrControl+Plus',
    'CommandOrControl+-',
    'CommandOrControl+0',
  ]
  blockers.forEach((accel) => {
    try {
      globalShortcut.register(accel, () => {})
    } catch {}
  })

  // DON'T register any Chrome shortcuts globally - our per-window handler manages actions
})

app.on('will-quit', () => {
  try {
    globalShortcut.unregisterAll()
  } catch {}
})

const getParentWindowOfTab = (tab) => {
  switch (tab.getType()) {
    case 'window':
      return BrowserWindow.fromWebContents(tab)
    case 'browserView':
    case 'webview':
      return tab.getOwnerBrowserWindow()
    case 'backgroundPage':
      return BrowserWindow.getFocusedWindow()
    default:
      throw new Error(`Unable to find parent window of '${tab.getType()}'`)
  }
}

class TabbedBrowserWindow {
  constructor(options) {
    this.session = options.session || session.defaultSession
    this.extensions = options.extensions

    // Can't inheret BrowserWindow
    // https://github.com/electron/electron/issues/23#issuecomment-19613241
    this.window = new BrowserWindow(options.window)
    this.id = this.window.id
    this.webContents = this.window.webContents
    this._didResetInitialZoom = false

    // DevTools enabled for debugging
    // (Previously blocked, now enabled)

    const webuiUrl = `chrome-extension://${webuiExtensionId}/webui.html`
    this.webContents.loadURL(webuiUrl)

    // Inject AI panel control function after page loads
    this.webContents.on('dom-ready', () => {
      try {
        this.webContents
          .executeJavaScript(
            `
          window.__setAIPanelWidth = (width) => {
            console.log('[Injected] __setAIPanelWidth called with:', width);
            return Promise.resolve(width);
          };
          console.log('[Injected] __setAIPanelWidth function installed');
        `,
          )
          .catch((err) => console.error('Failed to inject AI panel function:', err))
      } catch (err) {
        console.error('Error setting up AI panel function:', err)
      }
    })

    this.tabs = new Tabs(this.window)

    const self = this

    // Prevent window from closing via Ctrl+W - keep browser alive like Chrome/Firefox
    this.window.on('close', (e) => {
      try {
        // If close was triggered by Ctrl+W (within 1 second), prevent it
        if (self._lastCtrlW && Date.now() - self._lastCtrlW < 1000) {
          e.preventDefault()
          // Ensure at least one tab with new-tab page is open
          if (self.tabs && self.tabs.tabList && self.tabs.tabList.length > 0) {
            // We have tabs, just make sure current one shows new-tab
            const current = self.tabs?.selected
            if (current) {
              try {
                current.loadURL(options.urls.newtab)
              } catch {}
            }
          } else {
            // No tabs exist, create one
            try {
              const tab = self.tabs.create({
                webPreferences: {
                  sandbox: false, // CRITICAL: sandbox blocks drag-drop events!
                  webSecurity: false, // Allow file:// URLs and drag-drop files
                  allowRunningInsecureContent: false,
                  enableBlinkFeatures: 'FileSystem,DragAndDropAPI',
                  allowFileAccessFromFileURLs: true,
                  webviewTag: true, // Enable file handling
                },
              })
              tab.loadURL(options.urls.newtab)
            } catch {}
          }
          console.log('[Ctrl+W] Prevented window close, keeping browser alive')
        }
      } catch (err) {
        console.error('[Ctrl+W] Error in close handler:', err)
      }
    })

    // Unified, deduplicated shortcut handler (works for window and tab webContents)
    if (!self._shortcutState) self._shortcutState = { sig: '', at: 0 }
    const handleShortcut = (event, input) => {
      try {
        const { key, control, meta, shift, alt, isAutoRepeat, type } = input
        if (type && type !== 'keyDown') return
        // Allow native repeat for non-shortcut keys
        if (isAutoRepeat) {
          // Do not prevent default here; only handle explicit shortcuts below
        }
        const ctrl = control || meta
        const keyLower = typeof key === 'string' ? key.toLowerCase() : String(key)
        const sig = `${keyLower}|${ctrl ? '1' : '0'}${shift ? '1' : '0'}${alt ? '1' : '0'}`
        const now = Date.now()
        // Deduplicate if the same shortcut fires twice within a very short window
        // Reduced from 60ms to 30ms for better responsiveness
        if (
          self._shortcutState &&
          self._shortcutState.sig === sig &&
          now - self._shortcutState.at < 30
        ) {
          event.preventDefault()
          return
        }
        self._shortcutState = { sig, at: now }

        // Tab actions
        if (keyLower === 't' && ctrl && !shift && !alt) {
          event.preventDefault()
          const newTab = self.tabs.create({
            webPreferences: {
              sandbox: false, // CRITICAL: sandbox blocks drag-drop events!
              webSecurity: false, // Allow file:// URLs and drag-drop files
              allowRunningInsecureContent: false,
              enableBlinkFeatures: 'FileSystem,DragAndDropAPI',
              allowFileAccessFromFileURLs: true,
              webviewTag: true, // Enable file handling
            },
          })
          newTab.loadURL(options.urls.newtab)
          return
        }
        if (keyLower === 'd' && ctrl && !shift && !alt) {
          event.preventDefault()
          const currentUrl = self.webContents.getURL()
          const extensionId = currentUrl.match(/chrome-extension:\/\/([^\/]+)/)?.[1]
          if (extensionId) {
            const downloadsUrl = `chrome-extension://${extensionId}/downloads.html`
            const newTab = self.tabs.create({
              webPreferences: {
                sandbox: false, // CRITICAL: sandbox blocks drag-drop events!
                webSecurity: false, // Allow file:// URLs and drag-drop files
                allowRunningInsecureContent: false,
                enableBlinkFeatures: 'FileSystem,DragAndDropAPI',
                allowFileAccessFromFileURLs: true,
                webviewTag: true, // Enable file handling
              },
            })
            newTab.loadURL(downloadsUrl)
          }
          return
        }
        if (keyLower === 'l' && ctrl && !shift && !alt) {
          event.preventDefault()
          self.webContents.send('focus-address-bar')
          return
        }
        if (keyLower === 'r' && ctrl && !shift && !alt) {
          event.preventDefault()
          if (self.tabs.selected) {
            self.tabs.selected.webContents.reload()
          }
          return
        }
        // DevTools shortcuts
        if (key === 'F12' || (keyLower === 'i' && ctrl && shift && !alt)) {
          event.preventDefault()
          if (self.tabs.selected) {
            self.tabs.selected.webContents.toggleDevTools()
          }
          return
        }
        if (keyLower === 'w' && ctrl && !shift && !alt) {
          event.preventDefault()
          self._lastCtrlW = Date.now()

          // Simple behavior like Chrome/Firefox: Close current tab, or load new-tab if it's the last one
          const current = self.tabs.selected
          if (!current) {
            console.log('[Ctrl+W] No selected tab, ignoring')
            return
          }

          const tabCount = self.tabs.tabList.length
          console.log('[Ctrl+W] Tab count:', tabCount, 'Current tab ID:', current.id)

          if (tabCount > 1) {
            // Close the current tab (browser stays open with remaining tabs)
            try {
              self.extensions.removeTab(current.webContents, current.window)
              console.log('[Ctrl+W] Closed tab, remaining:', tabCount - 1)
            } catch (err) {
              console.error('[Ctrl+W] Failed to remove via extensions, trying direct:', err)
              try {
                self.tabs.remove(current.id)
                console.log('[Ctrl+W] Closed tab via direct remove')
              } catch (err2) {
                console.error('[Ctrl+W] Failed to remove tab:', err2)
              }
            }
          } else {
            // Last tab: Navigate to new-tab instead of closing (keep browser alive)
            console.log('[Ctrl+W] Last tab, navigating to new-tab instead of closing')
            try {
              current.loadURL(options.urls.newtab)
            } catch (err) {
              console.error('[Ctrl+W] Failed to load new-tab:', err)
            }
          }
          return
        }
        if (keyLower === 'h' && ctrl && !shift && !alt) {
          event.preventDefault()
          const currentUrl = self.webContents.getURL()
          const extensionId = currentUrl.match(/chrome-extension:\/\/([^\/]+)/)?.[1]
          if (extensionId) {
            const historyUrl = `chrome-extension://${extensionId}/history.html`
            const newTab = self.tabs.create({
              webPreferences: {
                sandbox: false, // CRITICAL: sandbox blocks drag-drop events!
                webSecurity: false, // Allow file:// URLs and drag-drop files
                allowRunningInsecureContent: false,
                enableBlinkFeatures: 'FileSystem,DragAndDropAPI',
                allowFileAccessFromFileURLs: true,
                webviewTag: true, // Enable file handling
              },
            })
            newTab.loadURL(historyUrl)
          }
          return
        }
        if (keyLower === 'b' && ctrl && !shift && !alt) {
          event.preventDefault()
          const currentUrl = self.webContents.getURL()
          const extensionId = currentUrl.match(/chrome-extension:\/\/([^\/]+)/)?.[1]
          if (extensionId) {
            const bookmarksUrl = `chrome-extension://${extensionId}/bookmarks.html`
            const newTab = self.tabs.create({
              webPreferences: {
                sandbox: false, // CRITICAL: sandbox blocks drag-drop events!
                webSecurity: false, // Allow file:// URLs and drag-drop files
                allowRunningInsecureContent: false,
                enableBlinkFeatures: 'FileSystem,DragAndDropAPI',
                allowFileAccessFromFileURLs: true,
                webviewTag: true, // Enable file handling
              },
            })
            newTab.loadURL(bookmarksUrl)
          }
          return
        }
        if ((key === 'Tab' || key === 'PageDown') && ctrl && !shift && !alt) {
          event.preventDefault()
          const currentIndex = self.tabs.tabList.findIndex((t) => t.id === self.tabs.selected?.id)
          const nextIndex = (currentIndex + 1) % self.tabs.tabList.length
          if (self.tabs.tabList[nextIndex]) {
            self.tabs.select(self.tabs.tabList[nextIndex].id)
          }
          return
        }
        if ((key === 'Tab' || key === 'PageUp') && ctrl && shift && !alt) {
          event.preventDefault()
          const currentIndex = self.tabs.tabList.findIndex((t) => t.id === self.tabs.selected?.id)
          const prevIndex = currentIndex === 0 ? self.tabs.tabList.length - 1 : currentIndex - 1
          if (self.tabs.tabList[prevIndex]) {
            self.tabs.select(self.tabs.tabList[prevIndex].id)
          }
          return
        }
        if (/^[1-8]$/.test(key) && ctrl && !shift && !alt) {
          event.preventDefault()
          const tabIndex = parseInt(key) - 1
          if (self.tabs.tabList[tabIndex]) {
            self.tabs.select(self.tabs.tabList[tabIndex].id)
          }
          return
        }
        if (key === '9' && ctrl && !shift && !alt) {
          event.preventDefault()
          if (self.tabs.tabList.length > 0) {
            const lastTab = self.tabs.tabList[self.tabs.tabList.length - 1]
            self.tabs.select(lastTab.id)
          }
          return
        }
        if (keyLower === 'n' && ctrl && !shift && !alt) {
          event.preventDefault()
          // Create new window - not implemented yet
          return
        }
        if (keyLower === 'w' && ctrl && shift && !alt) {
          event.preventDefault()
          self.window.close()
          return
        }
        if (key === 'F11') {
          event.preventDefault()
          self.window.setFullScreen(!self.window.isFullScreen())
          return
        }
        if (key === 'Home' && alt && !ctrl && !shift) {
          event.preventDefault()
          if (self.tabs.selected) {
            self.tabs.selected.loadURL(options.urls.newtab)
          }
          return
        }
        if (key === 'ArrowLeft' && alt && !ctrl && !shift) {
          event.preventDefault()
          if (self.tabs.selected) {
            self.tabs.selected.webContents.goBack()
          }
          return
        }
        if (key === 'ArrowRight' && alt && !ctrl && !shift) {
          event.preventDefault()
          if (self.tabs.selected) {
            self.tabs.selected.webContents.goForward()
          }
          return
        }
        // Block specific Electron shortcuts that interfere
        if ((ctrl || meta) && keyLower === 'i') {
          event.preventDefault()
          return
        }
        if (key === 'F5' || key === 'F12') {
          event.preventDefault()
          return
        }
      } catch {}
    }

    // Ensure window-level handler exists (once)
    if (!this.webContents._hasShortcutHandler) {
      this.webContents._hasShortcutHandler = true
      this.webContents.on('before-input-event', handleShortcut)
    }

    this.tabs.on('tab-created', function onTabCreated(tab) {
      // No automatic loadURL here! Only shortcut handler loads URLs.

      // One-time zoom reset when the first tab is created for this window
      if (!self._didResetInitialZoom) {
        try {
          const wc = tab.webContents
          if (wc && !wc.isDestroyed()) {
            wc.setZoomFactor(1)
            wc.setVisualZoomLevelLimits(1, 1)
          }
        } catch {}
        self._didResetInitialZoom = true
      }

      // Track tab that may have been created outside of the extensions API.
      self.extensions.addTab(tab.webContents, tab.window)

      // Log navigation to history
      tab.webContents.on('did-navigate', (event, url) => {
        if (url && !url.startsWith('chrome-extension://')) {
          const title = tab.webContents.getTitle()
          ipcMain.emit('save-history', null, { url, title })
        }
      })

      tab.webContents.on('did-navigate-in-page', (event, url) => {
        if (url && !url.startsWith('chrome-extension://')) {
          const title = tab.webContents.getTitle()
          ipcMain.emit('save-history', null, { url, title })
        }
      })

      // Track successfully loaded URLs to prevent replacing them with error pages on reload issues
      let lastSuccessfulUrl = null
      let isNavigating = false

      // Clear tracking when user starts a new navigation
      tab.webContents.on('did-start-navigation', (event, url, isInPlace, isMainFrame) => {
        if (isMainFrame && !isInPlace) {
          // User is navigating to a new page - clear the successful URL
          const oldUrl = lastSuccessfulUrl
          lastSuccessfulUrl = null
          isNavigating = true
          console.log('[Error Handler] Started navigation from', oldUrl, 'to', url)
        }
      })

      // Mark when a page successfully loads
      tab.webContents.on('did-finish-load', () => {
        const url = tab.webContents.getURL()
        if (url && !url.startsWith('chrome-extension://')) {
          lastSuccessfulUrl = url
          isNavigating = false
          console.log('[Error Handler] Page loaded successfully:', url)
        }
      })

      // Handle navigation errors - display error pages in the same tab
      const handleLoadError = (
        event,
        errorCode,
        errorDescription,
        validatedURL,
        isMainFrame,
        isProvisional = false,
      ) => {
        try {
          console.log(
            `[Error Handler] Event fired: ${isProvisional ? 'did-fail-provisional-load' : 'did-fail-load'}`,
            {
              errorCode,
              errorDescription,
              validatedURL,
              isMainFrame,
              currentURL: tab.webContents.getURL(),
              isProvisional,
              lastSuccessfulUrl,
            },
          )

          // Skip errorCode 0 (no error)
          if (errorCode === 0) {
            console.log('[Error Handler] Skipping error code 0 (no error)')
            return
          }

          // Get extension ID from webUI extension
          const extensionId = webuiExtensionId

          if (!extensionId) {
            console.error('[Error Handler] No extension ID available!')
            return
          }

          const currentUrl = tab.webContents.getURL()

          // Don't show error page if we're already on an error page (prevent loops)
          if (currentUrl.includes('dns-error.html') || currentUrl.includes('no-internet.html')) {
            console.log('[Error Handler] Already on error page, skipping')
            return
          }

          // CRITICAL: Only show error pages for MAIN FRAME navigation failures
          // Electron provides isMainFrame to distinguish main frame from subframes/iframes
          if (!isMainFrame) {
            console.log('[Error Handler] Skipping subframe/iframe error:', validatedURL)
            return
          }

          // SUPER CRITICAL: If the page has already loaded successfully, don't replace it with error page
          // This handles reload issues, post-load navigation attempts by scripts, etc.
          if (
            lastSuccessfulUrl &&
            (currentUrl === lastSuccessfulUrl || validatedURL === lastSuccessfulUrl)
          ) {
            console.log(
              '[Error Handler] Page already loaded successfully, ignoring post-load error',
            )
            return
          }

          // Only show error pages for actual user navigation (from blank page or extension pages)
          const isUserNavigation =
            currentUrl === 'about:blank' ||
            currentUrl.startsWith('chrome-extension://') ||
            !currentUrl // Empty URL = fresh navigation

          if (!isUserNavigation) {
            console.log(
              '[Error Handler] Not user navigation, skipping error (currentUrl:',
              currentUrl,
              ')',
            )
            return
          }

          console.log('[Error Handler] User navigation failed - will show error page')

          // Check if it's an HTTP/HTTPS URL (network request)
          const isNetworkRequest =
            validatedURL &&
            (validatedURL.startsWith('http://') || validatedURL.startsWith('https://'))

          // Error code -3 (ERR_ABORTED) when trying to load network resources usually means no internet
          const isAbortedNetworkRequest = errorCode === -3 && isNetworkRequest

          // Check if DNS error is for a well-known reliable domain (likely means no internet, not bad domain)
          const wellKnownDomains = [
            'google.com',
            'youtube.com',
            'facebook.com',
            'twitter.com',
            'instagram.com',
            'amazon.com',
            'wikipedia.org',
            'reddit.com',
            'linkedin.com',
            'microsoft.com',
            'apple.com',
            'netflix.com',
            'yahoo.com',
            'bing.com',
            'github.com',
          ]
          const isDNSErrorForWellKnownDomain =
            errorCode === -105 &&
            validatedURL &&
            wellKnownDomains.some((domain) => validatedURL.includes(domain))

          // Network/Internet errors (show "No Internet" page)
          // -106: INTERNET_DISCONNECTED, -7: TIMED_OUT, -118: CONNECTION_TIMED_OUT
          // -101: CONNECTION_RESET, -102: CONNECTION_REFUSED, -109: ADDRESS_UNREACHABLE
          // -3: ERR_ABORTED (when loading http/https URLs, often means no internet)
          // -105: NAME_NOT_RESOLVED for well-known domains (likely no internet, not bad domain)
          const isNetworkError =
            errorCode === -106 ||
            errorCode === -7 ||
            errorCode === -118 ||
            errorCode === -101 ||
            errorCode === -102 ||
            errorCode === -109 ||
            isAbortedNetworkRequest ||
            isDNSErrorForWellKnownDomain

          // DNS/Name resolution errors (show "This site can't be reached" page)
          // -105: NAME_NOT_RESOLVED (for unknown/uncommon domains)
          // -800 to -899: various DNS errors
          const isDNSError =
            (errorCode === -105 && !isDNSErrorForWellKnownDomain) ||
            (errorCode <= -800 && errorCode >= -899)

          let errorPageUrl
          if (isNetworkError) {
            // Network/Internet connection issues - show "No Internet" page
            errorPageUrl = `chrome-extension://${extensionId}/no-internet.html`
            console.log('[Error Handler] Network/Internet Error detected, loading:', errorPageUrl)
          } else if (isDNSError) {
            // DNS resolution errors - show "Site can't be reached" page
            errorPageUrl = `chrome-extension://${extensionId}/dns-error.html?url=${encodeURIComponent(validatedURL || '')}`
            console.log('[Error Handler] DNS Error detected, loading:', errorPageUrl)
          } else {
            // For other errors, show DNS error page as fallback
            errorPageUrl = `chrome-extension://${extensionId}/dns-error.html?url=${encodeURIComponent(validatedURL || '')}`
            console.log(
              '[Error Handler] Other navigation error (code: ' +
                errorCode +
                '), loading DNS error page:',
              errorPageUrl,
            )
          }

          tab
            .loadURL(errorPageUrl)
            .then(() => {
              console.log('[Error Handler] Error page loaded successfully')
            })
            .catch((err) => {
              console.error('[Error Handler] Failed to load error page:', err)
            })
        } catch (err) {
          console.error('[Error Handler] Exception in error handler:', err)
        }
      }

      console.log('[Tab Setup] Attaching error handlers for tab:', tab.id)

      tab.webContents.on(
        'did-fail-load',
        (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
          handleLoadError(event, errorCode, errorDescription, validatedURL, isMainFrame, false)
        },
      )

      tab.webContents.on(
        'did-fail-provisional-load',
        (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
          handleLoadError(event, errorCode, errorDescription, validatedURL, isMainFrame, true)
        },
      )

      // Allow file:// URLs to load in tabs (from drag-drop)
      tab.webContents.on('will-navigate', (event, url) => {
        // Allow http(s), file://, and chrome-extension:// URLs
        // This is KEY for drag-drop to work
      })

      // Inject simple drag-drop handler into page content
      tab.webContents.on('did-finish-load', () => {
        if (!tab.webContents.isDestroyed()) {
          tab.webContents
            .executeJavaScript(
              `
            if (!window.__dragDropEnabled) {
              window.__dragDropEnabled = true;
              
              document.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
              });
              
              document.addEventListener('drop', (e) => {
                e.preventDefault();
                const files = e.dataTransfer?.files;
                if (files && files.length > 0 && files[0].path) {
                  const fileUrl = 'file:///' + files[0].path.replace(/\\\\/g, '/');
                  window.location.href = fileUrl;
                }
              });
            }
          `,
            )
            .catch(() => {})
        }
      })

      // Autofill credentials on load (if saved)
      tab.webContents.on('did-finish-load', async () => {
        try {
          if (!keytar) return
          const url = tab.webContents.getURL()
          const origin = new URL(url).origin
          const saved = await keytar.getPassword('ShellBrowser', origin)
          if (!saved) return
          let creds
          try {
            creds = JSON.parse(saved)
          } catch {}
          if (!creds || !creds.password) return
          const js = `(() => {
            try {
              const pass = document.querySelector('input[type="password"]');
              if (!pass) return;
              const user = document.querySelector('input[type="email"], input[type="text"], input[name*="user" i], input[name*="login" i]');
              if (user && ${JSON.stringify(!!creds.username)}) user.value = ${JSON.stringify(creds.username || '')};
              pass.value = ${JSON.stringify(creds.password)};
            } catch {}
          })();`
          tab.webContents.executeJavaScript(js).catch(() => {})
        } catch {}
      })

      // Inject listener to offer saving credentials on form submit
      tab.webContents.on('dom-ready', () => {
        try {
          const inject = `(() => {
            if (window.__shell_pw_hook) return; window.__shell_pw_hook = true;
            document.addEventListener('submit', (ev) => {
              try {
                const form = ev.target;
                const pass = form.querySelector('input[type="password"]');
                if (!pass || !pass.value) return;
                const user = form.querySelector('input[type="email"], input[type="text"], input[name*="user" i], input[name*="login" i]');
                const username = user ? (user.value || '') : '';
                const origin = location.origin;
                fetch('app://password?action=save&origin=' + encodeURIComponent(origin) + '&username=' + encodeURIComponent(username) + '&password=' + encodeURIComponent(pass.value)).catch(()=>{});
              } catch {}
            }, true);
          })();`
          tab.webContents.executeJavaScript(inject).catch(() => {})
        } catch {}
      })

      // Attach shortcut handler to the tab's webContents once (deduped by handler)
      if (!tab.webContents._hasShortcutHandler) {
        tab.webContents._hasShortcutHandler = true
        tab.webContents.on('before-input-event', handleShortcut)
      }

      // DevTools enabled for debugging
      // (Previously blocked, now enabled)
    })

    // Adjust webview bounds when renderer shows/hides address suggestions
    try {
      ipcMain.on('address-suggestions-visible', (_e, visible) => {
        try {
          this.tabs.setExtraTop(visible ? 140 : 0)
        } catch {}
      })
    } catch {}

    // Set up polling to check for AI panel state changes via injected global
    setInterval(() => {
      try {
        if (!this.webContents || this.webContents.isDestroyed()) return

        this.webContents
          .executeJavaScript(
            'typeof window.__aiPanelOpen !== "undefined" ? window.__aiPanelOpen : null',
          )
          .then((isOpen) => {
            if (isOpen === null) return
            const targetWidth = isOpen ? 340 : 0
            // Only update if changed
            if (this._lastAIPanelWidth !== targetWidth) {
              console.log('[AI Panel] State changed, setting width to:', targetWidth)
              this._lastAIPanelWidth = targetWidth
              this.tabs.setAIPanelWidth(targetWidth)
            }
          })
          .catch(() => {})
      } catch (err) {}
    }, 100) // Poll every 100ms

    // Set up polling for bookmark operations
    setInterval(() => {
      try {
        if (!this.webContents || this.webContents.isDestroyed()) return

        // Check for toggle bookmark request
        this.webContents
          .executeJavaScript('window.__toggleBookmark')
          .then((req) => {
            if (req && req.timestamp) {
              if (this._lastBookmarkToggle !== req.timestamp) {
                this._lastBookmarkToggle = req.timestamp
                console.log('[Bookmark] Adding bookmark:', req.url)

                try {
                  const fs = require('fs')
                  const bookmarksPath = path.join(PATHS.WEBUI, 'bookmarks-data.json')

                  // Load existing bookmarks
                  let bookmarks = []
                  if (fs.existsSync(bookmarksPath)) {
                    const data = fs.readFileSync(bookmarksPath, 'utf8')
                    bookmarks = JSON.parse(data)
                  }

                  // Check if already exists
                  const existing = bookmarks.find((b) => b.url === req.url)
                  if (!existing) {
                    const bookmark = {
                      id: Date.now() + Math.random(),
                      url: req.url,
                      title: req.title || req.url,
                      favicon: null,
                      added_at: new Date().toISOString(),
                    }
                    bookmarks.unshift(bookmark)
                    fs.writeFileSync(bookmarksPath, JSON.stringify(bookmarks, null, 2))
                    console.log('[Bookmark] Saved! Total bookmarks:', bookmarks.length)
                  } else {
                    console.log('[Bookmark] Already exists')
                  }
                } catch (err) {
                  console.error('[Bookmark] Failed to save:', err)
                }
              }
            }
          })
          .catch(() => {})

        // Check for check bookmark request
        this.webContents
          .executeJavaScript('window.__checkBookmark')
          .then((req) => {
            if (req && req.timestamp) {
              if (this._lastBookmarkCheck !== req.timestamp) {
                this._lastBookmarkCheck = req.timestamp
                const isBookmarked = db.isBookmarked(req.url)
                this.webContents.executeJavaScript(`window.__bookmarkStatus = ${isBookmarked}`)
              }
            }
          })
          .catch(() => {})

        // Check for get bookmarks request (from bookmarks page)
        this.webContents
          .executeJavaScript('window.__getBookmarks')
          .then((req) => {
            if (req && req.timestamp) {
              if (this._lastGetBookmarks !== req.timestamp) {
                this._lastGetBookmarks = req.timestamp
                const bookmarks = db.getAllBookmarks()
                this.webContents.executeJavaScript(
                  `window.__bookmarksData = ${JSON.stringify(bookmarks)}`,
                )
              }
            }
          })
          .catch(() => {})

        // Check for delete bookmarks request
        this.webContents
          .executeJavaScript('window.__deleteBookmarks')
          .then((req) => {
            if (req && req.timestamp && req.bookmarks) {
              if (this._lastDeleteBookmarks !== req.timestamp) {
                this._lastDeleteBookmarks = req.timestamp
                console.log('[Bookmark] Delete request received')
                console.log('[Bookmark] IDs to delete:', req.ids)
                console.log('[Bookmark] Saving updated bookmarks list to file...')

                try {
                  const fs = require('fs')
                  const bookmarksPath = path.join(PATHS.WEBUI, 'bookmarks-data.json')
                  fs.writeFileSync(bookmarksPath, JSON.stringify(req.bookmarks, null, 2))
                  console.log(
                    '[Bookmark] ✓ Successfully deleted! Remaining bookmarks:',
                    req.bookmarks.length,
                  )
                  console.log('[Bookmark] ✓ bookmarks-data.json updated permanently')
                } catch (err) {
                  console.error('[Bookmark] ✗ Failed to save after delete:', err)
                }
              }
            }
          })
          .catch(() => {})
      } catch (err) {}
    }, 100) // Poll every 100ms

    this.tabs.on('tab-selected', function onTabSelected(tab) {
      self.extensions.selectTab(tab.webContents)
    })

    queueMicrotask(() => {
      // Create initial tab
      const tab = this.tabs.create()

      if (options.initialUrl) {
        tab.loadURL(options.initialUrl)
      } else {
        tab.loadURL(options.urls.newtab)
      }
    })
  }

  destroy() {
    this.tabs.destroy()
    this.window.destroy()
  }

  getFocusedTab() {
    return this.tabs.selected
  }
}

class Browser {
  windows = []

  urls = {
    newtab: 'https://www.google.com',
  }

  constructor() {
    this.ready = new Promise((resolve) => {
      this.resolveReady = resolve
    })

    app.whenReady().then(() => {
      this.init()
    })

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.destroy()
      }
    })

    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) this.createInitialWindow()
    })

    app.on('web-contents-created', this.onWebContentsCreated.bind(this))
  }

  destroy() {
    app.quit()
  }

  getFocusedWindow() {
    return this.windows.find((w) => w.window.isFocused()) || this.windows[0]
  }

  getWindowFromBrowserWindow(window) {
    return !window.isDestroyed() ? this.windows.find((win) => win.id === window.id) : null
  }

  getWindowFromWebContents(webContents) {
    let window

    if (this.popup && webContents === this.popup.browserWindow?.webContents) {
      window = this.popup.parent
    } else {
      window = getParentWindowOfTab(webContents)
    }

    return window ? this.getWindowFromBrowserWindow(window) : null
  }

  async init() {
    this.initSession()
    setupMenu(this)

    if ('registerPreloadScript' in this.session) {
      this.session.registerPreloadScript({
        id: 'shell-preload',
        type: 'frame',
        filePath: PATHS.PRELOAD,
      })
      // Expose IPC bridge for WebUI pages (history, downloads, etc.)
      this.session.registerPreloadScript({
        id: 'shell-webui-preload',
        type: 'frame',
        filePath: PATHS.WEBUI_PRELOAD,
      })
    } else {
      // TODO(mv3): remove
      this.session.setPreloads([PATHS.PRELOAD, PATHS.WEBUI_PRELOAD])
    }

    this.extensions = new ElectronChromeExtensions({
      license: 'internal-license-do-not-use',
      session: this.session,

      createTab: async (details) => {
        await this.ready

        const win =
          typeof details.windowId === 'number' &&
          this.windows.find((w) => w.id === details.windowId)

        if (!win) {
          throw new Error(`Unable to find windowId=${details.windowId}`)
        }

        const tab = win.tabs.create()

        if (details.url) tab.loadURL(details.url)
        if (typeof details.active === 'boolean' ? details.active : true) win.tabs.select(tab.id)

        return [tab.webContents, tab.window]
      },
      selectTab: (tab, browserWindow) => {
        const win = this.getWindowFromBrowserWindow(browserWindow)
        win?.tabs.select(tab.id)
      },
      removeTab: (tab, browserWindow) => {
        const win = this.getWindowFromBrowserWindow(browserWindow)
        win?.tabs.remove(tab.id)
      },

      createWindow: async (details) => {
        await this.ready

        const win = this.createWindow({
          initialUrl: details.url,
        })
        // if (details.active) tabs.select(tab.id)
        return win.window
      },
      removeWindow: (browserWindow) => {
        const win = this.getWindowFromBrowserWindow(browserWindow)
        win?.destroy()
      },
    })
    // Simple protocol for history actions callable from renderer via fetch('app://history?...')
    try {
      const { protocol } = this.session
      if (protocol.isProtocolHandled('app')) {
        protocol.unhandle('app')
      }
      protocol.handle('app', async (request) => {
        try {
          const u = new URL(request.url)
          if (u.hostname === 'history') {
            const action = u.searchParams.get('action')
            if (action === 'clear') {
              const duration = u.searchParams.get('duration') || 'all'
              db.clearByDuration(duration)
              this.updateExtensionHistory()
              return new Response('cleared', { status: 200 })
            }
            if (action === 'delete') {
              const idsStr = u.searchParams.get('ids')
              const ids = idsStr ? JSON.parse(idsStr) : []
              db.deleteByIds(Array.isArray(ids) ? ids.map((n) => Number(n)) : [])
              this.updateExtensionHistory()
              return new Response('deleted', { status: 200 })
            }
          }
          // Simple password save endpoint: app://password?action=save&origin=...&username=...&password=...
          if (u.hostname === 'password') {
            const action = u.searchParams.get('action')
            if (action === 'save' && keytar) {
              const origin = u.searchParams.get('origin') || ''
              const username = u.searchParams.get('username') || ''
              const password = u.searchParams.get('password') || ''
              if (origin && password) {
                // Confirm with user once per save
                try {
                  const bw = BrowserWindow.getFocusedWindow()
                  const res = await dialog.showMessageBox(bw, {
                    type: 'question',
                    buttons: ['Save', 'Cancel'],
                    defaultId: 0,
                    cancelId: 1,
                    title: 'Save password?',
                    message: `Save password for ${origin}?`,
                    detail: username ? `Username: ${username}` : '',
                  })
                  if (res.response === 0) {
                    await keytar.setPassword(
                      'ShellBrowser',
                      origin,
                      JSON.stringify({ username, password }),
                    )
                    return new Response('saved', { status: 200 })
                  }
                } catch {}
              }
              return new Response('ignored', { status: 200 })
            }
            return new Response('not found', { status: 404 })
          }
          // Simple bookmark save endpoint: app://save-bookmarks?data=...
          if (u.hostname === 'save-bookmarks') {
            const data = u.searchParams.get('data')
            if (data) {
              try {
                const bookmarks = JSON.parse(decodeURIComponent(data))
                const fs = require('fs')
                const bookmarksJsonPath = path.join(PATHS.WEBUI, 'bookmarks-data.json')
                fs.writeFileSync(bookmarksJsonPath, JSON.stringify(bookmarks, null, 2))
                console.log('[Bookmarks] Saved', bookmarks.length, 'bookmarks to file')
                return new Response('saved', { status: 200 })
              } catch (err) {
                console.error('[Bookmarks] Failed to save:', err)
                return new Response('error', { status: 500 })
              }
            }
            return new Response('no data', { status: 400 })
          }
          // Get history endpoint: app://get-history
          if (u.hostname === 'get-history') {
            try {
              const fs = require('fs')
              const historyJsonPath = path.join(PATHS.WEBUI, 'history-data.json')
              if (fs.existsSync(historyJsonPath)) {
                const data = fs.readFileSync(historyJsonPath, 'utf8')
                return new Response(data, {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' },
                })
              }
              return new Response('[]', {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              })
            } catch (err) {
              console.error('[History] Failed to read:', err)
              return new Response('error', { status: 500 })
            }
          }
          return new Response('not found', { status: 404 })
        } catch (err) {
          console.error('app:// protocol error', err)
          return new Response('error', { status: 500 })
        }
      })
    } catch (err) {
      console.error('Failed to register app:// protocol', err)
    }

    // Display <browser-action-list> extension icons.
    ElectronChromeExtensions.handleCRXProtocol(this.session)

    this.extensions.on('browser-action-popup-created', (popup) => {
      this.popup = popup
    })

    // Allow extensions to override new tab page
    this.extensions.on('url-overrides-updated', (urlOverrides) => {
      if (urlOverrides.newtab) {
        // Keep our custom new-tab as the default unless explicitly overridden later
        // If you want to allow extensions to override, comment out the next return
        return
      }
    })

    const webuiExtension = await this.session.extensions.loadExtension(PATHS.WEBUI)
    webuiExtensionId = webuiExtension.id
    this.urls.newtab = `chrome-extension://${webuiExtensionId}/new-tab.html`

    // Initialize extension history data
    this.updateExtensionHistory()

    // Initialize downloads tracking
    this.downloads = new Map()

    // Wait for web store extensions to finish loading as they may change the
    // newtab URL.
    await installChromeWebStore({
      session: this.session,
      async beforeInstall(details) {
        if (!details.browserWindow || details.browserWindow.isDestroyed()) return

        const title = `Add “${details.localizedName}”?`

        let message = `${title}`
        if (details.manifest.permissions) {
          const permissions = (details.manifest.permissions || []).join(', ')
          message += `\n\nPermissions: ${permissions}`
        }

        const returnValue = await dialog.showMessageBox(details.browserWindow, {
          title,
          message,
          icon: details.icon,
          buttons: ['Cancel', 'Add Extension'],
        })

        return { action: returnValue.response === 0 ? 'deny' : 'allow' }
      },
    })

    if (!app.isPackaged) {
      await loadAllExtensions(this.session, PATHS.LOCAL_EXTENSIONS, {
        allowUnpacked: true,
      })
    }

    await Promise.all(
      this.session.extensions.getAllExtensions().map(async (extension) => {
        const manifest = extension.manifest
        if (manifest.manifest_version === 3 && manifest?.background?.service_worker) {
          await this.session.serviceWorkers.startWorkerForScope(extension.url).catch((error) => {
            console.error(error)
          })
        }
      }),
    )

    this.createInitialWindow()
    this.resolveReady()

    // Setup IPC handlers for history
    this.setupHistoryHandlers()

    // Setup download handlers
    this.setupDownloadHandlers()

    // Set up periodic check for extension changes
    setInterval(() => {
      this.checkForExtensionChanges()
    }, 2000) // Check every 2 seconds
  }

  setupHistoryHandlers() {
    // Save history entry
    ipcMain.on('save-history', (event, { url, title }) => {
      try {
        db.insert(url, title)
        // Update the extension background script with new history data
        this.updateExtensionHistory()
        // notify renderers
        this.windows.forEach((win) => {
          if (win && !win.window.isDestroyed()) {
            win.webContents.send('history-updated')
          }
        })
      } catch (err) {
        console.error('History save failed:', err)
      }
    })

    // Get history entries
    ipcMain.handle('get-history', async () => {
      try {
        return db.getAll()
      } catch (err) {
        console.error('Failed to get history:', err)
        return []
      }
    })

    // Clear history and return updated list
    ipcMain.handle('clear-history-invoke', async (_event, duration) => {
      try {
        db.clearByDuration(duration)
        this.updateExtensionHistory()
        return db.getAll()
      } catch (err) {
        console.error('Failed to clear history (invoke):', err)
        return []
      }
    })

    // Delete entries and return updated list
    ipcMain.handle('delete-history-entries-invoke', async (_event, ids) => {
      try {
        const numericIds = Array.isArray(ids) ? ids.map((id) => Number(id)) : []
        db.deleteByIds(numericIds)
        this.updateExtensionHistory()
        return db.getAll()
      } catch (err) {
        console.error('Failed to delete history entries (invoke):', err)
        return []
      }
    })

    // Clear history by duration
    ipcMain.on('clear-history', (event, duration) => {
      try {
        db.clearByDuration(duration)
        // Update the extension background script with cleared history data
        this.updateExtensionHistory()
        // notify renderers
        this.windows.forEach((win) => {
          if (win && !win.window.isDestroyed()) {
            win.webContents.send('history-updated')
          }
        })
      } catch (err) {
        console.error('Failed to clear history:', err)
      }
    })

    // Delete specific history entries
    ipcMain.on('delete-history-entries', (event, ids) => {
      try {
        const numericIds = Array.isArray(ids) ? ids.map((id) => Number(id)) : []
        db.deleteByIds(numericIds)
        // Update the extension background script with updated history data
        this.updateExtensionHistory()
        // notify renderers
        this.windows.forEach((win) => {
          if (win && !win.window.isDestroyed()) {
            win.webContents.send('history-updated')
          }
        })
      } catch (err) {
        console.error('Failed to delete history entries:', err)
      }
    })

    // Open URL in current focused tab (fallback to new tab if none)
    ipcMain.on('open-url-in-tab', (event, url) => {
      const win = this.getFocusedWindow()
      if (!win) return
      const current = win.getFocusedTab?.() || win.tabs?.selected
      if (current && current.webContents && !current.webContents.isDestroyed()) {
        current.loadURL(url)
      } else {
        const tab = win.tabs.create()
        tab.loadURL(url)
      }
    })

    // Open history page
    ipcMain.on('open-history-page', () => {
      console.log('Received open-history-page message')
      const win = this.getFocusedWindow()
      console.log('Focused window:', win)
      if (win) {
        const tab = win.tabs.create()
        const historyUrl = `chrome-extension://${webuiExtensionId}/history.html`
        console.log('Loading history page with correct protocol:', historyUrl)
        tab.loadURL(historyUrl)
      } else {
        console.log('No focused window found')
      }
    })

    // Handle extension history changes
    ipcMain.on('extension-history-change', (event, changes) => {
      console.log('Received extension history change:', changes)
      try {
        if (changes.action === 'clear') {
          db.clearByDuration(changes.data)
          console.log('Applied clear history changes:', changes.data)
        } else if (changes.action === 'delete') {
          db.deleteByIds(changes.data)
          console.log('Applied delete history changes:', changes.data)
        }

        // Update the history data file
        this.updateExtensionHistory()
      } catch (err) {
        console.error('Failed to apply extension changes:', err)
      }
    })

    // Handle direct history file updates
    ipcMain.on('update-history-file', (event, data) => {
      console.log('Updating history file directly')
      try {
        const fs = require('fs')
        const historyJsonPath = path.join(PATHS.WEBUI, 'history-data.json')
        fs.writeFileSync(historyJsonPath, data)
        console.log('History file updated successfully')
      } catch (err) {
        console.error('Failed to update history file:', err)
      }
    })

    // Handle theme changes and persist to current-theme.json
    ipcMain.on('apply-theme', (event, themeData) => {
      console.log('[Theme] Received theme change:', themeData?.theme)
      try {
        const fs = require('fs')
        const themePath = path.join(PATHS.WEBUI, 'current-theme.json')
        fs.writeFileSync(themePath, JSON.stringify(themeData, null, 2))
        console.log('[Theme] Theme saved to current-theme.json')

        // Broadcast theme change to all browser windows
        BrowserWindow.getAllWindows().forEach((win) => {
          try {
            if (win.webContents && !win.webContents.isDestroyed()) {
              win.webContents
                .executeJavaScript(
                  `
                if (window.ThemeManager) {
                  window.ThemeManager.loadAndApplyTheme();
                }
              `,
                )
                .catch(() => {})
            }
          } catch (err) {}
        })
      } catch (err) {
        console.error('[Theme] Failed to save theme:', err)
      }
    })

    // Handle background changes - same pattern as themes!
    // OpenRouter API Key handlers
    ipcMain.handle('get-openrouter-key', async () => {
      try {
        const fs = require('fs')
        const keyPath = path.join(app.getPath('userData'), 'openrouter-key.json')
        if (fs.existsSync(keyPath)) {
          const data = fs.readFileSync(keyPath, 'utf8')
          return JSON.parse(data)
        }
        return null
      } catch (error) {
        console.error('[OpenRouter] Error reading API key:', error)
        return null
      }
    })

    ipcMain.handle('save-openrouter-key', async (event, data) => {
      try {
        const fs = require('fs')
        const keyPath = path.join(app.getPath('userData'), 'openrouter-key.json')
        fs.writeFileSync(keyPath, JSON.stringify(data, null, 2))
        console.log('[OpenRouter] ✓ API key saved')
        return { success: true }
      } catch (error) {
        console.error('[OpenRouter] Error saving API key:', error)
        throw error
      }
    })

    ipcMain.on('apply-background', (event, backgroundData) => {
      console.log(
        '[Background] Received background change:',
        backgroundData?.type,
        backgroundData?.value,
      )
      try {
        const fs = require('fs')
        const backgroundPath = path.join(PATHS.WEBUI, 'background-settings.json')
        fs.writeFileSync(backgroundPath, JSON.stringify(backgroundData, null, 2))
        console.log('[Background] ✓ Saved to background-settings.json')

        // Notify ALL tabs in ALL TabbedBrowserWindow instances
        let notifiedCount = 0
        console.log('[Background] Found', this.windows.length, 'browser windows')

        this.windows.forEach((win, winIndex) => {
          try {
            if (win.tabs && win.tabs.tabList) {
              console.log('[Background] Window', winIndex, 'has', win.tabs.tabList.length, 'tabs')
              win.tabs.tabList.forEach((tab, tabIndex) => {
                if (tab.webContents && !tab.webContents.isDestroyed()) {
                  const url = tab.webContents.getURL()
                  const isNewTab = url.includes('/new-tab.html')

                  console.log(
                    '[Background] Tab',
                    tabIndex,
                    ':',
                    url,
                    isNewTab ? '(new-tab ✓)' : '(skipping)',
                  )

                  // Only notify new-tab.html pages
                  if (isNewTab) {
                    // Use polling mechanism - set a flag that new-tab.html polls for
                    tab.webContents
                      .executeJavaScript(
                        `
                      window.__reloadBackground = Date.now();
                      console.log('[Background] 🔄 Reload flag set:', window.__reloadBackground);
            `,
                      )
                      .catch((err) => {
                        console.error('[Background] Failed to set reload flag:', err.message)
                      })
                    notifiedCount++
                  }
                }
              })
            }
          } catch (err) {
            console.error('[Background] Error accessing window tabs:', err.message)
          }
        })

        console.log('[Background] ✓ Notified', notifiedCount, 'new-tab.html tabs')
      } catch (err) {
        console.error('[Background] Failed to save:', err)
      }
    })

    // Bookmarks are now handled via app://save-bookmarks protocol (see protocol.handle above)
    // No IPC handlers needed - everything goes through background.js and app:// protocol
  }

  setupDownloadHandlers() {
    const updateDownloadsMirror = () => {
      try {
        const fs = require('fs')
        const downloadsPath = path.join(PATHS.WEBUI, 'downloads-data.json')
        const list = Array.from(this.downloads.values()).map((d) => ({
          id: d.id,
          url: d.url,
          filename: d.filename,
          state: d.state,
          receivedBytes: d.receivedBytes,
          totalBytes: d.totalBytes,
          started_at: d.started_at,
        }))
        fs.writeFileSync(downloadsPath, JSON.stringify(list, null, 2))
      } catch (err) {
        console.error('Failed to update downloads mirror:', err)
      }
    }

    // Listen for new downloads
    this.session.on('will-download', (event, item, webContents) => {
      try {
        const id = `${Date.now()}-${Math.random()}`
        const url = item.getURL()
        const filename = item.getFilename()
        const savePath = path.join(app.getPath('downloads'), filename)
        item.setSavePath(savePath)

        const entry = {
          id,
          url,
          filename,
          state: 'downloading',
          receivedBytes: 0,
          totalBytes: item.getTotalBytes(),
          started_at: new Date().toISOString(),
          _item: item,
        }
        this.downloads.set(id, entry)
        updateDownloadsMirror()
        try {
          webContents
            .getAllWebContents()
            .forEach((wc) => wc.send('download-updated', { id, ...entry }))
        } catch {}

        item.on('updated', (_e, state) => {
          const d = this.downloads.get(id)
          if (!d) return
          d.receivedBytes = item.getReceivedBytes()
          d.totalBytes = item.getTotalBytes()
          if (state === 'interrupted') {
            d.state = 'paused'
          } else if (state === 'progressing') {
            if (item.isPaused()) {
              d.state = 'paused'
            } else {
              d.state = 'downloading'
            }
          }
          updateDownloadsMirror()
          try {
            webContents
              .getAllWebContents()
              .forEach((wc) => wc.send('download-updated', { id, ...d }))
          } catch {}
        })

        item.once('done', (_e, state) => {
          const d = this.downloads.get(id)
          if (!d) return
          d.state = state === 'completed' ? 'complete' : 'cancelled'
          updateDownloadsMirror()
          try {
            webContents
              .getAllWebContents()
              .forEach((wc) => wc.send('download-updated', { id, ...d }))
          } catch {}
        })
      } catch (err) {
        console.error('will-download error:', err)
      }
    })

    // IPC controls
    ipcMain.handle('get-downloads', async () =>
      Array.from(this.downloads.values()).map(({ _item, ...rest }) => rest),
    )
    ipcMain.on('start-download', (_e, url) => {
      try {
        const win = this.getFocusedWindow()
        win?.webContents.downloadURL(url)
      } catch (err) {
        console.error('start-download failed:', err)
      }
    })
    ipcMain.on('pause-download', (_e, id) => {
      const d = this.downloads.get(id)
      if (d?._item && !d._item.isPaused()) {
        try {
          d._item.pause()
        } catch {}
      }
    })
    ipcMain.on('resume-download', (_e, id) => {
      const d = this.downloads.get(id)
      if (d?._item && d._item.canResume()) {
        try {
          d._item.resume()
        } catch {}
      }
    })
    ipcMain.on('cancel-download', (_e, id) => {
      const d = this.downloads.get(id)
      if (d?._item) {
        try {
          d._item.cancel()
        } catch {}
      }
    })
    ipcMain.handle('clear-downloads', async () => {
      this.downloads.forEach((d) => {
        if (d._item && !d._item.isDestroyed?.())
          try {
            d._item.cancel()
          } catch {}
      })
      this.downloads.clear()
      updateDownloadsMirror()
      return []
    })

    ipcMain.handle('delete-downloads', async (_e, ids) => {
      try {
        const set = new Set(Array.isArray(ids) ? ids : [])
        Array.from(this.downloads.keys()).forEach((id) => {
          if (set.has(id)) this.downloads.delete(id)
        })
        updateDownloadsMirror()
        return Array.from(this.downloads.values()).map(({ _item, ...rest }) => rest)
      } catch (err) {
        console.error('delete-downloads failed:', err)
        return Array.from(this.downloads.values()).map(({ _item, ...rest }) => rest)
      }
    })

    // Allow UI to force-write downloads mirror
    ipcMain.on('update-downloads-file', (_e, data) => {
      try {
        const fs = require('fs')
        const downloadsPath = path.join(PATHS.WEBUI, 'downloads-data.json')
        fs.writeFileSync(downloadsPath, data)
      } catch (err) {
        console.error('Failed to update downloads file:', err)
      }
    })
  }

  // Update the extension background script with current history data
  updateExtensionHistory() {
    try {
      const historyData = db.getAll()
      // Write history data to a JSON file that the extension can read
      const fs = require('fs')
      const historyJsonPath = path.join(PATHS.WEBUI, 'history-data.json')
      if (historyData.length === 0) {
        if (fs.existsSync(historyJsonPath)) {
          fs.unlinkSync(historyJsonPath)
        }
        console.log('History cleared: removed history-data.json')
      } else {
        fs.writeFileSync(historyJsonPath, JSON.stringify(historyData, null, 2))
        console.log('Updated history data file:', historyData.length, 'entries')
      }
    } catch (err) {
      console.error('Failed to update extension history:', err)
    }
  }

  // Check for changes from the extension and apply them to the database
  checkForExtensionChanges() {
    try {
      const fs = require('fs')
      const changesPath = path.join(PATHS.WEBUI, 'history-changes.json')

      if (fs.existsSync(changesPath)) {
        const changesData = JSON.parse(fs.readFileSync(changesPath, 'utf8'))

        if (changesData.action === 'clear') {
          db.clearByDuration(changesData.data)
          console.log('Applied clear history changes:', changesData.data)
        } else if (changesData.action === 'delete') {
          db.deleteByIds(changesData.data)
          console.log('Applied delete history changes:', changesData.data)
        }

        // Remove the changes file after processing
        fs.unlinkSync(changesPath)

        // Update the history data file
        this.updateExtensionHistory()
      }
    } catch (err) {
      console.error('Failed to check for extension changes:', err)
    }
  }

  initSession() {
    this.session = session.defaultSession

    // Remove Electron and App details to closer emulate Chrome's UA
    const userAgent = this.session
      .getUserAgent()
      .replace(/\sElectron\/\S+/, '')
      .replace(new RegExp(`\\s${app.getName()}\/\\S+`), '')
    this.session.setUserAgent(userAgent)

    // Stronger spoof for Google properties: set Chrome-like UA and client hints
    const CHROME_UA =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    try {
      app.userAgentFallback = CHROME_UA
    } catch {}

    try {
      this.session.webRequest.onBeforeSendHeaders((details, callback) => {
        try {
          const url = details.url || ''
          const isGoogle =
            /(^https?:\/\/([^\/]+\.)?(google|gstatic|googleusercontent|googleapis)\.[a-z.]+\/)/i.test(
              url,
            ) || /accounts\.google\.com/i.test(url)
          const headers = { ...details.requestHeaders }
          if (isGoogle) {
            headers['User-Agent'] = CHROME_UA
            headers['sec-ch-ua'] =
              '"Chromium";v="120", "Google Chrome";v="120", ";Not A Brand";v="24"'
            headers['sec-ch-ua-platform'] = '"Windows"'
            headers['sec-ch-ua-mobile'] = '?0'
            headers['accept-language'] = headers['accept-language'] || 'en-US,en;q=0.9'
          }
          callback({ cancel: false, requestHeaders: headers })
        } catch {
          callback({ cancel: false, requestHeaders: details.requestHeaders })
        }
      })
    } catch {}

    this.session.serviceWorkers.on('running-status-changed', (event) => {
      console.info(`service worker ${event.versionId} ${event.runningStatus}`)
    })

    if (process.env.SHELL_DEBUG) {
      this.session.serviceWorkers.once('running-status-changed', () => {
        const tab = this.windows[0]?.getFocusedTab()
        if (tab) {
          tab.webContents.inspectServiceWorker()
        }
      })
    }
  }

  createWindow(options) {
    const win = new TabbedBrowserWindow({
      ...options,
      urls: this.urls,
      extensions: this.extensions,
      window: {
        width: 1280,
        height: 720,
        frame: false,
        titleBarStyle: 'hidden',
        titleBarOverlay: {
          height: 31,
          color: '#111112',
          symbolColor: '#ffffff',
        },
        webPreferences: {
          preload: PATHS.PRELOAD,
          sandbox: false, // CRITICAL: sandbox blocks drag-drop events!
          nodeIntegration: false,
          enableRemoteModule: false,
          contextIsolation: true,
          worldSafeExecuteJavaScript: true,
          webSecurity: false, // Allow drag-drop of local files
          enableBlinkFeatures: 'FileSystem,DragAndDropAPI', // Enable drag-drop
          allowFileAccessFromFileURLs: true,
          webviewTag: true, // Enable file handling in webviews
        },
      },
    })
    this.windows.push(win)

    if (process.env.SHELL_DEBUG) {
      win.webContents.openDevTools({ mode: 'detach' })
    }

    return win
  }

  createInitialWindow() {
    this.createWindow()
  }

  async onWebContentsCreated(event, webContents) {
    const type = webContents.getType()
    const url = webContents.getURL()
    console.log(`'web-contents-created' event [type:${type}, url:${url}]`)

    if (process.env.SHELL_DEBUG && ['backgroundPage', 'remote'].includes(webContents.getType())) {
      webContents.openDevTools({ mode: 'detach', activate: true })
    }

    webContents.setWindowOpenHandler((details) => {
      switch (details.disposition) {
        case 'foreground-tab':
        case 'background-tab':
        case 'new-window': {
          return {
            action: 'allow',
            outlivesOpener: true,
            createWindow: ({ webContents: guest, webPreferences }) => {
              const win = this.getWindowFromWebContents(webContents)
              const tab = win.tabs.create({
                webContents: guest,
                webPreferences: {
                  ...webPreferences,
                  sandbox: false, // CRITICAL: sandbox blocks drag-drop events!
                  webSecurity: false, // Allow file:// URLs and drag-drop files
                  allowRunningInsecureContent: false,
                  enableBlinkFeatures: 'FileSystem,DragAndDropAPI',
                  allowFileAccessFromFileURLs: true,
                  webviewTag: true, // Enable file handling
                },
              })
              tab.loadURL(details.url)
              return tab.webContents
            },
          }
        }
        default:
          return { action: 'allow' }
      }
    })

    // Intercept actions from WebUI history page to perform clear/delete
    webContents.on('did-navigate', (e, navUrl) => {
      try {
        const parsed = new URL(navUrl)
        if (parsed.protocol === 'chrome-extension:' && parsed.pathname === '/history.html') {
          const params = parsed.searchParams
          const action = params.get('action')
          if (action === 'clear') {
            const duration = params.get('duration') || 'all'
            db.clearByDuration(duration)
            this.updateExtensionHistory()
            // Remove params and reload
            const sanitized = new URL(navUrl)
            sanitized.search = ''
            webContents.loadURL(sanitized.toString())
          } else if (action === 'delete') {
            const idsStr = params.get('ids')
            const ids = idsStr ? JSON.parse(idsStr) : []
            if (Array.isArray(ids)) {
              db.deleteByIds(ids.map((n) => Number(n)))
              this.updateExtensionHistory()
              const sanitized = new URL(navUrl)
              sanitized.search = ''
              webContents.loadURL(sanitized.toString())
            }
          }
        }
      } catch (err) {
        console.error('Failed to handle history action (navigate):', err)
      }
    })

    webContents.on('did-navigate-in-page', (e, inPageUrl) => {
      try {
        const parsed = new URL(inPageUrl)
        if (parsed.protocol === 'chrome-extension:' && parsed.pathname === '/history.html') {
          const hash = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash
          if (!hash) return
          const params = new URLSearchParams(hash)
          const action = params.get('action')
          if (action === 'clear') {
            const duration = params.get('duration') || 'all'
            db.clearByDuration(duration)
            this.updateExtensionHistory()
            // Remove hash and reload content
            webContents.executeJavaScript("location.hash='';").catch(() => {})
            webContents.reload()
          } else if (action === 'delete') {
            const idsStr = params.get('ids')
            const ids = idsStr ? JSON.parse(idsStr) : []
            if (Array.isArray(ids)) {
              db.deleteByIds(ids.map((n) => Number(n)))
              this.updateExtensionHistory()
              webContents.executeJavaScript("location.hash='';").catch(() => {})
              webContents.reload()
            }
          }
        }
      } catch (err) {
        console.error('Failed to handle history action:', err)
      }
    })

    webContents.on('context-menu', async (event, params) => {
      try {
        const win = this.getFocusedWindow()
        const isImage = params.mediaType === 'image' || !!params.srcURL
        const isLink = !!params.linkURL
        const items = []

        const openInNewTab = (url) => {
          try {
            if (!url || !win) return
            const tab = win.tabs.create({
              webPreferences: {
                sandbox: false, // CRITICAL: sandbox blocks drag-drop events!
                webSecurity: false, // Allow file:// URLs and drag-drop files
                allowRunningInsecureContent: false,
                enableBlinkFeatures: 'FileSystem,DragAndDropAPI',
                allowFileAccessFromFileURLs: true,
                webviewTag: true, // Enable file handling
              },
            })
            tab.loadURL(url)
          } catch {}
        }
        const openInNewWindow = (url) => {
          try {
            if (!url) return
            this.createWindow({ initialUrl: url })
          } catch {}
        }
        const saveAs = async (url) => {
          try {
            if (!url || !win) return
            const urlPath = new URL(url).pathname
            const defaultName = require('path').basename(urlPath) || 'download'
            const { canceled, filePath } = await dialog.showSaveDialog(win.window, {
              defaultPath: defaultName,
            })
            if (canceled || !filePath) return
            const s = webContents.session || session.defaultSession
            const listener = (e, item) => {
              try {
                item.setSavePath(filePath)
              } catch {}
              const cleanup = () => {
                try {
                  s.removeListener('will-download', listener)
                } catch {}
              }
              item.once('done', cleanup)
            }
            s.on('will-download', listener)
            webContents.downloadURL(url)
          } catch {}
        }

        if (isLink) {
          items.push({ label: 'Open link in new tab', click: () => openInNewTab(params.linkURL) })
          items.push({
            label: 'Open link in new window',
            click: () => openInNewWindow(params.linkURL),
          })
          items.push({
            label: 'Open link as',
            click: () => {
              try {
                require('electron').shell.openExternal(params.linkURL)
              } catch {}
            },
          })
          items.push({
            label: 'Save link as ...',
            click: () => {
              saveAs(params.linkURL)
            },
          })
          items.push({ type: 'separator' })
          items.push({
            label: 'Copy link address',
            click: () => {
              try {
                clipboard.writeText(params.linkURL || '')
              } catch {}
            },
          })
        }

        if (isImage) {
          if (isLink) items.push({ type: 'separator' })
          const srcUrl = params.srcURL
          items.push({ label: 'Open image in new tab', click: () => openInNewTab(srcUrl) })
          items.push({
            label: 'Save image as ...',
            click: () => {
              saveAs(srcUrl)
            },
          })
          items.push({
            label: 'Copy image',
            click: async () => {
              try {
                if (!srcUrl) return
                if (srcUrl.startsWith('data:')) {
                  const img = nativeImage.createFromDataURL(srcUrl)
                  if (!img.isEmpty()) clipboard.writeImage(img)
                  return
                }
                const mod = srcUrl.startsWith('https:') ? 'https' : 'http'
                const getter = require(mod).get
                getter(srcUrl, (res) => {
                  const chunks = []
                  res.on('data', (d) => chunks.push(d))
                  res.on('end', () => {
                    try {
                      const buf = Buffer.concat(chunks)
                      const img = nativeImage.createFromBuffer(buf)
                      if (!img.isEmpty()) clipboard.writeImage(img)
                    } catch {}
                  })
                }).on('error', () => {})
              } catch {}
            },
          })
          items.push({
            label: 'Copy image address',
            click: () => {
              try {
                clipboard.writeText(srcUrl || '')
              } catch {}
            },
          })
        }

        items.push({ type: 'separator' })
        items.push({
          label: 'Inspect',
          click: () => webContents.inspectElement(params.x, params.y),
        })

        const menu = Menu.buildFromTemplate(items)
        menu.popup({ window: win?.window || BrowserWindow.fromWebContents(webContents) })
      } catch {
        // Fallback ignored
      }
    })
  }
}

module.exports = Browser

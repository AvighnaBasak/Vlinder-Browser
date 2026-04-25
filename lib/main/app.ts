import { BrowserWindow, shell, app, session, Menu, MenuItem, ipcMain, WebContents } from 'electron'
import { join } from 'path'
import appIcon from '@/resources/build/icon.png?asset'
import { registerResourcesProtocol } from './protocols'
import { registerWindowHandlers } from '@/lib/conveyor/handlers/window-handler'
import { registerAppHandlers } from '@/lib/conveyor/handlers/app-handler'
import { registerConfigHandlers } from '@/lib/conveyor/handlers/config-handler'
import { contentBlocker } from '@/lib/main/modules/content-blocker'
import { initPasswordCapture } from '@/lib/main/modules/password-capture'
import { getCurrentShortcut } from '@/lib/main/modules/shortcuts'
import { shortcutsEmitter } from '@/lib/main/modules/shortcuts-storage'
import { downloadManager } from '@/lib/main/modules/download-manager'

// Send an IPC message to the currently focused window (safe across multi-window)
function sendToFocusedWindow(channel: string, ...args: any[]) {
  const win = BrowserWindow.getFocusedWindow()
  if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
    win.webContents.send(channel, ...args)
  }
}

let menuInitialized = false

// Menu setup function — uses getFocusedWindow() so shortcuts always target the active window
function setupMenu() {
  if (menuInitialized) return
  menuInitialized = true

  const craftMenu = async () => {
    const isMac = process.platform === 'darwin'

    const template: Array<MenuItemConstructorOptions | MenuItem> = [
      // macOS App Menu
      ...(isMac
        ? [
            {
              label: 'Vlinder',
              submenu: [
                {
                  label: 'About Vlinder',
                  role: 'about',
                },
                { type: 'separator' },
                {
                  label: 'Services',
                  role: 'services',
                  submenu: [],
                },
                { type: 'separator' },
                {
                  label: 'Hide Vlinder',
                  accelerator: 'CommandOrControl+H',
                  role: 'hide',
                },
                {
                  label: 'Hide Others',
                  accelerator: 'CommandOrControl+Alt+H',
                  role: 'hideothers',
                },
                {
                  label: 'Show All',
                  role: 'unhide',
                },
                { type: 'separator' },
                {
                  label: 'Quit',
                  accelerator: 'CommandOrControl+Q',
                  click: () => app.quit(),
                },
              ],
            },
          ]
        : []),

      // File Menu
      {
        label: 'File',
        submenu: [
          {
            label: 'New Window',
            accelerator: 'CommandOrControl+N',
            click: () => {
              createAppWindow()
            },
          },
          {
            label: 'New Incognito Window',
            accelerator: 'CommandOrControl+Shift+N',
            click: () => {
              createIncognitoWindow()
            },
          },
          { type: 'separator' },
          {
            label: 'Settings',
            accelerator: getCurrentShortcut('browser.openSettings'),
            click: () => sendToFocusedWindow('navigate-to-settings'),
          },
          {
            label: 'Downloads',
            accelerator: getCurrentShortcut('browser.openDownloads'),
            click: () => sendToFocusedWindow('navigate-to-downloads'),
          },
          {
            label: 'History',
            accelerator: getCurrentShortcut('browser.openHistory'),
            click: () => sendToFocusedWindow('navigate-to-history'),
          },
          ...(isMac
            ? []
            : [
                { type: 'separator' },
                {
                  label: 'Exit',
                  accelerator: 'Ctrl+Q',
                  click: () => app.quit(),
                },
              ]),
        ],
      },

      // Edit Menu
      {
        label: 'Edit',
        submenu: [
          { label: 'Undo', accelerator: 'CommandOrControl+Z', role: 'undo' },
          { label: 'Redo', accelerator: 'Shift+CommandOrControl+Z', role: 'redo' },
          { type: 'separator' },
          { label: 'Cut', accelerator: 'CommandOrControl+X', role: 'cut' },
          { label: 'Copy', accelerator: 'CommandOrControl+C', role: 'copy' },
          { label: 'Paste', accelerator: 'CommandOrControl+V', role: 'paste' },
          { label: 'Select All', accelerator: 'CommandOrControl+A', role: 'selectall' },
        ],
      },

      // View Menu
      {
        label: 'View',
        submenu: [
          {
            label: 'Toggle Sidebar',
            accelerator: getCurrentShortcut('browser.toggleSidebar'),
            click: () => sendToFocusedWindow('toggle-sidebar'),
          },
          {
            label: 'Toggle Command Palette',
            accelerator: getCurrentShortcut('browser.toggleCommandPalette'),
            click: () => sendToFocusedWindow('toggle-command-palette'),
          },
          {
            label: 'Next Tab',
            accelerator: getCurrentShortcut('browser.nextTab'),
            click: () => sendToFocusedWindow('next-tab'),
          },
          {
            label: 'Reopen Closed Tab',
            accelerator: getCurrentShortcut('browser.reopenClosedTab'),
            click: () => sendToFocusedWindow('reopen-closed-tab'),
          },
          { type: 'separator' },
          {
            label: 'Reload Platform',
            accelerator: getCurrentShortcut('platform.reload'),
            click: () => sendToFocusedWindow('reload-platform'),
          },
          {
            label: 'Force Reload Platform',
            accelerator: getCurrentShortcut('platform.forceReload'),
            click: () => sendToFocusedWindow('force-reload-platform'),
          },
          { type: 'separator' },
          {
            label: 'Toggle DevTools',
            accelerator: getCurrentShortcut('platform.toggleDevTools'),
            click: () => {
              const win = BrowserWindow.getFocusedWindow()
              if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
                win.webContents.toggleDevTools()
              }
            },
          },
          { type: 'separator' },
          { label: 'Actual Size', accelerator: 'CommandOrControl+0', role: 'resetzoom' },
          { label: 'Zoom In', accelerator: 'CommandOrControl+Plus', role: 'zoomin' },
          { label: 'Zoom Out', accelerator: 'CommandOrControl+-', role: 'zoomout' },
          { type: 'separator' },
          { label: 'Toggle Fullscreen', accelerator: 'F11', role: 'togglefullscreen' },
        ],
      },

      // Navigation Menu
      {
        label: 'Navigation',
        submenu: [
          {
            label: 'Go Back',
            accelerator: getCurrentShortcut('navigation.goBack'),
            click: () => sendToFocusedWindow('go-back'),
          },
          {
            label: 'Go Forward',
            accelerator: getCurrentShortcut('navigation.goForward'),
            click: () => sendToFocusedWindow('go-forward'),
          },
        ],
      },

      // Platform Menu
      {
        label: 'Platform',
        submenu: [
          {
            label: 'Close Platform',
            accelerator: getCurrentShortcut('platform.close'),
            click: () => sendToFocusedWindow('close-platform'),
          },
        ],
      },

      // Window Menu (macOS)
      ...(isMac
        ? [
            {
              label: 'Window',
              submenu: [
                { label: 'Close', accelerator: 'CommandOrControl+W', role: 'close' },
                { label: 'Minimize', accelerator: 'CommandOrControl+M', role: 'minimize' },
                { label: 'Zoom', role: 'zoom' },
                { type: 'separator' },
                { label: 'Bring All to Front', role: 'front' },
              ],
            },
          ]
        : []),
    ]

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
  }

  craftMenu()
  shortcutsEmitter.on('shortcuts-changed', craftMenu)

  return craftMenu
}

// Find the parent BrowserWindow that owns a given WebContents (handles nested webview contents)
function getOwnerWindow(contents: WebContents): BrowserWindow | null {
  // Try direct lookup first
  const direct = BrowserWindow.fromWebContents(contents)
  if (direct) return direct

  // For webview guest contents, walk up the host chain
  const allWindows = BrowserWindow.getAllWindows()
  for (const win of allWindows) {
    if (win.isDestroyed()) continue
    try {
      if (win.webContents && !win.webContents.isDestroyed()) {
        if (win.webContents.id === contents.id) return win
      }
    } catch { /* ignore */ }
  }

  // Fallback: return the first non-destroyed window
  return allWindows.find((w) => !w.isDestroyed()) || null
}

// Global flag to track if user confirmed quit with downloads
let shouldQuitWithDownloads = false

// Track whether global handlers have been registered (must only happen once)
let ipcHandlersRegistered = false
let webContentsHandlerRegistered = false

export function createAppWindow(initialUrl?: string): BrowserWindow {
  // Register custom protocol for resources (safe to call multiple times)
  registerResourcesProtocol()

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 700,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    backgroundColor: '#00000000',
    ...(process.platform === 'win32' ? { backgroundMaterial: 'acrylic' as const } : { transparent: true }),
    icon: appIcon,
    frame: false,
    titleBarStyle: 'hiddenInset',
    title: 'Vlinder',
    maximizable: true,
    resizable: true,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      sandbox: false,
      webviewTag: true,
    },
  })

  // Initialize background URLs tracking (shared with app-handler)
  if (!(global as any).__backgroundUrls) {
    ;(global as any).__backgroundUrls = new Set<string>()
  }
  const backgroundUrls = (global as any).__backgroundUrls as Set<string>

  // One-time global setup (IPC handlers, session config, web-contents-created)
  if (!ipcHandlersRegistered) {
    registerWindowHandlers(mainWindow)
    registerAppHandlers(app, mainWindow)
    registerConfigHandlers()

    // Set main window for download manager
    downloadManager.setMainWindow(mainWindow)

    const unifiedSession = session.fromPartition('persist:unified-session')

    // --- User-Agent & Header Configuration ---
    const defaultUA = app.userAgentFallback
    const cleanUA = defaultUA
      .replace(/\s*Vlinder\/\S+/gi, '')
      .replace(/\s*Electron\/\S+/gi, '')
      .replace(/\s*vlinder\/\S+/gi, '')
    app.userAgentFallback = cleanUA
    unifiedSession.setUserAgent(cleanUA)

    const chromiumVersion = process.versions.chrome.split('.')[0]
    unifiedSession.webRequest.onBeforeSendHeaders((details, callback) => {
      details.requestHeaders['SEC-CH-UA'] =
        `"Chromium";v="${chromiumVersion}", "Google Chrome";v="${chromiumVersion}", "Not-A.Brand";v="99"`
      details.requestHeaders['SEC-CH-UA-MOBILE'] = '?0'
      details.requestHeaders['SEC-CH-UA-PLATFORM'] =
        process.platform === 'win32'
          ? '"Windows"'
          : process.platform === 'darwin'
            ? '"macOS"'
            : '"Linux"'

      if (details.url.includes('accounts.google.com')) {
        try {
          const url = new URL(details.url)
          if (url.hostname === 'accounts.google.com') {
            const fxVersion =
              91 + Math.floor((Date.now() - 1628553600000) / (4.1 * 7 * 24 * 60 * 60 * 1000))
            const rootUA =
              process.platform === 'win32'
                ? `Mozilla/5.0 (Windows NT 10.0; WOW64; rv:${fxVersion}.0) Gecko/20100101 Firefox/${fxVersion}.0`
                : process.platform === 'darwin'
                  ? `Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:${fxVersion}.0) Gecko/20100101 Firefox/${fxVersion}.0`
                  : `Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:${fxVersion}.0) Gecko/20100101 Firefox/${fxVersion}.0`
            details.requestHeaders['User-Agent'] = rootUA
          }
        } catch {
          // Ignore URL parsing errors
        }
      }

      callback({ cancel: false, requestHeaders: details.requestHeaders })
    })

    unifiedSession.setPermissionRequestHandler((_webContents, permission, callback) => {
      const allowedPermissions = [
        'media',
        'mediaKeySystem',
        'geolocation',
        'notifications',
        'fullscreen',
        'pointerLock',
        'openExternal',
        'clipboard-read',
        'clipboard-sanitized-write',
      ]
      callback(allowedPermissions.includes(permission))
    })

    unifiedSession.setPermissionCheckHandler((_webContents, permission) => {
      const allowedPermissions = [
        'media',
        'mediaKeySystem',
        'fullscreen',
        'pointerLock',
        'clipboard-read',
        'clipboard-sanitized-write',
      ]
      return allowedPermissions.includes(permission)
    })

    const initDownloadPath = async () => {
      try {
        const Store = await import('electron-store')
        const ElectronStore = Store.default
        const store = new ElectronStore({ name: 'vlinder-config' })
        const savedPath = store.get('downloadPath', null) as string | null
        if (savedPath) {
          downloadManager.setDownloadPath(savedPath)
        } else {
          const defaultPath = app.getPath('downloads')
          downloadManager.setDownloadPath(defaultPath)
        }
      } catch {
        const defaultPath = app.getPath('downloads')
        downloadManager.setDownloadPath(defaultPath)
      }
    }

    initDownloadPath()

    unifiedSession.on('will-download', (event, downloadItem, webContents) => {
      downloadManager.handleDownload(webContents, downloadItem)
    })

    ipcMain.on('mark-background-url-fast', (_event, url: string) => {
      if (typeof url === 'string' && url) {
        backgroundUrls.add(url)
        setTimeout(() => {
          backgroundUrls.delete(url)
        }, 5000)
      }
    })

    ipcHandlersRegistered = true
  }

  // Setup global application menu (only once — uses getFocusedWindow for all actions)
  setupMenu()

  // Handle window close event - prevent closing if downloads are active
  mainWindow.on('close', (event) => {
    // Check if user confirmed quit with downloads
    if ((global as any).__shouldQuitWithDownloads) {
      ;(global as any).__shouldQuitWithDownloads = false
      return // Allow close
    }

    if (downloadManager.hasActiveDownloads()) {
      event.preventDefault()
      const activeCount = downloadManager.getActiveDownloadCount()
      if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
        try {
          mainWindow.webContents.send('download-warning-show', activeCount)
        } catch {
          // Window might be destroyed, ignore
        }
      }
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()

    // Initialize content blocker with unified session
    const unifiedSession = session.fromPartition('persist:unified-session')
    contentBlocker.initialize(unifiedSession).catch((err) => {})
    initPasswordCapture(mainWindow)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Detect likely ad/redirect URLs when content blocking is active
  function isLikelyAdRedirect(targetUrl: string, sourceUrl: string): boolean {
    try {
      const target = new URL(targetUrl)
      const source = new URL(sourceUrl)
      const targetHost = target.hostname.toLowerCase()
      const targetPath = (target.pathname + target.search).toLowerCase()

      // Block known ad/redirect TLDs with random-looking domains
      const suspiciousTLDs = ['.cfd', '.buzz', '.top', '.xyz', '.click', '.link', '.club', '.icu', '.live', '.surf', '.rest', '.monster', '.sbs', '.cyou']
      if (suspiciousTLDs.some(tld => targetHost.endsWith(tld))) {
        return true
      }

      // Block known ad/redirect URL patterns
      const adPatterns = [
        /\/partitial\//i,
        /\/link\d\?/i,
        /redirect.*\?.*var[_=]/i,
        /scontext_r=/i,
        /prfrev=/i,
        /northb?_fallback/i,
        /popunder/i,
        /popads/i,
        /\/afu\.php/i,
        /\/go\.php\?/i,
        /\/out\.php\?/i,
        /\/redirect\//i,
        /clickid=/i,
        /subid=/i,
        /zoneid=/i,
        /bannerid=/i,
      ]
      if (adPatterns.some(pattern => pattern.test(targetUrl))) {
        return true
      }

      // Block known ad/redirect domains
      const adDomains = [
        'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
        'adservice.google.com', 'ads.yahoo.com', 'adnxs.com',
        'taboola.com', 'outbrain.com', 'propellerads.com',
        'popcash.net', 'popads.net', 'juicyads.com',
        'exoclick.com', 'trafficjunky.com', 'revcontent.com',
        'mgid.com', 'content.ad', 'adf.ly', 'bit.ly',
        'shorte.st', 'linkvertise.com', 'ouo.io',
        'bc.vc', 'earnow.online',
      ]
      if (adDomains.some(d => targetHost === d || targetHost.endsWith('.' + d))) {
        return true
      }

      // Block betting/casino domains
      const bettingPatterns = [
        /bet365|1xbet|betwinner|melbet|mostbet|22bet|pinnacle|betway|stake\.com/i,
        /casino|poker|slots|jackpot|wager|gambl/i,
      ]
      if (bettingPatterns.some(p => p.test(targetHost))) {
        return true
      }
    } catch {
      return false
    }
    return false
  }

  // ── Throttle gate: rate-limit window.open per webContents ──
  const popupTimestamps = new WeakMap<WebContents, number[]>()
  const POPUP_THROTTLE_MS = 2000
  const POPUP_THROTTLE_MAX = 1

  function isPopupThrottled(wc: WebContents): boolean {
    const now = Date.now()
    let stamps = popupTimestamps.get(wc)
    if (!stamps) {
      stamps = []
      popupTimestamps.set(wc, stamps)
    }
    while (stamps.length > 0 && now - stamps[0] > POPUP_THROTTLE_MS) {
      stamps.shift()
    }
    if (stamps.length >= POPUP_THROTTLE_MAX) {
      return true
    }
    stamps.push(now)
    return false
  }

  // Handle webview security and external links (register only once globally)
  if (!webContentsHandlerRegistered) {
  webContentsHandlerRegistered = true
  app.on('web-contents-created', (_, contents) => {
    // Increase max listeners to prevent warnings from multiple event handlers
    contents.setMaxListeners(20)

    // Handle webview tags
    contents.on('will-attach-webview', (_event, webPreferences) => {
      // Disable node integration in webviews for security
      webPreferences.nodeIntegration = false
      webPreferences.contextIsolation = true
      // Note: navigateOnDragDrop doesn't work with webview tags
      // We'll handle drag-drop in the renderer process
    })

    // Handle context menu for webviews
    contents.on('context-menu', (event, params) => {
      // Prevent the default context menu from showing
      event.preventDefault()

      // Send context menu event to the correct parent window's renderer
      const ownerWin = getOwnerWindow(contents)
      if (ownerWin && !ownerWin.isDestroyed()) {
        ownerWin.webContents.send('webview-context-menu', {
          x: params.x,
          y: params.y,
          selectionText: params.selectionText,
          linkURL: params.linkURL,
          srcURL: params.srcURL,
          webContentsId: contents.id,
          isEditable: params.isEditable,
          inputFieldType: params.inputFieldType,
        })
      }
    })

    // Handle external navigation in webviews
    contents.on('will-navigate', (event, navigationUrl) => {
      const currentUrl = contents.getURL()

      // Check if this is an external link (different domain)
      try {
        const currentDomain = new URL(currentUrl).hostname
        const targetDomain = new URL(navigationUrl).hostname

        // Allow navigation to same service domains (e.g., google.com -> lens.google.com)
        const isSameService = isSameServiceDomain(currentDomain, targetDomain)

        if (currentDomain !== targetDomain && !isSameService) {
          // When content blocking is active, block suspicious redirect URLs
          const blockingMode = contentBlocker.getMode()
          if (blockingMode !== 'disabled' && isLikelyAdRedirect(navigationUrl, currentUrl)) {
            event.preventDefault()
            return
          }

          // This is an external link - check if it should be background
          const isBackground = backgroundUrls.has(navigationUrl)

          if (isBackground) {
            // Remove from set (one-time use)
            backgroundUrls.delete(navigationUrl)
          }

          // This is an external link - send to the correct parent window's renderer
          event.preventDefault()
          const eventName = isBackground ? 'external-link-navigation-background' : 'external-link-navigation'
          const navOwner = getOwnerWindow(contents)
          if (navOwner && !navOwner.isDestroyed()) {
            navOwner.webContents.send(eventName, {
              url: navigationUrl,
              currentUrl: currentUrl,
              title: contents.getTitle(),
            })
          }
        }
      } catch (error) {
        // If URL parsing fails, allow navigation to continue
      }
    })

    // Helper function to check if domains are part of the same service
    function isSameServiceDomain(currentDomain: string, targetDomain: string): boolean {
      // Remove www. prefix for comparison
      const cleanCurrent = currentDomain.replace(/^www\./, '')
      const cleanTarget = targetDomain.replace(/^www\./, '')

      // Check if one domain is a subdomain of the other
      if (cleanTarget.endsWith('.' + cleanCurrent) || cleanCurrent.endsWith('.' + cleanTarget)) {
        return true
      }

      // Special cases for known services
      const sameServicePatterns = [
        // Google services
        { current: 'google.com', target: 'lens.google.com' },
        { current: 'google.com', target: 'maps.google.com' },
        { current: 'google.com', target: 'drive.google.com' },
        { current: 'google.com', target: 'docs.google.com' },
        { current: 'google.com', target: 'sheets.google.com' },
        { current: 'google.com', target: 'slides.google.com' },
        { current: 'google.com', target: 'photos.google.com' },
        { current: 'google.com', target: 'youtube.com' },
        { current: 'google.com', target: 'gmail.com' },
        // Microsoft services
        { current: 'microsoft.com', target: 'office.com' },
        { current: 'microsoft.com', target: 'outlook.com' },
        { current: 'microsoft.com', target: 'onedrive.com' },
        // Other common services
        { current: 'github.com', target: 'github.io' },
        { current: 'amazon.com', target: 'aws.amazon.com' },
      ]

      return sameServicePatterns.some(
        (pattern) =>
          (cleanCurrent === pattern.current && cleanTarget === pattern.target) ||
          (cleanCurrent === pattern.target && cleanTarget === pattern.current)
      )
    }

    // Handle new window requests (target="_blank" links)
    contents.setWindowOpenHandler((details) => {
      // Throttle gate: block rapid-fire popup bombs (>1 per 2s per webview)
      if (isPopupThrottled(contents)) {
        return { action: 'deny' }
      }

      const { disposition, features } = details
      const blockingMode = contentBlocker.getMode()

      // Parse window features (width, height, etc.)
      const parsedFeatures: Record<string, string | number> = {}
      if (features) {
        features.split(',').forEach((feature) => {
          const [key, value] = feature.trim().split('=')
          if (key && value) {
            parsedFeatures[key] = isNaN(+value) ? value : +value
          }
        })
      }

      // When content blocking is active, block any cross-origin ad redirect
      if (blockingMode !== 'disabled' && isLikelyAdRedirect(details.url, contents.getURL())) {
        return { action: 'deny' }
      }

      // Check if this is a popup (has dimensions or explicit popup feature)
      const isPopup =
        parsedFeatures.popup === '1' || parsedFeatures.width || parsedFeatures.height || disposition === 'new-window'

      if (isPopup) {
        // When content blocking is active, only allow same-origin popups (auth flows)
        if (blockingMode !== 'disabled') {
          try {
            const openerUrl = contents.getURL()
            const popupUrl = details.url
            const openerOrigin = new URL(openerUrl).origin
            const popupOrigin = new URL(popupUrl).origin
            if (openerOrigin !== popupOrigin) {
              return { action: 'deny' }
            }
          } catch {
            return { action: 'deny' }
          }
        }

        return {
          action: 'allow',
          outlivesOpener: true,
          overrideBrowserWindowOptions: {
            width: Number(parsedFeatures.width) || 800,
            height: Number(parsedFeatures.height) || 600,
            x: Number(parsedFeatures.left) || undefined,
            y: Number(parsedFeatures.top) || undefined,
            frame: false,
            show: true,
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true,
              sandbox: true,
            },
          },
        }
      }

      // When content blocking is active, also block cross-origin "other" dispositions
      // (e.g. script-triggered foreground/background tabs that aren't user clicks)
      if (blockingMode !== 'disabled' && disposition === 'other') {
        try {
          const openerOrigin = new URL(contents.getURL()).origin
          const targetOrigin = new URL(details.url).origin
          if (openerOrigin !== targetOrigin) {
            return { action: 'deny' }
          }
        } catch {
          return { action: 'deny' }
        }
      }

      // For regular links, create temporary app in the correct parent window
      const popupOwner = getOwnerWindow(contents)
      if (popupOwner && !popupOwner.isDestroyed()) {
        popupOwner.webContents.send('external-link-navigation', {
          url: details.url,
          currentUrl: contents.getURL(),
          title: '',
        })
      }
      return { action: 'deny' }
    })

    // Inject script to hide scrollbars in webviews
    contents.on('did-finish-load', () => {
      if (contents.isDestroyed()) return

      contents
        .executeJavaScript(
          `
        // Hide scrollbars
        const style = document.createElement('style');
        style.textContent = \`
          ::-webkit-scrollbar {
            width: 0px !important;
            height: 0px !important;
            display: none !important;
          }
          * {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }
          body::-webkit-scrollbar,
          html::-webkit-scrollbar,
          div::-webkit-scrollbar {
            width: 0px !important;
            height: 0px !important;
            display: none !important;
          }
        \`;
        document.head.appendChild(style);
      `,
          true
        )
        .catch(() => {})

      if (contents.isDestroyed()) return

      // Inject fullscreen helper to ensure fullscreen works for all video/game players
      contents
        .executeJavaScript(
          `
        (function() {
          if (window.__vlinder_fs_helper) return;
          window.__vlinder_fs_helper = true;

          // Ensure the Fullscreen API works by polyfilling vendor-prefixed methods
          if (!Element.prototype.requestFullscreen) {
            Element.prototype.requestFullscreen =
              Element.prototype.webkitRequestFullscreen ||
              Element.prototype.mozRequestFullScreen ||
              Element.prototype.msRequestFullscreen ||
              function() { return Promise.reject(new Error('Fullscreen not supported')); };
          }
          if (!document.exitFullscreen) {
            document.exitFullscreen =
              document.webkitExitFullscreen ||
              document.mozCancelFullScreen ||
              document.msExitFullscreen ||
              function() { return Promise.reject(new Error('Fullscreen not supported')); };
          }

          // Override requestFullscreen to ensure it works on any element
          const origRequestFullscreen = Element.prototype.requestFullscreen;
          Element.prototype.requestFullscreen = function(options) {
            try {
              return origRequestFullscreen.call(this, options);
            } catch(e) {
              // If the element itself can't go fullscreen, try document.documentElement
              if (this !== document.documentElement) {
                return origRequestFullscreen.call(document.documentElement, options);
              }
              throw e;
            }
          };

          // For iframes - ensure they have allowfullscreen attribute
          const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
              for (const node of mutation.addedNodes) {
                if (node.nodeName === 'IFRAME' || (node.querySelectorAll && node.querySelectorAll('iframe').length > 0)) {
                  const iframes = node.nodeName === 'IFRAME' ? [node] : node.querySelectorAll('iframe');
                  for (const iframe of iframes) {
                    if (!iframe.hasAttribute('allowfullscreen')) {
                      iframe.setAttribute('allowfullscreen', '');
                      iframe.setAttribute('allow', (iframe.getAttribute('allow') || '') + '; fullscreen');
                    }
                  }
                }
              }
            }
          });
          observer.observe(document.documentElement, { childList: true, subtree: true });

          // Set allowfullscreen on existing iframes
          document.querySelectorAll('iframe').forEach(function(iframe) {
            if (!iframe.hasAttribute('allowfullscreen')) {
              iframe.setAttribute('allowfullscreen', '');
              iframe.setAttribute('allow', (iframe.getAttribute('allow') || '') + '; fullscreen');
            }
          });
        })();
      `,
          true
        )
        .catch(() => {})
    })
  })
  } // end webContentsHandlerRegistered guard

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // If opened with a specific URL, send it to the renderer once loaded
  if (initialUrl) {
    mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(() => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send('external-link-navigation', {
            url: initialUrl,
            currentUrl: '',
            title: '',
          })
        }
      }, 500)
    })
  }

  return mainWindow
}

export function createIncognitoWindow(): BrowserWindow {
  registerResourcesProtocol()

  const partitionName = `incognito-${Date.now()}`
  const incognitoSession = session.fromPartition(partitionName)

  // Mirror essential session config from normal window
  const defaultUA = app.userAgentFallback
  incognitoSession.setUserAgent(defaultUA)

  const chromiumVersion = process.versions.chrome.split('.')[0]
  incognitoSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['SEC-CH-UA'] =
      `"Chromium";v="${chromiumVersion}", "Google Chrome";v="${chromiumVersion}", "Not-A.Brand";v="99"`
    details.requestHeaders['SEC-CH-UA-MOBILE'] = '?0'
    details.requestHeaders['SEC-CH-UA-PLATFORM'] =
      process.platform === 'win32' ? '"Windows"' : process.platform === 'darwin' ? '"macOS"' : '"Linux"'
    callback({ cancel: false, requestHeaders: details.requestHeaders })
  })

  incognitoSession.setPermissionRequestHandler((_wc, permission, cb) => {
    const allowed = ['media', 'mediaKeySystem', 'geolocation', 'notifications', 'fullscreen', 'pointerLock', 'clipboard-read', 'clipboard-sanitized-write']
    cb(allowed.includes(permission))
  })

  const win = new BrowserWindow({
    width: 1200,
    height: 700,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    backgroundColor: '#00000000',
    ...(process.platform === 'win32' ? { backgroundMaterial: 'acrylic' as const } : { transparent: true }),
    icon: appIcon,
    frame: false,
    titleBarStyle: 'hiddenInset',
    title: 'Vlinder (Incognito)',
    maximizable: true,
    resizable: true,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      sandbox: false,
      webviewTag: true,
      session: incognitoSession,
    },
  })

  setupMenu()

  win.on('ready-to-show', () => {
    win.show()
    contentBlocker.initialize(incognitoSession).catch(() => {})
  })

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Tell the renderer it's incognito after load
  win.webContents.once('did-finish-load', () => {
    if (!win.isDestroyed()) {
      win.webContents.send('set-incognito', true, partitionName)
    }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

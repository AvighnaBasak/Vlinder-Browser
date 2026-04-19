import { BrowserWindow, shell, app, session, Menu, MenuItem, ipcMain } from 'electron'
import { join } from 'path'
import appIcon from '@/resources/build/icon.png?asset'
import { registerResourcesProtocol } from './protocols'
import { registerWindowHandlers } from '@/lib/conveyor/handlers/window-handler'
import { registerAppHandlers } from '@/lib/conveyor/handlers/app-handler'
import { registerConfigHandlers } from '@/lib/conveyor/handlers/config-handler'
import { contentBlocker } from '@/lib/main/modules/content-blocker'
import { getCurrentShortcut } from '@/lib/main/modules/shortcuts'
import { shortcutsEmitter } from '@/lib/main/modules/shortcuts-storage'
import { downloadManager } from '@/lib/main/modules/download-manager'

// Menu setup function
function setupMenu(mainWindow: BrowserWindow) {
  const craftMenu = async () => {
    const isMac = process.platform === 'darwin'

    const template: Array<MenuItemConstructorOptions | MenuItem> = [
      // macOS App Menu
      ...(isMac
        ? [
            {
              label: 'Lux',
              submenu: [
                {
                  label: 'About Lux',
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
                  label: 'Hide Lux',
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
            label: 'Settings',
            accelerator: getCurrentShortcut('browser.openSettings'),
            click: () => {
              mainWindow.webContents.send('navigate-to-settings')
            },
          },
          {
            label: 'Downloads',
            accelerator: getCurrentShortcut('browser.openDownloads'),
            click: () => {
              mainWindow.webContents.send('navigate-to-downloads')
            },
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
            click: () => {
              mainWindow.webContents.send('toggle-sidebar')
            },
          },
          {
            label: 'Toggle Command Palette',
            accelerator: getCurrentShortcut('browser.toggleCommandPalette'),
            click: () => {
              mainWindow.webContents.send('toggle-command-palette')
            },
          },
          {
            label: 'Next Tab',
            accelerator: getCurrentShortcut('browser.nextTab'),
            click: () => {
              mainWindow.webContents.send('next-tab')
            },
          },
          {
            label: 'Reopen Closed Tab',
            accelerator: getCurrentShortcut('browser.reopenClosedTab'),
            click: () => {
              mainWindow.webContents.send('reopen-closed-tab')
            },
          },
          { type: 'separator' },
          {
            label: 'Reload Platform',
            accelerator: getCurrentShortcut('platform.reload'),
            click: () => {
              mainWindow.webContents.send('reload-platform')
            },
          },
          {
            label: 'Force Reload Platform',
            accelerator: getCurrentShortcut('platform.forceReload'),
            click: () => {
              mainWindow.webContents.send('force-reload-platform')
            },
          },
          { type: 'separator' },
          {
            label: 'Toggle DevTools',
            accelerator: getCurrentShortcut('platform.toggleDevTools'),
            click: () => {
              mainWindow.webContents.toggleDevTools()
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
            click: () => {
              mainWindow.webContents.send('go-back')
            },
          },
          {
            label: 'Go Forward',
            accelerator: getCurrentShortcut('navigation.goForward'),
            click: () => {
              mainWindow.webContents.send('go-forward')
            },
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
            click: () => {
              mainWindow.webContents.send('close-platform')
            },
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

// Global flag to track if user confirmed quit with downloads
let shouldQuitWithDownloads = false

export function createAppWindow(): BrowserWindow {
  // Register custom protocol for resources
  registerResourcesProtocol()

  // Create the main window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 700,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    // Use acrylic on Windows, backgroundColor on Linux
    ...(process.platform === 'win32' ? { backgroundMaterial: 'acrylic' as const } : { transparent: true }),
    icon: appIcon,
    frame: false,
    titleBarStyle: 'hiddenInset',
    title: 'Lux',
    maximizable: true,
    resizable: true,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      sandbox: false,
      webviewTag: true,
    },
  })

  // Register IPC events for the main window.
  registerWindowHandlers(mainWindow)
  registerAppHandlers(app, mainWindow)
  registerConfigHandlers()

  // Set main window for download manager
  downloadManager.setMainWindow(mainWindow)

  // Initialize download path from config (if saved) or use default
  // This will be updated when config handlers are registered
  const unifiedSession = session.fromPartition('persist:unified-session')

  // Load saved download path from config store
  const initDownloadPath = async () => {
    try {
      const Store = await import('electron-store')
      const ElectronStore = Store.default
      const store = new ElectronStore({ name: 'lux-config' })
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

  // Set up download handler for unified session (used by all webviews) - MUST be before webviews are created
  unifiedSession.on('will-download', (event, downloadItem, webContents) => {
    downloadManager.handleDownload(webContents, downloadItem)
  })

  // Initialize background URLs tracking (shared with app-handler)
  if (!(global as any).__backgroundUrls) {
    ;(global as any).__backgroundUrls = new Set<string>()
  }
  const backgroundUrls = (global as any).__backgroundUrls as Set<string>

  // Fast one-way IPC for marking background URLs (bypasses conveyor validation for speed)
  ipcMain.on('mark-background-url-fast', (_event, url: string) => {
    if (typeof url === 'string' && url) {
      backgroundUrls.add(url)
      // Clean up after 5 seconds
      setTimeout(() => {
        backgroundUrls.delete(url)
      }, 5000)
    }
  })

  // Setup application menu
  setupMenu(mainWindow)

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
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Handle webview security and external links
  app.on('web-contents-created', (_, contents) => {
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

      // Send context menu event to renderer
      mainWindow.webContents.send('webview-context-menu', {
        x: params.x,
        y: params.y,
        selectionText: params.selectionText,
        linkURL: params.linkURL,
        srcURL: params.srcURL,
        webContentsId: contents.id,
        isEditable: params.isEditable,
        inputFieldType: params.inputFieldType,
      })
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
          // This is an external link - check if it should be background
          const isBackground = backgroundUrls.has(navigationUrl)

          if (isBackground) {
            // Remove from set (one-time use)
            backgroundUrls.delete(navigationUrl)
          }

          // This is an external link - send to renderer to create temporary app
          event.preventDefault()
          const eventName = isBackground ? 'external-link-navigation-background' : 'external-link-navigation'
          mainWindow.webContents.send(eventName, {
            url: navigationUrl,
            currentUrl: currentUrl,
            title: contents.getTitle(),
          })
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
      const { disposition, features } = details

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

      // Check if this is a popup (has dimensions or explicit popup feature)
      const isPopup =
        parsedFeatures.popup === '1' || parsedFeatures.width || parsedFeatures.height || disposition === 'new-window'

      if (isPopup) {
        // Allow popup windows for authentication/login
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

      // For regular links, create temporary app as before
      mainWindow.webContents.send('external-link-navigation', {
        url: details.url,
        currentUrl: contents.getURL(),
        title: '', // Title will be fetched when the temporary app loads
      })
      return { action: 'deny' }
    })

    // Inject script to hide scrollbars in webviews
    contents.on('did-finish-load', () => {
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
        .catch(() => {
          // Ignore errors
        })
    })
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

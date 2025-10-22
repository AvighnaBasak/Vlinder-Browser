// Browser Context for NW.js
// This module provides browser functionality in the NW.js unified context
// Replaces Electron's main.js process separation

const path = require('path')
const fs = require('fs')

// NW.js globals
const nwWin = nw.Window.get()
const nwApp = nw.App

// Get database module
const db = require('./db')

// Paths configuration
const SHELL_ROOT_DIR = path.join(__dirname, '../')
const PATHS = {
  WEBUI: path.join(__dirname, 'ui'),
  LOCAL_EXTENSIONS: path.join(__dirname, '../../extensions'),
  HISTORY: path.join(__dirname, 'ui', 'history.html'),
  DOWNLOADS: path.join(__dirname, 'ui', 'downloads.html'),
  BOOKMARKS: path.join(__dirname, 'ui', 'bookmarks.html'),
}

console.log('[Browser Context] SHELL_ROOT_DIR:', SHELL_ROOT_DIR)
console.log('[Browser Context] WEBUI path:', PATHS.WEBUI)

// Chrome UA for Google login compatibility
const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

class BrowserContext {
  constructor() {
    this.window = nwWin
    this.downloads = new Map()
    this.urls = {
      newtab: 'https://www.google.com',
    }

    console.log('[Browser Context] Initializing...')
    this.init()
  }

  init() {
    // Set up User Agent spoofing for Google services
    this.setupUserAgentSpoofing()

    // Setup history handlers (direct function calls, no IPC)
    this.setupHistoryHandlers()

    // Setup download handlers
    this.setupDownloadHandlers()

    // Setup bookmark handlers
    this.setupBookmarkHandlers()

    // Setup theme/background handlers
    this.setupThemeHandlers()

    // Load WebUI extension
    this.loadWebuiExtension()

    // Load local extensions
    this.loadLocalExtensions()

    console.log('[Browser Context] Initialization complete')
  }

  setupUserAgentSpoofing() {
    // NW.js uses chrome.webRequest for header manipulation
    if (chrome && chrome.webRequest) {
      chrome.webRequest.onBeforeSendHeaders.addListener(
        (details) => {
          const url = details.url || ''
          const isGoogle =
            /(^https?:\/\/([^\/]+\.)?(google|gstatic|googleusercontent|googleapis)\.[a-z.]+\/)/i.test(
              url,
            ) || /accounts\.google\.com/i.test(url)

          if (isGoogle) {
            const headers = details.requestHeaders || []

            // Update or add User-Agent
            let uaFound = false
            headers.forEach((header) => {
              if (header.name.toLowerCase() === 'user-agent') {
                header.value = CHROME_UA
                uaFound = true
              }
            })
            if (!uaFound) {
              headers.push({ name: 'User-Agent', value: CHROME_UA })
            }

            // Add Chrome client hints
            headers.push({
              name: 'sec-ch-ua',
              value: '"Chromium";v="120", "Google Chrome";v="120", ";Not A Brand";v="24"',
            })
            headers.push({ name: 'sec-ch-ua-platform', value: '"Windows"' })
            headers.push({ name: 'sec-ch-ua-mobile', value: '?0' })

            return { requestHeaders: headers }
          }

          return { requestHeaders: details.requestHeaders }
        },
        { urls: ['<all_urls>'] },
        ['blocking', 'requestHeaders'],
      )

      console.log('[Browser Context] User-Agent spoofing configured for Google services')
    }
  }

  setupHistoryHandlers() {
    // History functions available globally
    window.browserHistory = {
      save: (url, title) => {
        try {
          db.insert(url, title)
          this.updateExtensionHistory()
        } catch (err) {
          console.error('[History] Save failed:', err)
        }
      },

      getAll: () => {
        try {
          return db.getAll()
        } catch (err) {
          console.error('[History] Get all failed:', err)
          return []
        }
      },

      clear: (duration) => {
        try {
          db.clearByDuration(duration)
          this.updateExtensionHistory()
        } catch (err) {
          console.error('[History] Clear failed:', err)
        }
      },

      delete: (ids) => {
        try {
          const numericIds = Array.isArray(ids) ? ids.map((id) => Number(id)) : []
          db.deleteByIds(numericIds)
          this.updateExtensionHistory()
        } catch (err) {
          console.error('[History] Delete failed:', err)
        }
      },
    }

    console.log('[Browser Context] History handlers configured')
  }

  updateExtensionHistory() {
    try {
      const historyData = db.getAll()
      const historyJsonPath = path.join(PATHS.WEBUI, 'history-data.json')

      if (historyData.length === 0) {
        if (fs.existsSync(historyJsonPath)) {
          fs.unlinkSync(historyJsonPath)
        }
        console.log('[History] Cleared: removed history-data.json')
      } else {
        fs.writeFileSync(historyJsonPath, JSON.stringify(historyData, null, 2))
        console.log('[History] Updated:', historyData.length, 'entries')
      }
    } catch (err) {
      console.error('[History] Update failed:', err)
    }
  }

  setupDownloadHandlers() {
    // Downloads via chrome.downloads API in NW.js
    if (chrome && chrome.downloads) {
      // Track downloads
      chrome.downloads.onCreated.addListener((item) => {
        console.log('[Downloads] Started:', item.filename)
        this.downloads.set(item.id, item)
        this.updateDownloadsMirror()
      })

      chrome.downloads.onChanged.addListener((delta) => {
        if (delta.state && delta.state.current === 'complete') {
          console.log('[Downloads] Completed:', delta.id)
        }
        this.updateDownloadsMirror()
      })

      console.log('[Browser Context] Download handlers configured')
    }

    // Global download functions
    window.browserDownloads = {
      getAll: () => {
        return new Promise((resolve) => {
          if (chrome && chrome.downloads) {
            chrome.downloads.search({}, (downloads) => {
              resolve(downloads)
            })
          } else {
            resolve([])
          }
        })
      },

      clear: () => {
        return new Promise((resolve) => {
          this.downloads.clear()
          this.updateDownloadsMirror()
          resolve([])
        })
      },
    }
  }

  updateDownloadsMirror() {
    try {
      const downloadsPath = path.join(PATHS.WEBUI, 'downloads-data.json')
      const list = Array.from(this.downloads.values())
      fs.writeFileSync(downloadsPath, JSON.stringify(list, null, 2))
    } catch (err) {
      console.error('[Downloads] Update mirror failed:', err)
    }
  }

  setupBookmarkHandlers() {
    // Global bookmark functions
    window.browserBookmarks = {
      getAll: () => {
        try {
          const bookmarksPath = path.join(PATHS.WEBUI, 'bookmarks-data.json')
          if (fs.existsSync(bookmarksPath)) {
            const data = fs.readFileSync(bookmarksPath, 'utf8')
            return JSON.parse(data)
          }
          return []
        } catch (err) {
          console.error('[Bookmarks] Get all failed:', err)
          return []
        }
      },

      add: (url, title) => {
        try {
          const bookmarksPath = path.join(PATHS.WEBUI, 'bookmarks-data.json')
          let bookmarks = []

          if (fs.existsSync(bookmarksPath)) {
            const data = fs.readFileSync(bookmarksPath, 'utf8')
            bookmarks = JSON.parse(data)
          }

          const existing = bookmarks.find((b) => b.url === url)
          if (!existing) {
            const bookmark = {
              id: Date.now() + Math.random(),
              url: url,
              title: title || url,
              favicon: null,
              added_at: new Date().toISOString(),
            }
            bookmarks.unshift(bookmark)
            fs.writeFileSync(bookmarksPath, JSON.stringify(bookmarks, null, 2))
            console.log('[Bookmarks] Added:', url)
          }
        } catch (err) {
          console.error('[Bookmarks] Add failed:', err)
        }
      },

      delete: (ids) => {
        try {
          const bookmarksPath = path.join(PATHS.WEBUI, 'bookmarks-data.json')
          if (fs.existsSync(bookmarksPath)) {
            let bookmarks = JSON.parse(fs.readFileSync(bookmarksPath, 'utf8'))
            bookmarks = bookmarks.filter((b) => !ids.includes(b.id))
            fs.writeFileSync(bookmarksPath, JSON.stringify(bookmarks, null, 2))
            console.log('[Bookmarks] Deleted:', ids.length, 'items')
          }
        } catch (err) {
          console.error('[Bookmarks] Delete failed:', err)
        }
      },

      isBookmarked: (url) => {
        try {
          const bookmarks = window.browserBookmarks.getAll()
          return bookmarks.some((b) => b.url === url)
        } catch (err) {
          return false
        }
      },
    }

    console.log('[Browser Context] Bookmark handlers configured')
  }

  setupThemeHandlers() {
    // Global theme functions
    window.browserTheme = {
      apply: (themeData) => {
        try {
          const themePath = path.join(PATHS.WEBUI, 'current-theme.json')
          fs.writeFileSync(themePath, JSON.stringify(themeData, null, 2))
          console.log('[Theme] Saved:', themeData.theme)

          // Reload theme in all contexts
          if (window.ThemeManager) {
            window.ThemeManager.loadAndApplyTheme()
          }
        } catch (err) {
          console.error('[Theme] Apply failed:', err)
        }
      },

      applyBackground: (backgroundData) => {
        try {
          const backgroundPath = path.join(PATHS.WEBUI, 'background-settings.json')
          fs.writeFileSync(backgroundPath, JSON.stringify(backgroundData, null, 2))
          console.log('[Background] Saved:', backgroundData.type)
        } catch (err) {
          console.error('[Background] Apply failed:', err)
        }
      },
    }

    // OpenRouter API Key handlers
    window.browserOpenRouter = {
      getKey: () => {
        try {
          const keyPath = path.join(nwApp.dataPath, 'openrouter-key.json')
          if (fs.existsSync(keyPath)) {
            const data = fs.readFileSync(keyPath, 'utf8')
            return JSON.parse(data)
          }
          return null
        } catch (err) {
          console.error('[OpenRouter] Get key failed:', err)
          return null
        }
      },

      saveKey: (data) => {
        try {
          const keyPath = path.join(nwApp.dataPath, 'openrouter-key.json')
          // Ensure data directory exists
          if (!fs.existsSync(nwApp.dataPath)) {
            fs.mkdirSync(nwApp.dataPath, { recursive: true })
          }
          fs.writeFileSync(keyPath, JSON.stringify(data, null, 2))
          console.log('[OpenRouter] Key saved')
          return { success: true }
        } catch (err) {
          console.error('[OpenRouter] Save key failed:', err)
          throw err
        }
      },
    }

    console.log('[Browser Context] Theme/Background handlers configured')
  }

  loadWebuiExtension() {
    // In NW.js, the WebUI is already loaded as the main page
    // Extension protocol handling is built-in via chrome-extension://
    // The ui/manifest.json defines the extension

    // Try to get extension ID from chrome.runtime
    if (chrome && chrome.runtime && chrome.runtime.id) {
      const extensionId = chrome.runtime.id
      this.urls.newtab = `chrome-extension://${extensionId}/new-tab.html`
      console.log('[Browser Context] WebUI extension ID:', extensionId)
      console.log('[Browser Context] New tab URL:', this.urls.newtab)
    } else {
      console.warn('[Browser Context] Unable to get extension ID, using fallback')
      this.urls.newtab = 'ui/new-tab.html'
    }
  }

  loadLocalExtensions() {
    // NW.js loads extensions via chrome.management API or manifest
    // Extensions in the extensions/ folder can be loaded programmatically

    if (!fs.existsSync(PATHS.LOCAL_EXTENSIONS)) {
      console.log('[Extensions] No local extensions folder found')
      return
    }

    try {
      const extensions = fs.readdirSync(PATHS.LOCAL_EXTENSIONS)
      console.log('[Extensions] Found', extensions.length, 'potential extensions')

      // In NW.js, extensions can be loaded using nw.App.manifest
      // or by specifying them in package.json
      // For now, just log them
      extensions.forEach((ext) => {
        const extPath = path.join(PATHS.LOCAL_EXTENSIONS, ext)
        if (fs.statSync(extPath).isDirectory()) {
          console.log('[Extensions] Extension folder:', ext)
        }
      })
    } catch (err) {
      console.error('[Extensions] Load failed:', err)
    }
  }
}

// Initialize browser context
let browserContext = null

function initBrowserContext() {
  if (!browserContext) {
    browserContext = new BrowserContext()
  }
  return browserContext
}

// Auto-initialize when loaded
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    initBrowserContext()
  })
}

module.exports = { BrowserContext, initBrowserContext }

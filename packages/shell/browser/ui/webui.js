class WebUI {
  windowId = -1
  activeTabId = -1
  /** @type {chrome.tabs.Tab[]} */
  tabList = []

  constructor() {
    const $ = document.querySelector.bind(document)

    this.$ = {
      tabList: $('#tabstrip .tab-list'),
      tabTemplate: $('#tabtemplate'),
      createTabButton: $('#createtab'),
      goBackButton: $('#goback'),
      goForwardButton: $('#goforward'),
      reloadButton: $('#reload'),
      addressUrl: $('#addressurl'),

      browserActions: $('#actions'),

      minimizeButton: $('#minimize'),
      maximizeButton: $('#maximize'),
      closeButton: $('#close'),

      settingsButton: $('#settings'),
      downloadsButton: $('#downloads'),
      downloadsBadge: $('#downloads-badge'),
      bookmarksButton: $('#bookmarks'),
      starButton: $('#star-button'),
      starIcon: $('#star-icon'),
      aiBot: $('#ai-bot'),
      aiChatPanel: $('#ai-chat-panel'),
      aiPanelClose: $('#ai-panel-close'),
    }

    // Helper to focus address bar with a few retries to beat view focus races
    this.focusAddressBarSoon = () => {
      const doFocus = () => {
        try {
          window.focus()
          const el = this.$.addressUrl
          if (!el) return
          // Simulate a real user click to transfer focus styling
          el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
          el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
          el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
          el.focus({ preventScroll: true })
          try {
            el.setSelectionRange(0, el.value.length)
          } catch {}
        } catch {}
      }
      const tryFocus = (delay) => setTimeout(doFocus, delay)
      tryFocus(0)
      tryFocus(40)
      tryFocus(100)
      tryFocus(200)
      requestAnimationFrame(doFocus)
    }

    this.$.createTabButton.addEventListener('click', () => {
      const currentUrl = window.location.href
      const extensionId = currentUrl.match(/chrome-extension:\/\/([^\/]+)/)?.[1]
      const newtabUrl = extensionId
        ? `chrome-extension://${extensionId}/new-tab.html`
        : 'about:blank'
      chrome.tabs.create({ url: newtabUrl })
    })
    this.$.goBackButton.addEventListener('click', () => chrome.tabs.goBack())
    this.$.goForwardButton.addEventListener('click', () => chrome.tabs.goForward())
    this.$.reloadButton.addEventListener('click', () => chrome.tabs.reload())
    this.$.addressUrl.addEventListener('keypress', this.onAddressUrlKeyPress.bind(this))

    // Drag-and-drop support (address bar only - tabs handle their own content)
    const addressBarContainer = this.$.addressUrl.parentElement

    if (addressBarContainer) {
      addressBarContainer.addEventListener('dragover', (e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
        addressBarContainer.style.background = 'rgba(138, 180, 248, 0.1)'
      })

      addressBarContainer.addEventListener('dragleave', () => {
        addressBarContainer.style.background = ''
      })

      addressBarContainer.addEventListener('drop', (e) => {
        e.preventDefault()
        addressBarContainer.style.background = ''

        const files = e.dataTransfer?.files
        if (files && files.length > 0) {
          const filePath = files[0].path
          if (filePath) {
            const fileUrl = 'file:///' + filePath.replace(/\\/g, '/')
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs && tabs[0]) {
                chrome.tabs.update(tabs[0].id, { url: fileUrl })
              }
            })
          }
        }
      })
    }

    this.$.minimizeButton.addEventListener('click', () =>
      chrome.windows.get(chrome.windows.WINDOW_ID_CURRENT, (win) => {
        chrome.windows.update(win.id, { state: win.state === 'minimized' ? 'normal' : 'minimized' })
      }),
    )
    this.$.maximizeButton.addEventListener('click', () =>
      chrome.windows.get(chrome.windows.WINDOW_ID_CURRENT, (win) => {
        chrome.windows.update(win.id, { state: win.state === 'maximized' ? 'normal' : 'maximized' })
      }),
    )
    this.$.closeButton.addEventListener('click', () => chrome.windows.remove())

    // Settings button - open history page
    this.$.settingsButton.addEventListener('click', () => {
      // Only open history tab on button click, not via keyboard shortcut
      const currentUrl = window.location.href
      const extensionId = currentUrl.match(/chrome-extension:\/\/([^\/]+)/)?.[1]
      if (extensionId) {
        const historyUrl = `chrome-extension://${extensionId}/history.html`
        chrome.tabs.create({ url: historyUrl })
      }
    })

    // Bookmarks button - open bookmarks page
    this.$.bookmarksButton.addEventListener('click', () => {
      const currentUrl = window.location.href
      const extensionId = currentUrl.match(/chrome-extension:\/\/([^\/]+)/)?.[1]
      if (extensionId) {
        const bookmarksUrl = `chrome-extension://${extensionId}/bookmarks.html`
        chrome.tabs.create({ url: bookmarksUrl })
      }
    })

    // Star button - toggle bookmark
    this.$.starButton.addEventListener('click', () => {
      this.toggleBookmark()
    })

    // AI Bot button - toggle panel open/close
    this.aiPanelOpen = false
    if (this.$.aiBot) {
      this.$.aiBot.addEventListener('click', () => {
        this.toggleAIPanel()
      })
    }

    // AI Panel close button
    this.$.aiPanelClose.addEventListener('click', () => {
      this.closeAIPanel()
    })

    // Downloads button - open downloads page
    this.$.downloadsButton.addEventListener('click', () => {
      // Only open downloads tab on button click, not via keyboard shortcut
      const currentUrl = window.location.href
      const extensionId = currentUrl.match(/chrome-extension:\/\/([^\/]+)/)?.[1]
      if (extensionId) {
        const downloadsUrl = `chrome-extension://${extensionId}/downloads.html`
        chrome.tabs.create({ url: downloadsUrl })
      }
    })

    // Subscribe to download updates to drive toolbar animations/badge
    // NW.js: Download updates will be handled via chrome.downloads API
    // TODO: Implement download badge updates using chrome.downloads.onChanged
    this._downloadingCount = 0

    // Placeholder for NW.js download tracking
    if (typeof chrome !== 'undefined' && chrome.downloads) {
      try {
        chrome.downloads.onChanged.addListener((delta) => {
          // Update badge when download state changes
          if (delta.state) {
            chrome.downloads.search({}, (downloads) => {
              const active = downloads.filter((d) => d.state === 'in_progress').length
              this._downloadingCount = active
              this.updateDownloadsBadge(active, delta.state.current === 'complete')
            })
          }
        })
      } catch (err) {
        console.log('[WebUI] Chrome downloads API not available:', err)
      }
    }

    this.updateDownloadsBadge = (active, flash) => {
      if (!this.$.downloadsBadge) return
      if (active > 0) {
        this.$.downloadsBadge.style.display = 'inline-block'
        this.$.downloadsBadge.textContent = String(active)
        this.$.downloadsButton.classList.add('downloading')
      } else {
        this.$.downloadsBadge.textContent = ''
        this.$.downloadsBadge.style.display = 'none'
        this.$.downloadsButton.classList.remove('downloading')
      }
      if (flash) {
        this.$.downloadsButton.classList.add('download-complete')
        setTimeout(() => this.$.downloadsButton.classList.remove('download-complete'), 900)
      }
    }

    const platformClass = `platform-${navigator.userAgentData.platform.toLowerCase()}`
    document.body.classList.add(platformClass)

    this.initTabs()

    // NW.js: Direct event handling, no IPC needed
    // Focus address bar when requested (e.g., via Ctrl+L shortcut)
    window.addEventListener('focus-address-bar', () => {
      try {
        this.$.addressUrl?.focus()
        this.$.addressUrl?.select()
      } catch {}
    })

    // Immediately focus the address bar on new tab load
    this.focusAddressBarSoon()
  }

  async initTabs() {
    const tabs = await new Promise((resolve) => chrome.tabs.query({ windowId: -2 }, resolve))
    this.tabList = [...tabs]
    this.renderTabs()

    const activeTab = this.tabList.find((tab) => tab.active)
    if (activeTab) {
      this.setActiveTab(activeTab)
    }

    // Wait to setup tabs and windowId prior to listening for updates.
    this.setupBrowserListeners()
  }

  setupBrowserListeners() {
    if (!chrome.tabs.onCreated) {
      throw new Error(`chrome global not setup. Did the extension preload not get run?`)
    }

    const findTab = (tabId) => {
      const existingTab = this.tabList.find((tab) => tab.id === tabId)
      return existingTab
    }

    const findOrCreateTab = (tabId) => {
      const existingTab = findTab(tabId)
      if (existingTab) return existingTab

      const newTab = { id: tabId }
      this.tabList.push(newTab)
      return newTab
    }

    chrome.tabs.onCreated.addListener((tab) => {
      if (tab.windowId !== this.windowId) return
      const newTab = findOrCreateTab(tab.id)
      Object.assign(newTab, tab)
      this.renderTabs()
      // If the newly created tab is active and is new-tab, focus immediately
      if (
        newTab.active &&
        typeof newTab.url === 'string' &&
        /\/new-tab\.html(\b|$)/.test(newTab.url)
      ) {
        this.focusAddressBarSoon()
      }
    })

    chrome.tabs.onActivated.addListener((activeInfo) => {
      if (activeInfo.windowId !== this.windowId) return

      this.setActiveTab(activeInfo)
    })

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, details) => {
      const tab = findTab(tabId)
      if (!tab) return
      Object.assign(tab, details)
      this.renderTabs()
      if (tabId === this.activeTabId) this.renderToolbar(tab)
      // When the active tab finishes navigating to the new-tab page, focus the address bar
      if (
        tabId === this.activeTabId &&
        typeof tab.url === 'string' &&
        /\/new-tab\.html(\b|$)/.test(tab.url)
      ) {
        this.focusAddressBarSoon()
      }
    })

    chrome.tabs.onRemoved.addListener((tabId) => {
      const tabIndex = this.tabList.findIndex((tab) => tab.id === tabId)
      if (tabIndex > -1) {
        this.tabList.splice(tabIndex, 1)
        this.$.tabList.querySelector(`[data-tab-id="${tabId}"]`).remove()
      }
    })
  }

  setActiveTab(activeTab) {
    this.activeTabId = activeTab.id || activeTab.tabId
    this.windowId = activeTab.windowId

    for (const tab of this.tabList) {
      if (tab.id === this.activeTabId) {
        tab.active = true
        this.renderTab(tab)
        this.renderToolbar(tab)
        // If this is the new-tab page, focus the address bar as soon as we become active
        if (typeof tab.url === 'string' && /\/new-tab\.html(\b|$)/.test(tab.url)) {
          this.focusAddressBarSoon()
        }
      } else {
        if (tab.active) {
          tab.active = false
          this.renderTab(tab)
        }
      }
    }
  }

  onAddressUrlKeyPress(event) {
    if (event.code === 'Enter') {
      const raw = this.$.addressUrl.value.trim()

      const hasProtocol = /^(https?:|file:|mailto:|chrome:|about:)/i.test(raw)
      const looksLikeDomain =
        /^(localhost|\d+\.\d+\.\d+\.\d+|([\w-]+\.)+[a-z]{2,})(:\d+)?(\/|$)/i.test(raw)

      let url
      if (hasProtocol) {
        url = raw
      } else if (looksLikeDomain) {
        url = 'http://' + raw
      } else {
        url = 'https://www.google.com/search?q=' + encodeURIComponent(raw)
      }

      chrome.tabs.update({ url })
    }
  }

  createTabNode(tab) {
    const tabElem = this.$.tabTemplate.content.cloneNode(true).firstElementChild
    tabElem.dataset.tabId = tab.id

    tabElem.addEventListener('click', () => {
      chrome.tabs.update(tab.id, { active: true })
    })
    tabElem.querySelector('.close').addEventListener('click', (e) => {
      e.stopPropagation()
      // Add slide-out animation before removing
      tabElem.classList.add('tab-exit')
      setTimeout(() => {
        chrome.tabs.remove(tab.id)
      }, getTabSlideDuration()) // Match the animation duration
    })
    const faviconElem = tabElem.querySelector('.favicon')
    faviconElem?.addEventListener('load', () => {
      faviconElem.classList.toggle('loaded', true)
    })
    faviconElem?.addEventListener('error', () => {
      faviconElem.classList.toggle('loaded', false)
    })

    this.$.tabList.appendChild(tabElem)

    // Add slide-in animation
    requestAnimationFrame(() => {
      tabElem.classList.add('tab-enter')
      // Remove animation class after animation completes
      setTimeout(() => {
        tabElem.classList.remove('tab-enter')
      }, getTabSlideDuration()) // Match the animation duration
    })

    return tabElem
  }

  renderTab(tab) {
    let tabElem = this.$.tabList.querySelector(`[data-tab-id="${tab.id}"]`)
    if (!tabElem) tabElem = this.createTabNode(tab)

    if (tab.active) {
      tabElem.dataset.active = ''
    } else {
      delete tabElem.dataset.active
    }

    const favicon = tabElem.querySelector('.favicon')
    if (tab.favIconUrl) {
      favicon.src = tab.favIconUrl
    } else {
      delete favicon.src
    }

    tabElem.querySelector('.title').textContent = tab.title
    tabElem.querySelector('.audio').disabled = !tab.audible
  }

  renderTabs() {
    this.tabList.forEach((tab) => {
      this.renderTab(tab)
    })
  }

  renderToolbar(tab) {
    const url = tab.url || ''
    const isInternal =
      /\/new-tab\.html(\b|$)|\/history\.html(\b|$)|\/downloads\.html(\b|$)|\/bookmarks\.html(\b|$)|\/dns-error\.html(\b|$)|\/no-internet\.html(\b|$)/.test(
        url,
      )
    this.$.addressUrl.value = isInternal ? '' : url
    // Update star icon based on bookmark status
    this.updateStarIcon(url)
    // this.$.browserActions.tab = tab.id
  }

  switchTab(direction) {
    if (!this.tabList.length) return
    const currentIdx = this.tabList.findIndex((tab) => tab.id === this.activeTabId)
    let newIdx = (currentIdx + direction + this.tabList.length) % this.tabList.length
    const newTab = this.tabList[newIdx]
    if (newTab) chrome.tabs.update(newTab.id, { active: true })
  }

  switchToTabIndex(idx) {
    if (!this.tabList.length) return
    if (idx < 0 || idx >= this.tabList.length) return
    const tab = this.tabList[idx]
    if (tab) chrome.tabs.update(tab.id, { active: true })
  }

  toggleAIPanel() {
    if (this.aiPanelOpen) {
      this.closeAIPanel()
    } else {
      this.openAIPanel()
    }
  }

  openAIPanel() {
    this.aiPanelOpen = true

    if (!this.$.aiChatPanel) {
      return
    }

    this.$.aiChatPanel.classList.add('open')
    document.body.classList.add('ai-panel-open')

    // Force a style recalculation to ensure animation works
    void this.$.aiChatPanel.offsetWidth

    // Set global variable for main process polling
    window.__aiPanelOpen = true
  }

  closeAIPanel() {
    this.aiPanelOpen = false
    this.$.aiChatPanel.classList.remove('open')
    document.body.classList.remove('ai-panel-open')
    // Set global variable for main process polling
    window.__aiPanelOpen = false
    console.log('Set window.__aiPanelOpen = false')
  }

  async toggleBookmark() {
    const activeTab = this.tabList.find((tab) => tab.active)
    if (!activeTab || !activeTab.url) return

    const url = activeTab.url

    // Don't bookmark internal pages
    if (/^chrome-extension:\/\//.test(url)) return

    console.log('[Bookmark] Toggling bookmark for:', url)

    // Check if already bookmarked
    try {
      const response = await fetch('./bookmarks-data.json')
      const bookmarks = await response.json()
      const isBookmarked = bookmarks.some((b) => b.url === url)

      if (isBookmarked) {
        // Remove bookmark
        console.log('[Bookmark] Removing bookmark')
        const updatedBookmarks = bookmarks.filter((b) => b.url !== url)
        window.__deleteBookmarks = {
          bookmarks: updatedBookmarks,
          timestamp: Date.now(),
        }
        this.$.starIcon.src = './unselected-star.png'
      } else {
        // Add bookmark
        console.log('[Bookmark] Adding bookmark')
        window.__toggleBookmark = {
          url: url,
          title: activeTab.title || url,
          timestamp: Date.now(),
        }
        this.$.starIcon.src = './selected-star.png'
      }
    } catch (err) {
      // No bookmarks file yet, just add
      console.log('[Bookmark] No bookmarks file, adding first bookmark')
      window.__toggleBookmark = {
        url: url,
        title: activeTab.title || url,
        timestamp: Date.now(),
      }
      this.$.starIcon.src = './selected-star.png'
    }
  }

  async updateStarIcon(url) {
    // Hide star for internal pages
    if (!url || /^chrome-extension:\/\//.test(url)) {
      this.$.starIcon.src = './unselected-star.png'
      this.$.starButton.style.opacity = '0.3'
      this.$.starButton.style.pointerEvents = 'none'
      return
    }

    // Enable star button
    this.$.starButton.style.opacity = '0.7'
    this.$.starButton.style.pointerEvents = 'auto'

    // Check if this URL is bookmarked
    try {
      const response = await fetch('./bookmarks-data.json')
      const bookmarks = await response.json()
      const isBookmarked = bookmarks.some((b) => b.url === url)

      if (isBookmarked) {
        this.$.starIcon.src = './selected-star.png'
        console.log('[Bookmark] Page is bookmarked, showing selected star')
      } else {
        this.$.starIcon.src = './unselected-star.png'
      }
    } catch (err) {
      // No bookmarks file or error reading it
      this.$.starIcon.src = './unselected-star.png'
    }
  }
}

function getTabSlideDuration() {
  const durationStr = getComputedStyle(document.documentElement)
    .getPropertyValue('--tab-slide-duration')
    .trim()
  let duration = 300
  if (durationStr.endsWith('ms')) duration = parseFloat(durationStr)
  else if (durationStr.endsWith('s')) duration = parseFloat(durationStr) * 1000
  return duration
}

// Load saved theme on startup
function loadSavedTheme() {
  const savedTheme = localStorage.getItem('browser-theme') || 'default'
  console.log('Loading saved theme:', savedTheme)

  // Apply theme immediately
  const themes = {
    default: {
      '--bg-color': '#111112',
      '--text-color': '#e0e0e0',
      '--tab-color': '#232324',
      '--tab-active-color': '#2c2c2e',
      '--tab-hover-color': '#29292b',
      '--input-bg': '#18181a',
      '--input-border': '#333335',
      '--input-focus': '#444448',
    },
    ocean: {
      '--bg-color': '#0a1929',
      '--text-color': '#e3f2fd',
      '--tab-color': '#1e3a8a',
      '--tab-active-color': '#3b82f6',
      '--tab-hover-color': '#1d4ed8',
      '--input-bg': '#1e40af',
      '--input-border': '#3b82f6',
      '--input-focus': '#60a5fa',
    },
    forest: {
      '--bg-color': '#0d1b2a',
      '--text-color': '#f1faee',
      '--tab-color': '#2d5016',
      '--tab-active-color': '#52b788',
      '--tab-hover-color': '#4ade80',
      '--input-bg': '#166534',
      '--input-border': '#52b788',
      '--input-focus': '#6ee7b7',
    },
    sunset: {
      '--bg-color': '#2d1b69',
      '--text-color': '#fff5f5',
      '--tab-color': '#7c2d12',
      '--tab-active-color': '#f97316',
      '--tab-hover-color': '#fb923c',
      '--input-bg': '#9a3412',
      '--input-border': '#f97316',
      '--input-focus': '#fb923c',
    },
    lavender: {
      '--bg-color': '#1a0b2e',
      '--text-color': '#faf5ff',
      '--tab-color': '#581c87',
      '--tab-active-color': '#a855f7',
      '--tab-hover-color': '#c084fc',
      '--input-bg': '#6b21a8',
      '--input-border': '#a855f7',
      '--input-focus': '#c084fc',
    },
    cherry: {
      '--bg-color': '#2d1b1b',
      '--text-color': '#fef2f2',
      '--tab-color': '#7f1d1d',
      '--tab-active-color': '#ef4444',
      '--tab-hover-color': '#f87171',
      '--input-bg': '#991b1b',
      '--input-border': '#ef4444',
      '--input-focus': '#f87171',
    },
  }

  const theme = themes[savedTheme]
  if (theme) {
    const root = document.documentElement
    Object.entries(theme).forEach(([property, value]) => {
      root.style.setProperty(property, value)
    })
    console.log('Theme applied:', savedTheme)
  }
}

// Add fade-in animation to body on navigation/reload
function triggerPageFadeIn() {
  document.body.classList.remove('page-fade-in')
  void document.body.offsetWidth
  document.body.classList.add('page-fade-in')
  // Get duration from CSS variable
  const durationStr = getComputedStyle(document.documentElement)
    .getPropertyValue('--page-fadein-duration')
    .trim()
  let duration = 600
  if (durationStr.endsWith('ms')) duration = parseFloat(durationStr)
  else if (durationStr.endsWith('s')) duration = parseFloat(durationStr) * 1000
  setTimeout(() => {
    document.body.classList.remove('page-fade-in')
  }, duration + 50) // small buffer
}

// Load theme when page loads
document.addEventListener('DOMContentLoaded', loadSavedTheme)
window.addEventListener('DOMContentLoaded', triggerPageFadeIn)
window.addEventListener('pageshow', triggerPageFadeIn)
window.addEventListener('popstate', triggerPageFadeIn)
window.addEventListener('hashchange', triggerPageFadeIn)

window.webui = new WebUI()

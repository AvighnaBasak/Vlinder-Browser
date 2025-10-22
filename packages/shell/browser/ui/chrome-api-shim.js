// Chrome API Shim for NW.js
// Provides chrome.tabs and other extension APIs when running in NW.js main window context

console.log('[Chrome API Shim] Loading...')

// Create chrome object if it doesn't exist
if (typeof chrome === 'undefined') {
  window.chrome = {}
}

// Get tabs manager reference (will be set by webui.js after Tabs class is initialized)
let tabsManager = null

window.setTabsManager = (manager) => {
  tabsManager = manager
  console.log('[Chrome API Shim] Tabs manager set')
}

// Chrome Tabs API Shim
if (!chrome.tabs) {
  console.log('[Chrome API Shim] Creating chrome.tabs shim')

  const tabsApi = {
    // Create a new tab
    create(createProperties, callback) {
      console.log('[chrome.tabs.create] Called with:', createProperties)
      if (!tabsManager) {
        console.error('[chrome.tabs.create] Tabs manager not initialized!')
        return
      }

      const tab = tabsManager.create()
      const url = createProperties?.url || 'about:blank'

      if (url) {
        tab.loadURL(url)
      }

      // Create chrome tab object
      const chromeTab = {
        id: tab.id,
        index: tabsManager.tabList.indexOf(tab),
        windowId: -2, // Current window
        active: true,
        url: url,
        title: '',
        favIconUrl: '',
      }

      if (callback) {
        callback(chromeTab)
      }

      // Emit onCreated event
      if (tabsApi.onCreated) {
        setTimeout(() => tabsApi.onCreated.emit(chromeTab), 0)
      }

      return chromeTab
    },

    // Update tab properties
    update(tabIdOrProps, updateProperties, callback) {
      console.log('[chrome.tabs.update] Called with:', tabIdOrProps, updateProperties)
      if (!tabsManager) return

      let tabId = tabIdOrProps
      let props = updateProperties

      // If first arg is an object (no tabId specified), use active tab
      if (typeof tabIdOrProps === 'object') {
        props = tabIdOrProps
        tabId = tabsManager.selected?.id
      }

      const tab = tabId ? tabsManager.get(tabId) : tabsManager.selected

      if (tab && props) {
        if (props.url) {
          tab.loadURL(props.url)
        }
        if (props.active !== undefined && props.active) {
          tabsManager.select(tab.id)
        }

        const chromeTab = {
          id: tab.id,
          url: tab.currentURL || props.url,
          active: tab === tabsManager.selected,
          windowId: -2,
        }

        if (callback) {
          callback(chromeTab)
        }

        // Emit onUpdated event
        if (tabsApi.onUpdated) {
          setTimeout(() => tabsApi.onUpdated.emit(tab.id, props, chromeTab), 0)
        }
      }
    },

    // Query tabs
    query(queryInfo, callback) {
      console.log('[chrome.tabs.query] Called with:', queryInfo)
      if (!tabsManager) {
        if (callback) callback([])
        return
      }

      const tabs = tabsManager.tabList.map((tab, index) => ({
        id: tab.id,
        index: index,
        windowId: queryInfo?.windowId || -2,
        active: tab === tabsManager.selected,
        url: tab.currentURL || 'about:blank',
        title: tab.currentTitle || '',
        favIconUrl: '',
      }))

      let filtered = tabs

      // Filter by active
      if (queryInfo?.active !== undefined) {
        filtered = filtered.filter((t) => t.active === queryInfo.active)
      }

      // Filter by currentWindow
      if (queryInfo?.currentWindow) {
        // All tabs are in current window
      }

      console.log('[chrome.tabs.query] Returning', filtered.length, 'tabs')

      if (callback) {
        callback(filtered)
      }

      return Promise.resolve(filtered)
    },

    // Remove/close tab
    remove(tabId, callback) {
      console.log('[chrome.tabs.remove] Called with:', tabId)
      if (!tabsManager) return

      const tab = tabsManager.get(tabId)
      if (tab) {
        tabsManager.remove(tabId)

        if (callback) {
          callback()
        }

        // Emit onRemoved event
        if (tabsApi.onRemoved) {
          setTimeout(
            () => tabsApi.onRemoved.emit(tabId, { windowId: -2, isWindowClosing: false }),
            0,
          )
        }
      }
    },

    // Go back
    goBack(tabId, callback) {
      console.log('[chrome.tabs.goBack] Called')
      if (!tabsManager) return

      const tab = tabId ? tabsManager.get(tabId) : tabsManager.selected
      if (tab && tab.webContents) {
        tab.webContents.goBack()
      }

      if (callback) callback()
    },

    // Go forward
    goForward(tabId, callback) {
      console.log('[chrome.tabs.goForward] Called')
      if (!tabsManager) return

      const tab = tabId ? tabsManager.get(tabId) : tabsManager.selected
      if (tab && tab.webContents) {
        tab.webContents.goForward()
      }

      if (callback) callback()
    },

    // Reload
    reload(tabId, reloadProperties, callback) {
      console.log('[chrome.tabs.reload] Called')
      if (!tabsManager) return

      const tab = tabId ? tabsManager.get(tabId) : tabsManager.selected
      if (tab && tab.webContents) {
        tab.webContents.reload()
      }

      if (callback) callback()
    },

    // Events
    onCreated: createEvent(),
    onUpdated: createEvent(),
    onActivated: createEvent(),
    onRemoved: createEvent(),
  }

  chrome.tabs = tabsApi
  console.log('[Chrome API Shim] chrome.tabs API created')
}

// Chrome Windows API Shim
if (!chrome.windows) {
  console.log('[Chrome API Shim] Creating chrome.windows shim')

  const nwWin = nw.Window.get()

  chrome.windows = {
    WINDOW_ID_CURRENT: -2,

    get(windowId, callback) {
      const win = {
        id: -2,
        focused: true,
        top: nwWin.y,
        left: nwWin.x,
        width: nwWin.width,
        height: nwWin.height,
        state: nwWin.isFullscreen ? 'fullscreen' : nwWin.isMaximized ? 'maximized' : 'normal',
        type: 'normal',
      }

      if (callback) {
        callback(win)
      }
      return Promise.resolve(win)
    },

    update(windowId, updateInfo, callback) {
      if (updateInfo.state === 'minimized') {
        nwWin.minimize()
      } else if (updateInfo.state === 'maximized') {
        nwWin.maximize()
      } else if (updateInfo.state === 'normal') {
        nwWin.restore()
      } else if (updateInfo.state === 'fullscreen') {
        nwWin.enterFullscreen()
      }

      if (callback) {
        callback()
      }
    },

    remove(windowId, callback) {
      nwWin.close()
      if (callback) callback()
    },
  }
}

// Chrome Runtime API Shim (minimal)
if (!chrome.runtime) {
  console.log('[Chrome API Shim] Creating chrome.runtime shim')

  chrome.runtime = {
    id: 'nwjs-webui',
    onMessage: createEvent(),
    sendMessage(message, callback) {
      console.log('[chrome.runtime.sendMessage]', message)
      if (callback) callback()
    },
  }
}

// Helper to create event emitter
function createEvent() {
  const listeners = []

  return {
    addListener(callback) {
      listeners.push(callback)
    },

    removeListener(callback) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    },

    emit(...args) {
      listeners.forEach((listener) => {
        try {
          listener(...args)
        } catch (err) {
          console.error('[Event] Error in listener:', err)
        }
      })
    },
  }
}

console.log('[Chrome API Shim] Initialization complete')

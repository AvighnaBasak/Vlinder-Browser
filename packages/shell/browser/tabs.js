const { EventEmitter } = require('events')

const toolbarHeight = 64

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

class Tab {
  constructor(parentContainer, options = {}) {
    this.invalidateLayout = this.invalidateLayout.bind(this)
    this.extraTop = 0
    this.aiPanelWidth = 0
    this.destroyed = false

    // Create iframe element
    this.iframe = document.createElement('iframe')
    this.id = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    this.iframe.id = this.iframe_id = this.id

    // NW.js frame attributes
    this.iframe.setAttribute('nwfaketop', '') // Treat iframe as top-level for window.top
    this.iframe.setAttribute('nwdisable', '') // Disable Node.js in iframe content
    this.iframe.setAttribute('nwUserAgent', CHROME_UA)

    // Style iframe
    this.iframe.style.cssText = `
      position: absolute;
      border: none;
      border-radius: 8px;
      background: #fff;
      display: none;
    `

    // Allow permissions
    this.iframe.setAttribute(
      'allow',
      'camera; microphone; geolocation; autoplay; encrypted-media; fullscreen',
    )
    this.iframe.setAttribute('allowfullscreen', 'true')

    // Store parent container and window references
    this.container = parentContainer
    this.window = nw.Window.get()

    // Append to container
    this.container.appendChild(this.iframe)

    // Create webContents-like interface for compatibility
    this.webContents = this.createWebContentsInterface()

    // Track window state
    this._isFullscreen = false
    this._isMaximized = false

    // Setup window listeners
    this._onEnterFs = () => {
      this._isFullscreen = true
      this.invalidateLayout()
    }
    this._onLeaveFs = () => {
      this._isFullscreen = false
      this.invalidateLayout()
    }
    this._onResize = () => {
      this.invalidateLayout()
    }

    this.window.on('enter-fullscreen', this._onEnterFs)
    this.window.on('leave-fullscreen', this._onLeaveFs)
    this.window.on('resize', this._onResize)

    // Track navigation for history
    this.currentURL = 'about:blank'
    this.currentTitle = ''

    // Setup iframe load listener
    this.iframe.addEventListener('load', () => {
      try {
        // Update current URL and title
        this.currentURL = this.iframe.contentWindow.location.href
        this.currentTitle = this.iframe.contentWindow.document.title || this.currentURL

        // Emit navigation events
        if (this.webContents._emitter) {
          this.webContents._emitter.emit('did-navigate', null, this.currentURL)
          this.webContents._emitter.emit('did-finish-load')
          this.webContents._emitter.emit('page-title-updated', null, this.currentTitle)
        }
      } catch (err) {
        // Cross-origin iframe, can't access
        console.log('[Tab] Cross-origin iframe, cannot access content')
      }
    })
  }

  createWebContentsInterface() {
    const self = this
    const emitter = new EventEmitter()

    return {
      id: this.id,
      _emitter: emitter,
      _iframe: this.iframe,

      loadURL(url) {
        self.iframe.src = url
        self.currentURL = url
        return Promise.resolve()
      },

      getURL() {
        try {
          return self.iframe.contentWindow.location.href
        } catch {
          return self.currentURL
        }
      },

      getTitle() {
        try {
          return self.iframe.contentWindow.document.title || self.currentTitle
        } catch {
          return self.currentTitle
        }
      },

      reload() {
        if (self.iframe.contentWindow) {
          self.iframe.contentWindow.location.reload()
        }
      },

      goBack() {
        if (self.iframe.contentWindow) {
          self.iframe.contentWindow.history.back()
        }
      },

      goForward() {
        if (self.iframe.contentWindow) {
          self.iframe.contentWindow.history.forward()
        }
      },

      canGoBack() {
        try {
          return self.iframe.contentWindow.history.length > 1
        } catch {
          return false
        }
      },

      canGoForward() {
        try {
          return self.iframe.contentWindow.history.length > 1
        } catch {
          return false
        }
      },

      toggleDevTools() {
        // In NW.js, DevTools for iframes can be opened
        if (self.iframe.contentWindow) {
          try {
            self.iframe.contentWindow.nw.Window.get().showDevTools()
          } catch (err) {
            console.log('[Tab] DevTools not available for this iframe')
          }
        }
      },

      executeJavaScript(code) {
        return new Promise((resolve, reject) => {
          try {
            const result = self.iframe.contentWindow.eval(code)
            resolve(result)
          } catch (err) {
            reject(err)
          }
        })
      },

      isDestroyed() {
        return self.destroyed
      },

      on(event, handler) {
        emitter.on(event, handler)
      },

      once(event, handler) {
        emitter.once(event, handler)
      },

      removeListener(event, handler) {
        emitter.removeListener(event, handler)
      },

      emit(event, ...args) {
        emitter.emit(event, ...args)
      },

      getType() {
        return 'webview' // Pretend to be webview for compatibility
      },

      getOwnerBrowserWindow() {
        return self.window
      },
    }
  }

  setExtraTop(pixels) {
    const n = Math.max(0, Number(pixels) || 0)
    if (this.extraTop !== n) {
      this.extraTop = n
      this.invalidateLayout()
    }
  }

  setAIPanelWidth(pixels) {
    const n = Math.max(0, Number(pixels) || 0)
    console.log(
      `Tab ${this.id}: setAIPanelWidth called with ${pixels}, setting to ${n}, current: ${this.aiPanelWidth}`,
    )
    if (this.aiPanelWidth !== n) {
      this.aiPanelWidth = n
      console.log(`Tab ${this.id}: aiPanelWidth changed, calling invalidateLayout`)
      this.invalidateLayout()
    } else {
      console.log(`Tab ${this.id}: aiPanelWidth unchanged, skipping layout`)
    }
  }

  destroy() {
    if (this.destroyed) return

    this.destroyed = true

    this.hide()

    // Remove window listeners
    try {
      this.window.off('enter-fullscreen', this._onEnterFs)
    } catch {}
    try {
      this.window.off('leave-fullscreen', this._onLeaveFs)
    } catch {}
    try {
      this.window.off('resize', this._onResize)
    } catch {}

    // Remove iframe from DOM
    if (this.iframe && this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe)
    }

    this.iframe = null
    this.webContents = null
    this.window = null
  }

  loadURL(url) {
    this.iframe.src = url
    this.currentURL = url
    return Promise.resolve()
  }

  show() {
    this.invalidateLayout()
    this.iframe.style.display = 'block'
  }

  hide() {
    this.iframe.style.display = 'none'
  }

  reload() {
    if (this.iframe.contentWindow) {
      this.iframe.contentWindow.location.reload()
    }
  }

  invalidateLayout() {
    if (!this.window || this.destroyed) return

    const [width, height] = [this.window.window.innerWidth, this.window.window.innerHeight]
    const padding = 8

    // Compute current state
    const isFs = this._isFullscreen
    const isMax = this._isMaximized
    const padMult = isFs || isMax ? 4 : 2
    const heightPadMult = isFs || isMax ? 3 : 1

    const bounds = {
      x: padding,
      y: toolbarHeight + this.extraTop,
      width: width - padding * padMult - this.aiPanelWidth,
      height: height - (toolbarHeight + this.extraTop) - padding * heightPadMult,
    }

    console.log(
      `Tab ${this.id} invalidateLayout: window=${width}x${height}, aiPanelWidth=${this.aiPanelWidth}, setting bounds:`,
      bounds,
    )

    // Apply bounds to iframe
    this.iframe.style.left = bounds.x + 'px'
    this.iframe.style.top = bounds.y + 'px'
    this.iframe.style.width = bounds.width + 'px'
    this.iframe.style.height = bounds.height + 'px'
  }
}

class Tabs extends EventEmitter {
  tabList = []
  selected = null

  constructor(containerElement) {
    super()
    this.container = containerElement || document.getElementById('tab-container')
    this.window = nw.Window.get()

    if (!this.container) {
      console.error('[Tabs] Tab container element not found!')
    }
  }

  setExtraTop(pixels) {
    this.tabList.forEach((tab) => tab.setExtraTop(pixels))
  }

  setAIPanelWidth(pixels) {
    console.log(`Tabs.setAIPanelWidth called with ${pixels}, updating ${this.tabList.length} tabs`)
    this.tabList.forEach((tab) => tab.setAIPanelWidth(pixels))
  }

  destroy() {
    this.tabList.forEach((tab) => tab.destroy())
    this.tabList = []
    this.selected = null

    if (this.window) {
      this.window.close()
      this.window = null
    }
  }

  get(tabId) {
    return this.tabList.find((tab) => tab.id === tabId)
  }

  create(options) {
    const tab = new Tab(this.container, options)
    this.tabList.push(tab)
    if (!this.selected) this.selected = tab
    tab.show()
    this.emit('tab-created', tab)
    this.select(tab.id)
    return tab
  }

  remove(tabId) {
    const tabIndex = this.tabList.findIndex((tab) => tab.id === tabId)
    if (tabIndex < 0) {
      throw new Error(`Tabs.remove: unable to find tab.id = ${tabId}`)
    }
    const tab = this.tabList[tabIndex]
    this.tabList.splice(tabIndex, 1)
    tab.destroy()
    if (this.selected === tab) {
      this.selected = null
      const nextTab = this.tabList[tabIndex] || this.tabList[tabIndex - 1]
      if (nextTab) this.select(nextTab.id)
    }
    this.emit('tab-destroyed', tab)
    if (this.tabList.length === 0) {
      // Don't destroy window, just close all tabs
      console.log('[Tabs] All tabs closed')
    }
  }

  select(tabId) {
    const tab = this.get(tabId)
    if (!tab) return
    if (this.selected) this.selected.hide()
    tab.show()
    this.selected = tab
    this.emit('tab-selected', tab)
  }
}

exports.Tabs = Tabs

const { EventEmitter } = require('events')
const { WebContentsView } = require('electron')

const toolbarHeight = 64

class Tab {
  constructor(parentWindow, wcvOpts = {}) {
    this.invalidateLayout = this.invalidateLayout.bind(this)
    this.extraTop = 0
    this.aiPanelWidth = 0

    // Delete undefined properties which cause WebContentsView constructor to
    // throw. This should probably be fixed in Electron upstream.
    if (wcvOpts.hasOwnProperty('webContents') && !wcvOpts.webContents) delete wcvOpts.webContents
    if (wcvOpts.hasOwnProperty('webPreferences') && !wcvOpts.webPreferences)
      delete wcvOpts.webPreferences

    this.view = new WebContentsView(wcvOpts)
    this.id = this.view.webContents.id
    this.window = parentWindow
    this.webContents = this.view.webContents
    this.window.contentView.addChildView(this.view)

    // Track fullscreen state explicitly; some environments delay isFullScreen()
    this._isFullscreen = !!this.window?.isFullScreen?.()
    this._isMaximized = !!this.window?.isMaximized?.()
    this._onEnterFs = () => {
      this._isFullscreen = true
      this.invalidateLayout()
    }
    this._onLeaveFs = () => {
      this._isFullscreen = false
      this.invalidateLayout()
    }
    this._onMaximize = () => {
      this._isMaximized = true
      this.invalidateLayout()
    }
    this._onUnmaximize = () => {
      this._isMaximized = false
      this.invalidateLayout()
    }
    this.window.on('enter-full-screen', this._onEnterFs)
    this.window.on('leave-full-screen', this._onLeaveFs)
    this.window.on('maximize', this._onMaximize)
    this.window.on('unmaximize', this._onUnmaximize)
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

    // Remove fullscreen listeners
    try {
      this.window.off('enter-full-screen', this._onEnterFs)
    } catch {}
    try {
      this.window.off('leave-full-screen', this._onLeaveFs)
    } catch {}
    try {
      this.window.off('maximize', this._onMaximize)
    } catch {}
    try {
      this.window.off('unmaximize', this._onUnmaximize)
    } catch {}

    this.window.contentView.removeChildView(this.view)
    this.window = undefined

    if (!this.webContents.isDestroyed()) {
      if (this.webContents.isDevToolsOpened()) {
        this.webContents.closeDevTools()
      }

      // TODO: why is this no longer called?
      this.webContents.emit('destroyed')

      this.webContents.destroy()
    }

    this.webContents = undefined
    this.view = undefined
  }

  loadURL(url) {
    return this.view.webContents.loadURL(url)
  }

  show() {
    this.invalidateLayout()
    this.startResizeListener()
    this.view.setVisible(true)
  }

  hide() {
    this.stopResizeListener()
    this.view.setVisible(false)
  }

  reload() {
    this.view.webContents.reload()
  }

  invalidateLayout() {
    const [width, height] = this.window.getSize()
    const padding = 8
    // Compute current state defensively in case events lag
    const isFs =
      typeof this.window.isFullScreen === 'function'
        ? this.window.isFullScreen()
        : this._isFullscreen
    const isMax =
      typeof this.window.isMaximized === 'function' ? this.window.isMaximized() : this._isMaximized
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
    this.view.setBounds(bounds)
    this.view.setBorderRadius(8)
  }

  // Replacement for BrowserView.setAutoResize. This could probably be better...
  startResizeListener() {
    this.stopResizeListener()
    this.window.on('resize', this.invalidateLayout)
  }
  stopResizeListener() {
    this.window.off('resize', this.invalidateLayout)
  }
}

class Tabs extends EventEmitter {
  tabList = []
  selected = null

  constructor(browserWindow) {
    super()
    this.window = browserWindow
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

    this.selected = undefined

    if (this.window) {
      this.window.destroy()
      this.window = undefined
    }
  }

  get(tabId) {
    return this.tabList.find((tab) => tab.id === tabId)
  }

  create(webContentsViewOptions) {
    const tab = new Tab(this.window, webContentsViewOptions)
    this.tabList.push(tab)
    if (!this.selected) this.selected = tab
    tab.show() // must be attached to window
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
      this.selected = undefined
      const nextTab = this.tabList[tabIndex] || this.tabList[tabIndex - 1]
      if (nextTab) this.select(nextTab.id)
    }
    this.emit('tab-destroyed', tab)
    if (this.tabList.length === 0) {
      this.destroy()
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

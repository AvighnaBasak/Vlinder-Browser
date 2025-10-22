// NW.js Main Initialization Script
// This runs in the same context as webui.html, replacing Electron's main process

const path = require('path')
const fs = require('fs')

// Get the NW.js window
const nwWin = nw.Window.get()
const nwApp = nw.App

console.log('[NW.js Init] Starting browser initialization...')

// Load browser context module
const { initBrowserContext } = require('../browser-context.js')

// Paths configuration
const SHELL_ROOT_DIR = path.join(__dirname, '../../')
const PATHS = {
  WEBUI: __dirname,
  LOCAL_EXTENSIONS: path.join(__dirname, '../../../../extensions'),
  HISTORY: path.join(__dirname, 'history.html'),
  DB: path.join(__dirname, '../db.js'),
  TABS: path.join(__dirname, '../tabs.js'),
}

console.log('[Paths] SHELL_ROOT_DIR:', SHELL_ROOT_DIR)
console.log('[Paths] WEBUI path:', PATHS.WEBUI)

// Block default keyboard shortcuts that interfere with browser shortcuts
const blockedShortcuts = [
  'F5', // Reload
  'F11', // Fullscreen
  'Ctrl+R', // Reload
  'Ctrl+Shift+R', // Hard reload
  'Ctrl+W', // Close tab
  'Ctrl+N', // New window
  'Ctrl+T', // New tab
]

// Global shortcut registration will be handled by window event listeners
// NW.js doesn't need globalShortcut.register like Electron

// Initialize when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  console.log('[NW.js Init] DOM loaded, initializing browser...')

  try {
    // Initialize browser context (history, downloads, bookmarks, etc.)
    initBrowserContext()

    // Initialize tabs manager
    const { Tabs } = require('../tabs.js')
    const tabContainer = document.getElementById('tab-container')

    if (tabContainer) {
      window.tabsManager = new Tabs(tabContainer)
      console.log('[NW.js Init] Tabs manager created')

      // Connect tabs manager to chrome API shim
      if (window.setTabsManager) {
        window.setTabsManager(window.tabsManager)
        console.log('[NW.js Init] Tabs manager connected to chrome API shim')
      }

      // Set up tab event listeners for UI updates
      window.tabsManager.on('tab-created', (tab) => {
        console.log('[NW.js Init] Tab created:', tab.id)
      })

      window.tabsManager.on('tab-selected', (tab) => {
        console.log('[NW.js Init] Tab selected:', tab.id)
      })

      window.tabsManager.on('tab-destroyed', (tab) => {
        console.log('[NW.js Init] Tab destroyed:', tab.id)
      })
    } else {
      console.error('[NW.js Init] Tab container not found!')
    }

    // Expose global state for AI panel communication
    window.__aiPanelOpen = false
    window.__setAIPanelWidth = (width) => {
      console.log('[NW.js Init] __setAIPanelWidth called with:', width)
      return Promise.resolve(width)
    }

    console.log('[NW.js Init] Global functions installed')

    // Set up window close behavior
    nwWin.on('close', function () {
      console.log('[NW.js] Window close requested')
      // In NW.js, we can just close the window
      // Or implement custom close behavior here
      this.close(true) // Force close
    })

    // Handle minimize/maximize
    nwWin.on('minimize', function () {
      console.log('[NW.js] Window minimized')
    })

    nwWin.on('maximize', function () {
      console.log('[NW.js] Window maximized')
    })

    nwWin.on('restore', function () {
      console.log('[NW.js] Window restored')
    })

    console.log('[NW.js Init] Window event listeners configured')
  } catch (err) {
    console.error('[NW.js Init] Error during initialization:', err)
  }
})

// Log startup completion
console.log('[NW.js Init] Initialization script loaded')

// Export for use by webui.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PATHS,
    nwWin,
    nwApp,
  }
}

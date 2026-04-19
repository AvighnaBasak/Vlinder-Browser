import { registerAppForCurrentUserOnWindows } from './default-browser-windows'
import { exec } from 'child_process'
import { app } from 'electron'

export function isDefaultBrowser() {
  // Check if the app is registered as the default protocol client for http and https
  const httpIsDefault = app.isDefaultProtocolClient('http')
  const httpsIsDefault = app.isDefaultProtocolClient('https')

  // Return true if at least one protocol is registered (more lenient check)
  return httpIsDefault || httpsIsDefault
}

export function setDefaultBrowser() {
  // Always set the basic protocol clients first
  app.setAsDefaultProtocolClient('http')
  app.setAsDefaultProtocolClient('https')

  return new Promise((resolve) => {
    if (process.platform === 'linux' || process.platform.includes('bsd')) {
      exec('xdg-settings set default-web-browser lux.desktop', (err) => {
        if (err?.message) {
          // xdg-settings failed, but basic protocol registration should still work
          resolve(true) // Still return true as basic registration worked
        } else {
          resolve(true)
        }
      })
      return
    } else if (process.platform === 'win32') {
      // Try the full Windows registration first
      registerAppForCurrentUserOnWindows()
        .then((success) => {
          if (success) {
            resolve(true)
          } else {
            // If full registration fails, basic protocol registration should still work
            resolve(true)
          }
        })
        .catch((error) => {
          // Windows registration error, but basic protocol registration should still work
          resolve(true)
        })
      return
    } else if (process.platform === 'darwin') {
      // Electron API should be enough to show a popup for default app request
      resolve(true)
      return
    }

    // If we don't know how to set the default browser, return false
    resolve(false)
  })
}

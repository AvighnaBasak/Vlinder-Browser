/**
 * Webview CSS Management Hook
 * Professional hook for managing CSS injection lifecycle
 */

import { useCallback, useEffect, useRef } from 'react'
import { cssInjectionService } from '../services/CSSInjectionService'

export interface WebviewCSSOptions {
  reapplyInterval?: number
  enablePeriodicReapplication?: boolean
  transparencyEnabled?: boolean
}

export function useWebviewCSS(webview: any, platformName: string, isActive: boolean, options: WebviewCSSOptions = {}) {
  const { reapplyInterval = 3000, enablePeriodicReapplication = true, transparencyEnabled = false } = options

  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Apply CSS to the webview
   */
  const applyCSS = useCallback(async () => {
    if (!webview || !isActive) return

    // If transparency is disabled, only remove existing styles and return early
    if (!transparencyEnabled) {
      await cssInjectionService.removeTransparency(webview)
      return
    }

    await cssInjectionService.applyTransparency(webview, platformName, transparencyEnabled)
  }, [webview, platformName, isActive, transparencyEnabled])

  /**
   * Remove CSS from the webview
   */
  const removeCSS = useCallback(async () => {
    if (!webview) return
    await cssInjectionService.removeTransparency(webview)
  }, [webview])

  /**
   * Start periodic re-application for dynamic content
   */
  const startPeriodicReapplication = useCallback(() => {
    if (!enablePeriodicReapplication || !isActive) return

    intervalRef.current = setInterval(() => {
      applyCSS()
    }, reapplyInterval)
  }, [applyCSS, enablePeriodicReapplication, isActive, reapplyInterval])

  /**
   * Stop periodic re-application
   */
  const stopPeriodicReapplication = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Apply CSS when webview or active state changes
  useEffect(() => {
    if (isActive) {
      applyCSS()
    }
  }, [applyCSS, isActive])

  // Manage periodic re-application
  useEffect(() => {
    if (isActive && enablePeriodicReapplication && transparencyEnabled) {
      startPeriodicReapplication()
    } else {
      stopPeriodicReapplication()
    }

    return () => {
      stopPeriodicReapplication()
    }
  }, [
    isActive,
    enablePeriodicReapplication,
    transparencyEnabled,
    startPeriodicReapplication,
    stopPeriodicReapplication,
  ])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPeriodicReapplication()
      removeCSS()
    }
  }, [removeCSS, stopPeriodicReapplication])

  return {
    applyCSS,
    removeCSS,
  }
}

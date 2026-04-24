import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { Tab as Platform } from '@/app/types/tab'
import { useWebviewCSS } from '@/app/hooks/useWebviewCSS'
import { LoadingBar } from '@/app/components/ui/loading-bar'
import { useConveyor } from '@/app/hooks/use-conveyor'
import { useWebviewHistory } from '@/app/hooks/useHistory'
import WebviewSurface from '@/app/components/views/webview/WebviewSurface'
import OfflineOverlay from '@/app/components/views/webview/OfflineOverlay'
import WebviewContextMenuLayer from '@/app/components/views/webview/WebviewContextMenuLayer'

interface WebviewContainerProps {
  platform: Platform
  isActive: boolean
  isMuted?: boolean
  isPinned?: boolean
  reloadTrigger?: number
  onNotification?: () => void
  transparencyEnabled?: boolean
  loadingBarEnabled?: boolean
  onTabUpdate?: (updates: Partial<Platform>) => void
}

export interface WebviewContainerRef {
  goBack: () => void
  goForward: () => void
  reload: () => void
  forceReload: () => void
  navigate: (url: string) => void
  getCurrentUrl: () => string | null
  getCurrentTitle: () => string | null
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string
          useragent?: string
          partition?: string
          allowpopups?: string
        },
        HTMLElement
      >
    }
  }
}

const WebviewContainer = forwardRef<WebviewContainerRef, WebviewContainerProps>(
  (
    {
      platform,
      isActive,
      isMuted = false,
      isPinned = false,
      reloadTrigger = 0,
      onNotification,
      transparencyEnabled = false,
      loadingBarEnabled = true,
      onTabUpdate,
    },
    ref
  ) => {
    const conveyor = useConveyor()
    const webviewRef = useRef<HTMLElement>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isOffline, setIsOffline] = useState(!navigator.onLine)
    const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false)
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
    const [loadingProgress, setLoadingProgress] = useState(0)
    const [isHtmlFullscreen, setIsHtmlFullscreen] = useState(false)
    const previousTitleRef = useRef<string>('')

    // (context menu state moved to WebviewContextMenuLayer)

    // CSS management hook - only apply when active
    const { applyCSS } = useWebviewCSS(webviewRef.current, platform.name, isActive, {
      reapplyInterval: 3000,
      enablePeriodicReapplication: true,
      transparencyEnabled,
    })

    // History tracking
    useWebviewHistory(webviewRef, platform.id, isActive)

    // Lazy loading: only load webview when it becomes active for the first time
    // Exception: tabs with URLs (not about:blank) should load immediately in background (like min-master)
    // BUT: pinned tabs should NOT auto-load - they should only load when user clicks on them (saves memory)
    useEffect(() => {
      if (isActive && !hasLoadedOnce) {
        setHasLoadedOnce(true)
        setHasAttemptedLoad(true)
      } else if (platform.url && platform.url !== 'about:blank' && !hasLoadedOnce && !isPinned) {
        // Tabs with actual URLs should start loading immediately (like min-master)
        // This includes both temporary tabs and regular tabs opened from links
        // BUT exclude pinned tabs - they should only load when clicked (saves memory on startup)
        setHasLoadedOnce(true)
        setHasAttemptedLoad(true)
      }
    }, [isActive, hasLoadedOnce, platform.isTemporary, platform.url, isPinned])

    // Memory optimization: pause inactive webviews to save resources
    useEffect(() => {
      const webview = webviewRef.current as any
      if (!webview || !hasLoadedOnce) return

      let rafId: number | null = null

      // Use requestAnimationFrame to avoid blocking the main thread
      const optimizeWebview = () => {
        if (isActive) {
          try {
            // Resume webview if it was paused
            if (webview.isPaused && webview.isPaused()) {
              webview.resume()
            }
          } catch (error) {
            // Failed to resume
          }
        } else {
          try {
            // Don't pause tabs while they're still loading
            // This allows background tabs (both temporary and regular) to fully load in the background
            if (isLoading) {
              // Will pause automatically when isLoading becomes false (effect will re-run)
              return
            }
            // Pause webview to save resources
            if (webview.pause) {
              webview.pause()
            }
          } catch (error) {
            // Failed to pause
          }
        }
      }

      rafId = requestAnimationFrame(optimizeWebview)

      return () => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId)
        }
      }
    }, [isActive, hasLoadedOnce, platform.name, platform.isTemporary, isLoading])

    // Handle mute/unmute
    useEffect(() => {
      const webview = webviewRef.current as any
      if (!webview) return

      let timeoutId: NodeJS.Timeout | null = null

      // Wait for webview to be ready before setting audio
      const setAudioWhenReady = () => {
        try {
          if (webview.isLoading && webview.isLoading()) {
            // Webview is still loading, wait a bit more
            timeoutId = setTimeout(setAudioWhenReady, 100)
            return
          }
          webview.setAudioMuted(isMuted)
        } catch (error) {
          // Failed to mute/unmute
        }
      }

      // Small delay to ensure webview is ready
      timeoutId = setTimeout(setAudioWhenReady, 200)

      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
      }
    }, [isMuted, platform.name])

    // Handle reload trigger - track last trigger value to prevent loops
    const lastReloadTriggerRef = useRef<number>(0)
    useEffect(() => {
      if (reloadTrigger > 0 && reloadTrigger !== lastReloadTriggerRef.current) {
        const webview = webviewRef.current as any
        if (webview) {
          lastReloadTriggerRef.current = reloadTrigger
          setIsLoading(true)
          try {
            webview.reload()
          } catch (error) {
            setIsLoading(false)
          }
        }
      }
    }, [reloadTrigger, platform.name])

    // Track title changes for notification detection and update tab
    useEffect(() => {
      const webview = webviewRef.current as any
      if (!webview) return

      const handleTitleUpdate = async (event: any) => {
        const newTitle = event.title || ''
        const previousTitle = previousTitleRef.current

        // Update tab with new title and name (min-master style)
        // The name field is what's displayed in the tab, so update both
        if (onTabUpdate && newTitle && newTitle.trim()) {
          onTabUpdate({
            title: newTitle,
            name: newTitle, // Update name so tab shows the actual page title
          } as any)
        }

        // Emit title update to main process for temporary apps
        if (platform.isTemporary && newTitle !== previousTitle && newTitle.trim()) {
          conveyor.app.webviewTitleUpdated(platform.id, newTitle)
        }

        // Track history for title updates
        if (isActive && webviewRef.current) {
          try {
            const webview = webviewRef.current as any
            if (webview && webview.getURL && newTitle && newTitle.trim()) {
              const url = webview.getURL()
              if (url && url !== 'about:blank') {
                const { addHistoryEntry } = await import('@/app/services/history')
                addHistoryEntry(url, newTitle, false, platform.id)
              }
            }
          } catch {
            // Ignore errors
          }
        }

        // Detect notification indicators in title
        // Common patterns: (1) Message, [2] Notifications, 3 New, etc.
        const hasNotificationIndicator = /^\(\d+\)|^\[\d+\]|^\d+\s+/.test(newTitle)
        const hadNotificationIndicator = /^\(\d+\)|^\[\d+\]|^\d+\s+/.test(previousTitle)

        // If notification indicator appeared or count increased, trigger notification
        if (hasNotificationIndicator && newTitle !== previousTitle && !isActive && onNotification) {
          // Extract numbers from titles to compare
          const newCount = parseInt(newTitle.match(/\d+/)?.[0] || '0')
          const prevCount = parseInt(previousTitle.match(/\d+/)?.[0] || '0')

          // Only trigger if count increased or notification indicator just appeared
          if (newCount > prevCount || !hadNotificationIndicator) {
            onNotification()
          }
        }

        previousTitleRef.current = newTitle
      }

      webview.addEventListener('page-title-updated', handleTitleUpdate)

      return () => {
        webview.removeEventListener('page-title-updated', handleTitleUpdate)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [platform.name, isActive, onTabUpdate])

    // Handle favicon updates and extract background color (min-master style)
    useEffect(() => {
      const webview = webviewRef.current as any
      if (!webview || !onTabUpdate) return

      const handleFaviconUpdate = (event: any) => {
        const favicons = event.favicons || []
        if (favicons.length === 0) return

        const faviconUrl = favicons[0]

        // Extract background color from favicon image (min-master style)
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')
            if (!ctx) return

            ctx.drawImage(img, 0, 0)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const data = imageData.data

            // Calculate average color
            let r = 0,
              g = 0,
              b = 0,
              count = 0
            for (let i = 0; i < data.length; i += 4) {
              r += data[i]
              g += data[i + 1]
              b += data[i + 2]
              count++
            }
            r = Math.round(r / count)
            g = Math.round(g / count)
            b = Math.round(b / count)

            // Calculate luminance for text color
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
            const textColor = luminance > 0.5 ? '#000000' : '#ffffff'

            // Update tab with favicon and background color (min-master style)
            onTabUpdate({
              favicon: {
                url: faviconUrl,
                luminance: luminance * 255,
              },
              faviconUrl: faviconUrl, // Set faviconUrl for display
              logoUrl: faviconUrl, // Set logoUrl so tab shows the actual favicon
              backgroundColor: {
                color: `rgb(${r}, ${g}, ${b})`,
                textColor: textColor,
                isLowContrast: false,
              },
            } as any)
          } catch (error) {
            // Fallback: just update favicon URL
            onTabUpdate({
              faviconUrl: faviconUrl,
              logoUrl: faviconUrl, // Ensure logoUrl is set for display
            } as any)
          }
        }
        img.onerror = () => {
          try {
            const domain = new URL(faviconUrl).hostname
            const googleFavicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
            onTabUpdate({
              faviconUrl: googleFavicon,
              logoUrl: googleFavicon,
            } as any)
          } catch {
            onTabUpdate({
              faviconUrl: faviconUrl,
              logoUrl: faviconUrl,
            } as any)
          }
        }
        img.src = faviconUrl
      }

      const handleThemeColorChange = (event: any) => {
        const color = event.themeColor
        if (!color || !onTabUpdate) return

        // Parse color string to RGB
        const parseColor = (colorStr: string) => {
          if (colorStr.startsWith('#')) {
            const hex = colorStr.slice(1)
            const r = parseInt(hex.slice(0, 2), 16)
            const g = parseInt(hex.slice(2, 4), 16)
            const b = parseInt(hex.slice(4, 6), 16)
            return { r, g, b }
          }
          if (colorStr.startsWith('rgb')) {
            const matches = colorStr.match(/\d+/g)
            if (matches && matches.length >= 3) {
              return {
                r: parseInt(matches[0]),
                g: parseInt(matches[1]),
                b: parseInt(matches[2]),
              }
            }
          }
          return null
        }

        const rgb = parseColor(color)
        if (rgb) {
          const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
          const textColor = luminance > 0.5 ? '#000000' : '#ffffff'

          onTabUpdate({
            themeColor: {
              color: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
              textColor: textColor,
              isLowContrast: false,
            },
          } as any)
        }
      }

      let faviconReceived = false
      const origHandleFavicon = handleFaviconUpdate
      const wrappedHandleFavicon = (event: any) => {
        faviconReceived = true
        origHandleFavicon(event)
      }

      const handleDidFinishLoad = () => {
        if (faviconReceived) return
        try {
          const url = webview.getURL()
          if (!url || url === 'about:blank') return
          const domain = new URL(url).hostname
          const googleFavicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
          onTabUpdate({
            faviconUrl: googleFavicon,
            logoUrl: googleFavicon,
          } as any)
        } catch {}
      }

      const handleNavigationStart = (event: any) => {
        if (event.isMainFrame && onTabUpdate) {
          faviconReceived = false
          onTabUpdate({
            backgroundColor: null,
            favicon: null,
            faviconUrl: undefined,
          } as any)
        }
      }

      webview.addEventListener('page-favicon-updated', wrappedHandleFavicon)
      webview.addEventListener('did-change-theme-color', handleThemeColorChange)
      webview.addEventListener('did-start-navigation', handleNavigationStart)
      webview.addEventListener('did-finish-load', handleDidFinishLoad)

      return () => {
        webview.removeEventListener('page-favicon-updated', wrappedHandleFavicon)
        webview.removeEventListener('did-change-theme-color', handleThemeColorChange)
        webview.removeEventListener('did-start-navigation', handleNavigationStart)
        webview.removeEventListener('did-finish-load', handleDidFinishLoad)
      }
    }, [platform.id, onTabUpdate])

    useEffect(() => {
      const webview = webviewRef.current
      if (!webview) return

      // Add event listeners for webview
      const handleLoadStart = async () => {
        setIsLoading(true)
        setLoadingProgress(0)
        setHasAttemptedLoad(true)
        // Only clear offline state if we have internet connection
        if (navigator.onLine) {
          setIsOffline(false)
        }

        // Inject Ctrl+Click handler when DOM is ready (using dom-ready event)
        // This ensures it's ready as soon as the DOM is available
        try {
          const webviewAny = webview as any
          // Add dom-ready listener to inject handler as early as possible
          const domReadyHandler = async () => {
            try {
              await webviewAny.executeJavaScript(
                `(() => {
                  // Initialize array if it doesn't exist
                  if (!window.__UF_BACKGROUND_LINKS__) {
                    window.__UF_BACKGROUND_LINKS__ = [];
                  }
                  
                  // Remove existing listener if any (to avoid duplicates)
                  if (window.__UF_CTRL_CLICK_HANDLER__) {
                    document.removeEventListener('click', window.__UF_CTRL_CLICK_HANDLER__, true);
                    window.removeEventListener('click', window.__UF_CTRL_CLICK_HANDLER__, true);
                  }
                  
                  // Create new handler - use capture phase with highest priority
                  const handler = (e) => {
                    const anchor = e.target.closest('a');
                    if (anchor && (e.ctrlKey || e.metaKey)) {
                      const href = anchor.href || anchor.getAttribute('href');
                      if (href && href !== '#' && !href.startsWith('javascript:') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('data:')) {
                        // CRITICAL: Prevent navigation FIRST
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        
                        // Store the link for background tab
                        const linkData = {
                          url: href,
                          title: anchor.textContent?.trim() || anchor.title || anchor.getAttribute('title') || '',
                          timestamp: Date.now()
                        };
                        window.__UF_BACKGROUND_LINKS__.push(linkData);
                        
                        // Signal that we captured a Ctrl+Click (for debugging)
                        window.__UF_LAST_CTRL_CLICK__ = linkData;
                        
                        // Also send postMessage as backup
                        try {
                          window.postMessage({ type: 'CTRL_CLICK_LINK', data: linkData }, '*');
                        } catch (err) {
                          // postMessage might fail in some contexts, that's okay
                        }
                        
                        // Return false to further prevent navigation
                        return false;
                      }
                    }
                  };
                  
                  // Store handler reference for cleanup
                  window.__UF_CTRL_CLICK_HANDLER__ = handler;
                  // Add listener in capture phase with highest priority (useCapture=true, passive=false)
                  document.addEventListener('click', handler, { capture: true, passive: false });
                  // Also add to window for early interception
                  window.addEventListener('click', handler, { capture: true, passive: false });
                })()`
              )
            } catch (err) {
              // Ignore injection errors
            }
          }

          // Add dom-ready listener (fires when DOM is ready)
          // Store reference for cleanup
          domReadyHandlerRef = domReadyHandler
          webviewAny.addEventListener('dom-ready', domReadyHandler)

          // Also try to inject immediately if DOM is already ready
          // This handles the case where dom-ready already fired
          setTimeout(async () => {
            try {
              await webviewAny.executeJavaScript('document.readyState')
              // If we can execute JS, DOM is ready, so inject handler
              await domReadyHandler()
            } catch {
              // DOM not ready yet, dom-ready event will handle it
            }
          }, 100)
        } catch (e) {
          // Ignore injection errors
        }
      }

      const handleLoadStop = async () => {
        setIsLoading(false)
        setLoadingProgress(100)
        setIsOffline(false)

        // Apply CSS only if webview is ready and not loading
        try {
          const webviewAny = webview as any
          if (webviewAny && (!webviewAny.isLoading || !webviewAny.isLoading())) {
            await applyCSS()
          }
        } catch {
          // Ignore CSS application errors - don't let it block page load
        }

        // Update tab title and name when page finishes loading (min-master style)
        try {
          const webviewAny = webview as any
          const currentUrl = webviewAny?.getURL?.() || platform.url
          const currentTitle = webviewAny?.getTitle?.() || ''

          // Update tab with actual page title if available
          if (currentTitle && currentTitle.trim() && onTabUpdate) {
            onTabUpdate({
              title: currentTitle,
              name: currentTitle, // Update name so tab shows the actual page title
            } as any)
          }

          // Track history when page finishes loading
          if (currentUrl && currentUrl !== 'about:blank' && isActive) {
            const { addHistoryEntry } = await import('@/app/services/history')
            addHistoryEntry(currentUrl, currentTitle, false, platform.id)
          }
        } catch {
          // Ignore errors
        }

        // Inject capture hook and attempt autofill
        try {
          const webviewAny = webview as any
          const currentUrl = webviewAny?.getURL?.() || platform.url
          // Autofill
          try {
            const matches = await conveyor.passwords.findForUrl(currentUrl)
            if (matches && matches.length > 0) {
              const creds = await Promise.all(
                matches.map(async (m) => ({ ...m, ...(await conveyor.passwords.get(m.id)) }))
              )
              await webviewAny.executeJavaScript(`(() => {
                const credentials = ${JSON.stringify(
                  creds.map((c) => ({ username: c.username, password: c.password }))
                )};
                const setValue = (el, val) => { try { el.focus(); el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } catch { /* no-op */ } };
                const doc = document;
                const isVisible = (el) => {
                  if (!el) return false;
                  const style = window.getComputedStyle(el);
                  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
                  const r = el.getBoundingClientRect();
                  return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < (window.innerHeight || 0) && r.left < (window.innerWidth || 0);
                };
                const pw = Array.from(doc.querySelectorAll('input[autocomplete="current-password"], input[type="password"]')).find(isVisible);
                // try find form context first
                const form = pw?.form || pw?.closest('form') || doc.querySelector('form');
                const userCandidates = [
                  'input[autocomplete="username"]',
                  'input[type="email"]',
                  'input[name="identifier"]',
                  '#identifierId',
                  'input[name*="user" i]'
                ];
                const scope = form || doc;
                const user = userCandidates.map(sel => scope.querySelector(sel)).filter(Boolean).find(isVisible);
                const onLoginLikePage = /login|signin|auth|identifier|account/i.test(location.href);

                // Pending support across multi-step logins
                const PENDING_KEY = '__UF_PENDING_CRED__';
                const getPending = () => { try { return JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null'); } catch { return null; } };
                const setPending = (cred) => { try { sessionStorage.setItem(PENDING_KEY, JSON.stringify({ ...cred, ts: Date.now() })); } catch { /* no-op */ } };
                const clearPending = () => { try { sessionStorage.removeItem(PENDING_KEY); } catch { /* no-op */ } };

                const pending = getPending();

                // If password present and pending exists, complete automatically
                if (pw && pending) {
                  if (user && !user.value && pending.username) setValue(user, pending.username);
                  if (pending.password) setValue(pw, pending.password);
                  clearPending();
                  return;
                }

                // Require a real login context: either a visible password field, or a visible username on a login-like URL
                if (!pw && !(user && onLoginLikePage)) return;

                const fill = (cred) => {
                  if (user && cred.username) setValue(user, cred.username);
                  if (pw && cred.password) setValue(pw, cred.password);
                };

                if (credentials.length === 1) {
                  const single = credentials[0];
                  if (user && !pw) { setValue(user, single.username || ''); setPending(single); return; }
                  fill(single); clearPending();
                  return;
                }

                // If user already filled and matches a credential, auto-pick without chooser
                if (user && user.value) {
                  const match = credentials.find(c => (c.username || '').toLowerCase() === (user.value || '').toLowerCase());
                  if (match) {
                    if (!pw) { setPending(match); return; }
                    fill(match); clearPending();
                    return;
                  }
                }

                // chooser overlay (only when login context detected)
                try {
                  const id = '__uf_pwd_chooser__';
                  if (doc.getElementById(id)) doc.getElementById(id).remove();
                  const wrap = doc.createElement('div');
                  wrap.id = id;
                  wrap.style.position = 'fixed';
                  wrap.style.top = '12px';
                  wrap.style.right = '12px';
                  wrap.style.zIndex = '2147483647';
                  wrap.style.background = '#111827CC';
                  wrap.style.color = 'white';
                  wrap.style.borderRadius = '8px';
                  wrap.style.padding = '8px';
                  wrap.style.font = '12px system-ui, sans-serif';
                  wrap.style.boxShadow = '0 6px 20px rgba(0,0,0,.25)';
                  const title = doc.createElement('div');
                  title.textContent = 'Autofill credentials';
                  title.style.marginBottom = '6px';
                  title.style.fontWeight = '600';
                  wrap.appendChild(title);
                  credentials.forEach((c, idx) => {
                    const btn = doc.createElement('button');
                    btn.textContent = c.username || '(no username)';
                    btn.style.display = 'block';
                    btn.style.width = '100%';
                    btn.style.textAlign = 'left';
                    btn.style.background = '#111827';
                    btn.style.color = 'white';
                    btn.style.border = '1px solid #374151';
                    btn.style.borderRadius = '6px';
                    btn.style.padding = '6px 8px';
                    btn.style.margin = '4px 0';
                    btn.style.cursor = 'pointer';
                    btn.onmouseenter = () => (btn.style.background = '#1F2937');
                    btn.onmouseleave = () => (btn.style.background = '#111827');
                    btn.addEventListener('click', () => {
                      const cred = credentials[idx];
                      if (user && !pw) { setValue(user, cred.username || ''); setPending(cred); }
                      else { fill(cred); clearPending(); }
                      wrap.remove();
                    }, { once: true });
                    wrap.appendChild(btn);
                  });
                  const close = doc.createElement('button');
                  close.textContent = 'Dismiss';
                  close.style.marginTop = '6px';
                  close.style.background = 'transparent';
                  close.style.color = '#D1D5DB';
                  close.style.border = 'none';
                  close.style.cursor = 'pointer';
                  close.onclick = () => wrap.remove();
                  wrap.appendChild(close);
                  doc.body.appendChild(wrap);
                } catch { /* no-op */ }
              })()`)
            }
          } catch {
            /* no-op */
          }

          // Capture injection (once per page)
          await webviewAny.executeJavaScript(
            `(() => {
              if (window.__UF_CAPTURE_INSTALLED__) return;
              window.__UF_CAPTURE_INSTALLED__ = true;
              const setFlag = (username, password) => {
                window.__UF_LAST_LOGIN__ = { origin: location.origin, username, password, ts: Date.now() };
              };
              const onSubmit = (e) => {
                try {
                  const form = e.target.closest('form') || e.target.form || document.activeElement?.form;
                  const inputs = form ? Array.from(form.querySelectorAll('input')) : Array.from(document.querySelectorAll('input'));
                  const pass = inputs.find(i => i.type === 'password');
                  const user = inputs.find(i => /email|user|login|name/i.test(i.name || i.id || i.placeholder || '') && i.type !== 'password');
                  if (pass && pass.value) {
                    setFlag(user ? user.value : '', pass.value);
                  }
                } catch { /* no-op */ }
              };
              document.addEventListener('submit', onSubmit, true);
              document.addEventListener('click', (e) => {
                if ((e.target && (e.target as any).type === 'submit') || (e.target as any)?.closest('button[type="submit"]')) {
                  onSubmit(e);
                }
              }, true);
            })()`
          )

          // Inject Ctrl+Click handler when page finishes loading (reinstall on each page load)
          // This ensures it works even if dom-ready injection failed
          try {
            await webviewAny.executeJavaScript(
              `(() => {
              // Initialize array if it doesn't exist
              if (!window.__UF_BACKGROUND_LINKS__) {
                window.__UF_BACKGROUND_LINKS__ = [];
              }
              
              // Remove existing listener if any (to avoid duplicates)
              if (window.__UF_CTRL_CLICK_HANDLER__) {
                document.removeEventListener('click', window.__UF_CTRL_CLICK_HANDLER__, true);
                window.removeEventListener('click', window.__UF_CTRL_CLICK_HANDLER__, true);
              }
              
              // Create new handler - use capture phase with highest priority
              const handler = (e) => {
                const anchor = e.target.closest('a');
                if (anchor && (e.ctrlKey || e.metaKey)) {
                  const href = anchor.href || anchor.getAttribute('href');
                  if (href && href !== '#' && !href.startsWith('javascript:') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('data:')) {
                    // CRITICAL: Prevent navigation FIRST
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    
                    // Store the link for background tab
                    const linkData = {
                      url: href,
                      title: anchor.textContent?.trim() || anchor.title || anchor.getAttribute('title') || '',
                      timestamp: Date.now()
                    };
                    window.__UF_BACKGROUND_LINKS__.push(linkData);
                    
                    // Signal that we captured a Ctrl+Click (for debugging)
                    window.__UF_LAST_CTRL_CLICK__ = linkData;
                    
                    // Also send postMessage as backup
                    try {
                      window.postMessage({ type: 'CTRL_CLICK_LINK', data: linkData }, '*');
                    } catch (err) {
                      // postMessage might fail in some contexts, that's okay
                    }
                    
                    // Return false to further prevent navigation
                    return false;
                  }
                }
              };
              
              // Store handler reference for cleanup
              window.__UF_CTRL_CLICK_HANDLER__ = handler;
              // Add listener in capture phase with highest priority (useCapture=true, passive=false)
              document.addEventListener('click', handler, { capture: true, passive: false });
              // Also add to window for early interception
              window.addEventListener('click', handler, { capture: true, passive: false });
            })()`
            )
          } catch (e) {
            // Ignore injection errors
          }
        } catch (e) {
          // Ignore errors
        }
      }

      const handleLoadProgress = (event: any) => {
        if (event && typeof event.loaded === 'number' && typeof event.total === 'number') {
          const progress = Math.round((event.loaded / event.total) * 100)
          setLoadingProgress(Math.min(progress, 95)) // Cap at 95% until fully loaded
        }
      }

      const handleFailLoad = (event: any) => {
        if (event && event.isMainFrame) {
          setIsLoading(false)
        }
      }

      // Store dom-ready handler reference for cleanup
      let domReadyHandlerRef: (() => Promise<void>) | null = null

      webview.addEventListener('did-start-loading', handleLoadStart)
      webview.addEventListener('did-stop-loading', handleLoadStop)
      webview.addEventListener('did-fail-load', handleFailLoad as any)
      webview.addEventListener('did-frame-finish-load', handleLoadProgress as any)

      // Poll for captured credentials
      let captureTimer: NodeJS.Timeout | null = null
      const startCapturePoll = () => {
        const webviewAny = webview as any
        if (captureTimer) clearInterval(captureTimer)
        captureTimer = setInterval(async () => {
          try {
            const flag = await webviewAny.executeJavaScript('window.__UF_LAST_LOGIN__ || null')
            if (flag && flag.password) {
              await conveyor.passwords.save({
                origin: flag.origin,
                username: flag.username || '',
                password: flag.password,
              })
              await webviewAny.executeJavaScript('window.__UF_LAST_LOGIN__ = null')
            }
          } catch {
            /* no-op */
          }
        }, 1500)
      }

      // Poll for background links (Ctrl+Click)
      // Track background URLs globally to prevent will-navigate from focusing them
      if (!(window as any).__UF_BACKGROUND_URLS__) {
        ;(window as any).__UF_BACKGROUND_URLS__ = new Set<string>()
      }

      let backgroundLinkTimer: NodeJS.Timeout | null = null
      const startBackgroundLinkPoll = () => {
        const webviewAny = webview as any
        if (backgroundLinkTimer) clearInterval(backgroundLinkTimer)
        backgroundLinkTimer = setInterval(async () => {
          try {
            // Check if webview is still valid
            if (!webviewAny || !webviewRef.current) return

            const links = await webviewAny.executeJavaScript('window.__UF_BACKGROUND_LINKS__ || []')
            if (Array.isArray(links) && links.length > 0) {
              // Clear the array in webview immediately
              await webviewAny.executeJavaScript('window.__UF_BACKGROUND_LINKS__ = []')

              // Send each link to renderer as background tab
              // Process links sequentially to ensure IPC calls complete
              for (const link of links) {
                // Mark URL as background IMMEDIATELY in both renderer and main process
                if (!(window as any).__UF_BACKGROUND_URLS__) {
                  ;(window as any).__UF_BACKGROUND_URLS__ = new Set<string>()
                }
                ;(window as any).__UF_BACKGROUND_URLS__.add(link.url)

                // Also mark in main process BEFORE navigation happens
                try {
                  await conveyor.app.markBackgroundUrl(link.url)
                } catch {
                  // Ignore errors
                }

                // Dispatch event for background tab creation
                window.dispatchEvent(
                  new CustomEvent('external-link-navigation-background', {
                    detail: {
                      url: link.url,
                      title: link.title || '',
                      currentUrl: webviewAny.getURL?.() || platform.url,
                    },
                  })
                )

                // Clean up after delay
                setTimeout(() => {
                  if ((window as any).__UF_BACKGROUND_URLS__) {
                    ;(window as any).__UF_BACKGROUND_URLS__.delete(link.url)
                  }
                }, 2000)
              }
            }
          } catch {
            // Ignore errors - webview might be destroyed
          }
        }, 200) // Poll more frequently for better responsiveness (reduced from 300ms)
      }
      startCapturePoll()
      startBackgroundLinkPoll()

      return () => {
        webview.removeEventListener('did-start-loading', handleLoadStart)
        webview.removeEventListener('did-stop-loading', handleLoadStop)
        webview.removeEventListener('did-fail-load', handleFailLoad as any)
        webview.removeEventListener('did-frame-finish-load', handleLoadProgress as any)
        // Clean up dom-ready listener
        if (domReadyHandlerRef) {
          const webviewAny = webview as any
          try {
            webviewAny.removeEventListener('dom-ready', domReadyHandlerRef)
          } catch {
            // Ignore errors during cleanup
          }
        }
        if (captureTimer) clearInterval(captureTimer)
        if (backgroundLinkTimer) clearInterval(backgroundLinkTimer)
      }
    }, [platform.name, platform.url, conveyor.passwords])

    // Listen for messages from webview (Ctrl+Click events via postMessage)
    useEffect(() => {
      const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type === 'CTRL_CLICK_LINK') {
          const { url, title } = event.data.data

          // Mark in renderer immediately
          if (!(window as any).__UF_BACKGROUND_URLS__) {
            ;(window as any).__UF_BACKGROUND_URLS__ = new Set<string>()
          }
          ;(window as any).__UF_BACKGROUND_URLS__.add(url)

          // Mark in main process immediately (CRITICAL - before will-navigate fires)
          // Use fast one-way send instead of async invoke for speed
          try {
            if ((window as any).electronAPI?.markBackgroundUrl) {
              ;(window as any).electronAPI.markBackgroundUrl(url)
            } else {
              // Fallback to async method
              await conveyor.app.markBackgroundUrl(url)
            }
          } catch {
            // Ignore errors
          }

          // Dispatch event for handler
          const webviewAny = webviewRef.current as any
          window.dispatchEvent(
            new CustomEvent('external-link-navigation-background', {
              detail: { url, title: title || '', currentUrl: webviewAny?.getURL?.() || platform.url },
            })
          )
        }
      }

      window.addEventListener('message', handleMessage)
      return () => {
        window.removeEventListener('message', handleMessage)
      }
    }, [platform.id, platform.url, conveyor.app])

    useEffect(() => {
      const goOnline = () => {
        setIsOffline(false)
        // If we come back online and haven't attempted to load yet, start loading
        if (!hasAttemptedLoad) {
          setIsLoading(true)
        }
      }
      const goOffline = () => {
        setIsOffline(true)
        setIsLoading(false)
      }
      window.addEventListener('online', goOnline)
      window.addEventListener('offline', goOffline)
      return () => {
        window.removeEventListener('online', goOnline)
        window.removeEventListener('offline', goOffline)
      }
    }, [hasAttemptedLoad])

    // Handle drag-and-drop events for file uploads
    useEffect(() => {
      const webview = webviewRef.current
      if (!webview || !isActive) return

      const handleDragOver = (event: DragEvent) => {
        event.preventDefault()
        event.stopPropagation()
      }

      const handleDragEnter = (event: DragEvent) => {
        event.preventDefault()
        event.stopPropagation()
      }

      const handleDragLeave = (event: DragEvent) => {
        event.preventDefault()
        event.stopPropagation()
      }

      const handleDrop = (event: DragEvent) => {
        event.preventDefault()
        event.stopPropagation()

        // Let the webview handle the file drop naturally
        // We just prevent the default behavior that might trigger navigation
      }

      // Add drag-and-drop event listeners to the webview container
      const container = webview.parentElement
      if (container) {
        container.addEventListener('dragover', handleDragOver)
        container.addEventListener('dragenter', handleDragEnter)
        container.addEventListener('dragleave', handleDragLeave)
        container.addEventListener('drop', handleDrop)

        return () => {
          container.removeEventListener('dragover', handleDragOver)
          container.removeEventListener('dragenter', handleDragEnter)
          container.removeEventListener('dragleave', handleDragLeave)
          container.removeEventListener('drop', handleDrop)
        }
      }
    }, [platform.name, isActive])

    const handleReload = () => {
      const webview = webviewRef.current as any
      if (webview && webview.reload) {
        webview.reload()
      }
    }

    const handleForceReload = () => {
      const webview = webviewRef.current as any
      if (webview && webview.reload) {
        webview.reloadIgnoringCache()
      }
    }

    const handleNavigate = (targetUrl: string) => {
      const webview = webviewRef.current as any
      if (webview) {
        setIsLoading(true)
        try {
          if (webview.loadURL) {
            webview.loadURL(targetUrl)
          } else {
            webview.src = targetUrl
          }
        } catch {
          setIsLoading(false)
        }
      }
    }

    const handleGoBack = () => {
      const webview = webviewRef.current as any
      if (webview && webview.canGoBack && webview.goBack) {
        webview.goBack()
      }
    }

    const handleGoForward = () => {
      const webview = webviewRef.current as any
      if (webview && webview.canGoForward && webview.goForward) {
        webview.goForward()
      }
    }

    // Expose navigation methods to parent component
    useImperativeHandle(
      ref,
      () => ({
        goBack: handleGoBack,
        goForward: handleGoForward,
        reload: handleReload,
        forceReload: handleForceReload,
        navigate: handleNavigate,
        getCurrentUrl: () => {
          const webview = webviewRef.current as any
          if (webview && webview.getURL) {
            try {
              return webview.getURL()
            } catch {
              return null
            }
          }
          return null
        },
        getCurrentTitle: () => {
          const webview = webviewRef.current as any
          if (webview && webview.getTitle) {
            try {
              return webview.getTitle()
            } catch {
              return null
            }
          }
          return null
        },
      }),
      []
    )

    // (context menu logic moved to WebviewContextMenuLayer)

    // Handle new-window events (target="_blank" links)
    useEffect(() => {
      const webview = webviewRef.current as any
      if (!webview) return

      const handleNewWindow = (event: any) => {
        // The new-window event is fired when a link with target="_blank" is clicked
        // The main process setWindowOpenHandler will handle creating the temporary app
        // This handler ensures the event is properly captured by the webview
      }

      webview.addEventListener('new-window', handleNewWindow)

      return () => {
        webview.removeEventListener('new-window', handleNewWindow)
      }
    }, [platform.name])

    // Handle HTML5 Fullscreen API events from webview content
    // External video players (vidfast.pro, etc.) use element.requestFullscreen()
    // which fires these events on the webview tag. We need to expand the webview
    // over the entire window when this happens.
    useEffect(() => {
      const webview = webviewRef.current as any
      if (!webview) return

      const handleEnterFullscreen = () => {
        setIsHtmlFullscreen(true)
      }

      const handleLeaveFullscreen = () => {
        setIsHtmlFullscreen(false)
      }

      // Handle ESC key to exit HTML fullscreen
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isHtmlFullscreen) {
          try {
            // Tell the webview content to exit fullscreen
            webview.executeJavaScript('document.exitFullscreen().catch(() => {})')
          } catch {
            // Fallback: just reset state
            setIsHtmlFullscreen(false)
          }
        }
      }

      webview.addEventListener('enter-html-full-screen', handleEnterFullscreen)
      webview.addEventListener('leave-html-full-screen', handleLeaveFullscreen)
      window.addEventListener('keydown', handleKeyDown)

      return () => {
        webview.removeEventListener('enter-html-full-screen', handleEnterFullscreen)
        webview.removeEventListener('leave-html-full-screen', handleLeaveFullscreen)
        window.removeEventListener('keydown', handleKeyDown)
      }
    }, [platform.name, isHtmlFullscreen])

    // Cleanup effect: destroy webview when component unmounts or tab is closed
    useEffect(() => {
      return () => {
        const webview = webviewRef.current as any
        if (!webview) return

        try {
          // Stop any ongoing navigation immediately
          if (webview.stop && typeof webview.stop === 'function') {
            try {
              webview.stop()
            } catch {
              // May fail if webview is already stopped
            }
          }

          // Pause the webview to stop all activity
          if (webview.pause && typeof webview.pause === 'function') {
            try {
              webview.pause()
            } catch {
              // May fail if already paused or destroyed
            }
          }

          // Clear the webview source to stop loading and free resources
          try {
            if (webview.src && webview.src !== 'about:blank') {
              webview.src = 'about:blank'
            }
          } catch {
            // May fail if webview is already destroyed
          }

          // Remove from DOM if still attached (this triggers Electron cleanup)
          if (webview.parentNode) {
            try {
              webview.parentNode.removeChild(webview)
            } catch {
              // Element may already be removed
            }
          }

          // Destroy the webview's webContents if accessible
          if (webview.getWebContents && typeof webview.getWebContents === 'function') {
            try {
              const webContents = webview.getWebContents()
              if (webContents && !webContents.isDestroyed()) {
                webContents.destroy()
              }
            } catch {
              // webContents may not be accessible or already destroyed
            }
          }

          // Call destroy method if available (Electron webview tag method)
          if (webview.destroy && typeof webview.destroy === 'function') {
            try {
              webview.destroy()
            } catch {
              // May already be destroyed
            }
          }

          // Clear the ref to help GC
          webviewRef.current = null
        } catch (error) {
          // Ignore errors during cleanup - webview may already be destroyed
        }
      }
    }, [platform.id])

    // Only render webview if it's active or has been loaded before
    const shouldRenderWebview = isActive || hasLoadedOnce

    return (
      <div
        className={`
        ${isHtmlFullscreen ? 'fixed inset-0 w-screen h-screen' : 'absolute inset-0 w-full h-full'}
        ${isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}
      `}
        style={{
          willChange: 'opacity',
          transition: isActive ? 'opacity 100ms ease-out' : 'opacity 50ms ease-out',
          background: isHtmlFullscreen ? '#000' : 'var(--background, #1a1a1a)',
          zIndex: isHtmlFullscreen ? 2147483647 : (isActive ? 10 : 0),
        }}
      >
        {/* Loading Bar - only show when active, loading, enabled, and not in fullscreen */}
        {isActive && loadingBarEnabled && !isHtmlFullscreen && <LoadingBar isLoading={isLoading} progress={loadingProgress} />}
        {shouldRenderWebview ? (
          <WebviewSurface ref={webviewRef} platform={platform} className="w-full h-full webview-transparent" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
            <div className="text-center">
              <div className="text-gray-500 dark:text-gray-400 text-sm">
                {platform.name} will load when you click on it
              </div>
            </div>
          </div>
        )}

        {/* Offline Overlay - only show when actually offline */}
        {isOffline && !isLoading && (
          <OfflineOverlay
            logoUrl={platform.logoUrl}
            name={platform.name}
            onRetry={() => {
              const webview = webviewRef.current as any
              if (webview) {
                setIsLoading(true)
                webview.reload()
              }
            }}
          />
        )}

        {/* Context Menu */}
        <WebviewContextMenuLayer webviewRef={webviewRef} isActive={isActive} />
      </div>
    )
  }
)

WebviewContainer.displayName = 'WebviewContainer'

export default WebviewContainer

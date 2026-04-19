import { useEffect, useMemo, useState } from 'react'
import { WebviewContextMenu } from '@/app/components/ui/webview-context-menu'

interface WebviewContextMenuLayerProps {
  webviewRef: React.RefObject<HTMLElement | null>
  isActive: boolean
}

export default function WebviewContextMenuLayer({ webviewRef, isActive }: WebviewContextMenuLayerProps) {
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean
    position: { x: number; y: number }
    selectedText?: string
    linkUrl?: string
    imageUrl?: string
    isEditable?: boolean
    inputFieldType?: string
  }>({ isOpen: false, position: { x: 0, y: 0 } })

  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)
  const [currentZoomLevel, setCurrentZoomLevel] = useState(0)

  const closeContextMenu = () => setContextMenu((prev) => ({ ...prev, isOpen: false }))

  // Subscribe to main-process context menu events for this webview
  useEffect(() => {
    if (!isActive) return

    const handleWebviewContextMenu = (data: any) => {
      const webview = webviewRef.current as any
      if (!webview || webview.getWebContentsId?.() !== data.webContentsId) return
      setContextMenu({
        isOpen: true,
        position: { x: data.x, y: data.y },
        selectedText: data.selectionText || undefined,
        linkUrl: data.linkURL || undefined,
        imageUrl: data.srcURL || undefined,
        isEditable: data.isEditable || false,
        inputFieldType: data.inputFieldType || undefined,
      })
    }

    if (window.electronAPI) {
      window.electronAPI.onWebviewContextMenu(handleWebviewContextMenu)
    }
    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeWebviewContextMenuListener()
      }
    }
  }, [isActive, webviewRef])

  // Click outside to close - handles clicks outside webview area
  useEffect(() => {
    if (!contextMenu.isOpen || !isActive) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      // Don't close if clicking on the context menu itself or the overlay
      if (target.closest('[data-context-menu]') || target.hasAttribute('data-webview-overlay')) return
      closeContextMenu()
    }

    // Listen for clicks on document (for areas outside webview)
    document.addEventListener('mousedown', handleClickOutside, true)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true)
    }
  }, [contextMenu.isOpen, isActive])

  // Navigation and zoom tracking when active
  useEffect(() => {
    if (!isActive) return
    const updateStates = () => {
      const wv = webviewRef.current as any
      if (!wv) return
      try {
        if (wv.canGoBack) setCanGoBack(!!wv.canGoBack())
        if (wv.canGoForward) setCanGoForward(!!wv.canGoForward())
        if (wv.getZoomLevel) {
          const zl = wv.getZoomLevel()
          if (typeof zl === 'number') setCurrentZoomLevel(zl)
        }
      } catch {}
    }
    updateStates()
    const wv = webviewRef.current as any
    if (wv) {
      wv.addEventListener('did-navigate', updateStates)
      wv.addEventListener('did-navigate-in-page', updateStates)
    }
    return () => {
      if (wv) {
        wv.removeEventListener('did-navigate', updateStates)
        wv.removeEventListener('did-navigate-in-page', updateStates)
      }
    }
  }, [isActive, webviewRef])

  // Actions
  const actions = useMemo(() => {
    const getWebview = () => webviewRef.current as any

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(contextMenu.selectedText || '')
      } catch (error) {
        // Failed to copy text
      }
    }

    const handlePaste = async () => {
      try {
        const text = await navigator.clipboard.readText()
        const wv = getWebview()
        if (wv?.executeJavaScript) {
          await wv.executeJavaScript(`
          const ae = document.activeElement;
          if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.contentEditable === 'true')) {
            ae.value = ae.value + '${(contextMenu.isEditable ? '' : '').replace(/'/g, "\\'")}';
            ae.dispatchEvent(new Event('input', { bubbles: true }));
          }
        `)
        }
      } catch (error) {
        // Failed to paste text
      }
    }

    const handleSearch = (text: string) => {
      const url = `https://www.google.com/search?q=${encodeURIComponent(text)}`
      const wv = getWebview()
      if (wv?.loadURL) wv.loadURL(url)
    }

    const handleOpenLink = (url: string) => {
      const wv = getWebview()
      if (wv?.loadURL) wv.loadURL(url)
    }

    const handleOpenInNewApp = (url: string) => {
      // Dispatch external-link-navigation event to open in new tab (like other external links)
      const event = new CustomEvent('external-link-navigation', {
        detail: { url, currentUrl: '', title: '' },
      })
      window.dispatchEvent(event)
    }

    const handleCopyLink = async (url: string) => {
      try {
        await navigator.clipboard.writeText(url)
      } catch (error) {
        // Failed to copy link
      }
    }

    const handleDownloadImage = (url: string) => {
      const wv = getWebview()
      if (wv?.downloadURL) wv.downloadURL(url)
    }

    const handleCopyImage = async (url: string) => {
      const wv = getWebview()
      if (!wv?.executeJavaScript) {
        try {
          await navigator.clipboard.writeText(url)
        } catch (e) {
          // Failed to copy image URL
        }
        return
      }
      try {
        const imageData = await wv.executeJavaScript(`(async () => {
          try {
            const r = await fetch('${url}')
            const b = await r.blob()
            const img = new Image(); img.crossOrigin='anonymous';
            await new Promise((res, rej)=>{ img.onload=res; img.onerror=rej; img.src=URL.createObjectURL(b); });
            const c = document.createElement('canvas'); c.width=img.width; c.height=img.height; c.getContext('2d').drawImage(img,0,0);
            const pb = await new Promise(res=>c.toBlob(res,'image/png'));
            const ab = await pb.arrayBuffer();
            const u8 = new Uint8Array(ab);
            return { data: Array.from(u8), type: 'image/png', size: pb.size };
          } catch (e) { throw new Error('Failed to fetch and convert image: ' + e.message) }
        })()`)
        const u8 = new Uint8Array(imageData.data)
        const blob = new Blob([u8], { type: 'image/png' })
        const item = new ClipboardItem({ 'image/png': blob })
        await navigator.clipboard.write([item])
      } catch (error) {
        // Failed to copy image via webview
        try {
          await navigator.clipboard.writeText(url)
        } catch {}
      }
    }

    const handleReload = () => {
      const wv = getWebview()
      wv?.reload?.()
    }
    const handleGoBack = () => {
      const wv = getWebview()
      if (wv?.canGoBack?.()) wv.goBack()
    }
    const handleGoForward = () => {
      const wv = getWebview()
      if (wv?.canGoForward?.()) wv.goForward()
    }
    const handleZoomIn = () => {
      const wv = getWebview()
      try {
        const cur = wv?.getZoomLevel?.()
        if (typeof cur === 'number') {
          const nl = Math.min(cur + 0.5, 3)
          wv.setZoomLevel?.(nl)
          setCurrentZoomLevel(nl)
        }
      } catch (e) {}
    }
    const handleZoomOut = () => {
      const wv = getWebview()
      try {
        const cur = wv?.getZoomLevel?.()
        if (typeof cur === 'number' && cur > 0.5) {
          const nl = Math.max(cur - 0.5, 0.5)
          wv.setZoomLevel?.(nl)
          setCurrentZoomLevel(nl)
        }
      } catch (e) {}
    }
    const handleResetZoom = () => {
      const wv = getWebview()
      wv?.setZoomLevel?.(0)
      setCurrentZoomLevel(0)
    }
    const handleInspect = () => {
      const wv = getWebview()
      wv?.openDevTools?.()
    }

    return {
      onCopy: handleCopy,
      onPaste: handlePaste,
      onSearch: handleSearch,
      onOpenLink: handleOpenLink,
      onOpenInNewApp: handleOpenInNewApp,
      onCopyLink: handleCopyLink,
      onDownloadImage: handleDownloadImage,
      onCopyImage: handleCopyImage,
      onReload: handleReload,
      onGoBack: handleGoBack,
      onGoForward: handleGoForward,
      onZoomIn: handleZoomIn,
      onZoomOut: handleZoomOut,
      onResetZoom: handleResetZoom,
      onInspect: handleInspect,
    }
  }, [webviewRef, contextMenu.selectedText, contextMenu.isEditable])

  return (
    <>
      {/* Transparent overlay to catch clicks on webview when context menu is open */}
      {contextMenu.isOpen && (
        <div
          data-webview-overlay
          className="absolute inset-0 z-[45]"
          onClick={(e) => {
            // Don't close if clicking on the context menu itself
            const target = e.target as HTMLElement
            if (!target.closest('[data-context-menu]')) {
              closeContextMenu()
            }
          }}
        />
      )}
      <WebviewContextMenu
        isOpen={contextMenu.isOpen}
        onClose={closeContextMenu}
        position={contextMenu.position}
        selectedText={contextMenu.selectedText}
        linkUrl={contextMenu.linkUrl}
        imageUrl={contextMenu.imageUrl}
        isEditable={contextMenu.isEditable}
        inputFieldType={contextMenu.inputFieldType}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        currentZoomLevel={currentZoomLevel}
        {...actions}
      />
    </>
  )
}

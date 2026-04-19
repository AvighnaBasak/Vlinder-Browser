import { useState, useEffect, useCallback } from 'react'

interface UseCommandPaletteReturn {
  isOpen: boolean
  openCommandPalette: () => void
  closeCommandPalette: () => void
  toggleCommandPalette: () => void
}

interface UseCommandPaletteProps {
  enabled?: boolean
}

export function useCommandPalette({ enabled = true }: UseCommandPaletteProps = {}): UseCommandPaletteReturn {
  const [isOpen, setIsOpen] = useState(false)

  const openCommandPalette = useCallback(() => {
    setIsOpen(true)
  }, [])

  const closeCommandPalette = useCallback(() => {
    setIsOpen(false)
  }, [])

  const toggleCommandPalette = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  // Handle Ctrl+T keyboard shortcut and custom events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+T (or Cmd+T on Mac) and if command palette is enabled
      if ((event.ctrlKey || event.metaKey) && event.key === 't' && enabled) {
        event.preventDefault()
        event.stopPropagation()
        toggleCommandPalette()
      }
    }

    const handleOpenCommandPalette = () => {
      if (enabled) {
        openCommandPalette()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('open-command-palette', handleOpenCommandPalette)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('open-command-palette', handleOpenCommandPalette)
    }
  }, [toggleCommandPalette, openCommandPalette, enabled])

  return {
    isOpen,
    openCommandPalette,
    closeCommandPalette,
    toggleCommandPalette,
  }
}

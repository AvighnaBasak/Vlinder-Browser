import React, { useState, useEffect, useRef } from 'react'
import {
  Copy,
  Clipboard,
  Search,
  ExternalLink,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  Download,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Settings,
  X,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContextMenuProps {
  isOpen: boolean
  onClose: () => void
  position: { x: number; y: number }
  selectedText?: string
  linkUrl?: string
  imageUrl?: string
  isEditable?: boolean
  inputFieldType?: string
  canGoBack?: boolean
  canGoForward?: boolean
  currentZoomLevel?: number
  onCopy?: () => void
  onPaste?: () => void
  onSearch?: (text: string) => void
  onOpenLink?: (url: string) => void
  onOpenInNewApp?: (url: string) => void
  onCopyLink?: (url: string) => void
  onDownloadImage?: (url: string) => void
  onCopyImage?: (url: string) => void
  onReload?: () => void
  onGoBack?: () => void
  onGoForward?: () => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  onResetZoom?: () => void
  onInspect?: () => void
}

export function WebviewContextMenu({
  isOpen,
  onClose,
  position,
  selectedText,
  linkUrl,
  imageUrl,
  isEditable = false,
  inputFieldType,
  canGoBack = false,
  canGoForward = false,
  currentZoomLevel = 0,
  onCopy,
  onPaste,
  onSearch,
  onOpenLink,
  onOpenInNewApp,
  onCopyLink,
  onDownloadImage,
  onCopyImage,
  onReload,
  onGoBack,
  onGoForward,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onInspect,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [adjustedPosition, setAdjustedPosition] = useState(position)

  // Adjust position to keep menu within viewport
  useEffect(() => {
    if (!isOpen || !menuRef.current) return

    const menu = menuRef.current
    const rect = menu.getBoundingClientRect()
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    }

    let newX = position.x
    let newY = position.y

    // Adjust horizontal position
    if (position.x + rect.width > viewport.width) {
      newX = viewport.width - rect.width - 10
    }
    if (newX < 10) newX = 10

    // Adjust vertical position
    if (position.y + rect.height > viewport.height) {
      newY = viewport.height - rect.height - 10
    }
    if (newY < 10) newY = 10

    setAdjustedPosition({ x: newX, y: newY })
  }, [isOpen, position])

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const menuItems = [
    // Navigation section - only show if there are available actions
    ...(canGoBack || canGoForward || onReload
      ? [
          {
            section: 'navigation',
            items: [
              ...(canGoBack && onGoBack
                ? [
                    {
                      icon: ArrowLeft,
                      label: 'Back',
                      onClick: onGoBack,
                    },
                  ]
                : []),
              ...(canGoForward && onGoForward
                ? [
                    {
                      icon: ArrowRight,
                      label: 'Forward',
                      onClick: onGoForward,
                    },
                  ]
                : []),
              ...(onReload
                ? [
                    {
                      icon: RotateCw,
                      label: 'Reload',
                      onClick: onReload,
                    },
                  ]
                : []),
            ].filter(Boolean),
          },
        ]
      : []),
    // Text actions section
    ...(selectedText
      ? [
          {
            section: 'text',
            items: [
              {
                icon: Copy,
                label: 'Copy',
                onClick: onCopy,
              },
              {
                icon: Search,
                label: `Search "${selectedText.slice(0, 30)}${selectedText.length > 30 ? '...' : ''}"`,
                onClick: () => onSearch?.(selectedText),
              },
            ],
          },
        ]
      : []),
    // Link actions section
    ...(linkUrl
      ? [
          {
            section: 'link',
            items: [
              ...(onOpenLink
                ? [
                    {
                      icon: ExternalLink,
                      label: 'Open Link',
                      onClick: () => onOpenLink(linkUrl),
                    },
                  ]
                : []),
              ...(onOpenInNewApp
                ? [
                    {
                      icon: Plus,
                      label: 'Open in New Tab',
                      onClick: () => onOpenInNewApp(linkUrl),
                    },
                  ]
                : []),
              ...(onCopyLink
                ? [
                    {
                      icon: Copy,
                      label: 'Copy Link',
                      onClick: () => onCopyLink(linkUrl),
                    },
                  ]
                : []),
            ].filter(Boolean),
          },
        ]
      : []),
    // Image actions section
    ...(imageUrl
      ? [
          {
            section: 'image',
            items: [
              {
                icon: Download,
                label: 'Save Image',
                onClick: () => onDownloadImage?.(imageUrl),
              },
              {
                icon: Copy,
                label: 'Copy Image',
                onClick: () => onCopyImage?.(imageUrl),
              },
            ],
          },
        ]
      : []),
    // General actions section - only show paste if element is editable
    ...(onPaste && isEditable
      ? [
          {
            section: 'general',
            items: [
              {
                icon: Clipboard,
                label: 'Paste',
                onClick: onPaste,
              },
            ],
          },
        ]
      : []),
    // View section - only show if zoom functions are available
    ...(onZoomIn || onZoomOut || onResetZoom
      ? [
          {
            section: 'view',
            items: [
              ...(onZoomIn
                ? [
                    {
                      icon: ZoomIn,
                      label: 'Zoom In',
                      onClick: onZoomIn,
                    },
                  ]
                : []),
              ...(onZoomOut && currentZoomLevel > 0.5
                ? [
                    {
                      icon: ZoomOut,
                      label: 'Zoom Out',
                      onClick: onZoomOut,
                    },
                  ]
                : []),
              ...(onResetZoom
                ? [
                    {
                      icon: RefreshCw,
                      label: 'Reset Zoom',
                      onClick: onResetZoom,
                    },
                  ]
                : []),
            ].filter(Boolean),
          },
        ]
      : []),
    // Developer section - only show if inspect is available
    ...(onInspect
      ? [
          {
            section: 'developer',
            items: [
              {
                icon: Settings,
                label: 'Inspect Element',
                onClick: onInspect,
              },
            ],
          },
        ]
      : []),
  ]

  return (
    <div
      ref={menuRef}
      data-context-menu
      className="fixed z-50 min-w-48 bg-white/55 dark:bg-gray-900/55 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-xl"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
    >
      <div className="py-1">
        {menuItems.map((section, sectionIndex) => (
          <div key={section.section}>
            {section.items.map((item, itemIndex) => (
              <button
                key={`${section.section}-${itemIndex}`}
                onClick={() => {
                  item.onClick?.()
                  onClose()
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors duration-150',
                  'hover:bg-blue-50 dark:hover:bg-blue-900/20',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'text-gray-700 dark:text-gray-300'
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
              </button>
            ))}
            {sectionIndex < menuItems.length - 1 && <div className="my-1 h-px bg-gray-200/50 dark:bg-gray-700/50" />}
          </div>
        ))}
      </div>
    </div>
  )
}

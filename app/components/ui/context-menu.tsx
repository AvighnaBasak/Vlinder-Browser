import { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ContextMenuProps {
  children: ReactNode
  trigger: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  onOpenChange?: (open: boolean) => void
}

interface ContextMenuContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

const ContextMenuContext = createContext<ContextMenuContextType | undefined>(undefined)

export function ContextMenu({ children, trigger, side = 'right', onOpenChange }: ContextMenuProps) {
  const [isOpen, _setIsOpen] = useState(false)
  const setIsOpen = (open: boolean) => {
    _setIsOpen(open)
    onOpenChange?.(open)
  }
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) {
      let x = rect.right + 4
      let y = rect.top

      if (side === 'bottom') {
        x = rect.left
        y = rect.bottom + 4
      } else if (side === 'left') {
        x = rect.left - 4
        y = rect.top
      } else if (side === 'top') {
        x = rect.left
        y = rect.top - 4
      }

      // Adjust position to keep menu in viewport
      const menuWidth = 200 // Approximate menu width
      const menuHeight = 300 // Approximate menu height

      if (x + menuWidth > window.innerWidth) {
        x = window.innerWidth - menuWidth - 8
      }
      if (y + menuHeight > window.innerHeight) {
        y = window.innerHeight - menuHeight - 8
      }
      if (x < 8) x = 8
      if (y < 8) y = 8

      setPosition({ x, y })
    }
    setIsOpen(true)
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  return (
    <ContextMenuContext.Provider value={{ isOpen, setIsOpen }}>
      <div ref={triggerRef} onContextMenu={handleContextMenu}>
        {trigger}
      </div>
      {isOpen && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[180px] rounded-2xl border border-border/50 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl shadow-2xl shadow-black/20 dark:shadow-black/40 py-1.5"
          style={{ left: `${position.x}px`, top: `${position.y}px` }}
        >
          {children}
        </div>
      )}
    </ContextMenuContext.Provider>
  )
}

interface ContextMenuItemProps {
  icon?: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  variant?: 'default' | 'danger'
  disabled?: boolean
  checked?: boolean
  showCheck?: boolean
}

export function ContextMenuItem({
  icon: Icon,
  label,
  onClick,
  variant = 'default',
  disabled = false,
  checked = false,
  showCheck = false,
}: ContextMenuItemProps) {
  const context = useContext(ContextMenuContext)

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return
    e.preventDefault()
    e.stopPropagation()

    // Execute callback first, then close menu
    try {
      onClick()
    } finally {
      // Small delay to ensure state updates complete
      setTimeout(() => {
        context?.setIsOpen(false)
      }, 10)
    }
  }

  return (
    <button
      onClick={handleClick}
      onMouseDown={(e) => e.stopPropagation()}
      disabled={disabled}
      className={cn(
        'flex items-center gap-3 w-full px-3 py-2 text-sm transition-colors',
        'hover:bg-gray-100 dark:hover:bg-gray-800/80',
        variant === 'danger' && 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30',
        disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent'
      )}
    >
      {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
      <span className="flex-1 text-left">{label}</span>
      {showCheck && (
        <div
          className={cn(
            'w-4 h-4 rounded border flex items-center justify-center',
            checked ? 'bg-gray-500 border-gray-500 text-white' : 'border-gray-300 dark:border-gray-600'
          )}
        >
          {checked && (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      )}
    </button>
  )
}

export function ContextMenuSeparator() {
  return <div className="h-px bg-border/50 my-1.5" />
}

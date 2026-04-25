import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import AppLogo from '@/ui-ref/vlinder-butterply.png'

interface AppLogoToggleProps {
  compact: boolean
  onToggleCompact: () => void
  isIncognito?: boolean
}

export function AppLogoToggle({ compact, onToggleCompact, isIncognito }: AppLogoToggleProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <button
      aria-label={compact ? 'Expand sidebar' : 'Collapse sidebar'}
      onClick={onToggleCompact}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'relative h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-500 ease-out no-drag z-10',
        'active:scale-95',
        'opacity-80 hover:opacity-100'
      )}
    >
      {/* Logo container */}
      <div className="relative w-6 h-6 rounded-md overflow-hidden transition-all duration-500 ease-out">
        <img
          src={AppLogo}
          alt="Vlinder"
          className={cn(
            'w-full h-full object-contain transition-all duration-500 ease-out',
            isHovered ? 'scale-110 brightness-110' : 'scale-100 brightness-100'
          )}
          style={isIncognito ? {
            filter: 'brightness(0) saturate(100%) invert(26%) sepia(98%) saturate(6000%) hue-rotate(355deg) brightness(95%) contrast(120%)',
          } : undefined}
        />
      </div>

      {/* Toggle icon overlay on hover */}
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out',
          isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
        )}
      >
        <div className="relative w-5 h-5 rounded-full bg-white/90 dark:bg-gray-900/90 flex items-center justify-center shadow-lg">
          {compact ? (
            <ChevronRight className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300" />
          )}
        </div>
      </div>

    </button>
  )
}

import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  /** Optional logo/image to display in the center */
  logo?: string
  /** Alt text for the logo */
  logoAlt?: string
  /** Loading message to display */
  message?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Whether to show the spinner animation */
  showSpinner?: boolean
  /** Custom className for the container */
  className?: string
  /** Whether to show as overlay (full screen) */
  overlay?: boolean
  /** Custom gradient colors */
  gradient?: string
}

const sizeClasses = {
  sm: {
    container: 'w-8 h-8',
    logo: 'w-4 h-4',
    text: 'text-xs',
    gap: 'gap-2',
  },
  md: {
    container: 'w-12 h-12',
    logo: 'w-6 h-6',
    text: 'text-sm',
    gap: 'gap-3',
  },
  lg: {
    container: 'w-16 h-16',
    logo: 'w-8 h-8',
    text: 'text-base',
    gap: 'gap-4',
  },
  xl: {
    container: 'w-20 h-20',
    logo: 'w-10 h-10',
    text: 'text-lg',
    gap: 'gap-6',
  },
}

export default function LoadingSpinner({
  logo,
  logoAlt = 'Loading',
  message,
  size = 'lg',
  showSpinner = true,
  className,
  overlay = false,
  gradient = 'from-gray-500 to-gray-600',
}: LoadingSpinnerProps) {
  const sizeConfig = sizeClasses[size]

  const content = (
    <div className={cn('flex flex-col items-center', sizeConfig.gap, className)}>
      <div className={cn('relative', sizeConfig.container)}>
        {showSpinner && (
          <>
            {/* Pulsing background */}
            <div className={cn('absolute inset-0 rounded-full bg-gradient-to-tr opacity-30 animate-pulse', gradient)} />
            {/* Spinning border */}
            <div
              className={cn(
                'absolute inset-0 rounded-full border-4 border-transparent animate-spin',
                `border-t-gray-500 border-r-gray-600`
              )}
            />
          </>
        )}
        {/* Logo container */}
        <div
          className={cn(
            'absolute inset-2 rounded-full bg-card border border-border flex items-center justify-center',
            !showSpinner && 'inset-0'
          )}
        >
          {logo ? (
            <img src={logo} alt={logoAlt} className={cn('transition-all duration-300', sizeConfig.logo)} />
          ) : (
            <div className={cn('rounded-full bg-gradient-to-br animate-pulse', gradient, sizeConfig.logo)} />
          )}
        </div>
      </div>

      {message && (
        <div className={cn('text-muted-foreground font-medium animate-pulse', sizeConfig.text)}>{message}</div>
      )}
    </div>
  )

  if (overlay) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm pointer-events-none select-none">
        {content}
      </div>
    )
  }

  return content
}

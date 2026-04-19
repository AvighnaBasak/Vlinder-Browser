import { cn } from '@/lib/utils'

interface NotificationBadgeProps {
  count: number
  variant?: 'default' | 'compact'
  className?: string
}

export function NotificationBadge({ count, variant = 'default', className }: NotificationBadgeProps) {
  if (count <= 0) return null

  const displayCount = count > 99 ? '99+' : count.toString()

  return (
    <div
      className={cn(
        'flex items-center justify-center font-semibold rounded-full shadow-lg transition-all duration-200',
        variant === 'compact'
          ? 'min-w-[18px] h-[18px] px-1 text-[10px] bg-gradient-to-br from-red-500 to-red-600 text-white'
          : 'min-w-[22px] h-[22px] px-1.5 text-[11px] bg-gradient-to-br from-red-500 to-red-600 text-white ring-2 ring-white dark:ring-gray-900',
        className
      )}
    >
      {displayCount}
    </div>
  )
}

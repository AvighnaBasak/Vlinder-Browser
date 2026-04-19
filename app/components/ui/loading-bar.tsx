import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface LoadingBarProps {
  isLoading: boolean
  progress?: number
  className?: string
}

export function LoadingBar({ isLoading, progress: externalProgress, className }: LoadingBarProps) {
  const [internalProgress, setInternalProgress] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  // Use external progress if provided, otherwise use internal simulation
  const progress = externalProgress !== undefined ? externalProgress : internalProgress

  useEffect(() => {
    if (isLoading) {
      setIsVisible(true)
      setInternalProgress(0)

      // Only simulate progress if no external progress is provided
      if (externalProgress === undefined) {
        const interval = setInterval(() => {
          setInternalProgress((prev) => {
            if (prev >= 90) {
              clearInterval(interval)
              return 90 // Stop at 90% until actually loaded
            }
            return prev + Math.random() * 15
          })
        }, 100)

        return () => clearInterval(interval)
      }
    } else {
      // Complete the loading bar when done
      if (externalProgress === undefined) {
        setInternalProgress(100)
      }
      setTimeout(() => {
        setIsVisible(false)
        setInternalProgress(0)
      }, 300)
    }
  }, [isLoading, externalProgress])

  if (!isVisible) return null

  return (
    <div className={cn('absolute top-0 left-0 right-0 z-50 h-1', className)}>
      {/* Background bar */}
      <div className="h-full bg-gray-200/30 dark:bg-gray-700/30 backdrop-blur-sm" />

      {/* Progress bar with gradient */}
      <div
        className="absolute top-0 left-0 h-full transition-all duration-300 ease-out loading-bar-gradient"
        style={{ width: `${progress}%` }}
      />

      {/* Shimmer effect overlay */}
      <div className="absolute top-0 left-0 h-full w-full opacity-30 loading-bar-shimmer" />
    </div>
  )
}

// Alternative simpler version without animations
export function SimpleLoadingBar({ isLoading, className }: LoadingBarProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (isLoading) {
      setProgress(0)

      // Simulate loading progress
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 85) {
            clearInterval(interval)
            return 85
          }
          return prev + Math.random() * 10
        })
      }, 150)

      return () => clearInterval(interval)
    } else {
      setProgress(100)
      setTimeout(() => setProgress(0), 200)
    }
  }, [isLoading])

  if (!isLoading && progress === 0) return null

  return (
    <div className={cn('absolute top-0 left-0 right-0 z-50 h-0.5', className)}>
      <div
        className="h-full bg-gradient-to-r from-gray-500 via-gray-400 to-gray-500 transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

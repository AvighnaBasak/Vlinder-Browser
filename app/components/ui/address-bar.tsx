import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Globe, ChevronLeft, ChevronRight, Clock, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AutocompleteController } from './command-palette/autocomplete-controller'
import { HistoryProvider } from './command-palette/providers/history-provider'
import { SearchProvider } from './command-palette/providers/search-provider'
import { AutocompleteMatch } from './command-palette/types'

interface AddressBarProps {
  currentUrl: string | null
  onNavigate: (url: string) => void
  enabled: boolean
  onGoBack?: () => void
  onGoForward?: () => void
  canGoBack?: boolean
  canGoForward?: boolean
}

export function AddressBar({
  currentUrl,
  onNavigate,
  enabled,
  onGoBack,
  onGoForward,
  canGoBack = false,
  canGoForward = false,
}: AddressBarProps) {
  const [inputValue, setInputValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [suggestions, setSuggestions] = useState<AutocompleteMatch[]>([])
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<AutocompleteController | null>(null)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isFocusedRef = useRef(false)
  const isHoveredRef = useRef(false)

  // Initialize autocomplete controller
  useEffect(() => {
    if (!controllerRef.current) {
      const providers = [new SearchProvider(), new HistoryProvider()]

      controllerRef.current = new AutocompleteController(providers, (results) => {
        setSuggestions(results)
        setSelectedSuggestionIndex(-1)
      })
    }

    return () => {
      if (controllerRef.current) {
        controllerRef.current.stop()
      }
    }
  }, [])

  // Sync refs with state
  useEffect(() => {
    isFocusedRef.current = isFocused
  }, [isFocused])

  useEffect(() => {
    isHoveredRef.current = isHovered
  }, [isHovered])

  // Auto-hide/show logic
  useEffect(() => {
    if (!enabled) return

    const scheduleHide = () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = setTimeout(() => {
        // Use refs to get current state
        if (!isFocusedRef.current && !isHoveredRef.current) {
          setIsVisible(false)
        }
      }, 2000) // Hide after 2 seconds of inactivity
    }

    const scheduleShow = () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current)
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
      setIsVisible(true)
    }

    // Show on mouse move near bottom of screen
    const handleMouseMove = (e: MouseEvent) => {
      const windowHeight = window.innerHeight
      const mouseY = e.clientY
      const distanceFromBottom = windowHeight - mouseY

      if (distanceFromBottom < 80) {
        // Within 80px of bottom, show address bar
        scheduleShow()
      } else {
        // Check if mouse is actually over the address bar element
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect()
          const isOverAddressBar =
            e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom

          if (!isOverAddressBar && !isFocusedRef.current && !isHoveredRef.current) {
            scheduleHide()
          }
        } else if (!isFocusedRef.current && !isHoveredRef.current) {
          scheduleHide()
        }
      }
    }

    // Show on scroll near bottom
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      const distanceFromBottom = documentHeight - (scrollTop + windowHeight)

      if (distanceFromBottom < 100) {
        scheduleShow()
      } else if (!isFocusedRef.current && !isHoveredRef.current) {
        scheduleHide()
      }
    }

    // Initially show if enabled
    setIsVisible(true)
    scheduleHide()

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('scroll', handleScroll)
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current)
    }
  }, [enabled])

  // Update input value when URL changes (only when not editing)
  useEffect(() => {
    if (!isEditing && currentUrl) {
      setInputValue(currentUrl)
    }
  }, [currentUrl, isEditing])

  // Handle focus - select all text and expand
  const handleFocus = useCallback(() => {
    setIsFocused(true)
    setIsEditing(true)
    setIsVisible(true)
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    // Select all text on focus
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.select()
      }
    }, 0)

    // Trigger autocomplete when focused with current text
    if (controllerRef.current && inputValue.trim()) {
      controllerRef.current.start({
        text: inputValue.trim(),
        type: 'focus',
      })
    }
  }, [inputValue])

  // Track if we're clicking on a suggestion to prevent blur from interfering
  const clickingSuggestionRef = useRef(false)

  // Handle blur - collapse and reset editing state
  const handleBlur = useCallback(() => {
    // If we're clicking on a suggestion, don't clear suggestions yet
    if (clickingSuggestionRef.current) {
      clickingSuggestionRef.current = false
      return
    }

    setIsFocused(false)
    // Small delay to allow click events to fire
    setTimeout(() => {
      setIsEditing(false)
      setSuggestions([])
      setSelectedSuggestionIndex(-1)
      // Reset to current URL if empty or invalid
      if (!inputValue.trim() && currentUrl) {
        setInputValue(currentUrl)
      }
      // Schedule auto-hide after blur (unless hovering)
      if (!isHovered && hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
        hideTimeoutRef.current = setTimeout(() => {
          setIsVisible(false)
        }, 2000)
      }
      // Stop autocomplete controller
      if (controllerRef.current) {
        controllerRef.current.stop()
      }
    }, 200)
  }, [inputValue, currentUrl, isHovered])

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    setSelectedSuggestionIndex(-1)

    // Trigger autocomplete
    if (controllerRef.current && isFocused) {
      controllerRef.current.start({
        text: value,
        type: 'keystroke',
      })
    }
  }

  // Suggestions availability
  const hasSuggestions = suggestions.length > 0 && isFocused

  // Handle keyboard navigation in suggestions
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (hasSuggestions) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSelectedSuggestionIndex((prev) => {
            const next = prev < suggestions.length - 1 ? prev + 1 : 0
            setTimeout(() => {
              const selectedElement = suggestionsRef.current?.querySelector(`[data-index="${next}"]`) as HTMLElement
              selectedElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
            }, 0)
            return next
          })
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSelectedSuggestionIndex((prev) => {
            const next = prev > 0 ? prev - 1 : suggestions.length - 1
            setTimeout(() => {
              const selectedElement = suggestionsRef.current?.querySelector(`[data-index="${next}"]`) as HTMLElement
              selectedElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
            }, 0)
            return next
          })
        } else if (e.key === 'Tab' && selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
          const match = suggestions[selectedSuggestionIndex]
          if (match.inlineCompletion) {
            e.preventDefault()
            setInputValue(match.inlineCompletion)
            if (controllerRef.current) {
              controllerRef.current.start({
                text: match.inlineCompletion,
                type: 'keystroke',
              })
            }
          }
        } else if (e.key === 'Escape') {
          setSuggestions([])
          setSelectedSuggestionIndex(-1)
        }
      }
    },
    [hasSuggestions, suggestions, selectedSuggestionIndex]
  )

  const handleSelectSuggestion = useCallback(
    (match: AutocompleteMatch) => {
      // Track history for typed URLs
      if (match.type === 'url-what-you-typed' || match.type === 'history-url') {
        import('@/app/services/history').then(({ addHistoryEntry }) => {
          addHistoryEntry(match.destinationUrl, match.contents, match.type === 'url-what-you-typed')
        })
      }
      onNavigate(match.destinationUrl)
      setInputValue(match.destinationUrl)
      setSuggestions([])
      setIsFocused(false)
      setIsEditing(false)
      inputRef.current?.blur()

      // Stop autocomplete controller
      if (controllerRef.current) {
        controllerRef.current.stop()
      }
    },
    [onNavigate]
  )

  // Handle form submission
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      if (!inputValue.trim()) return

      // If a suggestion is selected, use it
      if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
        handleSelectSuggestion(suggestions[selectedSuggestionIndex])
        return
      }

      // Use default/verbatim suggestion if available
      const defaultMatch = suggestions.find((m) => m.isDefault)
      if (defaultMatch) {
        handleSelectSuggestion(defaultMatch)
        return
      }

      // Fallback: treat as URL or search
      let url = inputValue.trim()

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        if (url.includes('.') && !url.includes(' ')) {
          url = `https://${url}`
        } else {
          url = `https://www.google.com/search?q=${encodeURIComponent(url)}`
        }
      }

      try {
        new URL(url)
        import('@/app/services/history').then(({ addHistoryEntry }) => {
          addHistoryEntry(url, '', true)
        })
        onNavigate(url)
        inputRef.current?.blur()
      } catch {
        url = `https://www.google.com/search?q=${encodeURIComponent(inputValue.trim())}`
        onNavigate(url)
        inputRef.current?.blur()
      }
    },
    [inputValue, onNavigate, selectedSuggestionIndex, suggestions, handleSelectSuggestion]
  )

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFocused) {
        inputRef.current?.blur()
      }
    }

    if (isFocused) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
    return undefined
  }, [isFocused])

  const getMatchIcon = useCallback((match: AutocompleteMatch) => {
    switch (match.type) {
      case 'history-url':
        return <Clock className="w-4 h-4" />
      case 'search-query':
      case 'verbatim':
        return <Search className="w-4 h-4" />
      case 'url-what-you-typed':
        return <Globe className="w-4 h-4" />
      default:
        return <Globe className="w-4 h-4" />
    }
  }, [])

  const getMatchTypeLabel = useCallback((match: AutocompleteMatch) => {
    switch (match.type) {
      case 'history-url':
        return 'History'
      case 'search-query':
        return 'Search'
      case 'verbatim':
        return 'Search'
      case 'url-what-you-typed':
        return 'URL'
      default:
        return ''
    }
  }, [])

  if (!enabled) return null

  return (
    <div
      ref={containerRef}
      className={cn(
        'absolute bottom-0 left-0 right-0 z-40 flex items-center justify-center pb-4 pointer-events-none transition-all duration-500 ease-out',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      )}
      onMouseEnter={() => {
        setIsHovered(true)
        setIsVisible(true)
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
      }}
      onMouseLeave={() => {
        setIsHovered(false)
        if (!isFocusedRef.current) {
          if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current)
          }
          hideTimeoutRef.current = setTimeout(() => {
            // Double-check state before hiding
            if (!isFocusedRef.current && !isHoveredRef.current) {
              setIsVisible(false)
            }
          }, 2000)
        }
      }}
    >
      {/* Back Button - Left Corner */}
      {onGoBack && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (canGoBack && onGoBack) {
              onGoBack()
            }
          }}
          className={cn(
            'mr-3 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300',
            'bg-white/10 dark:bg-black/20',
            'backdrop-blur-xl backdrop-saturate-150',
            'border border-white/20 dark:border-white/10',
            'shadow-lg shadow-black/20',
            canGoBack && isVisible
              ? 'pointer-events-auto opacity-100 hover:bg-white/15 dark:hover:bg-black/30 hover:scale-110 active:scale-95'
              : 'pointer-events-none opacity-0'
          )}
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
          }}
          aria-label="Go back"
        >
          <ChevronLeft className="w-5 h-5 text-white/70" />
        </button>
      )}

      {/* Address Bar Form */}
      <form
        onSubmit={handleSubmit}
        className={cn(
          'relative flex items-center pointer-events-auto transition-all duration-300 ease-out',
          isFocused ? 'w-full max-w-xl mx-4 scale-105' : 'w-full max-w-md mx-4 scale-100'
        )}
      >
        <div
          className={cn(
            'relative w-full flex items-center rounded-full',
            'bg-white/10 dark:bg-black/20',
            'backdrop-blur-xl backdrop-saturate-150',
            'border border-white/20 dark:border-white/10',
            'shadow-2xl shadow-black/20',
            'transition-all duration-300',
            isFocused ? 'ring-2 ring-white/30 dark:ring-white/20 ring-offset-2 ring-offset-transparent' : ''
          )}
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
            boxShadow: isFocused
              ? '0 20px 40px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
              : '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
          }}
        >
          {/* Search/Globe Icon */}
          <div className="absolute left-4 flex items-center pointer-events-none z-10">
            {inputValue.trim() && !inputValue.includes('.') && inputValue.includes(' ') ? (
              <Search className="w-5 h-5 text-white/70" />
            ) : (
              <Globe className="w-5 h-5 text-white/70" />
            )}
          </div>

          {/* Input Field */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const file = e.dataTransfer?.files?.[0]
              if (file && (file as any).path) {
                onNavigate('file://' + (file as any).path.replace(/\\/g, '/'))
              }
            }}
            placeholder="Search or enter URL..."
            className={cn(
              'w-full pl-12 pr-12 py-3 text-sm font-medium',
              'bg-transparent border-none rounded-full',
              'text-white placeholder-white/50',
              'focus:outline-none focus:ring-0',
              'transition-all duration-200',
              'selection:bg-white/30'
            )}
            style={{
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
            }}
          />

          {/* Visual indicator when focused */}
          {isFocused && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-pulse" />
          )}
        </div>

        {/* Suggestions Dropdown */}
        {hasSuggestions && (
          <div
            ref={suggestionsRef}
            className={cn(
              'absolute bottom-full mb-2 w-full rounded-2xl shadow-2xl border max-h-80 overflow-y-auto z-50',
              'bg-black/40 backdrop-blur-md border-gray-700/50',
              'transition-all duration-300'
            )}
            style={{
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            }}
          >
            {suggestions.map((match, index) => (
              <button
                key={`${match.providerName}-${index}`}
                type="button"
                data-index={index}
                onMouseDown={(e) => {
                  e.preventDefault()
                  clickingSuggestionRef.current = true
                  handleSelectSuggestion(match)
                }}
                onMouseEnter={() => setSelectedSuggestionIndex(index)}
                className={cn(
                  'w-full px-4 py-3 flex items-start gap-3 text-left transition-colors',
                  'border-b border-gray-700/30 last:border-b-0',
                  selectedSuggestionIndex === index ? 'bg-white/15' : 'hover:bg-white/10'
                )}
              >
                <div className="mt-0.5 flex-shrink-0 text-white/60">{getMatchIcon(match)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="font-medium text-white truncate">{match.contents}</div>
                    {match.type && (
                      <span className="text-xs text-white/40 bg-white/10 px-1.5 py-0.5 rounded flex-shrink-0">
                        {getMatchTypeLabel(match)}
                      </span>
                    )}
                  </div>
                  {match.description && match.description !== match.contents && (
                    <div className="text-sm text-white/50 truncate">{match.description}</div>
                  )}
                </div>
                <div className="mt-0.5 flex-shrink-0 text-white/40">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Forward Button - Right Corner */}
      {onGoForward && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (canGoForward && onGoForward) {
              onGoForward()
            }
          }}
          className={cn(
            'ml-3 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300',
            'bg-white/10 dark:bg-black/20',
            'backdrop-blur-xl backdrop-saturate-150',
            'border border-white/20 dark:border-white/10',
            'shadow-lg shadow-black/20',
            canGoForward && isVisible
              ? 'pointer-events-auto opacity-100 hover:bg-white/15 dark:hover:bg-black/30 hover:scale-110 active:scale-95'
              : 'pointer-events-none opacity-0'
          )}
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
          }}
          aria-label="Go forward"
        >
          <ChevronRight className="w-5 h-5 text-white/70" />
        </button>
      )}
    </div>
  )
}

import { useState } from 'react'
import { Minimize2, X, Square, Maximize2 } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { useConveyor } from '@/app/hooks/use-conveyor'

interface WindowControlsProps {
  compact: boolean
}

export function WindowControls({ compact }: WindowControlsProps) {
  const conveyor = useConveyor()
  const [isMaximized, setIsMaximized] = useState(false)

  const handleWindowControl = async (action: 'minimize' | 'maximize' | 'close') => {
    try {
      switch (action) {
        case 'minimize':
          await conveyor.window.windowMinimize()
          break
        case 'maximize':
          await conveyor.window.windowMaximizeToggle()
          setIsMaximized(!isMaximized)
          break
        case 'close':
          await conveyor.window.windowClose()
          break
      }
    } catch (error) {
      console.error('Window control error:', error)
    }
  }

  if (compact) return null

  return (
    <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-gray-800/50 rounded-full px-2 py-1 no-drag relative z-10 transition-all duration-300 ease-out">
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 hover:bg-yellow-500/20 hover:text-yellow-600 dark:hover:text-yellow-400 rounded-md transition-all duration-200 ease-out opacity-70 hover:opacity-100 hover:scale-105"
        onClick={() => handleWindowControl('minimize')}
        title="Minimize"
      >
        <Minimize2 className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 hover:bg-blue-500/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-all duration-200 ease-out opacity-70 hover:opacity-100 hover:scale-105"
        onClick={() => handleWindowControl('maximize')}
        title={isMaximized ? 'Restore' : 'Maximize'}
      >
        {isMaximized ? <Square className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-400 rounded-md transition-all duration-200 ease-out opacity-70 hover:opacity-100 hover:scale-105"
        onClick={() => handleWindowControl('close')}
        title="Close"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}

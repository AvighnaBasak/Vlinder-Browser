import { useState, useEffect } from 'react'
import { useConveyor } from '@/app/hooks/use-conveyor'
import { Key, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CapturedCredential {
  origin: string
  username: string
  password: string
  isUpdate: boolean
}

export function PasswordSavePrompt() {
  const conveyor = useConveyor()
  const [credential, setCredential] = useState<CapturedCredential | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!(window as any)?.electronAPI) return

    const handleSavePrompt = (data: CapturedCredential) => {
      setCredential(data)
      setIsVisible(true)
    }

    const ipcRenderer = (window as any).electronAPI
    if (ipcRenderer.onPasswordSavePrompt) {
      ipcRenderer.onPasswordSavePrompt(handleSavePrompt)
    }

    return () => {
      if (ipcRenderer.removePasswordSavePromptListener) {
        ipcRenderer.removePasswordSavePromptListener()
      }
    }
  }, [])

  const dismiss = () => {
    setIsVisible(false)
    setTimeout(() => setCredential(null), 300)
  }

  const handleSave = async () => {
    if (!credential) return
    try {
      await conveyor.passwords.save({
        origin: credential.origin,
        username: credential.username,
        password: credential.password,
      })
    } catch (error) {
      console.error('Failed to save password:', error)
    }
    dismiss()
  }

  const handleNeverSave = async () => {
    if (!credential) return
    try {
      await conveyor.passwords.neverSaveForOrigin(credential.origin)
    } catch (error) {
      console.error('Failed to set never-save:', error)
    }
    dismiss()
  }

  if (!credential) return null

  const displayOrigin = credential.origin.replace(/^https?:\/\//, '')

  return (
    <div className="fixed right-4 bottom-4 z-[1000] w-[340px]">
      <div
        className={cn(
          'rounded-xl shadow-lg border border-blue-200 dark:border-blue-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur p-4 transition-all duration-300 ease-out relative',
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        )}
      >
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 pr-6">
          <Key className="h-4 w-4 text-blue-500" />
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {credential.isUpdate ? 'Update password?' : 'Save password?'}
          </div>
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 ml-6">
          <span className="font-medium text-gray-800 dark:text-gray-200">{credential.username}</span>
          {' on '}
          <span className="font-medium text-gray-800 dark:text-gray-200">{displayOrigin}</span>
        </div>
        <div className="mt-3 flex items-center gap-2 ml-6">
          <button
            onClick={handleSave}
            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-medium"
          >
            {credential.isUpdate ? 'Update' : 'Save'}
          </button>
          <button
            onClick={handleNeverSave}
            className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs"
          >
            Never for this site
          </button>
        </div>
      </div>
    </div>
  )
}

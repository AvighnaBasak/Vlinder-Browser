import { useMemo } from 'react'

type UpdaterPhase = 'hidden' | 'available' | 'downloading' | 'downloaded'

interface UpdaterToastProps {
  phase: UpdaterPhase
  version?: string
  progress?: number
  onInstallNow: () => void
  onMaybeLater: () => void
}

export default function UpdaterToast({ phase, version, progress = 0, onInstallNow, onMaybeLater }: UpdaterToastProps) {
  const visible = phase !== 'hidden'
  const title = useMemo(() => {
    switch (phase) {
      case 'available':
        return 'New update available'
      case 'downloading':
        return 'Downloading update'
      case 'downloaded':
        return 'Update ready to install'
      default:
        return ''
    }
  }, [phase])

  const subtitle = useMemo(() => {
    switch (phase) {
      case 'available':
        return version ? `Version ${version} is available.` : 'A new version is available.'
      case 'downloading':
        return `We’ll let you know when it’s ready.`
      case 'downloaded':
        return 'Restart now to finish installing.'
      default:
        return ''
    }
  }, [phase, version])

  if (!visible) return null

  return (
    <div className="fixed right-4 bottom-4 z-[1000] w-[320px]">
      <div className="rounded-xl shadow-lg border border-blue-200 dark:border-blue-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur p-4">
        <div className="text-sm font-semibold text-blue-900 dark:text-blue-100">{title}</div>
        {subtitle ? (
          <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">{subtitle}</div>
        ) : null}
        {phase === 'downloading' ? (
          <div className="mt-3">
            <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(Math.max(progress || 0, 0), 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-blue-800 dark:text-blue-200 mt-1">{Math.round(progress || 0)}%</div>
          </div>
        ) : null}
        <div className="mt-3 flex items-center gap-2">
          {phase === 'available' ? (
            <button
              onClick={onMaybeLater}
              className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs"
            >
              Maybe later
            </button>
          ) : null}
          {phase === 'downloaded' ? (
            <button
              onClick={onInstallNow}
              className="px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 text-xs"
            >
              Install now
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}



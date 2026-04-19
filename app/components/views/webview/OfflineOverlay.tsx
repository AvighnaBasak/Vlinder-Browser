interface OfflineOverlayProps {
  logoUrl: string
  name: string
  onRetry: () => void
}

export default function OfflineOverlay({ logoUrl, name, onRetry }: OfflineOverlayProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 p-6 rounded-2xl border border-border bg-card/90">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gray-400 to-gray-600 opacity-20" />
          <div className="absolute inset-[2px] rounded-[14px] bg-white dark:bg-gray-900 flex items-center justify-center">
            <img src={logoUrl} alt={name} className="w-8 h-8 opacity-80" />
          </div>
        </div>
        <div className="text-center">
          <div className="text-foreground font-medium">No internet connection</div>
          <div className="text-xs text-muted-foreground mt-1">Check your network and try again</div>
        </div>
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm hover:from-blue-700 hover:to-purple-700 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  )
}

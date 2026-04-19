import { Tab } from '@/app/types/tab'

interface TabsBarProps {
  tabs: Tab[]
  activeTabId: string | null
  onSelectTab: (id: string) => void
  onNewTab: () => void
  onCloseTab: (id: string) => void
  onReopenClosedTab?: () => void
}

export default function TabsBar({
  tabs,
  activeTabId,
  onSelectTab,
  onNewTab,
  onCloseTab,
  onReopenClosedTab,
}: TabsBarProps) {
  return (
    <div className="flex items-center h-7 px-1.5 gap-0.5 border-b border-white/5 bg-transparent">
      <div className="flex-1 overflow-hidden">
        <div className="flex items-stretch gap-0.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`group flex items-center max-w-xs pl-2.5 pr-1.5 h-6 rounded-md border transition-all duration-150 ${
                activeTabId === t.id
                  ? 'bg-white/10 border-white/10'
                  : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/5'
              }`}
              onClick={() => onSelectTab(t.id)}
              title={t.url}
            >
              {t.logoUrl ? (
                <img src={t.logoUrl} alt="" className="w-3.5 h-3.5 mr-1.5 rounded-sm" />
              ) : (
                <div className="w-3.5 h-3.5 mr-1.5 rounded-sm bg-white/10" />
              )}
              <span className="truncate text-xs text-gray-400">{t.name || 'New Tab'}</span>
              <span
                className="ml-1.5 px-0.5 rounded hover:bg-white/10 text-gray-500 text-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  onCloseTab(t.id)
                }}
              >
                ×
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-0.5">
        <button
          className="w-6 h-6 rounded-md border border-white/5 hover:bg-white/5 text-gray-500 text-xs"
          onClick={onNewTab}
          title="New Tab"
        >
          +
        </button>
        {onReopenClosedTab ? (
          <button
            className="w-6 h-6 rounded-md border border-white/5 hover:bg-white/5 text-gray-500 text-xs"
            onClick={onReopenClosedTab}
            title="Reopen Closed Tab"
          >
            ↺
          </button>
        ) : null}
      </div>
    </div>
  )
}

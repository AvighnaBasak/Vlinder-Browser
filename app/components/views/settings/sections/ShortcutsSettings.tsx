import { useState, useRef, useCallback, useMemo } from 'react'
import { KeyboardIcon } from 'lucide-react'
import { ShortcutAction } from '@/app/types/shortcuts'
import { useShortcuts } from '@/app/components/providers/shortcuts-provider'
import { ModifiedShortcutsSection } from './shortcuts/ModifiedShortcutsSection'
import { CategorySection } from './shortcuts/CategorySection'
import { ResetDialog } from './shortcuts/ResetDialog'
import { useKeyboardNormalizer } from './shortcuts/hooks/useKeyboardNormalizer'
import { settingsStyles } from '../settings-design-system'

export function ShortcutsSettings() {
  const { shortcuts, isLoading, setShortcut, resetShortcut, resetAllShortcuts, formatShortcutForDisplay } =
    useShortcuts()
  const [searchTerm, setSearchTerm] = useState('')
  const [editingActionId, setEditingActionId] = useState<string | null>(null)
  const [shortcutInputValue, setShortcutInputValue] = useState('')
  const [tempRawShortcut, setTempRawShortcut] = useState('')
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const inputRef = useRef<HTMLDivElement | null>(null)
  const { processKeyboardEvent } = useKeyboardNormalizer()

  const handleEditClick = useCallback(
    (action: ShortcutAction) => {
      setEditingActionId(action.id)
      if (typeof action.shortcut === 'string') {
        setTempRawShortcut(action.shortcut)
        setShortcutInputValue(formatShortcutForDisplay(action.shortcut))
      } else {
        setTempRawShortcut('')
        setShortcutInputValue('None')
      }
      setIsRecording(false)
      setTimeout(() => inputRef.current?.focus(), 0)
    },
    [formatShortcutForDisplay]
  )

  const handleCancelEdit = useCallback(() => {
    setEditingActionId(null)
    setShortcutInputValue('')
    setTempRawShortcut('')
    setIsRecording(false)
  }, [])

  const handleSaveEdit = useCallback(
    async (actionId: string) => {
      try {
        if (!tempRawShortcut) {
          alert('Please record a valid shortcut first.')
          return
        }
        const success = await setShortcut(actionId, tempRawShortcut)
        if (success) {
          alert('Shortcut updated successfully.')
          handleCancelEdit()
        } else {
          alert('Failed to update shortcut.')
        }
      } catch (error) {
        console.error('Error saving shortcut:', error)
        alert('An error occurred while saving the shortcut.')
      }
    },
    [tempRawShortcut, setShortcut, handleCancelEdit]
  )

  const handleResetIndividualKeybind = useCallback(
    async (action: ShortcutAction) => {
      try {
        const success = await resetShortcut(action.id)
        if (success) {
          alert(`Shortcut for "${action.name}" reset to default.`)
          if (editingActionId === action.id) handleCancelEdit()
        } else {
          alert(`Could not reset shortcut for "${action.name}".`)
        }
      } catch (error) {
        console.error('Error resetting shortcut:', error)
        alert('An error occurred while resetting the shortcut.')
      }
    },
    [editingActionId, resetShortcut, handleCancelEdit]
  )

  const performResetAllKeybinds = useCallback(async () => {
    try {
      await resetAllShortcuts()
      alert('All shortcuts have been reset to their defaults.')
    } catch (error) {
      console.error('Failed to reset all keybinds:', error)
      alert('Could not reset all shortcuts.')
    }
  }, [resetAllShortcuts])

  const handleShortcutKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      const { key } = event
      if (key === 'Escape') { handleCancelEdit(); return }
      if (key === 'Enter' && editingActionId && tempRawShortcut) { handleSaveEdit(editingActionId); return }
      if (key === 'Backspace' || key === 'Delete') {
        setTempRawShortcut('')
        setShortcutInputValue('')
        setIsRecording(true)
        return
      }
      setIsRecording(true)
      const newRawShortcut = processKeyboardEvent(event)
      if (newRawShortcut) {
        setTempRawShortcut(newRawShortcut)
        setShortcutInputValue(formatShortcutForDisplay(newRawShortcut))
        setIsRecording(false)
      }
    },
    [editingActionId, formatShortcutForDisplay, handleCancelEdit, handleSaveEdit, processKeyboardEvent, tempRawShortcut]
  )

  const { groupedKeybinds, modifiedShortcuts, sortedEntries } = useMemo(() => {
    const filtered = shortcuts.filter(
      (kb) =>
        kb.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        kb.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (kb.shortcut && formatShortcutForDisplay(kb.shortcut).toLowerCase().includes(searchTerm.toLowerCase()))
    )
    const grouped = filtered.reduce(
      (acc, kb) => {
        if (!acc[kb.category]) acc[kb.category] = []
        acc[kb.category].push(kb)
        return acc
      },
      {} as Record<string, ShortcutAction[]>
    )
    const modified = filtered.filter((kb) => !!kb.originalShortcut && !!kb.shortcut && kb.originalShortcut !== kb.shortcut)
    const sorted = Object.entries(grouped).sort((a, b) => {
      if (a[0] === 'Modified') return -1
      if (b[0] === 'Modified') return 1
      return a[0].localeCompare(b[0])
    })
    return { groupedKeybinds: grouped, modifiedShortcuts: modified, sortedEntries: sorted }
  }, [searchTerm, shortcuts, formatShortcutForDisplay])

  return (
    <>
      <style>{settingsStyles}</style>
      <style>{`
        .s-kbd-panel {
          background: #0e0e0e;
          border: 1px solid #1a1a1a;
          border-radius: 4px;
          overflow: hidden;
          font-family: 'JetBrains Mono', monospace;
        }
        .s-kbd-header {
          padding: 16px 20px 14px;
          border-bottom: 1px solid #191919;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .s-kbd-search-wrap {
          padding: 14px 20px 10px;
          border-bottom: 1px solid #141414;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .s-kbd-search {
          flex: 1;
          background: #080808;
          border: 1px solid #1f1f1f;
          border-radius: 2px;
          padding: 7px 12px 7px 30px;
          font-size: 10px;
          font-family: 'JetBrains Mono', monospace;
          color: #888;
          letter-spacing: 0.04em;
          outline: none;
          width: 100%;
        }
        .s-kbd-search::placeholder { color: #2f2f2f; }
        .s-kbd-search:focus { border-color: #2a2a2a; color: #aaa; }
        .s-kbd-search-icon { position: absolute; left: 9px; top: 50%; transform: translateY(-50%); }
        .s-kbd-reset-btn {
          font-size: 10px;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          padding: 6px 12px;
          border: 1px solid #1f1f1f;
          background: transparent;
          color: #3a3a3a;
          border-radius: 2px;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.12s ease;
        }
        .s-kbd-reset-btn:hover { background: rgba(255,255,255,0.04); color: #666; border-color: #2f2f2f; }
        .s-kbd-reset-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .s-kbd-cat-label {
          font-size: 9px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #333;
          padding: 14px 20px 6px;
          font-weight: 600;
        }
        .s-kbd-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 11px 20px;
          border-bottom: 1px solid #111;
          transition: background 0.1s ease;
          gap: 12px;
        }
        .s-kbd-item:last-child { border-bottom: none; }
        .s-kbd-item:hover { background: rgba(255,255,255,0.02); }
        .s-kbd-item.editing { background: rgba(255,255,255,0.03); }
        .s-kbd-item.modified { border-left: 2px solid #3a3a3a; padding-left: 18px; }
        .s-kbd-name {
          font-size: 11px;
          color: #888;
          letter-spacing: 0.03em;
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .s-kbd-name.modified-label { color: #aaa; }
        .s-kbd-badge {
          font-size: 9px;
          letter-spacing: 0.07em;
          color: #555;
          background: rgba(255,255,255,0.05);
          border: 1px solid #1f1f1f;
          border-radius: 2px;
          padding: 1px 5px;
          margin-left: 6px;
        }
        .s-kbd-key {
          font-size: 10px;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.06em;
          padding: 4px 10px;
          background: #0c0c0c;
          border: 1px solid #1f1f1f;
          border-radius: 2px;
          color: #666;
          min-width: 100px;
          text-align: center;
          flex-shrink: 0;
        }
        .s-kbd-key.modified { color: #aaa; border-color: #2a2a2a; background: #111; }
        .s-kbd-key.unset { color: #333; font-style: italic; }
        .s-kbd-actions { display: flex; gap: 4px; align-items: center; flex-shrink: 0; }
        .s-kbd-icon-btn {
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid transparent;
          border-radius: 2px;
          background: transparent;
          cursor: pointer;
          color: #333;
          transition: all 0.1s ease;
        }
        .s-kbd-icon-btn:hover { color: #888; border-color: #222; background: rgba(255,255,255,0.04); }
        .s-kbd-icon-btn.save:hover { color: #6a8a6a; }
        .s-kbd-icon-btn.cancel:hover { color: #8a5a5a; }
        .s-kbd-icon-btn.reset-btn:hover { color: #5a6a8a; }
        .s-kbd-icon-btn:disabled { opacity: 0.2; cursor: not-allowed; }
        .s-kbd-record-field {
          font-size: 10px;
          font-family: 'JetBrains Mono', monospace;
          min-width: 130px;
          padding: 5px 10px;
          background: #080808;
          border: 1px solid #2a2a2a;
          border-radius: 2px;
          color: #aaa;
          letter-spacing: 0.06em;
          text-align: center;
          cursor: text;
          display: flex;
          align-items: center;
          justify-content: center;
          outline: none;
        }
        .s-kbd-record-field:focus { border-color: #3a3a3a; }
        .s-kbd-record-field.recording { color: #888; border-color: #333; animation: recordPulse 1s ease infinite alternate; }
        @keyframes recordPulse { from { opacity: 0.6; } to { opacity: 1; } }
        .s-kbd-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 20px;
          color: #2f2f2f;
          gap: 8px;
          text-align: center;
        }
        .s-kbd-empty-title { font-size: 11px; color: #444; letter-spacing: 0.06em; }
        .s-kbd-empty-desc { font-size: 10px; color: #2a2a2a; letter-spacing: 0.04em; }
        .s-kbd-dialog-overlay {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,0.7);
        }
        .s-kbd-dialog {
          position: relative;
          background: #0e0e0e;
          border: 1px solid #1f1f1f;
          border-radius: 4px;
          padding: 24px;
          max-width: 400px;
          width: 100%;
          margin: 0 16px;
        }
        .s-kbd-dialog-title {
          font-size: 11px;
          letter-spacing: 0.1em;
          color: #aaa;
          text-transform: uppercase;
          font-weight: 600;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .s-kbd-dialog-desc {
          font-size: 10px;
          color: #444;
          letter-spacing: 0.04em;
          line-height: 1.7;
          margin-bottom: 20px;
        }
        .s-kbd-dialog-btns { display: flex; gap: 8px; justify-content: flex-end; }
        .s-kbd-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div className="s-kbd-panel">
        {/* Header */}
        <div className="s-kbd-header">
          <div className="s-panel-icon">
            <KeyboardIcon className="w-3.5 h-3.5" style={{ color: '#888' }} />
          </div>
          <div>
            <div className="s-panel-title">Keyboard Shortcuts</div>
            <div className="s-panel-desc">Customize vlinder shortcuts to improve your workflow</div>
          </div>
        </div>

        {/* Search + Reset */}
        <div className="s-kbd-search-wrap">
          <div style={{ position: 'relative', flex: 1 }}>
            <KeyboardIcon className="s-kbd-search-icon w-3 h-3" style={{ color: '#333' }} />
            <input
              className="s-kbd-search"
              type="search"
              placeholder="Search shortcuts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            className="s-kbd-reset-btn"
            onClick={() => setIsResetDialogOpen(true)}
            disabled={isLoading}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
            </svg>
            Reset Defaults
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="s-kbd-empty">
            <svg className="s-kbd-spin w-5 h-5" style={{ color: '#2f2f2f' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
            </svg>
            <div className="s-kbd-empty-title">Loading shortcuts</div>
            <div className="s-kbd-empty-desc">Please wait...</div>
          </div>
        ) : Object.keys(groupedKeybinds).length === 0 && searchTerm ? (
          <div className="s-kbd-empty">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: '#2f2f2f' }}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <div className="s-kbd-empty-title">No results for "{searchTerm}"</div>
            <div className="s-kbd-empty-desc">Try different search terms</div>
          </div>
        ) : Object.keys(groupedKeybinds).length === 0 ? (
          <div className="s-kbd-empty">
            <KeyboardIcon className="w-5 h-5" style={{ color: '#2f2f2f' }} />
            <div className="s-kbd-empty-title">No shortcuts configured</div>
          </div>
        ) : (
          <div>
            {modifiedShortcuts.length > 0 && (
              <ModifiedShortcutsSection
                shortcuts={modifiedShortcuts}
                editingActionId={editingActionId}
                shortcutInputValue={shortcutInputValue}
                isRecording={isRecording}
                inputRef={inputRef}
                formatShortcutForDisplay={formatShortcutForDisplay}
                onEditClick={handleEditClick}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                onResetShortcut={handleResetIndividualKeybind}
                onKeyDown={handleShortcutKeyDown}
              />
            )}
            {sortedEntries.map(([category, shortcuts]) => (
              <CategorySection
                key={category}
                categoryName={category}
                shortcuts={shortcuts}
                editingActionId={editingActionId}
                shortcutInputValue={shortcutInputValue}
                isRecording={isRecording}
                inputRef={inputRef}
                formatShortcutForDisplay={formatShortcutForDisplay}
                onEditClick={handleEditClick}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                onResetShortcut={handleResetIndividualKeybind}
                onKeyDown={handleShortcutKeyDown}
                animationDelay={0}
              />
            ))}
          </div>
        )}
      </div>

      <ResetDialog isOpen={isResetDialogOpen} onOpenChange={setIsResetDialogOpen} onConfirm={performResetAllKeybinds} />
    </>
  )
}

import React from 'react'
import { ShortcutAction } from '@/app/types/shortcuts'
import { Edit3Icon, RotateCcwIcon, SaveIcon, XIcon } from 'lucide-react'

interface ShortcutItemProps {
  shortcut: ShortcutAction
  isEditing: boolean
  shortcutInputValue: string
  isRecording: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  onReset: () => void
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void
  inputRef: React.RefObject<HTMLDivElement | null>
  formatShortcutForDisplay: (shortcut: string | null) => string
  isModified: boolean
  animationDelay?: number
}

export function ShortcutItem({
  shortcut,
  isEditing,
  shortcutInputValue,
  isRecording,
  onEdit,
  onSave,
  onCancel,
  onReset,
  onKeyDown,
  inputRef,
  formatShortcutForDisplay,
  isModified,
}: ShortcutItemProps) {
  return (
    <div className={`s-kbd-item ${isEditing ? 'editing' : ''} ${isModified ? 'modified' : ''}`}>
      <span className={`s-kbd-name ${isModified ? 'modified-label' : ''}`} title={shortcut.name}>
        {shortcut.name}
        {isModified && <span className="s-kbd-badge">MODIFIED</span>}
      </span>

      {isEditing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <div
            ref={inputRef}
            tabIndex={0}
            onKeyDown={onKeyDown}
            className={`s-kbd-record-field ${isRecording ? 'recording' : ''}`}
          >
            {isRecording ? (
              <span style={{ color: '#555', fontStyle: 'italic' }}>recording...</span>
            ) : shortcutInputValue ? (
              shortcutInputValue
            ) : (
              <span style={{ color: '#777777', fontStyle: 'italic' }}>click to record</span>
            )}
          </div>
          <div className="s-kbd-actions">
            <button className="s-kbd-icon-btn save" onClick={onSave} disabled={!shortcutInputValue} title="Save">
              <SaveIcon className="w-3 h-3" />
            </button>
            <button className="s-kbd-icon-btn cancel" onClick={onCancel} title="Cancel">
              <XIcon className="w-3 h-3" />
            </button>
            <button className="s-kbd-icon-btn reset-btn" onClick={onReset} title="Reset to default">
              <RotateCcwIcon className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : (
        <div className="s-kbd-actions">
          <span className={`s-kbd-key ${isModified ? 'modified' : ''} ${!shortcut.shortcut ? 'unset' : ''}`}>
            {formatShortcutForDisplay(shortcut.shortcut)}
          </span>
          <button className="s-kbd-icon-btn" onClick={onEdit} title="Edit shortcut">
            <Edit3Icon className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  )
}

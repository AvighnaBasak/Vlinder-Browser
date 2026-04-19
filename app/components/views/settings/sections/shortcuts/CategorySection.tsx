import React from 'react'
import { ShortcutAction } from '@/app/types/shortcuts'
import { ShortcutItem } from './ShortcutItem'

interface CategorySectionProps {
  categoryName: string
  shortcuts: ShortcutAction[]
  editingActionId: string | null
  shortcutInputValue: string
  isRecording: boolean
  inputRef: React.RefObject<HTMLDivElement | null>
  formatShortcutForDisplay: (shortcut: string | null) => string
  onEditClick: (action: ShortcutAction) => void
  onSaveEdit: (actionId: string) => void
  onCancelEdit: () => void
  onResetShortcut: (action: ShortcutAction) => void
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void
  animationDelay?: number
}

export function CategorySection({
  categoryName,
  shortcuts,
  editingActionId,
  shortcutInputValue,
  isRecording,
  inputRef,
  formatShortcutForDisplay,
  onEditClick,
  onSaveEdit,
  onCancelEdit,
  onResetShortcut,
  onKeyDown,
}: CategorySectionProps) {
  const modifiedCount = shortcuts.filter((kb) => kb.originalShortcut && kb.shortcut !== kb.originalShortcut).length

  return (
    <div>
      <div className="s-kbd-cat-label">
        {categoryName}
        {modifiedCount > 0 && (
          <span className="s-kbd-badge">{modifiedCount} modified</span>
        )}
      </div>
      <div>
        {shortcuts.map((shortcut) => (
          <ShortcutItem
            key={shortcut.id}
            shortcut={shortcut}
            isEditing={editingActionId === shortcut.id}
            shortcutInputValue={editingActionId === shortcut.id ? shortcutInputValue : ''}
            isRecording={isRecording}
            onEdit={() => onEditClick(shortcut)}
            onSave={() => onSaveEdit(shortcut.id)}
            onCancel={onCancelEdit}
            onReset={() => onResetShortcut(shortcut)}
            onKeyDown={onKeyDown}
            inputRef={inputRef}
            formatShortcutForDisplay={formatShortcutForDisplay}
            isModified={!!shortcut.originalShortcut && !!shortcut.shortcut && shortcut.originalShortcut !== shortcut.shortcut}
            animationDelay={0}
          />
        ))}
      </div>
    </div>
  )
}

import React from 'react'
import { ShortcutAction } from '@/app/types/shortcuts'
import { CategorySection } from './CategorySection'

interface ModifiedShortcutsSectionProps {
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
}

export function ModifiedShortcutsSection({
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
}: ModifiedShortcutsSectionProps) {
  return (
    <CategorySection
      categoryName="Modified"
      shortcuts={shortcuts}
      editingActionId={editingActionId}
      shortcutInputValue={shortcutInputValue}
      isRecording={isRecording}
      inputRef={inputRef}
      formatShortcutForDisplay={formatShortcutForDisplay}
      onEditClick={onEditClick}
      onSaveEdit={onSaveEdit}
      onCancelEdit={onCancelEdit}
      onResetShortcut={onResetShortcut}
      onKeyDown={onKeyDown}
    />
  )
}

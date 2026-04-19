import { AlertTriangleIcon } from 'lucide-react'

interface ResetDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function ResetDialog({ isOpen, onOpenChange, onConfirm }: ResetDialogProps) {
  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <div className="s-kbd-dialog-overlay" onClick={() => onOpenChange(false)}>
      <div className="s-kbd-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="s-kbd-dialog-title">
          <AlertTriangleIcon className="w-3.5 h-3.5" style={{ color: '#884444' }} />
          Reset All Shortcuts
        </div>
        <div className="s-kbd-dialog-desc">
          All shortcuts will be restored to their default values.
          This action cannot be undone.
        </div>
        <div className="s-kbd-dialog-btns">
          <button
            className="s-action-btn"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </button>
          <button
            className="s-action-btn s-btn-danger"
            onClick={handleConfirm}
          >
            Reset All
          </button>
        </div>
      </div>
    </div>
  )
}

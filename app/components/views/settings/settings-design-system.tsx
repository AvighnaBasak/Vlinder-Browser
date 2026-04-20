/**
 * Shared inline styles for the redesigned settings panels.
 * Grayscale, JetBrains Mono, terminal-noir aesthetic.
 */

export const settingsStyles = `
  .s-panel {
    background: var(--theme-surface, #0e0e0e);
    border: 1px solid var(--theme-border, #1a1a1a);
    border-radius: 4px;
    overflow: hidden;
    font-family: 'JetBrains Mono', 'SF Mono', 'Consolas', monospace;
  }

  .s-panel-header {
    padding: 16px 20px 14px;
    border-bottom: 1px solid var(--theme-border, #191919);
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .s-panel-icon {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255,255,255,0.05);
    border: 1px solid var(--theme-border, #222);
    border-radius: 3px;
    flex-shrink: 0;
  }

  .s-panel-title {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--theme-text-bright, #c8c8c8);
  }

  .s-panel-desc {
    font-size: 10px;
    color: var(--theme-text-muted, #404040);
    letter-spacing: 0.04em;
    margin-top: 2px;
  }

  .s-panel-body {
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .s-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-radius: 2px;
    gap: 12px;
    transition: background 0.12s ease;
    position: relative;
  }

  .s-row::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 16px;
    right: 16px;
    height: 1px;
    background: var(--theme-border, #141414);
  }

  .s-row:last-child::after {
    display: none;
  }

  .s-row:hover {
    background: rgba(255,255,255,0.02);
  }

  .s-row-label {
    font-size: 11px;
    font-weight: 500;
    color: #b0b0b0;
    letter-spacing: 0.04em;
  }

  .s-row-desc {
    font-size: 10px;
    color: #3d3d3d;
    letter-spacing: 0.03em;
    margin-top: 2px;
    font-weight: 400;
  }

  .s-row-desc.active {
    color: #666;
  }

  .s-toggle {
    position: relative;
    width: 36px;
    height: 20px;
    flex-shrink: 0;
    cursor: pointer;
  }

  .s-toggle input {
    opacity: 0;
    width: 0;
    height: 0;
    position: absolute;
  }

  .s-toggle-track {
    position: absolute;
    inset: 0;
    background: var(--theme-chrome, #1a1a1a);
    border: 1px solid var(--theme-border2, #262626);
    border-radius: 10px;
    transition: all 0.2s ease;
  }

  .s-toggle input:checked + .s-toggle-track {
    background: #333;
    border-color: #4a4a4a;
  }

  .s-toggle-thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 12px;
    height: 12px;
    background: #404040;
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  .s-toggle input:checked ~ .s-toggle-thumb {
    left: 19px;
    background: #e5e5e5;
    box-shadow: 0 0 8px rgba(229,229,229,0.3);
  }

  .s-seg-group {
    display: flex;
    gap: 2px;
    background: var(--theme-surface2, #111);
    padding: 2px;
    border: 1px solid var(--theme-border, #1f1f1f);
    border-radius: 3px;
  }

  .s-seg-btn {
    flex: 1;
    padding: 5px 10px;
    font-size: 10px;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 500;
    letter-spacing: 0.06em;
    cursor: pointer;
    border-radius: 2px;
    transition: all 0.15s ease;
    border: 1px solid transparent;
    color: #3d3d3d;
    background: transparent;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .s-seg-btn.active {
    background: rgba(255,255,255,0.1);
    border-color: rgba(255,255,255,0.15);
    color: #e5e5e5;
  }

  .s-seg-btn:hover:not(.active) {
    background: rgba(255,255,255,0.04);
    color: #666;
  }

  .s-radio-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .s-radio-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 16px;
    cursor: pointer;
    border-radius: 2px;
    transition: background 0.12s ease;
    border: 1px solid transparent;
  }

  .s-radio-item:hover {
    background: rgba(255,255,255,0.02);
  }

  .s-radio-item.selected {
    background: rgba(255,255,255,0.04);
    border-color: #252525;
  }

  .s-radio-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 1px solid #2f2f2f;
    flex-shrink: 0;
    margin-top: 1px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.12s ease;
  }

  .s-radio-item.selected .s-radio-dot {
    border-color: #888;
  }

  .s-radio-inner {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: transparent;
    transition: all 0.12s ease;
  }

  .s-radio-item.selected .s-radio-inner {
    background: #d0d0d0;
  }

  .s-radio-label {
    font-size: 11px;
    font-weight: 500;
    color: #888;
    letter-spacing: 0.04em;
  }

  .s-radio-item.selected .s-radio-label {
    color: #d0d0d0;
  }

  .s-radio-subdesc {
    font-size: 10px;
    color: #333;
    letter-spacing: 0.03em;
    margin-top: 2px;
  }

  .s-radio-item.selected .s-radio-subdesc {
    color: #555;
  }

  .s-action-btn {
    padding: 8px 16px;
    font-size: 10px;
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-weight: 600;
    border-radius: 2px;
    cursor: pointer;
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 1px solid #252525;
    background: transparent;
    color: #666;
  }

  .s-action-btn:hover {
    background: rgba(255,255,255,0.05);
    border-color: #3a3a3a;
    color: #aaa;
  }

  .s-action-btn.s-btn-danger {
    border-color: #2a1a1a;
    color: #884444;
  }

  .s-action-btn.s-btn-danger:hover {
    background: rgba(255, 80, 80, 0.05);
    border-color: #4a2020;
    color: #cc6666;
  }

  .s-action-btn.s-btn-danger.confirmed {
    border-color: #cc5555;
    color: #ff8888;
    animation: warningPulse 0.8s ease infinite alternate;
  }

  .s-action-btn.s-btn-primary {
    border-color: #333;
    color: #aaa;
    background: rgba(255,255,255,0.04);
  }

  .s-action-btn.s-btn-primary:hover {
    background: rgba(255,255,255,0.09);
    border-color: #555;
    color: #e5e5e5;
  }

  .s-action-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  @keyframes warningPulse {
    from { box-shadow: none; }
    to { box-shadow: 0 0 10px rgba(200,80,80,0.3); }
  }

  .s-info-box {
    background: var(--theme-surface, #0c0c0c);
    border: 1px solid var(--theme-border, #181818);
    border-radius: 2px;
    padding: 10px 14px;
    font-size: 10px;
    color: #3a3a3a;
    letter-spacing: 0.04em;
    line-height: 1.7;
  }

  .s-info-box.warning {
    border-color: #2a1a0a;
    color: #5a4a30;
  }

  .s-status-ok {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    color: #5a8a5a;
    letter-spacing: 0.06em;
  }

  .s-status-err {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    color: #8a4a4a;
    letter-spacing: 0.06em;
  }

  .s-status-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
  }

  .s-status-ok .s-status-dot { background: #5a8a5a; box-shadow: 0 0 5px #5a8a5a88; }
  .s-status-err .s-status-dot { background: #8a4a4a; box-shadow: 0 0 5px #8a4a4a88; }

  .s-monospace-path {
    font-size: 10px;
    color: #555;
    letter-spacing: 0.04em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .s-path-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: var(--theme-surface, #080808);
    border: 1px solid var(--theme-border, #181818);
    border-radius: 2px;
  }

  .s-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1px;
    background: var(--theme-border, #141414);
    border: 1px solid var(--theme-border, #141414);
    border-radius: 2px;
    overflow: hidden;
  }

  .s-grid-cell {
    background: var(--theme-surface, #0e0e0e);
    padding: 10px 14px;
  }

  .s-grid-cell-title {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    color: #555;
    margin-bottom: 6px;
    text-transform: uppercase;
  }

  .s-grid-cell-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .s-grid-cell-list li {
    font-size: 10px;
    color: #383838;
    letter-spacing: 0.03em;
  }

  .s-version-display {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #2a2a2a;
    font-family: 'JetBrains Mono', monospace;
    line-height: 1;
  }

  .s-version-display span {
    color: #c8c8c8;
  }

  .s-strikethrough {
    position: relative;
    display: inline-block;
  }

  .s-strikethrough::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    height: 2px;
    background: linear-gradient(90deg, transparent 0%, #cc4444 20%, #cc4444 80%, transparent 100%);
  }

  .s-update-status {
    font-size: 10px;
    letter-spacing: 0.06em;
    color: #3a3a3a;
    padding: 6px 0;
    border-top: 1px solid var(--theme-border, #141414);
    margin-top: 8px;
  }
`

/**
 * Inline toggle component that doesn't rely on shadcn Switch
 */
export function SToggle({
  checked,
  onCheckedChange,
  disabled,
}: {
  checked: boolean
  onCheckedChange: (val: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className="s-toggle" style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
      <input type="checkbox" checked={checked} onChange={(e) => !disabled && onCheckedChange(e.target.checked)} disabled={disabled} />
      <span className="s-toggle-track" />
      <span className="s-toggle-thumb" />
    </label>
  )
}

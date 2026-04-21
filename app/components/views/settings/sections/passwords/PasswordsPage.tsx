import { useEffect, useMemo, useState, useCallback } from 'react'
import { usePasswordsService } from '@/app/services/passwords'
import { Lock, Trash2, Copy, Upload, Eye, EyeOff, Pencil, Check, X, ShieldCheck } from 'lucide-react'
import { settingsStyles } from '../../settings-design-system'

interface CredentialSummary {
  id: string
  origin: string
  username: string
  createdAt: string
}

interface RevealedPasswords {
  [id: string]: string
}

interface EditingState {
  id: string
  username: string
  password: string
}

export function PasswordsPage() {
  const passwords = usePasswordsService()
  const [items, setItems] = useState<CredentialSummary[]>([])
  const [query, setQuery] = useState('')
  const [revealed, setRevealed] = useState<RevealedPasswords>({})
  const [editing, setEditing] = useState<EditingState | null>(null)
  const [authenticated, setAuthenticated] = useState(false)
  const [authPromptVisible, setAuthPromptVisible] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return items
    return items.filter((i) => i.origin.toLowerCase().includes(q) || i.username.toLowerCase().includes(q))
  }, [items, query])

  useEffect(() => {
    passwords
      .list()
      .then(setItems)
      .catch((e: any) => console.error('Failed to load passwords', e))
  }, [passwords])

  const requireAuth = useCallback(
    async (action: () => void) => {
      if (authenticated) {
        action()
        return
      }
      setAuthPromptVisible(true)
      setPendingAction(() => action)
    },
    [authenticated]
  )

  const handleAuthenticate = async () => {
    const ok = await passwords.verifyAuth()
    if (ok) {
      setAuthenticated(true)
      setAuthPromptVisible(false)
      if (pendingAction) {
        pendingAction()
        setPendingAction(null)
      }
    } else {
      setAuthPromptVisible(false)
      setPendingAction(null)
    }
  }

  const handleReveal = async (id: string) => {
    requireAuth(async () => {
      if (revealed[id]) {
        setRevealed((prev) => {
          const next = { ...prev }
          delete next[id]
          return next
        })
        return
      }
      const pw = await passwords.revealPassword(id)
      if (pw !== null) {
        setRevealed((prev) => ({ ...prev, [id]: pw }))
      }
    })
  }

  const handleCopy = async (id: string) => {
    requireAuth(async () => {
      const pw = await passwords.revealPassword(id)
      if (pw !== null) {
        await navigator.clipboard.writeText(pw)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
      }
    })
  }

  const handleDelete = async (id: string) => {
    await passwords.remove(id)
    setItems((prev) => prev.filter((i) => i.id !== id))
    setRevealed((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const handleStartEdit = (item: CredentialSummary) => {
    requireAuth(async () => {
      const pw = await passwords.revealPassword(item.id)
      if (pw !== null) {
        setEditing({ id: item.id, username: item.username, password: pw })
      }
    })
  }

  const handleSaveEdit = async () => {
    if (!editing) return
    await passwords.update(editing.id, {
      username: editing.username,
      password: editing.password,
    })
    setEditing(null)
    const next = await passwords.list()
    setItems(next)
    setRevealed({})
  }

  const handleCancelEdit = () => {
    setEditing(null)
  }

  const handleImport = async (evt: React.ChangeEvent<HTMLInputElement>) => {
    const file = evt.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const rows = parseCsv(text).filter((r) => /^https?:\/\//i.test(r.url))
    await passwords.importCsv(rows)
    const next = await passwords.list()
    setItems(next)
    evt.target.value = ''
  }

  return (
    <>
      <style>{settingsStyles}</style>
      <style>{`
        .s-pwd-panel {
          background: #0e0e0e;
          border: 1px solid #1a1a1a;
          border-radius: 4px;
          overflow: hidden;
          font-family: 'JetBrains Mono', monospace;
        }
        .s-pwd-toolbar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 20px 10px;
          border-bottom: 1px solid #141414;
        }
        .s-pwd-search {
          flex: 1;
          background: #080808;
          border: 1px solid #1f1f1f;
          border-radius: 2px;
          padding: 7px 12px;
          font-size: 10px;
          font-family: 'JetBrains Mono', monospace;
          color: #888;
          letter-spacing: 0.04em;
          outline: none;
        }
        .s-pwd-search::placeholder { color: #2f2f2f; }
        .s-pwd-search:focus { border-color: #2a2a2a; }
        .s-pwd-import-label {
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
        .s-pwd-import-label:hover { background: rgba(255,255,255,0.04); color: #666; border-color: #2f2f2f; }
        .s-pwd-table {
          width: 100%;
          border-collapse: collapse;
          font-family: 'JetBrains Mono', monospace;
        }
        .s-pwd-thead th {
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #333;
          text-align: left;
          padding: 10px 20px 8px;
          border-bottom: 1px solid #141414;
          font-weight: 600;
        }
        .s-pwd-row td {
          font-size: 10px;
          color: #666;
          padding: 11px 20px;
          border-bottom: 1px solid #111;
          letter-spacing: 0.03em;
          vertical-align: middle;
        }
        .s-pwd-row:last-child td { border-bottom: none; }
        .s-pwd-row:hover td { background: rgba(255,255,255,0.015); }
        .s-pwd-origin { color: #888; }
        .s-pwd-date { color: #333; font-size: 9px; }
        .s-pwd-action-cell { text-align: right; }
        .s-pwd-action-btns { display: flex; gap: 4px; justify-content: flex-end; }
        .s-pwd-btn {
          font-size: 9px;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 5px 8px;
          border-radius: 2px;
          cursor: pointer;
          transition: all 0.12s ease;
          display: flex;
          align-items: center;
          gap: 4px;
          border: 1px solid #1f1f1f;
          background: transparent;
          color: #3a3a3a;
        }
        .s-pwd-btn:hover { color: #888; background: rgba(255,255,255,0.04); border-color: #2f2f2f; }
        .s-pwd-btn.danger { border-color: #2a1a1a; color: #663333; }
        .s-pwd-btn.danger:hover { background: rgba(200,60,60,0.05); color: #884444; border-color: #3a2020; }
        .s-pwd-btn.success { border-color: #1a2a1a; color: #336633; }
        .s-pwd-empty td {
          text-align: center;
          padding: 40px 20px !important;
          color: #2a2a2a !important;
          font-style: italic;
          font-size: 10px !important;
        }
        .s-pwd-password {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: #555;
          letter-spacing: 0.15em;
        }
        .s-pwd-edit-input {
          background: #080808;
          border: 1px solid #2a2a2a;
          border-radius: 2px;
          padding: 4px 8px;
          font-size: 10px;
          font-family: 'JetBrains Mono', monospace;
          color: #888;
          outline: none;
          width: 100%;
        }
        .s-pwd-edit-input:focus { border-color: #3a3a3a; }
        .s-pwd-auth-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          background: rgba(59, 130, 246, 0.05);
          border-bottom: 1px solid #141414;
        }
        .s-pwd-auth-btn {
          font-size: 10px;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.06em;
          padding: 6px 14px;
          border-radius: 2px;
          cursor: pointer;
          border: 1px solid #2563eb33;
          background: rgba(37, 99, 235, 0.1);
          color: #60a5fa;
          transition: all 0.12s ease;
        }
        .s-pwd-auth-btn:hover { background: rgba(37, 99, 235, 0.2); border-color: #2563eb55; }
      `}</style>

      <div className="s-pwd-panel">
        {/* Header */}
        <div className="s-panel-header">
          <div className="s-panel-icon">
            <Lock className="w-3.5 h-3.5" style={{ color: '#888' }} />
          </div>
          <div>
            <div className="s-panel-title">Saved Passwords</div>
            <div className="s-panel-desc">
              {authenticated
                ? 'Manage stored credentials — authenticated'
                : 'Verify your identity to view or edit passwords'}
            </div>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: '9px', letterSpacing: '0.1em', color: '#333' }}>
            {items.length} SAVED
          </span>
        </div>

        {/* Auth banner */}
        {authPromptVisible && (
          <div className="s-pwd-auth-banner">
            <ShieldCheck className="w-4 h-4" style={{ color: '#60a5fa' }} />
            <span style={{ fontSize: '10px', color: '#60a5fa', letterSpacing: '0.04em' }}>
              System authentication required to continue
            </span>
            <button className="s-pwd-auth-btn" onClick={handleAuthenticate} style={{ marginLeft: 'auto' }}>
              Verify Identity
            </button>
            <button
              className="s-pwd-btn"
              onClick={() => {
                setAuthPromptVisible(false)
                setPendingAction(null)
              }}
              style={{ padding: '5px 8px' }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div className="s-pwd-toolbar">
          <input
            className="s-pwd-search"
            type="search"
            placeholder="Search by site or username..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <label className="s-pwd-import-label">
            <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
            <Upload className="w-3 h-3" />
            Import CSV
          </label>
        </div>

        {/* Table */}
        <table className="s-pwd-table">
          <thead className="s-pwd-thead">
            <tr>
              <th>Site</th>
              <th>Username</th>
              <th>Password</th>
              <th>Saved</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => {
              const isEditing = editing?.id === i.id

              if (isEditing) {
                return (
                  <tr key={i.id} className="s-pwd-row">
                    <td className="s-pwd-origin">{i.origin}</td>
                    <td>
                      <input
                        className="s-pwd-edit-input"
                        value={editing.username}
                        onChange={(e) => setEditing({ ...editing, username: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="s-pwd-edit-input"
                        type="text"
                        value={editing.password}
                        onChange={(e) => setEditing({ ...editing, password: e.target.value })}
                      />
                    </td>
                    <td className="s-pwd-date">{new Date(i.createdAt).toLocaleDateString()}</td>
                    <td className="s-pwd-action-cell">
                      <div className="s-pwd-action-btns">
                        <button className="s-pwd-btn success" onClick={handleSaveEdit}>
                          <Check className="w-2.5 h-2.5" />
                          Save
                        </button>
                        <button className="s-pwd-btn" onClick={handleCancelEdit}>
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              }

              return (
                <tr key={i.id} className="s-pwd-row">
                  <td className="s-pwd-origin">{i.origin}</td>
                  <td>{i.username}</td>
                  <td>
                    <span className="s-pwd-password">
                      {revealed[i.id] ? revealed[i.id] : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                    </span>
                  </td>
                  <td className="s-pwd-date">{new Date(i.createdAt).toLocaleDateString()}</td>
                  <td className="s-pwd-action-cell">
                    <div className="s-pwd-action-btns">
                      <button className="s-pwd-btn" onClick={() => handleReveal(i.id)} title={revealed[i.id] ? 'Hide' : 'Reveal'}>
                        {revealed[i.id] ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                      </button>
                      <button
                        className="s-pwd-btn"
                        onClick={() => handleCopy(i.id)}
                        title="Copy password"
                      >
                        {copiedId === i.id ? (
                          <Check className="w-2.5 h-2.5" style={{ color: '#4ade80' }} />
                        ) : (
                          <Copy className="w-2.5 h-2.5" />
                        )}
                      </button>
                      <button className="s-pwd-btn" onClick={() => handleStartEdit(i)} title="Edit">
                        <Pencil className="w-2.5 h-2.5" />
                      </button>
                      <button className="s-pwd-btn danger" onClick={() => handleDelete(i.id)} title="Delete">
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr className="s-pwd-empty">
                <td colSpan={5}>No passwords saved yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

function parseCsv(
  text: string
): Array<{ name?: string; url: string; username: string; password: string; note?: string }> {
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (lines.length === 0) return []
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const get = (row: string[], key: string) => row[header.indexOf(key)] || ''
  const rows: Array<{ name?: string; url: string; username: string; password: string; note?: string }> = []
  for (let i = 1; i < lines.length; i++) {
    const row = splitCsvLine(lines[i])
    const url = get(row, 'url') || get(row, 'origin')
    const username = get(row, 'username')
    const password = get(row, 'password')
    const name = get(row, 'name')
    const note = get(row, 'notes')
    if (url && username && password) rows.push({ url, username, password, name, note })
  }
  return rows
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

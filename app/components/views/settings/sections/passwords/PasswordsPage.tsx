import { useEffect, useMemo, useState } from 'react'
import { usePasswordsService } from '@/app/services/passwords'
import { Lock, Trash2, Copy, Upload } from 'lucide-react'
import { settingsStyles } from '../../settings-design-system'

interface CredentialSummary {
  id: string
  origin: string
  username: string
  createdAt: string
}

export function PasswordsPage() {
  const passwords = usePasswordsService()
  const [items, setItems] = useState<CredentialSummary[]>([])
  const [query, setQuery] = useState('')

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

  const handleDelete = async (id: string) => {
    await passwords.remove(id)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const handleReveal = async (id: string) => {
    const cred = await passwords.get(id)
    await navigator.clipboard.writeText(cred.password)
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
        .s-pwd-action-btns { display: flex; gap: 6px; justify-content: flex-end; }
        .s-pwd-btn {
          font-size: 9px;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 5px 10px;
          border-radius: 2px;
          cursor: pointer;
          transition: all 0.12s ease;
          display: flex;
          align-items: center;
          gap: 5px;
          border: 1px solid #1f1f1f;
          background: transparent;
          color: #3a3a3a;
        }
        .s-pwd-btn:hover { color: #888; background: rgba(255,255,255,0.04); border-color: #2f2f2f; }
        .s-pwd-btn.danger { border-color: #2a1a1a; color: #663333; }
        .s-pwd-btn.danger:hover { background: rgba(200,60,60,0.05); color: #884444; border-color: #3a2020; }
        .s-pwd-empty td {
          text-align: center;
          padding: 40px 20px !important;
          color: #2a2a2a !important;
          font-style: italic;
          font-size: 10px !important;
        }
      `}</style>

      <div className="s-pwd-panel">
        {/* Header */}
        <div className="s-panel-header">
          <div className="s-panel-icon">
            <Lock className="w-3.5 h-3.5" style={{ color: '#888' }} />
          </div>
          <div>
            <div className="s-panel-title">Saved Passwords</div>
            <div className="s-panel-desc">Manage stored credentials and import from CSV</div>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: '9px', letterSpacing: '0.1em', color: '#333' }}>
            {items.length} SAVED
          </span>
        </div>

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
              <th>Saved</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id} className="s-pwd-row">
                <td className="s-pwd-origin">{i.origin}</td>
                <td>{i.username}</td>
                <td className="s-pwd-date">{new Date(i.createdAt).toLocaleDateString()}</td>
                <td className="s-pwd-action-cell">
                  <div className="s-pwd-action-btns">
                    <button className="s-pwd-btn" onClick={() => handleReveal(i.id)}>
                      <Copy className="w-2.5 h-2.5" />
                      Copy
                    </button>
                    <button className="s-pwd-btn danger" onClick={() => handleDelete(i.id)}>
                      <Trash2 className="w-2.5 h-2.5" />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr className="s-pwd-empty">
                <td colSpan={4}>No passwords saved yet</td>
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
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

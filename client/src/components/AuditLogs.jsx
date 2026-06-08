import { useState, useEffect } from 'react'

const LEVEL_CONFIG = {
  INFO: { color: 'blue', icon: 'ℹ', label: 'INFO' },
  ERROR: { color: 'red', icon: '✕', label: 'ERROR' },
  WARN: { color: 'amber', icon: '⚠', label: 'WARN' },
}

const ACTION_ICONS = {
  SERVER_START: '🚀',
  DISCOVER_START: '⊕',
  DISCOVER_COMPLETE: '✓',
  DISCOVER_ERROR: '✕',
  PORT_SCAN_START: '◈',
  PORT_SCAN_COMPLETE: '✓',
  PORT_SCAN_ERROR: '✕',
  SSH_EXECUTE: '⌨',
  SSH_EXECUTE_COMPLETE: '✓',
  SSH_CONNECTION_ERROR: '✕',
  SSH_EXEC_ERROR: '✕',
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    fetchLogs()
    const t = setInterval(fetchLogs, 10000)
    return () => clearInterval(t)
  }, [])

  async function fetchLogs() {
    setLoading(true)
    try {
      const res = await fetch('/api/logs')
      const data = await res.json()
      setLogs(data.logs || [])
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  async function clearLogs() {
    if (!window.confirm('Tüm log kayıtları silinecek. Emin misiniz?')) return
    setClearing(true)
    try {
      await fetch('/api/logs', { method: 'DELETE' })
      setLogs([])
    } catch {/* */} finally {
      setClearing(false)
    }
  }

  const filtered = logs.filter(l => {
    const levelOk = filter === 'ALL' || l.level === filter
    const searchOk = !search || l.action?.toLowerCase().includes(search.toLowerCase()) ||
      JSON.stringify(l.details || {}).toLowerCase().includes(search.toLowerCase())
    return levelOk && searchOk
  })

  const counts = {
    ALL: logs.length,
    INFO: logs.filter(l => l.level === 'INFO').length,
    ERROR: logs.filter(l => l.level === 'ERROR').length,
    WARN: logs.filter(l => l.level === 'WARN').length,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Stats ── */}
      <div className="stat-grid">
        {[
          { key: 'ALL', label: 'Toplam Kayıt', icon: '◧', color: 'blue' },
          { key: 'INFO', label: 'Başarılı', icon: 'ℹ', color: 'green' },
          { key: 'ERROR', label: 'Hata', icon: '✕', color: 'red' },
          { key: 'WARN', label: 'Uyarı', icon: '⚠', color: 'amber' },
        ].map(s => (
          <div
            key={s.key}
            className="stat-card"
            style={{ cursor: 'pointer', borderColor: filter === s.key ? 'var(--border-subtle)' : undefined }}
            onClick={() => setFilter(s.key)}
          >
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            <div className="stat-info">
              <div className="stat-value" style={{ color: `var(--accent-${s.color === 'blue' ? 'primary' : s.color})` }}>
                {counts[s.key]}
              </div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Controls ── */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <div className="card-title-icon" style={{ background: 'rgba(245,158,11,0.15)' }}>◧</div>
            Audit Logları
          </div>
          <div className="flex gap-2 items-center">
            <button id="btn-refresh-logs" className="btn btn-sm btn-secondary" onClick={fetchLogs} disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '↻ Yenile'}
            </button>
            <button id="btn-clear-logs" className="btn btn-sm btn-danger" onClick={clearLogs} disabled={clearing}>
              {clearing ? 'Siliniyor...' : '✕ Temizle'}
            </button>
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-card)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Level filter */}
          <div className="flex gap-2">
            {['ALL', 'INFO', 'ERROR', 'WARN'].map(lvl => (
              <button
                key={lvl}
                id={`filter-${lvl}`}
                className={`btn btn-sm ${filter === lvl ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter(lvl)}
              >
                {lvl === 'ALL' ? 'Tümü' : lvl} ({counts[lvl]})
              </button>
            ))}
          </div>
          {/* Search */}
          <input
            id="log-search"
            className="form-control"
            style={{ maxWidth: 240, padding: '6px 12px', fontSize: 12.5 }}
            placeholder="Ara... (action, IP, detay)"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-text">
                {logs.length === 0 ? 'Henüz kayıt yok. Araçları kullanmaya başlayın.' : 'Filtreyle eşleşen kayıt bulunamadı.'}
              </div>
            </div>
          ) : (
            <div>
              {filtered.map((log, i) => {
                const cfg = LEVEL_CONFIG[log.level] || LEVEL_CONFIG.INFO
                const icon = ACTION_ICONS[log.action] || '•'
                const isExp = expanded === log.id
                return (
                  <div
                    key={log.id || i}
                    onClick={() => setExpanded(isExp ? null : log.id)}
                    style={{
                      borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                      cursor: 'pointer',
                      background: isExp ? 'rgba(59,130,246,0.04)' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 20px' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, flexShrink: 0,
                        background: cfg.color === 'blue' ? 'rgba(59,130,246,0.15)' : cfg.color === 'red' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                        color: cfg.color === 'blue' ? 'var(--accent-primary)' : cfg.color === 'red' ? 'var(--accent-red)' : 'var(--accent-amber)',
                        letterSpacing: '0.5px',
                      }}>{log.level}</span>

                      <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>

                      <span style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1, fontWeight: 500 }}>
                        {log.action?.replace(/_/g, ' ')}
                      </span>

                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                        {new Date(log.timestamp).toLocaleString('tr-TR')}
                      </span>

                      <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
                        {isExp ? '▲' : '▼'}
                      </span>
                    </div>

                    {isExp && (
                      <div style={{
                        margin: '0 20px 12px',
                        padding: '12px 16px',
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}>
                        <pre style={{
                          fontFamily: 'var(--font-mono)', fontSize: 12,
                          color: 'var(--text-secondary)', margin: 0,
                          whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                        }}>
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          ID: {log.id}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

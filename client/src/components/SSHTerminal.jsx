import { useState, useRef, useEffect } from 'react'

export default function SSHTerminal() {
  const [host, setHost] = useState('')
  const [port, setPort] = useState('22')
  const [username, setUsername] = useState('')
  const [authType, setAuthType] = useState('password')
  const [password, setPassword] = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [command, setCommand] = useState('')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [cmdHistory, setCmdHistory] = useState([])
  const [histIdx, setHistIdx] = useState(-1)

  const termBodyRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (termBodyRef.current) {
      termBodyRef.current.scrollTop = termBodyRef.current.scrollHeight
    }
  }, [history, loading])

  async function handleExecute(e) {
    e.preventDefault()
    if (!host || !username || !command) return

    const cmd = command.trim()
    setLoading(true)
    setError(null)
    setCmdHistory(prev => [cmd, ...prev].slice(0, 50))
    setHistIdx(-1)

    setHistory(prev => [...prev, {
      type: 'cmd',
      prompt: `${username}@${host}:~$`,
      text: cmd,
    }])
    setCommand('')

    try {
      const body = { host, port, username, command: cmd }
      if (authType === 'password') body.password = password
      else body.privateKey = privateKey

      const res = await fetch('/api/execute-ssh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'SSH hatası')

      if (data.stdout) {
        setHistory(prev => [...prev, { type: 'stdout', text: data.stdout }])
      }
      if (data.stderr) {
        setHistory(prev => [...prev, { type: 'stderr', text: data.stderr }])
      }
      if (!data.stdout && !data.stderr) {
        setHistory(prev => [...prev, { type: 'info', text: `[Komut tamamlandı. Exit code: ${data.exitCode}]` }])
      }
    } catch (err) {
      setHistory(prev => [...prev, { type: 'error', text: `Hata: ${err.message}` }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHistIdx(prev => {
        const next = Math.min(prev + 1, cmdHistory.length - 1)
        if (cmdHistory[next] !== undefined) setCommand(cmdHistory[next])
        return next
      })
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHistIdx(prev => {
        const next = prev - 1
        if (next < 0) { setCommand(''); return -1 }
        if (cmdHistory[next] !== undefined) setCommand(cmdHistory[next])
        return next
      })
    }
  }

  function clearTerminal() {
    setHistory([])
    setError(null)
  }

  const connected = host && username && (authType === 'password' ? password : privateKey)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Connection Config ── */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <div className="card-title-icon" style={{ background: 'rgba(6,182,212,0.15)' }}>⌨</div>
            SSH Bağlantı Ayarları
          </div>
          <div className="flex gap-2">
            {connected && <span className="badge badge-green">● Hazır</span>}
            <button className="btn btn-sm btn-secondary" onClick={clearTerminal}>Temizle</button>
          </div>
        </div>
        <div className="card-body">
          <div className="form-row cols-3 mb-4">
            <div className="form-group">
              <label className="form-label">Sunucu / IP</label>
              <input
                id="ssh-host"
                className="form-control mono"
                value={host}
                onChange={e => setHost(e.target.value)}
                placeholder="192.168.1.100"
              />
            </div>
            <div className="form-group">
              <label className="form-label">SSH Port</label>
              <input
                id="ssh-port"
                className="form-control mono"
                value={port}
                onChange={e => setPort(e.target.value)}
                placeholder="22"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Kullanıcı Adı</label>
              <input
                id="ssh-username"
                className="form-control"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="root veya ubuntu"
              />
            </div>
          </div>

          {/* Auth type toggle */}
          <div className="mb-4">
            <div className="form-label mb-2">Kimlik Doğrulama</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['password', 'key'].map(t => (
                <button
                  type="button"
                  key={t}
                  className={`btn btn-sm ${authType === t ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setAuthType(t)}
                >
                  {t === 'password' ? '🔑 Şifre' : '🗝 Private Key'}
                </button>
              ))}
            </div>
          </div>

          {authType === 'password' ? (
            <div className="form-group mb-4" style={{ maxWidth: 340 }}>
              <label className="form-label">Şifre</label>
              <input
                id="ssh-password"
                className="form-control"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
          ) : (
            <div className="form-group mb-4">
              <label className="form-label">Private Key (PEM formatı)</label>
              <textarea
                id="ssh-private-key"
                className="form-control mono"
                value={privateKey}
                onChange={e => setPrivateKey(e.target.value)}
                placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
                rows={5}
              />
            </div>
          )}

          <div className="alert alert-warn" style={{ borderRadius: 10 }}>
            <span>⚠</span>
            <span style={{ fontSize: 12.5 }}>
              Yalnızca izinli sistemlerde kullanın. Şifreler sadece bağlantı süresi boyunca bellekte tutulur, kaydedilmez.
            </span>
          </div>
        </div>
      </div>

      {/* ── Terminal ── */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <div className="card-title-icon" style={{ background: 'rgba(6,182,212,0.15)' }}>▶</div>
            SSH Terminali {host && <span className="text-muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>— {username}@{host}:{port}</span>}
          </div>
          <span className="text-muted text-sm">↑ ↓ komut geçmişi</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="terminal" style={{ borderRadius: '0 0 14px 14px', border: 'none' }}>
            <div className="terminal-titlebar">
              <div className="terminal-btn red" />
              <div className="terminal-btn amber" />
              <div className="terminal-btn green" />
              <span className="terminal-label">{host ? `${username}@${host}` : 'Bağlantı kurulmadı'}</span>
            </div>

            <div className="terminal-body" ref={termBodyRef}>
              {history.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>
                  NetOps SSH Terminal v1.0.0 — Bağlantı bilgilerini girin ve komut çalıştırın.
                </div>
              )}
              {history.map((line, i) => (
                <div key={i} style={{ marginBottom: 4 }}>
                  {line.type === 'cmd' && (
                    <div className="terminal-line">
                      <span className="terminal-prompt">{line.prompt}</span>
                      <span className="terminal-cmd">{line.text}</span>
                    </div>
                  )}
                  {line.type === 'stdout' && (
                    <pre style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#94a3b8', whiteSpace: 'pre-wrap', margin: 0 }}>{line.text}</pre>
                  )}
                  {line.type === 'stderr' && (
                    <pre style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent-amber)', whiteSpace: 'pre-wrap', margin: 0 }}>{line.text}</pre>
                  )}
                  {line.type === 'error' && (
                    <div className="terminal-error">{line.text}</div>
                  )}
                  {line.type === 'info' && (
                    <div className="terminal-info" style={{ fontSize: 12 }}>{line.text}</div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-2 items-center" style={{ color: 'var(--accent-cyan)', fontSize: 12 }}>
                  <span className="spinner" style={{ width: 12, height: 12 }} />
                  Komut çalışıyor...
                </div>
              )}
            </div>

            <form onSubmit={handleExecute}>
              <div className="terminal-input-row">
                <span className="terminal-prompt" style={{ flexShrink: 0 }}>
                  {connected ? `${username}@${host}:~$` : '$'}
                </span>
                <input
                  id="ssh-command-input"
                  ref={inputRef}
                  className="terminal-input"
                  value={command}
                  onChange={e => setCommand(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={connected ? 'Komut girin ve Enter\'a basın...' : 'Önce bağlantı bilgilerini doldurun'}
                  disabled={loading || !connected}
                  autoComplete="off"
                  spellCheck="false"
                />
                <button
                  id="btn-ssh-execute"
                  className="btn btn-sm btn-primary"
                  type="submit"
                  disabled={loading || !connected || !command.trim()}
                >
                  {loading ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '⏎ Çalıştır'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'

export default function Discover() {
  const [range, setRange] = useState('192.168.1.0/24')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(0)

  async function handleScan(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResults(null)
    setProgress(0)

    // Fake progress animation
    const timer = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 15, 90))
    }, 400)

    try {
      const res = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ range }),
      })
      const data = await res.json()
      clearInterval(timer)
      setProgress(100)
      if (!res.ok) throw new Error(data.error || 'Bilinmeyen hata')
      setResults(data)
    } catch (err) {
      clearInterval(timer)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const alive = results?.results?.filter(r => r.alive) || []
  const dead = results?.results?.filter(r => !r.alive) || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Scan Form ── */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <div className="card-title-icon" style={{ background: 'rgba(59,130,246,0.15)' }}>⊕</div>
            Ağ Keşif Taraması
          </div>
          {results && (
            <div className="flex gap-2 items-center">
              <span className="badge badge-green">● {alive.length} aktif</span>
              <span className="badge badge-gray">{dead.length} yanıt yok</span>
            </div>
          )}
        </div>
        <div className="card-body">
          <form onSubmit={handleScan}>
            <div className="form-row cols-auto mb-4">
              <div className="form-group">
                <label className="form-label">IP Aralığı</label>
                <input
                  id="discover-range"
                  className="form-control mono"
                  value={range}
                  onChange={e => setRange(e.target.value)}
                  placeholder="192.168.1.0/24 veya 192.168.1.1-50 veya 10.0.0.1"
                  disabled={loading}
                />
                <span className="form-hint">CIDR (örn: /24), aralık (1.1-1.50) veya tek IP desteklenir. Maks 256 IP.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button id="btn-discover-scan" className="btn btn-primary" type="submit" disabled={loading}>
                  {loading ? <><span className="spinner" style={{ width: 14, height: 14 }}></span> Taranıyor...</> : '⊕ Taramayı Başlat'}
                </button>
              </div>
            </div>

            {loading && (
              <div>
                <div className="flex justify-between mb-1" style={{ fontSize: 12 }}>
                  <span className="text-muted">Ping taraması devam ediyor...</span>
                  <span className="text-secondary">{Math.round(progress)}%</span>
                </div>
                <div className="progress-bar-wrap">
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </form>

          {error && (
            <div className="alert alert-error mt-4">
              <span>⚠</span> {error}
            </div>
          )}
        </div>
      </div>

      {/* ── Scan Format Guide ── */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <div className="card-title-icon" style={{ background: 'rgba(6,182,212,0.15)' }}>ℹ</div>
            Desteklenen Formatlar
          </div>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[
              { label: 'CIDR Notation', example: '192.168.1.0/24', desc: 'Tüm subnet taraması' },
              { label: 'IP Aralığı', example: '192.168.1.1-192.168.1.50', desc: 'Başlangıç-bitiş IP' },
              { label: 'Tek IP', example: '192.168.1.100', desc: 'Belirli bir cihaz' },
            ].map(f => (
              <div key={f.label} style={{
                padding: '14px 16px', borderRadius: 10,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-card)',
              }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>{f.label}</div>
                <div className="font-mono" style={{ fontSize: 13, color: 'var(--accent-cyan)', marginBottom: 4 }}>{f.example}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Results Table ── */}
      {results && (
        <div className="card animate-in">
          <div className="card-header">
            <div className="card-title">
              <div className="card-title-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>◉</div>
              Tarama Sonuçları
            </div>
            <div className="text-muted text-sm">{results.total} IP tarandı</div>
          </div>
          <div className="table-wrapper" style={{ margin: '0 1px 1px', borderRadius: '0 0 12px 12px', border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>IP Adresi</th>
                  <th>Hostname</th>
                  <th>Durum</th>
                  <th>Yanıt Süresi</th>
                </tr>
              </thead>
              <tbody>
                {results.results.map((r, i) => (
                  <tr key={r.ip}>
                    <td className="text-muted text-sm">{i + 1}</td>
                    <td className="ip-cell">{r.ip}</td>
                    <td className="text-secondary">{r.host && r.host !== r.ip ? r.host : '—'}</td>
                    <td>
                      {r.alive
                        ? <span className="badge badge-green"><span className="badge-dot"></span>Aktif</span>
                        : <span className="badge badge-gray"><span className="badge-dot"></span>Yanıt Yok</span>}
                    </td>
                    <td className="font-mono text-sm">
                      {r.time ? `${r.time} ms` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

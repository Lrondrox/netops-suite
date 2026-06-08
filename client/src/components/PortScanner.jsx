import { useState } from 'react'

const PRESET_PORTS = {
  'Web Servisleri': [80, 443, 8080, 8443],
  'Uzak Erişim': [22, 23, 3389, 5900],
  'Veritabanları': [3306, 5432, 27017, 6379, 1521],
  'Mail': [25, 110, 143, 465, 587, 993, 995],
  'Dosya Paylaşım': [21, 22, 445, 139, 2049],
  'Tam Tarama': [21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 3306, 3389, 5432, 5900, 6379, 8080, 8443, 27017],
}

const STATUS_COLOR = {
  open: 'open',
  closed: 'closed',
  filtered: 'filtered',
  unreachable: 'closed',
}

export default function PortScanner() {
  const [ip, setIp] = useState('')
  const [portsInput, setPortsInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(0)
  const [selectedPreset, setSelectedPreset] = useState(null)

  function applyPreset(name) {
    setSelectedPreset(name)
    setPortsInput(PRESET_PORTS[name].join(', '))
  }

  async function handleScan(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResults(null)
    setProgress(0)

    const ports = portsInput
      ? portsInput.split(/[\s,]+/).map(Number).filter(n => n > 0 && n < 65536)
      : []

    const timer = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 12, 88))
    }, 350)

    try {
      const res = await fetch('/api/scan-ports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, ports }),
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

  const openPorts = results?.results?.filter(r => r.status === 'open') || []
  const filteredPorts = results?.results?.filter(r => r.status === 'filtered') || []
  const closedPorts = results?.results?.filter(r => r.status === 'closed' || r.status === 'unreachable') || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Form ── */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <div className="card-title-icon" style={{ background: 'rgba(139,92,246,0.15)' }}>◈</div>
            TCP Port Taraması
          </div>
          {results && (
            <div className="flex gap-2 items-center">
              <span className="badge badge-green">● {results.open} açık</span>
              <span className="badge badge-amber">◎ {filteredPorts.length} filtreli</span>
              <span className="badge badge-gray">× {closedPorts.length} kapalı</span>
            </div>
          )}
        </div>
        <div className="card-body">
          <form onSubmit={handleScan}>
            <div className="form-row cols-2 mb-4">
              <div className="form-group">
                <label className="form-label">Hedef IP Adresi</label>
                <input
                  id="port-scan-ip"
                  className="form-control mono"
                  value={ip}
                  onChange={e => setIp(e.target.value)}
                  placeholder="192.168.1.1"
                  required
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Port Listesi (boş = varsayılan 18 port)</label>
                <input
                  id="port-scan-ports"
                  className="form-control mono"
                  value={portsInput}
                  onChange={e => { setPortsInput(e.target.value); setSelectedPreset(null) }}
                  placeholder="22, 80, 443, 3306 ..."
                  disabled={loading}
                />
              </div>
            </div>

            {/* Presets */}
            <div className="mb-4">
              <div className="form-label mb-2">Hızlı Ön Ayarlar</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Object.keys(PRESET_PORTS).map(name => (
                  <button
                    type="button"
                    key={name}
                    className={`btn btn-sm ${selectedPreset === name ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => applyPreset(name)}
                    disabled={loading}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 items-center">
              <button id="btn-port-scan" className="btn btn-primary" type="submit" disabled={loading || !ip}>
                {loading ? <><span className="spinner" style={{ width: 14, height: 14 }}></span> Taranıyor...</> : '◈ Taramayı Başlat'}
              </button>
            </div>

            {loading && (
              <div className="mt-4">
                <div className="flex justify-between mb-1" style={{ fontSize: 12 }}>
                  <span className="text-muted">TCP bağlantı denemeleri yapılıyor...</span>
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

      {/* ── Results ── */}
      {results && (
        <div className="card animate-in">
          <div className="card-header">
            <div className="card-title">
              <div className="card-title-icon" style={{ background: 'rgba(139,92,246,0.15)' }}>◉</div>
              <span>Sonuçlar: </span>
              <span className="ip-cell" style={{ fontFamily: 'var(--font-mono)' }}>{results.ip}</span>
            </div>
            <div className="text-muted text-sm">{results.total} port kontrol edildi</div>
          </div>

          {/* Open ports highlight */}
          {openPorts.length > 0 && (
            <div style={{ padding: '16px 24px', background: 'rgba(16,185,129,0.04)', borderBottom: '1px solid rgba(16,185,129,0.1)' }}>
              <div className="form-label mb-2" style={{ color: 'var(--accent-green)' }}>Açık Portlar</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {openPorts.map(r => (
                  <span key={r.port} className="port-tag open">
                    {r.port} / {r.service}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="table-wrapper" style={{ margin: '0 1px 1px', borderRadius: '0 0 12px 12px', border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Port</th>
                  <th>Servis</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {results.results.map(r => (
                  <tr key={r.port}>
                    <td className="font-mono" style={{ color: 'var(--accent-cyan)' }}>{r.port}</td>
                    <td className="text-secondary">{r.service}</td>
                    <td>
                      <span className={`port-tag ${STATUS_COLOR[r.status] || 'closed'}`}>
                        {r.status === 'open' ? '● Açık' : r.status === 'filtered' ? '◎ Filtreli' : '× Kapalı'}
                      </span>
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

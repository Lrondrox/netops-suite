import { useState, useEffect } from 'react'

export default function Dashboard({ onNavigate, apiOnline }) {
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState({ total: 0, info: 0, error: 0, warn: 0 })

  useEffect(() => {
    fetchLogs()
    const t = setInterval(fetchLogs, 15000)
    return () => clearInterval(t)
  }, [])

  async function fetchLogs() {
    try {
      const r = await fetch('/api/logs')
      const data = await r.json()
      const all = data.logs || []
      setLogs(all.slice(0, 6))
      setStats({
        total: all.length,
        info: all.filter(l => l.level === 'INFO').length,
        error: all.filter(l => l.level === 'ERROR').length,
        warn: all.filter(l => l.level === 'WARN').length,
      })
    } catch { /* offline */ }
  }

  const QUICK_ACTIONS = [
    { id: 'discover', icon: '⊕', label: 'Ağ Keşfi Başlat', desc: 'IP aralığındaki cihazları tara', color: 'blue' },
    { id: 'ports', icon: '◈', label: 'Port Taraması Yap', desc: 'Açık portları ve servisleri bul', color: 'purple' },
    { id: 'ssh', icon: '⌨', label: 'SSH Bağlantısı Kur', desc: 'Uzak cihazda komut çalıştır', color: 'cyan' },
    { id: 'logs', icon: '◧', label: 'Audit Logları Gör', desc: 'Güvenlik kayıtlarını incele', color: 'amber' },
  ]

  const colorMap = {
    blue: 'var(--accent-primary)',
    purple: 'var(--accent-purple)',
    cyan: 'var(--accent-cyan)',
    amber: 'var(--accent-amber)',
  }

  return (
    <div>
      {/* ── Stat Cards ── */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon blue">🛰</div>
          <div className="stat-info">
            <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>{stats.total}</div>
            <div className="stat-label">Toplam İşlem</div>
            <div className="stat-sub neutral">Tüm zamanlar</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✓</div>
          <div className="stat-info">
            <div className="stat-value" style={{ color: 'var(--accent-green)' }}>{stats.info}</div>
            <div className="stat-label">Başarılı İşlem</div>
            <div className="stat-sub up">INFO seviyesi</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">✕</div>
          <div className="stat-info">
            <div className="stat-value" style={{ color: 'var(--accent-red)' }}>{stats.error}</div>
            <div className="stat-label">Hata Sayısı</div>
            <div className="stat-sub down">ERROR seviyesi</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: apiOnline ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', boxShadow: apiOnline ? '0 4px 16px rgba(16,185,129,0.15)' : '0 4px 16px rgba(239,68,68,0.15)' }}>
            {apiOnline ? '🟢' : '🔴'}
          </div>
          <div className="stat-info">
            <div className="stat-value" style={{ fontSize: 18, color: apiOnline ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              {apiOnline === null ? 'Kontrol...' : apiOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
            </div>
            <div className="stat-label">API Sunucu Durumu</div>
            <div className="stat-sub neutral">localhost:5000</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* ── Quick Actions ── */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <div className="card-title-icon" style={{ background: 'rgba(59,130,246,0.15)' }}>⚡</div>
              Hızlı Erişim
            </div>
          </div>
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {QUICK_ACTIONS.map(a => (
              <button
                key={a.id}
                id={`quick-${a.id}`}
                className="btn btn-secondary"
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px', borderRadius: 10,
                  background: `rgba(${a.color === 'blue' ? '59,130,246' : a.color === 'purple' ? '139,92,246' : a.color === 'cyan' ? '6,182,212' : '245,158,11'},0.07)`,
                  borderColor: `rgba(${a.color === 'blue' ? '59,130,246' : a.color === 'purple' ? '139,92,246' : a.color === 'cyan' ? '6,182,212' : '245,158,11'},0.2)`,
                  textAlign: 'left', cursor: 'pointer',
                }}
                onClick={() => onNavigate(a.id)}
              >
                <span style={{ fontSize: 22, color: colorMap[a.color] }}>{a.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{a.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Recent Logs ── */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <div className="card-title-icon" style={{ background: 'rgba(245,158,11,0.15)' }}>◧</div>
              Son Aktiviteler
            </div>
            <button className="btn btn-sm btn-secondary" onClick={() => onNavigate('logs')}>Tümü →</button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {logs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-text">Henüz kayıt yok. Bir araç kullanmaya başlayın.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {logs.map((log, i) => (
                  <div key={log.id || i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 20px',
                    borderBottom: i < logs.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                      background: log.level === 'ERROR' ? 'rgba(239,68,68,0.15)' : log.level === 'WARN' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)',
                      color: log.level === 'ERROR' ? 'var(--accent-red)' : log.level === 'WARN' ? 'var(--accent-amber)' : 'var(--accent-primary)',
                      flexShrink: 0,
                    }}>{log.level}</span>
                    <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', flex: 1 }}>{log.action}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                      {new Date(log.timestamp).toLocaleTimeString('tr-TR')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Info Banner ── */}
        <div className="col-span-2">
          <div className="alert alert-info" style={{ borderRadius: 12 }}>
            <span style={{ fontSize: 20 }}>ℹ</span>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>NetOps Suite — Profesyonel Ağ Otomasyon Platformu</div>
              <div style={{ fontSize: 12.5, opacity: 0.85 }}>
                Bu araç; ağ keşfi (ping sweep), TCP port taraması ve SSH üzerinden uzak komut çalıştırma özelliklerini tek bir panelde sunar.
                Tüm işlemler yerel ağınızda gerçek zamanlı olarak çalışır ve audit log olarak kaydedilir. Sadece yetkili sistemlerde kullanın.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

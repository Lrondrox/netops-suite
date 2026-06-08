import { useState, useEffect, useCallback } from 'react'
import Discover from './components/Discover.jsx'
import PortScanner from './components/PortScanner.jsx'
import SSHTerminal from './components/SSHTerminal.jsx'
import AuditLogs from './components/AuditLogs.jsx'
import Dashboard from './components/Dashboard.jsx'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '⬡', section: 'Overview' },
  { id: 'discover', label: 'Network Discovery', icon: '⊕', section: 'Tools' },
  { id: 'ports', label: 'Port Scanner', icon: '◈', section: 'Tools' },
  { id: 'ssh', label: 'SSH Terminal', icon: '⌨', section: 'Tools' },
  { id: 'logs', label: 'Audit Logs', icon: '◧', section: 'Security' },
]

function Clock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <span className="header-time">
      {time.toLocaleTimeString('tr-TR')} &nbsp;|&nbsp; {time.toLocaleDateString('tr-TR')}
    </span>
  )
}

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [apiOnline, setApiOnline] = useState(null)

  const checkAPI = useCallback(async () => {
    try {
      const r = await fetch('/api/logs', { signal: AbortSignal.timeout(3000) })
      setApiOnline(r.ok)
    } catch {
      setApiOnline(false)
    }
  }, [])

  useEffect(() => {
    checkAPI()
    const t = setInterval(checkAPI, 10000)
    return () => clearInterval(t)
  }, [checkAPI])

  const sections = [...new Set(NAV_ITEMS.map(i => i.section))]

  const PAGE_TITLES = {
    dashboard: { title: 'Dashboard', sub: 'Genel Bakış ve Sistem Durumu' },
    discover: { title: 'Network Discovery', sub: 'Ağ cihazlarını keşfet ve listele' },
    ports: { title: 'Port Scanner', sub: 'TCP port analizi ve servis tespiti' },
    ssh: { title: 'SSH Terminal', sub: 'Uzak cihazlarda komut çalıştır' },
    logs: { title: 'Audit Logs', sub: 'Güvenlik ve işlem kayıtları' },
  }

  const current = PAGE_TITLES[page]

  return (
    <div className="app-layout">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🛰</div>
          <div className="sidebar-logo-text">
            <span>NetOps Suite</span>
            <span>v1.0.0 · Network Automation</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {sections.map(section => (
            <div key={section}>
              <div className="nav-section-label">{section}</div>
              {NAV_ITEMS.filter(i => i.section === section).map(item => (
                <div
                  key={item.id}
                  id={`nav-${item.id}`}
                  className={`nav-item${page === item.id ? ' active' : ''}`}
                  onClick={() => setPage(item.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && setPage(item.id)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </div>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="status-indicator">
            <div className={`status-dot${apiOnline === false ? ' offline' : ''}`} />
            <div className="status-text">
              API:{' '}
              <strong style={{ color: apiOnline === false ? 'var(--accent-red)' : apiOnline === true ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
                {apiOnline === null ? 'Bağlanıyor...' : apiOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
              </strong>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main-content">
        <header className="top-header">
          <div className="header-title">
            <h1>{current.title}</h1>
            <span>{current.sub}</span>
          </div>
          <div className="header-actions">
            {apiOnline === false && (
              <span className="badge badge-red">⚠ API Sunucusu Kapalı</span>
            )}
            <Clock />
          </div>
        </header>

        <main className="page-content animate-in" key={page}>
          {page === 'dashboard' && <Dashboard onNavigate={setPage} apiOnline={apiOnline} />}
          {page === 'discover' && <Discover />}
          {page === 'ports' && <PortScanner />}
          {page === 'ssh' && <SSHTerminal />}
          {page === 'logs' && <AuditLogs />}
        </main>
      </div>
    </div>
  )
}

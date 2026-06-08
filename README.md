# 🛰 NetOps Suite — Ağ Otomasyon ve Yönetim Platformu

Profesyonel, gerçek zamanlı çalışan ağ otomasyon aracı. Ping taraması, TCP port analizi, SSH üzerinden uzak komut çalıştırma ve güvenlik audit loglarını tek bir modern panelde sunar.

---

## ⚡ Hızlı Başlangıç

### 1. Backend'i Başlat
```powershell
cd server
npm install
node server.js
# → API: http://localhost:5000
```

### 2. Frontend'i Başlat (Yeni terminal)
```powershell
cd client
npm install
npm run dev
# → Arayüz: http://localhost:5173
```

---

## 🔧 Özellikler

| Özellik | Açıklama |
|--------|----------|
| **Network Discovery** | CIDR / IP aralığı üzerinde gerçek ICMP ping taraması |
| **Port Scanner** | TCP bağlantı tabanlı port taraması, servis tespiti |
| **SSH Terminal** | Şifre veya Private Key ile uzak cihazda komut çalıştırma |
| **Audit Logs** | Tüm işlemlerin zaman damgalı JSON kayıtları |
| **Dashboard** | Anlık durum, istatistikler ve hızlı erişim kartları |

---

## 📡 API Referansı

### POST /api/discover
```json
{ "range": "192.168.1.0/24" }
```

### POST /api/scan-ports
```json
{ "ip": "192.168.1.1", "ports": [22, 80, 443] }
```

### POST /api/execute-ssh
```json
{
  "host": "192.168.1.100",
  "port": 22,
  "username": "admin",
  "password": "secret",
  "command": "uname -a"
}
```

### GET /api/logs
Tüm audit logları döner.

### DELETE /api/logs
Audit loglarını temizler.

---

## 🏗 Mimari

```
netops-suite/
├── server/          # Node.js Express Backend
│   ├── server.js    # API sunucusu (port 5000)
│   └── audit.log    # İşlem kayıtları (otomatik oluşur)
└── client/          # Vite + React Frontend
    ├── src/
    │   ├── App.jsx
    │   ├── index.css
    │   └── components/
    │       ├── Dashboard.jsx
    │       ├── Discover.jsx
    │       ├── PortScanner.jsx
    │       ├── SSHTerminal.jsx
    │       └── AuditLogs.jsx
    └── vite.config.js  # /api → localhost:5000 proxy
```

---

## ⚠ Güvenlik Notu

Bu araç yalnızca **yetkili sistemlerde ve eğitim amaçlı** kullanılmalıdır. İzinsiz ağ taraması yasal düzenlemelere aykırı olabilir.

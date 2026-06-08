const express = require('express');
const cors = require('cors');
const net = require('net');
const { Client } = require('ssh2');
const ping = require('ping');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Log file path
const LOG_FILE = path.join(__dirname, 'audit.log');

// ─── Helper: Write audit log ────────────────────────────────────────────────
function writeLog(level, action, details) {
  const entry = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    level,
    action,
    details,
  };
  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(LOG_FILE, line);
  return entry;
}

// ─── Helper: Parse IP range ─────────────────────────────────────────────────
function parseIPRange(range) {
  // Supports:
  //   Single IP: 192.168.1.1
  //   CIDR: 192.168.1.0/24
  //   Range: 192.168.1.1-192.168.1.50
  const ips = [];

  if (range.includes('/')) {
    // CIDR notation
    const [base, bits] = range.split('/');
    const mask = parseInt(bits);
    if (mask < 16 || mask > 32) {
      throw new Error('CIDR range too large. Use /16 to /32.');
    }
    const baseParts = base.split('.').map(Number);
    const baseNum =
      (baseParts[0] << 24) |
      (baseParts[1] << 16) |
      (baseParts[2] << 8) |
      baseParts[3];
    const count = Math.pow(2, 32 - mask);
    const limit = Math.min(count, 256);
    for (let i = 1; i < limit - 1; i++) {
      const n = baseNum + i;
      ips.push(
        [
          (n >>> 24) & 255,
          (n >>> 16) & 255,
          (n >>> 8) & 255,
          n & 255,
        ].join('.')
      );
    }
  } else if (range.includes('-')) {
    // Range notation
    const [startStr, endStr] = range.split('-');
    const startParts = startStr.trim().split('.').map(Number);
    const endParts = endStr.trim().split('.').map(Number);
    const toNum = (p) =>
      (p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3];
    const fromNum = (n) => [
      (n >>> 24) & 255,
      (n >>> 16) & 255,
      (n >>> 8) & 255,
      n & 255,
    ];
    let s = toNum(startParts);
    const e = toNum(endParts);
    if (e - s > 512) throw new Error('Range too large (max 512 IPs).');
    while (s <= e) {
      ips.push(fromNum(s).join('.'));
      s++;
    }
  } else {
    // Single IP
    ips.push(range.trim());
  }

  return ips;
}

// ─── Helper: Ping single host ───────────────────────────────────────────────
async function pingHost(ip, timeout = 2) {
  try {
    const res = await ping.promise.probe(ip, { timeout });
    return {
      ip,
      alive: res.alive,
      time: res.time === 'unknown' ? null : res.time,
      host: res.host,
    };
  } catch {
    return { ip, alive: false, time: null, host: ip };
  }
}

// ─── Helper: TCP port scan ──────────────────────────────────────────────────
function scanPort(ip, port, timeout = 2000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let status = 'closed';

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      status = 'open';
      socket.destroy();
    });

    socket.on('timeout', () => {
      status = 'filtered';
      socket.destroy();
    });

    socket.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') status = 'closed';
      else if (err.code === 'EHOSTUNREACH') status = 'unreachable';
      else status = 'closed';
    });

    socket.on('close', () => {
      resolve({ port, status });
    });

    socket.connect(port, ip);
  });
}

// ─── Common port descriptions ───────────────────────────────────────────────
const PORT_DESCRIPTIONS = {
  21: 'FTP',
  22: 'SSH',
  23: 'Telnet',
  25: 'SMTP',
  53: 'DNS',
  80: 'HTTP',
  110: 'POP3',
  143: 'IMAP',
  443: 'HTTPS',
  445: 'SMB',
  3306: 'MySQL',
  3389: 'RDP',
  5432: 'PostgreSQL',
  5900: 'VNC',
  6379: 'Redis',
  8080: 'HTTP-Alt',
  8443: 'HTTPS-Alt',
  27017: 'MongoDB',
};

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// ─── GET / ──────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name: 'NetOps Suite API',
    version: '1.0.0',
    status: 'running',
    endpoints: [
      'POST /api/discover',
      'POST /api/scan-ports',
      'POST /api/execute-ssh',
      'GET  /api/logs',
      'DELETE /api/logs',
    ],
  });
});

// ─── POST /api/discover ──────────────────────────────────────────────────────
// Body: { range: "192.168.1.0/24" | "192.168.1.1-20" | "192.168.1.5" }
// Response: { results: [{ ip, alive, time, host }] }
app.post('/api/discover', async (req, res) => {
  const { range } = req.body;
  if (!range) return res.status(400).json({ error: 'range is required' });

  let ips;
  try {
    ips = parseIPRange(range);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  writeLog('INFO', 'DISCOVER_START', { range, count: ips.length });

  try {
    // Run pings in batches of 30 for performance
    const BATCH = 30;
    const results = [];
    for (let i = 0; i < ips.length; i += BATCH) {
      const batch = ips.slice(i, i + BATCH);
      const batchResults = await Promise.all(batch.map((ip) => pingHost(ip)));
      results.push(...batchResults);
    }

    const alive = results.filter((r) => r.alive).length;
    writeLog('INFO', 'DISCOVER_COMPLETE', {
      range,
      total: results.length,
      alive,
    });

    res.json({ results, total: results.length, alive });
  } catch (err) {
    writeLog('ERROR', 'DISCOVER_ERROR', { range, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/scan-ports ────────────────────────────────────────────────────
// Body: { ip: "192.168.1.1", ports: [22, 80, 443, ...] }
// Response: { ip, results: [{ port, status, service }] }
app.post('/api/scan-ports', async (req, res) => {
  const { ip, ports } = req.body;
  if (!ip) return res.status(400).json({ error: 'ip is required' });

  const targetPorts =
    ports && Array.isArray(ports) && ports.length > 0
      ? ports
      : [21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 3306, 3389, 5432, 5900, 6379, 8080, 8443, 27017];

  if (targetPorts.length > 200) {
    return res.status(400).json({ error: 'Max 200 ports per scan.' });
  }

  writeLog('INFO', 'PORT_SCAN_START', { ip, ports: targetPorts });

  try {
    const BATCH = 20;
    const results = [];
    for (let i = 0; i < targetPorts.length; i += BATCH) {
      const batch = targetPorts.slice(i, i + BATCH);
      const batchResults = await Promise.all(
        batch.map((p) => scanPort(ip, p))
      );
      results.push(...batchResults);
    }

    const enriched = results.map((r) => ({
      ...r,
      service: PORT_DESCRIPTIONS[r.port] || 'Unknown',
    }));

    const openPorts = enriched.filter((r) => r.status === 'open').length;
    writeLog('INFO', 'PORT_SCAN_COMPLETE', { ip, openPorts });

    res.json({ ip, results: enriched, total: enriched.length, open: openPorts });
  } catch (err) {
    writeLog('ERROR', 'PORT_SCAN_ERROR', { ip, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/execute-ssh ───────────────────────────────────────────────────
// Body: { host, port, username, password?, privateKey?, command }
// Response: { stdout, stderr, exitCode }
app.post('/api/execute-ssh', (req, res) => {
  const { host, port = 22, username, password, privateKey, command } = req.body;

  if (!host || !username || !command) {
    return res.status(400).json({ error: 'host, username, and command are required' });
  }
  if (!password && !privateKey) {
    return res.status(400).json({ error: 'Either password or privateKey is required' });
  }

  writeLog('INFO', 'SSH_EXECUTE', { host, port, username, command });

  const conn = new Client();
  let stdout = '';
  let stderr = '';

  const authConfig = {
    host,
    port: parseInt(port),
    username,
    readyTimeout: 10000,
  };

  if (privateKey) {
    authConfig.privateKey = Buffer.from(privateKey, 'utf8');
  } else {
    authConfig.password = password;
  }

  conn
    .on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          writeLog('ERROR', 'SSH_EXEC_ERROR', { host, error: err.message });
          return res.status(500).json({ error: err.message });
        }

        stream
          .on('close', (exitCode) => {
            conn.end();
            writeLog('INFO', 'SSH_EXECUTE_COMPLETE', {
              host,
              username,
              command,
              exitCode,
            });
            res.json({ stdout, stderr, exitCode });
          })
          .on('data', (data) => {
            stdout += data.toString();
          })
          .stderr.on('data', (data) => {
            stderr += data.toString();
          });
      });
    })
    .on('error', (err) => {
      writeLog('ERROR', 'SSH_CONNECTION_ERROR', { host, error: err.message });
      res.status(500).json({ error: `SSH connection failed: ${err.message}` });
    })
    .connect(authConfig);
});

// ─── GET /api/logs ───────────────────────────────────────────────────────────
app.get('/api/logs', (req, res) => {
  if (!fs.existsSync(LOG_FILE)) {
    return res.json({ logs: [] });
  }
  const lines = fs
    .readFileSync(LOG_FILE, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      try { return JSON.parse(l); } catch { return null; }
    })
    .filter(Boolean)
    .reverse();
  res.json({ logs: lines });
});

// ─── DELETE /api/logs ────────────────────────────────────────────────────────
app.delete('/api/logs', (req, res) => {
  if (fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, '');
  }
  res.json({ message: 'Logs cleared.' });
});

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 NetOps Suite API running at http://localhost:${PORT}`);
  console.log(`📋 Audit logs → ${LOG_FILE}\n`);
  writeLog('INFO', 'SERVER_START', { port: PORT });
});

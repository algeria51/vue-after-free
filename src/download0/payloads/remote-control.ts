import { libc_addr } from 'download0/userland'
import { fn, mem, BigInt } from 'download0/types'

// Remote Control Panel
// Starts an HTTP server serving a browser-based control panel with:
//   - JS REPL (eval arbitrary code on the PS4)
//   - Payload launcher (list & load .js payloads)
//   - File browser (read directory listings and file contents)
//   - Live log stream (long-poll /logs?since=N)
//   - System info

if (libc_addr === null) {
  include('userland.js')
}

jsmaf.remotePlay = true

// ── syscalls ─────────────────────────────────────────────────────────────────
fn.register(97, 'socket', ['bigint', 'bigint', 'bigint'], 'bigint')
fn.register(98, 'connect', ['bigint', 'bigint', 'bigint'], 'bigint')
fn.register(104, 'bind', ['bigint', 'bigint', 'bigint'], 'bigint')
fn.register(105, 'setsockopt', ['bigint', 'bigint', 'bigint', 'bigint', 'bigint'], 'bigint')
fn.register(106, 'listen', ['bigint', 'bigint'], 'bigint')
fn.register(30, 'accept', ['bigint', 'bigint', 'bigint'], 'bigint')
fn.register(32, 'getsockname', ['bigint', 'bigint', 'bigint'], 'bigint')
fn.register(3, 'read', ['bigint', 'bigint', 'bigint'], 'bigint')
fn.register(4, 'write', ['bigint', 'bigint', 'bigint'], 'bigint')
fn.register(5, 'open', ['string', 'number', 'number'], 'bigint')
fn.register(6, 'close', ['bigint'], 'bigint')
fn.register(0x110, 'getdents', ['number', 'bigint', 'bigint'], 'bigint')
fn.register(93, 'select', ['bigint', 'bigint', 'bigint', 'bigint', 'bigint'], 'bigint')

const socket_sys = fn.socket
const connect_sys = fn.connect
const bind_sys = fn.bind
const setsockopt_sys = fn.setsockopt
const listen_sys = fn.listen
const accept_sys = fn.accept
const getsockname_sys = fn.getsockname
const read_sys = fn.read
const write_sys = fn.write
const open_sys = fn.open
const close_sys = fn.close
const getdents_sys = fn.getdents
const select_sys = fn.select

const AF_INET = 2
const SOCK_STREAM = 1
const SOCK_DGRAM = 2
const SOL_SOCKET = 0xFFFF
const SO_REUSEADDR = 0x4
const O_RDONLY = 0

// ── log ring buffer ───────────────────────────────────────────────────────────
const LOG_RING: string[] = []
let LOG_SEQ = 0

function rc_log (msg: string) {
  LOG_RING.push(msg)
  if (LOG_RING.length > 500) LOG_RING.shift()
  LOG_SEQ++
  log('[RC] ' + msg)
}

// ── helpers ───────────────────────────────────────────────────────────────────
function detect_local_ip (): string {
  const fd = socket_sys(new BigInt(0, AF_INET), new BigInt(0, SOCK_DGRAM), new BigInt(0, 0))
  if (fd.lo < 0) return '127.0.0.1'
  const addr = mem.malloc(16)
  mem.view(addr).setUint8(1, AF_INET)
  mem.view(addr).setUint16(2, 0x3500, false)
  mem.view(addr).setUint32(4, 0x08080808, false)
  connect_sys(fd, addr, new BigInt(0, 16))
  const la = mem.malloc(16)
  const ll = mem.malloc(4)
  mem.view(ll).setUint32(0, 16, true)
  let ip = '127.0.0.1'
  if (getsockname_sys(fd, la, ll).lo >= 0) {
    const n = mem.view(la).getUint32(4, false)
    ip = ((n >> 24) & 0xFF) + '.' + ((n >> 16) & 0xFF) + '.' + ((n >> 8) & 0xFF) + '.' + (n & 0xFF)
  }
  close_sys(fd)
  return ip
}

function new_tcp_socket (): number {
  const fd = socket_sys(new BigInt(0, AF_INET), new BigInt(0, SOCK_STREAM), new BigInt(0, 0))
  if (fd.lo < 0) throw new Error('socket() failed')
  const opt = mem.malloc(4)
  mem.view(opt).setUint32(0, 1, true)
  setsockopt_sys(fd, new BigInt(0, SOL_SOCKET), new BigInt(0, SO_REUSEADDR), opt, new BigInt(0, 4))
  return fd.lo
}

function bind_random_port (fd: number): number {
  const addr = mem.malloc(16)
  mem.view(addr).setUint8(1, AF_INET)
  mem.view(addr).setUint16(2, 0, false)
  mem.view(addr).setUint32(4, 0, false)
  if (bind_sys(new BigInt(fd), addr, new BigInt(0, 16)).lo < 0) throw new Error('bind() failed')
  const ga = mem.malloc(16)
  const gl = mem.malloc(4)
  mem.view(gl).setUint32(0, 16, true)
  getsockname_sys(new BigInt(fd), ga, gl)
  return mem.view(ga).getUint16(2, false)
}

function read_request (fd: number): string {
  const buf = mem.malloc(8192)
  const n = read_sys(new BigInt(fd), buf, new BigInt(0, 8192)).lo
  if (n <= 0) return ''
  let s = ''
  for (let i = 0; i < n && i < 8192; i++) {
    const c = mem.view(buf).getUint8(i)
    if (c === 0) break
    s += String.fromCharCode(c)
  }
  return s
}

function send_raw (fd: number, data: string) {
  const buf = mem.malloc(data.length + 1)
  for (let i = 0; i < data.length; i++) mem.view(buf).setUint8(i, data.charCodeAt(i))
  write_sys(new BigInt(fd), buf, new BigInt(0, data.length))
}

function http_response (fd: number, status: string, ctype: string, body: string) {
  const resp = 'HTTP/1.1 ' + status + '\r\nContent-Type: ' + ctype +
    '\r\nContent-Length: ' + body.length +
    '\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n' + body
  send_raw(fd, resp)
}

function parse_path (raw: string): string {
  const line = raw.split('\n')[0] || ''
  const parts = line.trim().split(' ')
  return (parts.length >= 2 ? parts[1] : '/') || '/'
}

function parse_body (raw: string): string {
  const sep = raw.indexOf('\r\n\r\n')
  return sep >= 0 ? raw.substring(sep + 4) : ''
}

function url_decode (s: string): string {
  let out = ''
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '%' && i + 2 < s.length) {
      out += String.fromCharCode(parseInt(s.substring(i + 1, i + 3), 16))
      i += 2
    } else if (s[i] === '+') {
      out += ' '
    } else {
      out += s[i]
    }
  }
  return out
}

function qs_get (path: string, key: string): string {
  const q = path.indexOf('?')
  if (q < 0) return ''
  const pairs = path.substring(q + 1).split('&')
  for (const pair of pairs) {
    const eq = pair.indexOf('=')
    if (eq < 0) continue
    if (url_decode(pair.substring(0, eq)) === key) return url_decode(pair.substring(eq + 1))
  }
  return ''
}

function list_dir (dirpath: string): string[] {
  const files: string[] = []
  const fd = open_sys(dirpath, O_RDONLY, 0).lo
  if (fd < 0) return files
  const buf = mem.malloc(2048)
  while (true) {
    const n = getdents_sys(fd, buf, new BigInt(0, 2048)).lo
    if (n <= 0) break
    let off = 0
    while (off < n) {
      const reclen = mem.view(buf).getUint16(off + 4, true)
      const dtype = mem.view(buf).getUint8(off + 6)
      const namlen = mem.view(buf).getUint8(off + 7)
      let name = ''
      for (let i = 0; i < namlen; i++) name += String.fromCharCode(mem.view(buf).getUint8(off + 8 + i))
      if (name !== '.' && name !== '..') files.push((dtype === 4 ? 'd:' : 'f:') + name)
      off += reclen
    }
  }
  close_sys(new BigInt(fd))
  return files
}

function read_file (filepath: string, maxbytes: number): string {
  const fd = open_sys(filepath, O_RDONLY, 0).lo
  if (fd < 0) return ''
  const buf = mem.malloc(maxbytes)
  const n = read_sys(new BigInt(fd), buf, new BigInt(0, maxbytes)).lo
  close_sys(new BigInt(fd))
  let out = ''
  for (let i = 0; i < n; i++) {
    const c = mem.view(buf).getUint8(i)
    out += String.fromCharCode(c)
  }
  return out
}

function scan_payloads (): string[] {
  const found: string[] = []
  const dirs = ['/download0/', '/app0/download0/', 'download0/payloads']
  for (const d of dirs) {
    const entries = list_dir(d)
    if (entries.length > 0) {
      for (const e of entries) {
        if (e.startsWith('f:') && e.endsWith('.js')) found.push(e.substring(2))
      }
      break
    }
  }
  return found
}

function json_escape (s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
}

// ── control panel HTML ────────────────────────────────────────────────────────
const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PS4 Remote Control</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0d0d0d;color:#c9d1d9;font-family:'Courier New',monospace;font-size:13px;height:100vh;display:flex;flex-direction:column}
header{background:#161b22;border-bottom:1px solid #30363d;padding:10px 16px;display:flex;align-items:center;gap:12px;flex-shrink:0}
header h1{font-size:15px;color:#58a6ff;letter-spacing:1px}
#conn-dot{width:9px;height:9px;border-radius:50%;background:#f85149;display:inline-block;flex-shrink:0}
#conn-dot.ok{background:#3fb950}
#conn-label{font-size:11px;opacity:.7}
.tabs{display:flex;background:#161b22;border-bottom:1px solid #30363d;flex-shrink:0}
.tab{padding:8px 18px;cursor:pointer;border-bottom:2px solid transparent;color:#8b949e;font-size:12px;letter-spacing:.5px}
.tab.active{color:#58a6ff;border-color:#58a6ff}
.pane{display:none;flex:1;overflow:hidden;flex-direction:column}
.pane.active{display:flex}
/* REPL */
#repl-out{flex:1;overflow-y:auto;padding:10px;background:#0d1117;font-size:12px;line-height:1.6}
.repl-line{padding:2px 0}
.repl-in{color:#58a6ff}
.repl-ok{color:#3fb950}
.repl-err{color:#f85149}
.repl-log{color:#8b949e}
#repl-bar{display:flex;gap:8px;padding:8px;background:#161b22;border-top:1px solid #30363d;flex-shrink:0}
#repl-input{flex:1;background:#0d1117;border:1px solid #30363d;color:#c9d1d9;padding:6px 10px;font-family:inherit;font-size:12px;border-radius:4px;outline:none}
#repl-input:focus{border-color:#58a6ff}
#repl-btn{background:#238636;color:#fff;border:none;padding:6px 14px;border-radius:4px;cursor:pointer;font-family:inherit}
#repl-btn:hover{background:#2ea043}
/* Payloads */
#payload-list{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:6px}
.payload-item{background:#161b22;border:1px solid #30363d;border-radius:6px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between}
.payload-name{color:#c9d1d9}
.payload-btn{background:#1f6feb;color:#fff;border:none;padding:5px 14px;border-radius:4px;cursor:pointer;font-family:inherit;font-size:12px}
.payload-btn:hover{background:#388bfd}
.payload-btn:disabled{background:#30363d;color:#8b949e;cursor:default}
/* Files */
#file-nav{padding:8px 10px;background:#161b22;border-bottom:1px solid #30363d;display:flex;align-items:center;gap:8px;flex-shrink:0}
#file-path-input{flex:1;background:#0d1117;border:1px solid #30363d;color:#c9d1d9;padding:5px 10px;font-family:inherit;font-size:12px;border-radius:4px;outline:none}
#file-go-btn{background:#161b22;border:1px solid #30363d;color:#c9d1d9;padding:5px 12px;border-radius:4px;cursor:pointer;font-family:inherit}
#file-content{flex:1;overflow:auto;padding:10px;background:#0d1117;font-size:12px;line-height:1.5;white-space:pre-wrap;word-break:break-all}
.dir-entry{padding:3px 0;cursor:pointer;color:#58a6ff}
.dir-entry:hover{text-decoration:underline}
.dir-entry.file{color:#c9d1d9}
.dir-entry.file:hover{color:#58a6ff}
/* Logs */
#log-out{flex:1;overflow-y:auto;padding:10px;background:#0d1117;font-size:12px;line-height:1.6}
.log-entry{padding:1px 0;color:#8b949e}
.log-entry:last-child{color:#c9d1d9}
/* Sysinfo */
#sysinfo-content{flex:1;overflow-y:auto;padding:14px;background:#0d1117}
.si-card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:14px;margin-bottom:10px}
.si-title{color:#58a6ff;font-size:11px;letter-spacing:.8px;margin-bottom:8px;text-transform:uppercase}
.si-row{display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #21262d}
.si-row:last-child{border:none}
.si-key{color:#8b949e}
.si-val{color:#3fb950}
</style>
</head>
<body>
<header>
  <span id="conn-dot"></span>
  <h1>PS4 Remote Control</h1>
  <span id="conn-label">connecting...</span>
  <span style="margin-left:auto;color:#8b949e;font-size:11px" id="ip-label"></span>
</header>
<div class="tabs">
  <div class="tab active" onclick="switchTab('repl')">REPL</div>
  <div class="tab" onclick="switchTab('payloads')">Payloads</div>
  <div class="tab" onclick="switchTab('files')">Files</div>
  <div class="tab" onclick="switchTab('logs')">Live Logs</div>
  <div class="tab" onclick="switchTab('sysinfo')">System</div>
</div>

<div id="tab-repl" class="pane active">
  <div id="repl-out"></div>
  <div id="repl-bar">
    <input id="repl-input" placeholder="JS expression or statement..." onkeydown="replKey(event)">
    <button id="repl-btn" onclick="replRun()">Run</button>
  </div>
</div>

<div id="tab-payloads" class="pane">
  <div id="payload-list"><div style="color:#8b949e;padding:20px">Loading payloads...</div></div>
</div>

<div id="tab-files" class="pane">
  <div id="file-nav">
    <input id="file-path-input" value="/" onkeydown="if(event.key==='Enter')browseDir(document.getElementById('file-path-input').value)">
    <button id="file-go-btn" onclick="browseDir(document.getElementById('file-path-input').value)">Go</button>
  </div>
  <div id="file-content"><span style="color:#8b949e">Enter a path above to browse the PS4 filesystem.</span></div>
</div>

<div id="tab-logs" class="pane">
  <div id="log-out"><span style="color:#8b949e">Waiting for logs...</span></div>
</div>

<div id="tab-sysinfo" class="pane">
  <div id="sysinfo-content"><span style="color:#8b949e;padding:20px;display:block">Loading system info...</span></div>
</div>

<script>
const BASE = '';
let replHistory = [];
let replHistIdx = -1;
let logSeq = 0;
let logPollTimer = null;

// ── connection ping ───────────────────────────────────────────────────────────
function checkConn() {
  fetch(BASE + '/ping').then(r => {
    if (r.ok) {
      document.getElementById('conn-dot').className = 'ok';
      document.getElementById('conn-label').textContent = 'connected';
    }
  }).catch(() => {
    document.getElementById('conn-dot').className = '';
    document.getElementById('conn-label').textContent = 'lost connection';
  });
}
setInterval(checkConn, 3000);
checkConn();

// ── tab switching ─────────────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab').forEach((t,i) => {
    t.classList.toggle('active', ['repl','payloads','files','logs','sysinfo'][i] === name);
  });
  document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  if (name === 'payloads') loadPayloads();
  if (name === 'sysinfo') loadSysinfo();
  if (name === 'logs') startLogPoll();
  else stopLogPoll();
}

// ── REPL ──────────────────────────────────────────────────────────────────────
function replLine(text, cls) {
  const el = document.createElement('div');
  el.className = 'repl-line ' + cls;
  el.textContent = text;
  const out = document.getElementById('repl-out');
  out.appendChild(el);
  out.scrollTop = out.scrollHeight;
}

function replKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); replRun(); return; }
  if (e.key === 'ArrowUp') {
    if (replHistIdx < replHistory.length - 1) {
      replHistIdx++;
      e.target.value = replHistory[replHistory.length - 1 - replHistIdx] || '';
    }
    e.preventDefault();
  }
  if (e.key === 'ArrowDown') {
    if (replHistIdx > 0) {
      replHistIdx--;
      e.target.value = replHistory[replHistory.length - 1 - replHistIdx] || '';
    } else {
      replHistIdx = -1;
      e.target.value = '';
    }
    e.preventDefault();
  }
}

function replRun() {
  const inp = document.getElementById('repl-input');
  const code = inp.value.trim();
  if (!code) return;
  replHistory.push(code);
  replHistIdx = -1;
  inp.value = '';
  replLine('> ' + code, 'repl-in');
  fetch(BASE + '/exec', { method: 'POST', body: code, headers: {'Content-Type':'text/plain'} })
    .then(r => r.json())
    .then(d => {
      if (d.ok) replLine('← ' + d.result, 'repl-ok');
      else replLine('✗ ' + d.error, 'repl-err');
    })
    .catch(e => replLine('✗ fetch error: ' + e, 'repl-err'));
}

// ── payloads ──────────────────────────────────────────────────────────────────
function loadPayloads() {
  const list = document.getElementById('payload-list');
  list.innerHTML = '<div style="color:#8b949e;padding:20px">Loading...</div>';
  fetch(BASE + '/payloads').then(r => r.json()).then(d => {
    if (!d.files || d.files.length === 0) {
      list.innerHTML = '<div style="color:#8b949e;padding:20px">No payloads found.</div>';
      return;
    }
    list.innerHTML = '';
    for (const f of d.files) {
      const row = document.createElement('div');
      row.className = 'payload-item';
      row.innerHTML = '<span class="payload-name">' + f + '</span>' +
        '<button class="payload-btn" onclick="loadPayload(this, ' + "'" + f + "'" + ')">Load</button>';
      list.appendChild(row);
    }
  }).catch(() => { list.innerHTML = '<div style="color:#f85149;padding:20px">Failed to list payloads.</div>'; });
}

function loadPayload(btn, name) {
  btn.disabled = true;
  btn.textContent = 'Loading...';
  fetch(BASE + '/load/' + encodeURIComponent(name))
    .then(r => r.json())
    .then(d => {
      btn.textContent = d.ok ? 'Loaded ✓' : 'Error ✗';
      btn.style.background = d.ok ? '#238636' : '#b62324';
    })
    .catch(() => { btn.textContent = 'Error ✗'; btn.style.background = '#b62324'; });
}

// ── file browser ──────────────────────────────────────────────────────────────
function browseDir(path) {
  document.getElementById('file-path-input').value = path;
  const content = document.getElementById('file-content');
  content.textContent = 'Loading...';
  fetch(BASE + '/ls?path=' + encodeURIComponent(path)).then(r => r.json()).then(d => {
    if (d.error) { content.textContent = 'Error: ' + d.error; return; }
    content.innerHTML = '';
    if (d.type === 'dir') {
      const up = path.replace(/\\/$/, '').lastIndexOf('/');
      if (up >= 0) {
        const parentEl = document.createElement('div');
        parentEl.className = 'dir-entry';
        parentEl.textContent = '../ (parent)';
        const pp = path.replace(/\\/$/, '').substring(0, up) || '/';
        parentEl.onclick = () => browseDir(pp);
        content.appendChild(parentEl);
      }
      for (const e of (d.entries || [])) {
        const isDir = e.startsWith('d:');
        const name  = e.substring(2);
        const el = document.createElement('div');
        el.className = 'dir-entry' + (isDir ? '' : ' file');
        el.textContent = isDir ? name + '/' : name;
        const full = path.replace(/\\/$/, '') + '/' + name;
        el.onclick = () => isDir ? browseDir(full) : readFile(full);
        content.appendChild(el);
      }
    } else {
      content.textContent = d.content || '(empty)';
    }
  }).catch(e => { content.textContent = 'Fetch error: ' + e; });
}

function readFile(path) {
  document.getElementById('file-path-input').value = path;
  const content = document.getElementById('file-content');
  content.textContent = 'Loading...';
  fetch(BASE + '/read?path=' + encodeURIComponent(path)).then(r => r.json()).then(d => {
    content.textContent = d.error ? 'Error: ' + d.error : (d.content || '(empty)');
  }).catch(e => { content.textContent = 'Fetch error: ' + e; });
}

// ── live logs (long-poll) ─────────────────────────────────────────────────────
function startLogPoll() {
  if (logPollTimer) return;
  logPollTimer = setInterval(pollLogs, 800);
  pollLogs();
}
function stopLogPoll() {
  if (logPollTimer) { clearInterval(logPollTimer); logPollTimer = null; }
}
function pollLogs() {
  fetch(BASE + '/logs?since=' + logSeq).then(r => r.json()).then(d => {
    if (!d.entries || d.entries.length === 0) return;
    logSeq = d.seq;
    const out = document.getElementById('log-out');
    for (const line of d.entries) {
      const el = document.createElement('div');
      el.className = 'log-entry';
      el.textContent = line;
      out.appendChild(el);
    }
    if (out.children.length > 1000) {
      while (out.children.length > 800) out.removeChild(out.firstChild);
    }
    out.scrollTop = out.scrollHeight;
  }).catch(() => {});
}

// ── sysinfo ───────────────────────────────────────────────────────────────────
function loadSysinfo() {
  const el = document.getElementById('sysinfo-content');
  el.innerHTML = '<span style="color:#8b949e;padding:20px;display:block">Loading...</span>';
  fetch(BASE + '/sysinfo').then(r => r.json()).then(d => {
    el.innerHTML = '';
    for (const section of d.sections || []) {
      const card = document.createElement('div');
      card.className = 'si-card';
      card.innerHTML = '<div class="si-title">' + section.title + '</div>';
      for (const [k, v] of Object.entries(section.rows || {})) {
        card.innerHTML += '<div class="si-row"><span class="si-key">' + k + '</span><span class="si-val">' + v + '</span></div>';
      }
      el.appendChild(card);
    }
  }).catch(() => { el.textContent = 'Failed to load sysinfo.'; });
}
</script>
</body>
</html>`

// ── request router ────────────────────────────────────────────────────────────
function route (fd: number, raw: string) {
  const path = parse_path(raw)
  const base = path.indexOf('?') >= 0 ? path.substring(0, path.indexOf('?')) : path

  // ping
  if (base === '/ping') {
    http_response(fd, '200 OK', 'text/plain', 'pong')
    return
  }

  // main UI
  if (base === '/' || base === '/index.html') {
    http_response(fd, '200 OK', 'text/html; charset=utf-8', HTML)
    return
  }

  // JS REPL
  if (base === '/exec') {
    const code = parse_body(raw)
    if (!code) {
      http_response(fd, '400 Bad Request', 'application/json', '{"ok":false,"error":"no code"}')
      return
    }
    rc_log('exec: ' + code.substring(0, 120))
    let result = ''
    let ok = true
    try {
      // eslint-disable-next-line no-eval
      const ret = eval(code)
      result = (ret === undefined ? 'undefined' : String(ret))
    } catch (e) {
      ok = false
      result = (e as Error).message || String(e)
    }
    const body = '{"ok":' + (ok ? 'true' : 'false') + ',"' + (ok ? 'result' : 'error') + '":"' + json_escape(result) + '"}'
    http_response(fd, '200 OK', 'application/json', body)
    return
  }

  // list payloads
  if (base === '/payloads') {
    const files = scan_payloads()
    let arr = '['
    for (let i = 0; i < files.length; i++) arr += (i ? ',' : '') + '"' + json_escape(files[i]!) + '"'
    arr += ']'
    http_response(fd, '200 OK', 'application/json', '{"files":' + arr + '}')
    return
  }

  // load payload
  if (base.indexOf('/load/') === 0) {
    const name = url_decode(base.substring(6))
    rc_log('loading payload: ' + name)
    let ok = true
    let err = ''
    try {
      include('download0/payloads/' + name)
    } catch (e) {
      ok = false
      err = (e as Error).message || String(e)
    }
    http_response(fd, '200 OK', 'application/json',
      '{"ok":' + (ok ? 'true' : 'false') + ',"name":"' + json_escape(name) + '","error":"' + json_escape(err) + '"}')
    return
  }

  // directory / file listing
  if (base === '/ls') {
    const p = qs_get(path, 'path') || '/'
    const entries = list_dir(p)
    if (entries.length === 0 && p.indexOf('.') > p.lastIndexOf('/')) {
      // probably a file — read it
      const content = read_file(p, 65536)
      http_response(fd, '200 OK', 'application/json',
        '{"type":"file","path":"' + json_escape(p) + '","content":"' + json_escape(content) + '"}')
    } else {
      let arr = '['
      for (let i = 0; i < entries.length; i++) arr += (i ? ',' : '') + '"' + json_escape(entries[i]!) + '"'
      arr += ']'
      http_response(fd, '200 OK', 'application/json',
        '{"type":"dir","path":"' + json_escape(p) + '","entries":' + arr + '}')
    }
    return
  }

  // file read
  if (base === '/read') {
    const p = qs_get(path, 'path') || '/'
    const content = read_file(p, 131072)
    http_response(fd, '200 OK', 'application/json',
      '{"path":"' + json_escape(p) + '","content":"' + json_escape(content) + '"}')
    return
  }

  // live log poll
  if (base === '/logs') {
    const since = parseInt(qs_get(path, 'since') || '0', 10) || 0
    const start = Math.max(0, LOG_RING.length - (LOG_SEQ - since))
    const slice = LOG_RING.slice(start)
    let arr = '['
    for (let i = 0; i < slice.length; i++) arr += (i ? ',' : '') + '"' + json_escape(slice[i]!) + '"'
    arr += ']'
    http_response(fd, '200 OK', 'application/json', '{"seq":' + LOG_SEQ + ',"entries":' + arr + '}')
    return
  }

  // system info
  if (base === '/sysinfo') {
    const ua = (typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown')
    const sections = '[{"title":"Runtime","rows":{"userAgent":"' + json_escape(ua) + '"' +
      ',"date":"' + json_escape(new Date().toISOString()) + '"' +
      ',"heapUsed":"' + json_escape(String(typeof performance !== 'undefined' ? 'available' : 'n/a')) + '"' +
      '}},' +
      '{"title":"Jailbreak","rows":{"libc_addr":"' + json_escape(String(libc_addr)) + '"' +
      '}}]'
    http_response(fd, '200 OK', 'application/json', '{"sections":' + sections + '}')
    return
  }

  http_response(fd, '404 Not Found', 'text/plain', 'not found')
}

// ── server boot ───────────────────────────────────────────────────────────────
rc_log('starting remote control server...')

const local_ip = detect_local_ip()
rc_log('local ip: ' + local_ip)

const srv_fd = new_tcp_socket()
const srv_port = bind_random_port(srv_fd)

if (listen_sys(new BigInt(srv_fd), new BigInt(0, 8)).lo < 0) {
  close_sys(new BigInt(srv_fd))
  throw new Error('listen() failed')
}

rc_log('server ready on port ' + srv_port)
rc_log('open in browser: http://' + local_ip + ':' + srv_port)

try {
  jsmaf.openWebBrowser('http://' + local_ip + ':' + srv_port)
  rc_log('opened browser on PS4')
} catch (e) {
  rc_log('could not open browser: ' + (e as Error).message)
}

// ── non-blocking accept loop via onEnterFrame ─────────────────────────────────
const _sel_fds = mem.malloc(128)
const _sel_tv = mem.malloc(16) // zero timeout = poll
const _cli_addr = mem.malloc(16)
const _cli_len = mem.malloc(4)

let rcRunning = true
let reqCount = 0

jsmaf.onEnterFrame = function () {
  if (!rcRunning) return

  // zero fd_set
  for (let i = 0; i < 128; i++) mem.view(_sel_fds).setUint8(i, 0)
  const bi = Math.floor(srv_fd / 8)
  mem.view(_sel_fds).setUint8(bi, mem.view(_sel_fds).getUint8(bi) | (1 << (srv_fd % 8)))

  const ready = select_sys(new BigInt(0, srv_fd + 1), _sel_fds, new BigInt(0, 0), new BigInt(0, 0), _sel_tv).lo
  if (ready <= 0) return

  mem.view(_cli_len).setUint32(0, 16, true)
  const cli = accept_sys(new BigInt(srv_fd), _cli_addr, _cli_len).lo
  if (cli < 0) return

  reqCount++
  const raw = read_request(cli)
  if (raw.length > 0) {
    try {
      route(cli, raw)
    } catch (e) {
      rc_log('route error: ' + (e as Error).message)
      try { http_response(cli, '500 Internal Server Error', 'text/plain', 'error') } catch (_) {}
    }
  }
  close_sys(new BigInt(cli))
}

// Circle button exits
jsmaf.onKeyDown = function (keyCode) {
  if (keyCode === 13) {
    rc_log('shutting down...')
    rcRunning = false
    close_sys(new BigInt(srv_fd))
    jsmaf.onEnterFrame = null
    jsmaf.onKeyDown = null
    rc_log('server stopped')
  }
}

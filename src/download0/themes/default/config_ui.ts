import { libc_addr } from 'download0/userland'
import { lang } from 'download0/languages'
import { fn, mem, BigInt } from 'download0/types'

if (typeof libc_addr === 'undefined') include('userland.js')
if (typeof lang === 'undefined') include('languages.js')

;(function () {
  log('Loading config UI...')

  // ── Inline pixels ─────────────────────────────────────────────────────────
  const DARK_PX  = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNg4xACAAA4ACGcHPdwAAAAAElFTkSuQmCC'
  const WHITE_PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC'
  const CYAN_PX  = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGMIOPEfAAODAhiMwlb1AAAAAElFTkSuQmCC'
  const GREEN_PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGMIeDYNAANWAc20LRTOAAAAAElFTkSuQmCC'
  const RED_PX   = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4HxAAAAPxAaAHMjeOAAAAAElFTkSuQmCC'

  // ── Config state ──────────────────────────────────────────────────────────
  interface Cfg {
    autolapse: boolean; autopoop: boolean; autoclose: boolean
    autoclose_delay: number; music: boolean; jb_behavior: number
    theme: string; exp_core: number; exp_grooms: number
    exp_races: number; exp_timeout: number
  }
  const C: Cfg = {
    autolapse: false, autopoop: false, autoclose: false,
    autoclose_delay: 0, music: true, jb_behavior: 0,
    theme: 'default', exp_core: 4, exp_grooms: 512,
    exp_races: 100, exp_timeout: 8
  }
  let userPayloads: string[] = []
  let configLoaded = false

  const jbLabels = [lang.jbBehaviorAuto, lang.jbBehaviorNetctrl, lang.jbBehaviorLapse]

  // ── File I/O ──────────────────────────────────────────────────────────────
  const fs = {
    write (f: string, d: string, cb: (e: Error | null) => void) {
      const x = new jsmaf.XMLHttpRequest()
      x.onreadystatechange = function () {
        if (x.readyState === 4 && cb) cb(x.status === 0 || x.status === 200 ? null : new Error('xhr'))
      }
      x.open('POST', 'file://../download0/' + f, true); x.send(d)
    },
    read (f: string, cb: (e: Error | null, d?: string) => void) {
      const x = new jsmaf.XMLHttpRequest()
      x.onreadystatechange = function () {
        if (x.readyState === 4 && cb) cb(x.status === 0 || x.status === 200 ? null : new Error('xhr'), x.responseText)
      }
      x.open('GET', 'file://../download0/' + f, true); x.send()
    }
  }

  // ── Theme scan ────────────────────────────────────────────────────────────
  function scanThemes (): string[] {
    const themes: string[] = []
    try {
      try { fn.register(0x05,  'dcfg_open',    ['bigint', 'bigint', 'bigint'], 'bigint') } catch (_e) {}
      try { fn.register(0x06,  'dcfg_close',   ['bigint'],                     'bigint') } catch (_e) {}
      try { fn.register(0x110, 'dcfg_getdents',['bigint', 'bigint', 'bigint'], 'bigint') } catch (_e) {}
      const dir = '/download0/themes'
      const pa = mem.malloc(256); const buf = mem.malloc(4096)
      for (let i = 0; i < dir.length; i++) mem.view(pa).setUint8(i, dir.charCodeAt(i))
      mem.view(pa).setUint8(dir.length, 0)
      const fd = fn.dcfg_open(pa, new BigInt(0, 0), new BigInt(0, 0))
      if (!fd.eq(new BigInt(0xffffffff, 0xffffffff))) {
        const cnt = fn.dcfg_getdents(fd, buf, new BigInt(0, 4096))
        if (!cnt.eq(new BigInt(0xffffffff, 0xffffffff)) && cnt.lo > 0) {
          let off = 0
          while (off < cnt.lo) {
            const rl = mem.view(buf.add(new BigInt(0, off + 4))).getUint16(0, true)
            const dt = mem.view(buf.add(new BigInt(0, off + 6))).getUint8(0)
            const nl = mem.view(buf.add(new BigInt(0, off + 7))).getUint8(0)
            let name = ''
            for (let i = 0; i < nl; i++) { name += String.fromCharCode(mem.view(buf.add(new BigInt(0, off + 8 + i))).getUint8(0)) }
            if (dt === 4 && name !== '.' && name !== '..') themes.push(name)
            off += rl
          }
        }
        fn.dcfg_close(fd)
      }
    } catch (e) { log('Theme scan: ' + (e as Error).message) }
    if (!themes.includes('default')) themes.unshift('default')
    return themes
  }

  const availableThemes = scanThemes()
  const themeLabels = availableThemes.map((t: string) => t.charAt(0).toUpperCase() + t.slice(1))

  // ── Option definitions ────────────────────────────────────────────────────
  type OptType = 'toggle' | 'cycle'
  interface Opt { key: string; label: string; type: OptType; section: string; hint: string }
  const opts: Opt[] = [
    { key: 'music',       label: lang.music,              type: 'toggle', section: 'GENERAL', hint: 'Background music on / off' },
    { key: 'autolapse',   label: lang.autoLapse,          type: 'toggle', section: 'GENERAL', hint: 'Auto-run Lapse after exploit' },
    { key: 'autopoop',    label: lang.autoPoop,           type: 'toggle', section: 'GENERAL', hint: 'Auto-deploy payload on success' },
    { key: 'autoclose',   label: lang.autoClose,          type: 'toggle', section: 'GENERAL', hint: 'Close browser after jailbreak' },
    { key: 'jb_behavior', label: lang.jbBehavior,         type: 'cycle',  section: 'GENERAL', hint: 'Post-exploit behavior mode' },
    { key: 'theme',       label: lang.theme || 'Theme',   type: 'cycle',  section: 'GENERAL', hint: 'UI theme selection' },
    { key: 'exp_core',    label: 'CPU Core',              type: 'cycle',  section: 'EXPLOIT', hint: 'CPU core used for exploit (0–5)' },
    { key: 'exp_grooms',  label: 'Heap Grooms',           type: 'cycle',  section: 'EXPLOIT', hint: 'Heap grooming iterations' },
    { key: 'exp_races',   label: 'Race Attempts',         type: 'cycle',  section: 'EXPLOIT', hint: 'Race condition attempt count' },
    { key: 'exp_timeout', label: 'Timeout',               type: 'cycle',  section: 'EXPLOIT', hint: 'Exploit timeout in seconds' },
  ]
  const TOTAL = opts.length

  // ── Layout ────────────────────────────────────────────────────────────────
  const SW       = 1920
  const SH       = 1080
  const PAD_X    = 60
  const HEADER_H = 148
  const FOOTER_H = 46
  const AVAIL_H  = SH - HEADER_H - FOOTER_H - 18
  const BTN_H    = 74
  const BTN_GAP  = 8
  const VISIBLE  = Math.min(TOTAL, Math.floor(AVAIL_H / (BTN_H + BTN_GAP)))
  const ROW_W    = SW - PAD_X * 2
  const START_Y  = HEADER_H + 9

  // Column layout: 60% label | 20% value | 20% hint
  const VAL_OFF  = Math.floor(ROW_W * 0.60)
  const HINT_OFF = Math.floor(ROW_W * 0.78)
  const VAL_X    = PAD_X + VAL_OFF
  const HINT_X   = PAD_X + HINT_OFF

  const SFX_CUR = 'file:///../download0/sfx/cursor.wav'
  const SFX_OK  = 'file:///../download0/sfx/confirm.wav'
  const SFX_BCK = 'file:///../download0/sfx/cancel.wav'

  // ── FIX: Audio pool — prevents GC from destroying clips mid-play ──────────
  const _sfxPool: jsmaf.AudioClip[] = []
  function sfx (url: string) {
    if (typeof CONFIG !== 'undefined' && CONFIG.music === false) return
    try {
      const cl = new jsmaf.AudioClip()
      _sfxPool.push(cl)
      if (_sfxPool.length > 8) _sfxPool.splice(0, _sfxPool.length - 8)
      cl.volume = 1.0
      cl.open(url)
    } catch (_e) {}
  }

  // ── Styles — 'cfg_' prefix prevents collision with other screens ──────────
  jsmaf.root.children.length = 0

  new Style({ name: 'cfg_title',      color: 'rgb(255,255,255)',          size: 30 })
  new Style({ name: 'cfg_count',      color: 'rgba(120,210,255,0.55)',    size: 16 })
  new Style({ name: 'cfg_colhdr',     color: 'rgba(120,210,255,0.40)',    size: 13 })
  new Style({ name: 'cfg_white',      color: 'rgb(255,255,255)',          size: 21 })
  new Style({ name: 'cfg_muted',      color: 'rgba(255,255,255,0.55)',    size: 21 })
  new Style({ name: 'cfg_secbadge',   color: 'rgba(80,210,255,0.70)',     size: 11 })
  new Style({ name: 'cfg_val',        color: 'rgb(120,210,255)',          size: 20 })
  new Style({ name: 'cfg_selval',     color: 'rgb(60,230,255)',           size: 20 })
  new Style({ name: 'cfg_toggle_on',  color: 'rgb(80,230,150)',           size: 20 })
  new Style({ name: 'cfg_toggle_off', color: 'rgba(255,110,110,0.80)',    size: 20 })
  new Style({ name: 'cfg_arrow',      color: 'rgba(255,255,255,0.28)',    size: 20 })
  new Style({ name: 'cfg_arrsel',     color: 'rgb(60,230,255)',           size: 20 })
  new Style({ name: 'cfg_hint',       color: 'rgba(255,255,255,0.24)',    size: 14 })
  new Style({ name: 'cfg_scroll',     color: 'rgba(120,200,255,0.65)',    size: 16 })
  new Style({ name: 'cfg_back',       color: 'rgba(255,120,120,0.85)',    size: 20 })
  new Style({ name: 'cfg_footer',     color: 'rgba(255,255,255,0.30)',    size: 16 })

  // ── Background ────────────────────────────────────────────────────────────
  const bgBase = new Image({ url: DARK_PX, x: 0, y: 0, width: SW, height: SH })
  bgBase.alpha = 1.0; bgBase.borderWidth = 0
  jsmaf.root.children.push(bgBase)

  const glow = new Image({ url: CYAN_PX, x: 0, y: 0, width: 600, height: 350 })
  glow.alpha = 0.04; glow.borderWidth = 0
  jsmaf.root.children.push(glow)

  // ── Header ────────────────────────────────────────────────────────────────
  const hdrBg = new Image({ url: WHITE_PX, x: 0, y: 0, width: SW, height: HEADER_H })
  hdrBg.alpha = 0.055; hdrBg.borderWidth = 0
  jsmaf.root.children.push(hdrBg)

  const hdrStripe = new Image({ url: CYAN_PX, x: 0, y: 0, width: 5, height: HEADER_H })
  hdrStripe.alpha = 0.90; hdrStripe.borderWidth = 0
  jsmaf.root.children.push(hdrStripe)

  const hdrDiv = new Image({ url: CYAN_PX, x: 0, y: HEADER_H - 1, width: SW, height: 1 })
  hdrDiv.alpha = 0.20; hdrDiv.borderWidth = 0
  jsmaf.root.children.push(hdrDiv)

  const ttl = new jsmaf.Text()
  ttl.text = (lang.config || 'SETTINGS').toUpperCase()
  ttl.x = PAD_X; ttl.y = 34; ttl.style = 'cfg_title'
  jsmaf.root.children.push(ttl)

  const subTxt = new jsmaf.Text()
  subTxt.text = TOTAL + ' settings'
  subTxt.x = PAD_X; subTxt.y = 86; subTxt.style = 'cfg_count'
  jsmaf.root.children.push(subTxt)

  // Column headers
  const hdrOpt = new jsmaf.Text()
  hdrOpt.text = 'OPTION'; hdrOpt.x = PAD_X + 18; hdrOpt.y = HEADER_H + 2; hdrOpt.style = 'cfg_colhdr'
  jsmaf.root.children.push(hdrOpt)

  const hdrVal = new jsmaf.Text()
  hdrVal.text = 'VALUE'; hdrVal.x = VAL_X; hdrVal.y = HEADER_H + 2; hdrVal.style = 'cfg_colhdr'
  jsmaf.root.children.push(hdrVal)

  const hdrHnt = new jsmaf.Text()
  hdrHnt.text = 'DESCRIPTION'; hdrHnt.x = HINT_X; hdrHnt.y = HEADER_H + 2; hdrHnt.style = 'cfg_colhdr'
  jsmaf.root.children.push(hdrHnt)

  // Column separators
  const sep1 = new Image({ url: WHITE_PX, x: VAL_X - 12, y: START_Y, width: 1, height: AVAIL_H })
  sep1.alpha = 0.10; sep1.borderWidth = 0
  jsmaf.root.children.push(sep1)

  const sep2 = new Image({ url: WHITE_PX, x: HINT_X - 12, y: START_Y, width: 1, height: AVAIL_H })
  sep2.alpha = 0.07; sep2.borderWidth = 0
  jsmaf.root.children.push(sep2)

  // ── Row slot widgets ──────────────────────────────────────────────────────
  const slotBgs:    Image[]      = []
  const slotBars:   Image[]      = []
  const slotSecs:   jsmaf.Text[] = []
  const slotLabels: jsmaf.Text[] = []
  const slotArrows: jsmaf.Text[] = []
  const slotValues: jsmaf.Text[] = []
  const slotHints:  jsmaf.Text[] = []

  for (let s = 0; s < VISIBLE; s++) {
    const bY = START_Y + s * (BTN_H + BTN_GAP)

    const bg = new Image({ url: WHITE_PX, x: PAD_X, y: bY, width: ROW_W, height: BTN_H })
    bg.alpha = 0.07; bg.borderColor = 'rgba(120,200,255,0.16)'; bg.borderWidth = 1
    slotBgs.push(bg); jsmaf.root.children.push(bg)

    const bar = new Image({ url: CYAN_PX, x: PAD_X, y: bY, width: 4, height: BTN_H })
    bar.alpha = 0.45; bar.borderWidth = 0
    slotBars.push(bar); jsmaf.root.children.push(bar)

    // FIX: init text to '' — jsmaf.Text has no .visible support
    const sec = new jsmaf.Text(); sec.text = ''; sec.x = PAD_X + 12; sec.y = bY + 8;  sec.style = 'cfg_secbadge'
    slotSecs.push(sec); jsmaf.root.children.push(sec)

    const lbl = new jsmaf.Text(); lbl.text = ''; lbl.x = PAD_X + 12; lbl.y = bY + 28; lbl.style = 'cfg_muted'
    slotLabels.push(lbl); jsmaf.root.children.push(lbl)

    const arr = new jsmaf.Text(); arr.text = ''; arr.x = VAL_X - 22; arr.y = bY + 26; arr.style = 'cfg_arrow'
    slotArrows.push(arr); jsmaf.root.children.push(arr)

    const vt = new jsmaf.Text(); vt.text = ''; vt.x = VAL_X; vt.y = bY + 26; vt.style = 'cfg_val'
    slotValues.push(vt); jsmaf.root.children.push(vt)

    const ht = new jsmaf.Text(); ht.text = ''; ht.x = HINT_X; ht.y = bY + 28; ht.style = 'cfg_hint'
    slotHints.push(ht); jsmaf.root.children.push(ht)
  }

  // Scroll indicators — use text trick instead of .visible
  const arrowUp = new jsmaf.Text(); arrowUp.text = ''
  arrowUp.x = SW / 2 - 68; arrowUp.y = HEADER_H + 2; arrowUp.style = 'cfg_scroll'
  jsmaf.root.children.push(arrowUp)

  const arrowDn = new jsmaf.Text(); arrowDn.text = ''
  arrowDn.x = SW / 2 - 68; arrowDn.y = START_Y + VISIBLE * (BTN_H + BTN_GAP) + 4; arrowDn.style = 'cfg_scroll'
  jsmaf.root.children.push(arrowDn)

  // Back label
  const navY = SH - FOOTER_H - 52
  const bt = new jsmaf.Text()
  bt.text = jsmaf.circleIsAdvanceButton ? lang.xToGoBack : lang.oToGoBack
  bt.x = PAD_X; bt.y = navY + 10; bt.style = 'cfg_back'
  jsmaf.root.children.push(bt)

  // ── Footer ────────────────────────────────────────────────────────────────
  const footLine = new Image({ url: CYAN_PX, x: 0, y: SH - FOOTER_H, width: SW, height: 1 })
  footLine.alpha = 0.18; footLine.borderWidth = 0
  jsmaf.root.children.push(footLine)

  const footBg = new Image({ url: WHITE_PX, x: 0, y: SH - FOOTER_H + 1, width: SW, height: FOOTER_H - 1 })
  footBg.alpha = 0.09; footBg.borderWidth = 0
  jsmaf.root.children.push(footBg)

  const confirmLabel = jsmaf.circleIsAdvanceButton ? 'O' : 'X'
  const backLabel    = jsmaf.circleIsAdvanceButton ? 'X' : 'O'
  const fh = new jsmaf.Text()
  fh.text = '↑↓  Navigate    ' + confirmLabel + '  Change value    ' + backLabel + '  Save & back'
  fh.x = SW / 2 - 260; fh.y = SH - FOOTER_H + 15; fh.style = 'cfg_footer'
  jsmaf.root.children.push(fh)

  // ── State ─────────────────────────────────────────────────────────────────
  let cur = 0; let scrollOff = 0

  function getVal (idx: number): string {
    const o = opts[idx]!; const k = o.key as keyof Cfg
    if (o.type === 'toggle') return C[k] ? 'ON' : 'OFF'
    if (k === 'jb_behavior') return jbLabels[C.jb_behavior] || jbLabels[0]!
    if (k === 'theme')       { const ti = availableThemes.indexOf(C.theme); return themeLabels[ti >= 0 ? ti : 0]! }
    if (k === 'exp_core')    return 'Core ' + C.exp_core
    if (k === 'exp_grooms')  return '' + C.exp_grooms
    if (k === 'exp_races')   return '' + C.exp_races
    if (k === 'exp_timeout') return C.exp_timeout + 's'
    return ''
  }

  function renderRows () {
    for (let s = 0; s < VISIBLE; s++) {
      const idx = scrollOff + s
      const vis = idx < TOTAL

      slotBgs[s]!.visible  = vis
      slotBars[s]!.visible = vis

      // FIX: clear text when not visible (jsmaf.Text has no .visible)
      if (!vis) {
        slotSecs[s]!.text   = ''
        slotLabels[s]!.text = ''
        slotArrows[s]!.text = ''
        slotValues[s]!.text = ''
        slotHints[s]!.text  = ''
        continue
      }

      const o    = opts[idx]!
      const sel  = idx === cur
      const val  = getVal(idx)
      const isOn = o.type === 'toggle' && val === 'ON'
      const isCycle = o.type === 'cycle'

      slotBgs[s]!.alpha       = sel ? 0.20 : 0.07
      slotBgs[s]!.borderColor = sel ? 'rgba(80,210,255,0.80)' : 'rgba(120,200,255,0.16)'
      slotBgs[s]!.borderWidth = sel ? 2 : 1
      slotBars[s]!.alpha      = sel ? 1.0 : 0.45

      if (o.type === 'toggle' && sel) {
        slotBars[s]!.alpha = isOn ? 1.0 : 0.70
      }

      const prevSec = idx > 0 ? opts[idx - 1]!.section : ''
      slotSecs[s]!.text   = o.section !== prevSec ? '▪ ' + o.section : ''
      slotLabels[s]!.text = o.label
      slotLabels[s]!.style = sel ? 'cfg_white' : 'cfg_muted'
      slotArrows[s]!.text = isCycle ? '›' : ''
      slotArrows[s]!.style = sel ? 'cfg_arrsel' : 'cfg_arrow'
      slotValues[s]!.text = val
      slotValues[s]!.style = o.type === 'toggle'
        ? (isOn ? 'cfg_toggle_on' : 'cfg_toggle_off')
        : (sel ? 'cfg_selval' : 'cfg_val')
      slotHints[s]!.text = o.hint
    }
    // Use text trick for scroll arrows
    arrowUp.text = scrollOff > 0 ? '▲  Scroll up' : ''
    arrowDn.text = (scrollOff + VISIBLE) < TOTAL ? '▼  More below' : ''
  }

  function clamp () {
    if (cur < scrollOff) scrollOff = cur
    else if (cur >= scrollOff + VISIBLE) scrollOff = cur - VISIBLE + 1
  }

  // ── Save / Load ───────────────────────────────────────────────────────────
  function saveConfig (done?: () => void) {
    if (!configLoaded) { if (done) done(); return }
    const out = {
      config: {
        autolapse: C.autolapse, autopoop: C.autopoop, autoclose: C.autoclose,
        autoclose_delay: C.autoclose_delay, music: C.music,
        jb_behavior: C.jb_behavior, theme: C.theme,
        exploit: {
          core: C.exp_core, rtprio: 256, grooms: C.exp_grooms,
          races: C.exp_races, alias: 100, sds: 64, workers: 2,
          timeout_s: C.exp_timeout
        }
      },
      payloads: userPayloads
    }
    fs.write('config.json', JSON.stringify(out, null, 2), function (err) {
      if (err) log('Save error: ' + err.message); else log('Config saved')
      if (done) done()
    })
  }

  function loadConfig () {
    fs.read('config.json', function (err: Error | null, data?: string) {
      if (err) { log('Load error: ' + err.message); configLoaded = true; renderRows(); return }
      try {
        const d = JSON.parse(data || '{}')
        if (d.config) {
          const G = d.config
          C.autolapse       = G.autolapse  || false
          C.autopoop        = G.autopoop   || false
          C.autoclose       = G.autoclose  || false
          C.autoclose_delay = G.autoclose_delay || 0
          C.music           = G.music !== false
          C.jb_behavior     = G.jb_behavior || 0
          C.theme           = (G.theme && availableThemes.includes(G.theme)) ? G.theme : 'default'
          if (d.payloads && Array.isArray(d.payloads)) userPayloads = d.payloads.slice()
          if (G.exploit) {
            const ex = G.exploit
            if (ex.core      !== undefined) C.exp_core    = ex.core
            if (ex.grooms    !== undefined) C.exp_grooms  = ex.grooms
            if (ex.races     !== undefined) C.exp_races   = ex.races
            if (ex.timeout_s !== undefined) C.exp_timeout = ex.timeout_s
          }
        }
        configLoaded = true; renderRows()
        if (C.music) { if (typeof startBgmIfEnabled === 'function') startBgmIfEnabled() }
        else         { if (typeof stopBgm === 'function') stopBgm() }
        log('Config loaded')
      } catch (e) { log('Parse: ' + (e as Error).message); configLoaded = true; renderRows() }
    })
  }

  // ── Cycle / Toggle ────────────────────────────────────────────────────────
  function onPress () {
    const o = opts[cur]; if (!o) return
    const k = o.key as keyof Cfg
    if (o.type === 'cycle') {
      if (k === 'jb_behavior') { C.jb_behavior = (C.jb_behavior + 1) % jbLabels.length }
      else if (k === 'theme')       { const ti = availableThemes.indexOf(C.theme); C.theme = availableThemes[(ti + 1) % availableThemes.length]! }
      else if (k === 'exp_core')    { C.exp_core = (C.exp_core + 1) % 6 }
      else if (k === 'exp_grooms')  { const v = [128, 256, 512, 768, 1024, 1280]; const i = v.indexOf(C.exp_grooms);  C.exp_grooms  = v[(i + 1) % v.length]! }
      else if (k === 'exp_races')   { const v = [50, 75, 100, 150, 200, 300];      const i = v.indexOf(C.exp_races);   C.exp_races   = v[(i + 1) % v.length]! }
      else if (k === 'exp_timeout') { const v = [5, 8, 10, 15, 20];               const i = v.indexOf(C.exp_timeout); C.exp_timeout = v[(i + 1) % v.length]! }
    } else {
      if (k === 'autolapse' || k === 'autopoop' || k === 'autoclose' || k === 'music') {
        C[k] = !C[k]
        if (k === 'music') {
          if (typeof CONFIG !== 'undefined') CONFIG.music = C.music
          if (C.music) { if (typeof startBgmIfEnabled === 'function') startBgmIfEnabled() }
          else         { if (typeof stopBgm === 'function') stopBgm() }
        }
        if (k === 'autolapse' && C.autolapse) C.autopoop = false
        if (k === 'autopoop'  && C.autopoop)  C.autolapse = false
      }
    }
    renderRows(); saveConfig()
  }

  // ── Input ─────────────────────────────────────────────────────────────────
  const confirmKey = jsmaf.circleIsAdvanceButton ? 13 : 14
  const backKey    = jsmaf.circleIsAdvanceButton ? 14 : 13

  jsmaf.onKeyDown = function (kc: number) {
    if (kc === 6 || kc === 5) {
      cur = (cur + 1) % TOTAL; sfx(SFX_CUR); clamp(); renderRows()
    } else if (kc === 4 || kc === 7) {
      cur = (cur - 1 + TOTAL) % TOTAL; sfx(SFX_CUR); clamp(); renderRows()
    } else if (kc === confirmKey) {
      sfx(SFX_OK); onPress()
    } else if (kc === backKey) {
      sfx(SFX_BCK)
      saveConfig(function () {
        try {
          include('themes/' + (typeof CONFIG !== 'undefined' && CONFIG.theme ? CONFIG.theme : 'default') + '/main.js')
        } catch (e) { log('Back error: ' + (e as Error).message) }
      })
    }
  }

  renderRows(); loadConfig()
  log('Config UI loaded — ' + TOTAL + ' options.')
  ;((_a) => {})(libc_addr)
})()

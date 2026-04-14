import { libc_addr } from 'download0/userland'
import { lang } from 'download0/languages'
import { fn, mem, BigInt } from 'download0/types'

if (typeof libc_addr === 'undefined') include('userland.js')
if (typeof lang === 'undefined') include('languages.js')

;(function () {
  // ─── Palette ───────────────────────────────────────────────────────────────
  const DARK = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNg4+ADAAA0AB0VS5vvAAAAAElFTkSuQmCC'
  const WHITE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC'
  const AMBER = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4v9MIAASlAeurtfG0AAAAAElFTkSuQmCC'
  const GREEN = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGOwudQEAALeAZF36ueWAAAAAElFTkSuQmCC'
  const RED = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP44BYAAAOwAYeW+1bOAAAAAElFTkSuQmCC'

  // ─── Config data ───────────────────────────────────────────────────────────
  interface Cfg {
    autolapse: boolean;
    autopoop: boolean;
    autoclose: boolean
    autoclose_delay: number;
    music: boolean;
    jb_behavior: number
    theme: string;
    exp_core: number;
    exp_grooms: number
    exp_races: number;
    exp_timeout: number
  }
  const C: Cfg = { autolapse: false, autopoop: false, autoclose: false, autoclose_delay: 0, music: true, jb_behavior: 0, theme: 'default', exp_core: 4, exp_grooms: 512, exp_races: 100, exp_timeout: 8 }
  let userPayloads: string[] = []; let configLoaded = false
  const jbLabels = [lang.jbBehaviorAuto, lang.jbBehaviorNetctrl, lang.jbBehaviorLapse]

  const fs = {
    write (f: string, d: string, cb: (e: Error | null) => void) {
      const x = new jsmaf.XMLHttpRequest()
      x.onreadystatechange = function () { if (x.readyState === 4) cb(x.status === 0 || x.status === 200 ? null : new Error('xhr')) }
      x.open('POST', 'file://../download0/' + f, true); x.send(d)
    },
    read (f: string, cb: (e: Error | null, d?: string) => void) {
      const x = new jsmaf.XMLHttpRequest()
      x.onreadystatechange = function () { if (x.readyState === 4) cb(x.status === 0 || x.status === 200 ? null : new Error('xhr'), x.responseText) }
      x.open('GET', 'file://../download0/' + f, true); x.send()
    }
  }

  function scanThemes (): string[] {
    const themes: string[] = []
    try {
      try { fn.register(0x05, 'dcfg_open', ['bigint', 'bigint', 'bigint'], 'bigint') } catch (_e) {}
      try { fn.register(0x06, 'dcfg_close', ['bigint'], 'bigint') } catch (_e) {}
      try { fn.register(0x110, 'dcfg_getdents', ['bigint', 'bigint', 'bigint'], 'bigint') } catch (_e) {}
      const dir = '/download0/themes'; const pa = mem.malloc(256); const buf = mem.malloc(4096)
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
            for (let i = 0; i < nl; i++) name += String.fromCharCode(mem.view(buf.add(new BigInt(0, off + 8 + i))).getUint8(0))
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

  type OT = 'toggle' | 'cycle'
  interface Opt { key: string; label: string; type: OT; section: string; hint: string }
  const opts: Opt[] = [
    { key: 'music', label: lang.music, type: 'toggle', section: 'GENERAL', hint: 'Background music' },
    { key: 'autolapse', label: lang.autoLapse, type: 'toggle', section: 'GENERAL', hint: 'Auto-run Lapse' },
    { key: 'autopoop', label: lang.autoPoop, type: 'toggle', section: 'GENERAL', hint: 'Auto-deploy payload' },
    { key: 'autoclose', label: lang.autoClose, type: 'toggle', section: 'GENERAL', hint: 'Close browser after JB' },
    { key: 'jb_behavior', label: lang.jbBehavior, type: 'cycle', section: 'GENERAL', hint: 'Post-exploit mode' },
    { key: 'theme', label: lang.theme || 'Theme', type: 'cycle', section: 'GENERAL', hint: 'UI theme' },
    { key: 'exp_core', label: 'CPU Core', type: 'cycle', section: 'EXPLOIT', hint: 'Exploit core (0-5)' },
    { key: 'exp_grooms', label: 'Heap Grooms', type: 'cycle', section: 'EXPLOIT', hint: 'Heap grooming count' },
    { key: 'exp_races', label: 'Race Attempts', type: 'cycle', section: 'EXPLOIT', hint: 'Race condition tries' },
    { key: 'exp_timeout', label: 'Timeout', type: 'cycle', section: 'EXPLOIT', hint: 'Exploit timeout (s)' },
  ]
  const TOTAL = opts.length

  // ─── Layout ────────────────────────────────────────────────────────────────
  const SW = 1920; const SH = 1080; const PAD = 60
  const HDR = 160; const FTR = 52
  const BACK_STRIP = 70
  // Column headers live between HDR line and first row
  const COL_HDR_H = 34          // height of the column-header band
  const SY = HDR + COL_HDR_H   // rows start here (194)
  const AVAIL = SH - SY - FTR - BACK_STRIP - 10
  const BH = 76; const GAP = 8
  const VIS = Math.min(TOTAL, Math.floor(AVAIL / (BH + GAP)))

  const RW = SW - PAD * 2
  // Column split positions
  const VOFF = Math.floor(RW * 0.58); const HOFF = Math.floor(RW * 0.76)
  const VX = PAD + VOFF; const HX = PAD + HOFF

  // ─── Audio ─────────────────────────────────────────────────────────────────
  const SFX_CUR = 'file:///../download0/sfx/cursor.wav'
  const SFX_OK = 'file:///../download0/sfx/confirm.wav'
  const SFX_BCK = 'file:///../download0/sfx/cancel.wav'
  const poolCur: jsmaf.AudioClip[] = []; const poolOk: jsmaf.AudioClip[] = []; const poolBack: jsmaf.AudioClip[] = []
  for (let _i = 0; _i < 8; _i++) { const c = new jsmaf.AudioClip(); c.volume = 1.0; poolCur.push(c) }
  for (let _i = 0; _i < 4; _i++) { const c = new jsmaf.AudioClip(); c.volume = 1.0; poolOk.push(c) }
  for (let _i = 0; _i < 4; _i++) { const c = new jsmaf.AudioClip(); c.volume = 1.0; poolBack.push(c) }
  let pCur = 0; let pOk = 0; let pBack = 0
  function sfxCur () { if (typeof CONFIG !== 'undefined' && CONFIG.music === false) return; try { poolCur[pCur]!.open(SFX_CUR); pCur = (pCur + 1) % poolCur.length } catch (_e) {} }
  function sfxOk () { if (typeof CONFIG !== 'undefined' && CONFIG.music === false) return; try { poolOk[pOk]!.open(SFX_OK); pOk = (pOk + 1) % poolOk.length } catch (_e) {} }
  function sfxBack () { if (typeof CONFIG !== 'undefined' && CONFIG.music === false) return; try { poolBack[pBack]!.open(SFX_BCK); pBack = (pBack + 1) % poolBack.length } catch (_e) {} }

  jsmaf.root.children.length = 0

  // ─── Styles ────────────────────────────────────────────────────────────────
  new Style({ name: 'ctitle', color: 'rgb(255,255,255)', size: 30 })
  new Style({ name: 'ccount', color: 'rgba(255,210,120,0.65)', size: 16 })
  new Style({ name: 'ccolhdr', color: 'rgba(255,200,100,0.50)', size: 12 })
  new Style({ name: 'cwhite', color: 'rgb(255,255,255)', size: 22 })
  new Style({ name: 'cmuted', color: 'rgba(235,228,212,0.88)', size: 22 })
  new Style({ name: 'csec', color: 'rgba(255,185,50,0.70)', size: 11 })
  new Style({ name: 'cval', color: 'rgb(255,185,50)', size: 21 })
  new Style({ name: 'cselval', color: 'rgb(255,225,120)', size: 21 })
  new Style({ name: 'con', color: 'rgb(60,210,130)', size: 21 })
  new Style({ name: 'coff', color: 'rgba(240,80,90,0.88)', size: 21 })
  new Style({ name: 'carr', color: 'rgba(255,255,255,0.28)', size: 21 })
  new Style({ name: 'carrsel', color: 'rgb(255,185,50)', size: 21 })
  new Style({ name: 'chint', color: 'rgba(200,190,160,0.50)', size: 14 })
  new Style({ name: 'cscroll', color: 'rgba(255,200,80,0.80)', size: 16 })
  new Style({ name: 'cback', color: 'rgba(240,80,90,0.92)', size: 20 })
  new Style({ name: 'cftr', color: 'rgba(255,215,130,0.36)', size: 15 })

  // ─── Background ────────────────────────────────────────────────────────────
  const bg = new Image({ url: DARK, x: 0, y: 0, width: SW, height: SH })
  bg.alpha = 1.0; bg.borderWidth = 0; jsmaf.root.children.push(bg)
  const gl = new Image({ url: AMBER, x: 0, y: 0, width: 700, height: 460 })
  gl.alpha = 0.028; gl.borderWidth = 0; jsmaf.root.children.push(gl)

  // ─── Header ────────────────────────────────────────────────────────────────
  const topBar = new Image({ url: AMBER, x: 0, y: 0, width: SW, height: 3 })
  topBar.alpha = 0.88; topBar.borderWidth = 0; jsmaf.root.children.push(topBar)
  const hBg = new Image({ url: WHITE, x: 0, y: 0, width: SW, height: HDR })
  hBg.alpha = 0.058; hBg.borderWidth = 0; jsmaf.root.children.push(hBg)
  const hAccent = new Image({ url: AMBER, x: 0, y: 0, width: 5, height: HDR })
  hAccent.alpha = 1.0; hAccent.borderWidth = 0; jsmaf.root.children.push(hAccent)
  const hLine = new Image({ url: AMBER, x: 0, y: HDR - 1, width: SW, height: 1 })
  hLine.alpha = 0.24; hLine.borderWidth = 0; jsmaf.root.children.push(hLine)

  const ttl = new jsmaf.Text()
  ttl.style = 'ctitle'; ttl.text = (lang.config || 'SETTINGS').toUpperCase(); ttl.x = PAD; ttl.y = 38
  jsmaf.root.children.push(ttl)
  const sub = new jsmaf.Text()
  sub.style = 'ccount'; sub.text = TOTAL + ' settings'; sub.x = PAD; sub.y = 98
  jsmaf.root.children.push(sub)

  // ─── Column header band (HDR to SY, no overlap with rows) ─────────────────
  const colBandBg = new Image({ url: WHITE, x: 0, y: HDR, width: SW, height: COL_HDR_H })
  colBandBg.alpha = 0.036; colBandBg.borderWidth = 0; jsmaf.root.children.push(colBandBg)

  // Column headers — vertically centred in the band
  const chY = HDR + Math.floor((COL_HDR_H - 12) / 2) - 1
  const hOpt = new jsmaf.Text(); hOpt.style = 'ccolhdr'; hOpt.text = 'OPTION'; hOpt.x = PAD + 18; hOpt.y = chY; jsmaf.root.children.push(hOpt)
  const hVal = new jsmaf.Text(); hVal.style = 'ccolhdr'; hVal.text = 'VALUE'; hVal.x = VX; hVal.y = chY; jsmaf.root.children.push(hVal)
  const hHnt = new jsmaf.Text(); hHnt.style = 'ccolhdr'; hHnt.text = 'DESCRIPTION'; hHnt.x = HX; hHnt.y = chY; jsmaf.root.children.push(hHnt)

  // Thin separator below column headers (at SY)
  const colSep = new Image({ url: AMBER, x: 0, y: SY - 1, width: SW, height: 1 })
  colSep.alpha = 0.16; colSep.borderWidth = 0; jsmaf.root.children.push(colSep)

  // Vertical column dividers
  const sep1 = new Image({ url: WHITE, x: VX - 12, y: SY, width: 1, height: AVAIL })
  sep1.alpha = 0.12; sep1.borderWidth = 0; jsmaf.root.children.push(sep1)
  const sep2 = new Image({ url: WHITE, x: HX - 12, y: SY, width: 1, height: AVAIL })
  sep2.alpha = 0.08; sep2.borderWidth = 0; jsmaf.root.children.push(sep2)

  // ─── Pre-allocated row slots ───────────────────────────────────────────────
  const sBg: Image[] = []; const sBar: Image[] = []
  const sSec: jsmaf.Text[] = []; const sLbl: jsmaf.Text[] = []
  const sArr: jsmaf.Text[] = []; const sVal: jsmaf.Text[] = []
  const sHnt: jsmaf.Text[] = []

  for (let s = 0; s < VIS; s++) {
    const bY = SY + s * (BH + GAP)
    const bg2 = new Image({ url: WHITE, x: PAD, y: bY, width: RW, height: BH, visible: false })
    bg2.alpha = 0.10; bg2.borderColor = 'rgba(255,185,50,0.20)'; bg2.borderWidth = 1
    sBg.push(bg2); jsmaf.root.children.push(bg2)
    const bar = new Image({ url: AMBER, x: PAD, y: bY, width: 5, height: BH, visible: false })
    bar.alpha = 0.50; bar.borderWidth = 0; sBar.push(bar); jsmaf.root.children.push(bar)
    // Section tag (top-left of row)
    const sec = new jsmaf.Text(); sec.style = 'csec'; sec.text = ''; sec.x = PAD + 14; sec.y = bY + 8; sSec.push(sec); jsmaf.root.children.push(sec)
    // Option label
    const lbl = new jsmaf.Text(); lbl.style = 'cmuted'; lbl.text = ''; lbl.x = PAD + 14; lbl.y = bY + 30; sLbl.push(lbl); jsmaf.root.children.push(lbl)
    // Cycle arrow (just before VALUE column)
    const arrow = new jsmaf.Text(); arrow.style = 'carr'; arrow.text = ''; arrow.x = VX - 26; arrow.y = bY + 28; sArr.push(arrow); jsmaf.root.children.push(arrow)
    // Value
    const vt = new jsmaf.Text(); vt.style = 'cval'; vt.text = ''; vt.x = VX; vt.y = bY + 28; sVal.push(vt); jsmaf.root.children.push(vt)
    // Hint
    const ht = new jsmaf.Text(); ht.style = 'chint'; ht.text = ''; ht.x = HX; ht.y = bY + 30; sHnt.push(ht); jsmaf.root.children.push(ht)
  }

  // Scroll indicators
  const arrUp = new jsmaf.Text(); arrUp.style = 'cscroll'; arrUp.text = ''; arrUp.x = SW / 2 - 70; arrUp.y = SY + 4; jsmaf.root.children.push(arrUp)
  const arrDn = new jsmaf.Text(); arrDn.style = 'cscroll'; arrDn.text = ''; arrDn.x = SW / 2 - 70; arrDn.y = SY + VIS * (BH + GAP) + 6; jsmaf.root.children.push(arrDn)

  // ─── Back button strip (clearly above footer, below rows) ─────────────────
  const bsY = SH - FTR - BACK_STRIP
  const bsSep = new Image({ url: AMBER, x: 0, y: bsY, width: SW, height: 1 })
  bsSep.alpha = 0.15; bsSep.borderWidth = 0; jsmaf.root.children.push(bsSep)
  const bsBg = new Image({ url: WHITE, x: 0, y: bsY + 1, width: SW, height: BACK_STRIP - 1 })
  bsBg.alpha = 0.04; bsBg.borderWidth = 0; jsmaf.root.children.push(bsBg)
  const backT = new jsmaf.Text()
  backT.style = 'cback'
  backT.text = jsmaf.circleIsAdvanceButton ? lang.xToGoBack : lang.oToGoBack
  backT.x = PAD; backT.y = bsY + 20; jsmaf.root.children.push(backT)

  // ─── Footer ────────────────────────────────────────────────────────────────
  const fLine = new Image({ url: AMBER, x: 0, y: SH - FTR, width: SW, height: 1 })
  fLine.alpha = 0.24; fLine.borderWidth = 0; jsmaf.root.children.push(fLine)
  const fBg = new Image({ url: WHITE, x: 0, y: SH - FTR + 1, width: SW, height: FTR - 1 })
  fBg.alpha = 0.05; fBg.borderWidth = 0; jsmaf.root.children.push(fBg)
  const clbl = jsmaf.circleIsAdvanceButton ? 'O' : 'X'; const blbl = jsmaf.circleIsAdvanceButton ? 'X' : 'O'
  const fTxt = new jsmaf.Text()
  fTxt.style = 'cftr'; fTxt.text = '↑↓  Navigate    ' + clbl + '  Change    ' + blbl + '  Save & back'
  fTxt.x = SW / 2 - 240; fTxt.y = SH - FTR + 18; jsmaf.root.children.push(fTxt)

  let cur = 0; let scrollOff = 0

  function getVal (idx: number): string {
    const o = opts[idx]!; const k = o.key as keyof Cfg
    if (o.type === 'toggle') return (C[k] as boolean) ? 'ON' : 'OFF'
    if (k === 'jb_behavior') return jbLabels[C.jb_behavior] || jbLabels[0]!
    if (k === 'theme') { const ti = availableThemes.indexOf(C.theme); return themeLabels[ti >= 0 ? ti : 0]! }
    if (k === 'exp_core') return 'Core ' + C.exp_core
    if (k === 'exp_grooms') return '' + C.exp_grooms
    if (k === 'exp_races') return '' + C.exp_races
    if (k === 'exp_timeout') return C.exp_timeout + 's'
    return ''
  }

  function renderRows () {
    arrUp.text = scrollOff > 0 ? '▲  Scroll up' : ''
    arrDn.text = (scrollOff + VIS) < TOTAL ? '▼  More below' : ''
    for (let s = 0; s < VIS; s++) {
      const idx = scrollOff + s
      if (idx >= TOTAL) {
        sBg[s]!.visible = false; sBar[s]!.visible = false
        sSec[s]!.text = ''; sLbl[s]!.text = ''; sArr[s]!.text = ''; sVal[s]!.text = ''; sHnt[s]!.text = ''
        continue
      }
      const o = opts[idx]!; const sel = idx === cur
      const val = getVal(idx); const isOn = o.type === 'toggle' && val === 'ON'

      sBg[s]!.visible = true
      sBg[s]!.alpha = sel ? 0.22 : 0.10
      sBg[s]!.borderColor = sel ? 'rgba(255,185,50,0.92)' : 'rgba(255,185,50,0.20)'
      sBg[s]!.borderWidth = sel ? 2 : 1
      sBar[s]!.visible = true
      sBar[s]!.alpha = sel ? 1.0 : 0.50

      const prevSec = idx > 0 ? opts[idx - 1]!.section : ''
      sSec[s]!.text = o.section !== prevSec ? '▸ ' + o.section : ''
      sLbl[s]!.style = sel ? 'cwhite' : 'cmuted'
      sLbl[s]!.text = o.label
      sArr[s]!.style = sel ? 'carrsel' : 'carr'
      sArr[s]!.text = o.type === 'cycle' ? '›' : ''
      sVal[s]!.style = o.type === 'toggle' ? (isOn ? 'con' : 'coff') : (sel ? 'cselval' : 'cval')
      sVal[s]!.text = val
      sHnt[s]!.text = o.hint
    }
  }

  function clamp () {
    if (cur < scrollOff) scrollOff = cur
    else if (cur >= scrollOff + VIS) scrollOff = cur - VIS + 1
  }

  function saveConfig (done?: () => void) {
    if (!configLoaded) { if (done) done(); return }
    const out = { config: { autolapse: C.autolapse, autopoop: C.autopoop, autoclose: C.autoclose, autoclose_delay: C.autoclose_delay, music: C.music, jb_behavior: C.jb_behavior, theme: C.theme, exploit: { core: C.exp_core, rtprio: 256, grooms: C.exp_grooms, races: C.exp_races, alias: 100, sds: 64, workers: 2, timeout_s: C.exp_timeout } }, payloads: userPayloads }
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
          C.autolapse = G.autolapse || false; C.autopoop = G.autopoop || false; C.autoclose = G.autoclose || false; C.autoclose_delay = G.autoclose_delay || 0
          C.music = G.music !== false; C.jb_behavior = G.jb_behavior || 0
          C.theme = (G.theme && availableThemes.includes(G.theme)) ? G.theme : 'default'
          if (d.payloads && Array.isArray(d.payloads)) userPayloads = d.payloads.slice()
          if (G.exploit) { const ex = G.exploit; if (ex.core !== undefined) C.exp_core = ex.core; if (ex.grooms !== undefined) C.exp_grooms = ex.grooms; if (ex.races !== undefined) C.exp_races = ex.races; if (ex.timeout_s !== undefined) C.exp_timeout = ex.timeout_s }
        }
        configLoaded = true; renderRows()
        if (C.music) { if (typeof startBgmIfEnabled === 'function') startBgmIfEnabled() } else { if (typeof stopBgm === 'function') stopBgm() }
      } catch (e) { log('Parse: ' + (e as Error).message); configLoaded = true; renderRows() }
    })
  }

  function onPress () {
    const o = opts[cur]; if (!o) return; const k = o.key as keyof Cfg
    if (o.type === 'cycle') {
      if (k === 'jb_behavior') C.jb_behavior = (C.jb_behavior + 1) % jbLabels.length
      else if (k === 'theme') { const ti = availableThemes.indexOf(C.theme); C.theme = availableThemes[(ti + 1) % availableThemes.length]! } else if (k === 'exp_core') C.exp_core = (C.exp_core + 1) % 6
      else if (k === 'exp_grooms') { const v = [128, 256, 512, 768, 1024, 1280]; const i = v.indexOf(C.exp_grooms); C.exp_grooms = v[(i + 1) % v.length]! } else if (k === 'exp_races') { const v = [50, 75, 100, 150, 200, 300]; const i = v.indexOf(C.exp_races); C.exp_races = v[(i + 1) % v.length]! } else if (k === 'exp_timeout') { const v = [5, 8, 10, 15, 20]; const i = v.indexOf(C.exp_timeout); C.exp_timeout = v[(i + 1) % v.length]! }
    } else {
      if (k === 'autolapse' || k === 'autopoop' || k === 'autoclose' || k === 'music') {
        C[k] = !C[k]
        if (k === 'music') { if (typeof CONFIG !== 'undefined') CONFIG.music = C.music; if (C.music) { if (typeof startBgmIfEnabled === 'function') startBgmIfEnabled() } else { if (typeof stopBgm === 'function') stopBgm() } }
        if (k === 'autolapse' && C.autolapse) C.autopoop = false
        if (k === 'autopoop' && C.autopoop) C.autolapse = false
      }
    }
    renderRows(); saveConfig()
  }

  const confirmKey = jsmaf.circleIsAdvanceButton ? 13 : 14
  const backKey = jsmaf.circleIsAdvanceButton ? 14 : 13
  jsmaf.onKeyDown = function (kc: number) {
    if (kc === 6 || kc === 5) {
      cur = (cur + 1) % TOTAL; sfxCur(); clamp(); renderRows()
    } else if (kc === 4 || kc === 7) {
      cur = (cur - 1 + TOTAL) % TOTAL; sfxCur(); clamp(); renderRows()
    } else if (kc === confirmKey) {
      sfxOk(); onPress()
    } else if (kc === backKey) { sfxBack(); saveConfig(function () { try { include('themes/' + (typeof CONFIG !== 'undefined' && CONFIG.theme ? CONFIG.theme : 'default') + '/main.js') } catch (e) { log('Back: ' + (e as Error).message) } }) }
  }

  renderRows(); loadConfig()
  log('Config UI loaded — ' + TOTAL + ' options | VIS=' + VIS + ' SY=' + SY)
  ;((_a, _b, _c) => {})(libc_addr, GREEN, RED)
})()

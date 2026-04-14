import { libc_addr } from 'download0/userland'
import { lang } from 'download0/languages'
import { fn, mem, BigInt } from 'download0/types'

if (typeof libc_addr === 'undefined') include('userland.js')
if (typeof lang === 'undefined') include('languages.js')

;(function () {
  log('Loading config UI...')

  // ── Pixels ────────────────────────────────────────────────────────────────
<<<<<<< HEAD
  const DARK   = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGPg4RMDAABaADEUPDZQAAAAAElFTkSuQmCC'
  const WHITE  = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC'
  const CYAN   = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNguPQMAAKOAbnVoJuKAAAAAElFTkSuQmCC'
  const GREEN  = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGMIeDYNAANWAc20LRTOAAAAAElFTkSuQmCC'
  const RED    = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP47xYAAAPdAZZlZDzjAAAAAElFTkSuQmCC'
=======
  const DARK = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNg4xACAAA4ACGcHPdwAAAAAElFTkSuQmCC'
  const WHITE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC'
  const PURPLE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNY7/YfAAOcAfXVA39DAAAAAElFTkSuQmCC'
  const GREEN = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGMIeDYNAANWAc20LRTOAAAAAElFTkSuQmCC'
  const RED = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4HxAAAAPxAaAHMjeOAAAAAElFTkSuQmCC'
>>>>>>> 2007f94d1e913bb26f17c671f76df1d9ca9e0b9b

  // ── Config state ──────────────────────────────────────────────────────────
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
  const C: Cfg = {
    autolapse: false,
    autopoop: false,
    autoclose: false,
    autoclose_delay: 0,
    music: true,
    jb_behavior: 0,
    theme: 'default',
    exp_core: 4,
    exp_grooms: 512,
    exp_races: 100,
    exp_timeout: 8
  }
  let userPayloads: string[] = []
  let configLoaded = false
  const jbLabels = [lang.jbBehaviorAuto, lang.jbBehaviorNetctrl, lang.jbBehaviorLapse]

  // ── File I/O ──────────────────────────────────────────────────────────────
  const fs = {
    write (f: string, d: string, cb: (e: Error | null) => void) {
      const x = new jsmaf.XMLHttpRequest()
      x.onreadystatechange = function () {
        if (x.readyState === 4) cb(x.status === 0 || x.status === 200 ? null : new Error('xhr'))
      }
      x.open('POST', 'file://../download0/' + f, true); x.send(d)
    },
    read (f: string, cb: (e: Error | null, d?: string) => void) {
      const x = new jsmaf.XMLHttpRequest()
      x.onreadystatechange = function () {
        if (x.readyState === 4) cb(x.status === 0 || x.status === 200 ? null : new Error('xhr'), x.responseText)
      }
      x.open('GET', 'file://../download0/' + f, true); x.send()
    }
  }

  // ── Theme scan ────────────────────────────────────────────────────────────
  function scanThemes (): string[] {
    const themes: string[] = []
    try {
      try { fn.register(0x05, 'dcfg_open', ['bigint', 'bigint', 'bigint'], 'bigint') } catch (_e) {}
      try { fn.register(0x06, 'dcfg_close', ['bigint'], 'bigint') } catch (_e) {}
      try { fn.register(0x110, 'dcfg_getdents', ['bigint', 'bigint', 'bigint'], 'bigint') } catch (_e) {}
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

  // ── Options list ──────────────────────────────────────────────────────────
  type OptType = 'toggle' | 'cycle'
  interface Opt { key: string; label: string; type: OptType; section: string; hint: string }
  const opts: Opt[] = [
    { key: 'music', label: lang.music, type: 'toggle', section: 'GENERAL', hint: 'Background music' },
    { key: 'autolapse', label: lang.autoLapse, type: 'toggle', section: 'GENERAL', hint: 'Auto-run Lapse' },
    { key: 'autopoop', label: lang.autoPoop, type: 'toggle', section: 'GENERAL', hint: 'Auto-deploy payload' },
    { key: 'autoclose', label: lang.autoClose, type: 'toggle', section: 'GENERAL', hint: 'Close browser after JB' },
    { key: 'jb_behavior', label: lang.jbBehavior, type: 'cycle', section: 'GENERAL', hint: 'Post-exploit mode' },
    { key: 'theme', label: lang.theme || 'Theme', type: 'cycle', section: 'GENERAL', hint: 'UI theme' },
    { key: 'exp_core', label: 'CPU Core', type: 'cycle', section: 'EXPLOIT', hint: 'Exploit CPU core (0-5)' },
    { key: 'exp_grooms', label: 'Heap Grooms', type: 'cycle', section: 'EXPLOIT', hint: 'Heap grooming count' },
    { key: 'exp_races', label: 'Race Attempts', type: 'cycle', section: 'EXPLOIT', hint: 'Race condition tries' },
    { key: 'exp_timeout', label: 'Timeout', type: 'cycle', section: 'EXPLOIT', hint: 'Exploit timeout (s)' },
  ]
  const TOTAL = opts.length

  // ── Layout ────────────────────────────────────────────────────────────────
<<<<<<< HEAD
  const SW = 1920, SH = 1080, PAD = 60
  const HDR = 160, FTR = 50
  const AVAIL = SH - HDR - FTR - 20
  const BH = 74, GAP = 7
  const VIS  = Math.min(TOTAL, Math.floor(AVAIL / (BH + GAP)))
  const RW   = SW - PAD * 2
  const SY   = HDR + 10
  const VOFF = Math.floor(RW * 0.60)
  const HOFF = Math.floor(RW * 0.78)
  const VX   = PAD + VOFF
  const HX   = PAD + HOFF
=======
  const SW = 1920; const SH = 1080; const PAD = 60
  const HDR = 152; const FTR = 50
  const AVAIL = SH - HDR - FTR - 20
  const BH = 76; const GAP = 8
  const VIS = Math.min(TOTAL, Math.floor(AVAIL / (BH + GAP)))
  const RW = SW - PAD * 2
  const SY = HDR + 10
  const VOFF = Math.floor(RW * 0.60)   // value column offset
  const HOFF = Math.floor(RW * 0.78)   // hint column offset
  const VX = PAD + VOFF
  const HX = PAD + HOFF
>>>>>>> 2007f94d1e913bb26f17c671f76df1d9ca9e0b9b

  const SFX_CUR = 'file:///../download0/sfx/cursor.wav'
  const SFX_OK = 'file:///../download0/sfx/confirm.wav'
  const SFX_BCK = 'file:///../download0/sfx/cancel.wav'

<<<<<<< HEAD
  const poolCur  = Array.from({ length: 8 }, () => { const c = new jsmaf.AudioClip(); c.volume = 1.0; return c })
  const poolOk   = Array.from({ length: 4 }, () => { const c = new jsmaf.AudioClip(); c.volume = 1.0; return c })
=======
  // ── Audio pools ───────────────────────────────────────────────────────────
  const poolCur = Array.from({ length: 8 }, () => { const c = new jsmaf.AudioClip(); c.volume = 1.0; return c })
  const poolOk = Array.from({ length: 4 }, () => { const c = new jsmaf.AudioClip(); c.volume = 1.0; return c })
>>>>>>> 2007f94d1e913bb26f17c671f76df1d9ca9e0b9b
  const poolBack = Array.from({ length: 4 }, () => { const c = new jsmaf.AudioClip(); c.volume = 1.0; return c })
  let idxCur = 0; let idxOk = 0; let idxBack = 0

  function sfxCur () {
    if (typeof CONFIG !== 'undefined' && CONFIG.music === false) return
    try { poolCur[idxCur]!.open(SFX_CUR); idxCur = (idxCur + 1) % poolCur.length } catch (_e) {}
  }
  function sfxOk () {
    if (typeof CONFIG !== 'undefined' && CONFIG.music === false) return
    try { poolOk[idxOk]!.open(SFX_OK); idxOk = (idxOk + 1) % poolOk.length } catch (_e) {}
  }
  function sfxBack () {
    if (typeof CONFIG !== 'undefined' && CONFIG.music === false) return
    try { poolBack[idxBack]!.open(SFX_BCK); idxBack = (idxBack + 1) % poolBack.length } catch (_e) {}
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  jsmaf.root.children.length = 0

<<<<<<< HEAD
  new Style({ name: 'ctitle',  color: 'rgb(255,255,255)',          size: 30 })
  new Style({ name: 'ccount',  color: 'rgba(120,235,255,0.58)',    size: 16 })
  new Style({ name: 'ccolhdr', color: 'rgba(0,200,230,0.48)',      size: 13 })
  new Style({ name: 'cwhite',  color: 'rgb(255,255,255)',          size: 21 })
  new Style({ name: 'cmuted',  color: 'rgba(195,240,255,0.62)',    size: 21 })
  new Style({ name: 'csec',    color: 'rgba(0,200,230,0.70)',      size: 11 })
  new Style({ name: 'cval',    color: 'rgb(0,210,235)',            size: 20 })
  new Style({ name: 'cselval', color: 'rgb(120,245,255)',          size: 20 })
  new Style({ name: 'con',     color: 'rgb(60,225,130)',           size: 20 })
  new Style({ name: 'coff',    color: 'rgba(255,90,100,0.85)',     size: 20 })
  new Style({ name: 'carrow',  color: 'rgba(255,255,255,0.22)',    size: 20 })
  new Style({ name: 'carrsel', color: 'rgb(0,220,240)',            size: 20 })
  new Style({ name: 'chint',   color: 'rgba(160,235,255,0.28)',    size: 14 })
  new Style({ name: 'cscroll', color: 'rgba(0,220,240,0.75)',      size: 16 })
  new Style({ name: 'cback',   color: 'rgba(255,100,110,0.90)',    size: 20 })
  new Style({ name: 'cfooter', color: 'rgba(120,230,255,0.26)',    size: 15 })
=======
  new Style({ name: 'ctitle', color: 'rgb(255,255,255)', size: 30 })
  new Style({ name: 'ccount', color: 'rgba(200,150,255,0.65)', size: 16 })
  new Style({ name: 'ccolhdr', color: 'rgba(190,130,255,0.50)', size: 13 })
  new Style({ name: 'cwhite', color: 'rgb(255,255,255)', size: 22 })
  new Style({ name: 'cmuted', color: 'rgba(220,210,255,0.65)', size: 22 })
  new Style({ name: 'csec', color: 'rgba(190,110,255,0.75)', size: 11 })
  new Style({ name: 'cval', color: 'rgb(200,145,255)', size: 21 })
  new Style({ name: 'cselval', color: 'rgb(230,195,255)', size: 21 })
  new Style({ name: 'con', color: 'rgb(70,230,140)', size: 21 })
  new Style({ name: 'coff', color: 'rgba(255,100,100,0.85)', size: 21 })
  new Style({ name: 'carrow', color: 'rgba(255,255,255,0.25)', size: 21 })
  new Style({ name: 'carrsel', color: 'rgb(200,145,255)', size: 21 })
  new Style({ name: 'chint', color: 'rgba(200,185,255,0.30)', size: 14 })
  new Style({ name: 'cscroll', color: 'rgba(200,150,255,0.75)', size: 16 })
  new Style({ name: 'cback', color: 'rgba(255,110,110,0.90)', size: 20 })
  new Style({ name: 'cfooter', color: 'rgba(210,200,255,0.30)', size: 16 })
>>>>>>> 2007f94d1e913bb26f17c671f76df1d9ca9e0b9b

  // ── Static scene ──────────────────────────────────────────────────────────
  const bg = new Image({ url: DARK, x: 0, y: 0, width: SW, height: SH })
  bg.alpha = 1.0; bg.borderWidth = 0
  jsmaf.root.children.push(bg)

  const topStrip = new Image({ url: CYAN, x: 0, y: 0, width: SW, height: 3 })
  topStrip.alpha = 0.80; topStrip.borderWidth = 0
  jsmaf.root.children.push(topStrip)

  const glBg = new Image({ url: CYAN, x: 0, y: 0, width: 700, height: 450 })
  glBg.alpha = 0.022; glBg.borderWidth = 0
  jsmaf.root.children.push(glBg)

  const hBg = new Image({ url: WHITE, x: 0, y: 0, width: SW, height: HDR })
  hBg.alpha = 0.04; hBg.borderWidth = 0
  jsmaf.root.children.push(hBg)

  const hBar = new Image({ url: CYAN, x: 0, y: 0, width: 4, height: HDR })
  hBar.alpha = 1.0; hBar.borderWidth = 0
  jsmaf.root.children.push(hBar)

  const hDiv = new Image({ url: CYAN, x: 0, y: HDR - 1, width: SW, height: 1 })
  hDiv.alpha = 0.18; hDiv.borderWidth = 0
  jsmaf.root.children.push(hDiv)

  const ttl = new jsmaf.Text()
  ttl.style = 'ctitle'; ttl.text = (lang.config || 'SETTINGS').toUpperCase()
  ttl.x = PAD; ttl.y = 36; ttl.alpha = 1.0
  jsmaf.root.children.push(ttl)

  const sub = new jsmaf.Text()
  sub.style = 'ccount'; sub.text = TOTAL + ' settings'
  sub.x = PAD; sub.y = 90; sub.alpha = 1.0
  jsmaf.root.children.push(sub)

  const hOpt = new jsmaf.Text()
  hOpt.style = 'ccolhdr'; hOpt.text = 'OPTION'
  hOpt.x = PAD + 18; hOpt.y = HDR + 2; hOpt.alpha = 1.0
  jsmaf.root.children.push(hOpt)

  const hVal = new jsmaf.Text()
  hVal.style = 'ccolhdr'; hVal.text = 'VALUE'
  hVal.x = VX; hVal.y = HDR + 2; hVal.alpha = 1.0
  jsmaf.root.children.push(hVal)

  const hHnt = new jsmaf.Text()
  hHnt.style = 'ccolhdr'; hHnt.text = 'DESCRIPTION'
  hHnt.x = HX; hHnt.y = HDR + 2; hHnt.alpha = 1.0
  jsmaf.root.children.push(hHnt)

  const sep1 = new Image({ url: WHITE, x: VX - 12, y: SY, width: 1, height: AVAIL })
  sep1.alpha = 0.10; sep1.borderWidth = 0
  jsmaf.root.children.push(sep1)

  const sep2 = new Image({ url: WHITE, x: HX - 12, y: SY, width: 1, height: AVAIL })
  sep2.alpha = 0.07; sep2.borderWidth = 0
  jsmaf.root.children.push(sep2)

  const navY = SH - FTR - 54
  const backT = new jsmaf.Text()
  backT.style = 'cback'
  backT.text = jsmaf.circleIsAdvanceButton ? lang.xToGoBack : lang.oToGoBack
  backT.x = PAD; backT.y = navY + 10; backT.alpha = 1.0
  jsmaf.root.children.push(backT)

  const fLine = new Image({ url: CYAN, x: 0, y: SH - FTR, width: SW, height: 1 })
  fLine.alpha = 0.18; fLine.borderWidth = 0
  jsmaf.root.children.push(fLine)

  const fBg2 = new Image({ url: WHITE, x: 0, y: SH - FTR + 1, width: SW, height: FTR - 1 })
  fBg2.alpha = 0.05; fBg2.borderWidth = 0
  jsmaf.root.children.push(fBg2)

  const clbl = jsmaf.circleIsAdvanceButton ? 'O' : 'X'
  const blbl = jsmaf.circleIsAdvanceButton ? 'X' : 'O'
  const fTxt = new jsmaf.Text()
  fTxt.style = 'cfooter'
<<<<<<< HEAD
  fTxt.text  = '↑↓  Navigate    ' + clbl + '  Change value    ' + blbl + '  Save & back'
  fTxt.x = SW / 2 - 260; fTxt.y = SH - FTR + 18; fTxt.alpha = 1.0
=======
  fTxt.text = '↑↓  Navigate    ' + clbl + '  Change value    ' + blbl + '  Save & back'
  fTxt.x = SW / 2 - 270; fTxt.y = SH - FTR + 17; fTxt.alpha = 1.0
>>>>>>> 2007f94d1e913bb26f17c671f76df1d9ca9e0b9b
  jsmaf.root.children.push(fTxt)

  // ── PRE-ALLOCATED SLOTS ───────────────────────────────────────────────────
  // FIX: All row elements pre-created. renderRows() only updates properties.
  // This avoids the invisible-text bug from children.length truncation.

  const slotBg:    Image[]      = []
  const slotGlw:   Image[]      = []
  const slotBar:   Image[]      = []
  const slotSecLn: Image[]      = []    // section divider line
  const slotSec:   jsmaf.Text[] = []    // section label
  const slotLbl:   jsmaf.Text[] = []    // option label
  const slotArr:   jsmaf.Text[] = []    // cycle arrow
  const slotVal:   jsmaf.Text[] = []    // value text
  const slotHnt:   jsmaf.Text[] = []    // hint text

  for (let s = 0; s < VIS; s++) {
    const bY = SY + s * (BH + GAP)

    const rowSecLn = new Image({ url: CYAN, x: PAD, y: bY - 4, width: RW, height: 1 })
    rowSecLn.alpha = 0; rowSecLn.borderWidth = 0
    slotSecLn.push(rowSecLn); jsmaf.root.children.push(rowSecLn)

    const rowBg = new Image({ url: WHITE, x: PAD, y: bY, width: RW, height: BH })
    rowBg.alpha = 0; rowBg.borderWidth = 1
    slotBg.push(rowBg); jsmaf.root.children.push(rowBg)

    const rowGlw = new Image({ url: CYAN, x: PAD, y: bY, width: RW, height: BH })
    rowGlw.alpha = 0; rowGlw.borderWidth = 0
    slotGlw.push(rowGlw); jsmaf.root.children.push(rowGlw)

    const rowBar = new Image({ url: CYAN, x: PAD, y: bY, width: 4, height: BH })
    rowBar.alpha = 0; rowBar.borderWidth = 0
    slotBar.push(rowBar); jsmaf.root.children.push(rowBar)

    const rowSec = new jsmaf.Text()
    rowSec.style = 'csec'; rowSec.text = ' '
    rowSec.x = PAD + 12; rowSec.y = bY + 6; rowSec.alpha = 0
    slotSec.push(rowSec); jsmaf.root.children.push(rowSec)

    const rowLbl = new jsmaf.Text()
    rowLbl.style = 'cmuted'; rowLbl.text = ' '
    rowLbl.x = PAD + 12; rowLbl.y = bY + 26; rowLbl.alpha = 0
    slotLbl.push(rowLbl); jsmaf.root.children.push(rowLbl)

    const rowArr = new jsmaf.Text()
    rowArr.style = 'carrow'; rowArr.text = '›'
    rowArr.x = VX - 24; rowArr.y = bY + 26; rowArr.alpha = 0
    slotArr.push(rowArr); jsmaf.root.children.push(rowArr)

    const rowVal = new jsmaf.Text()
    rowVal.style = 'cval'; rowVal.text = ' '
    rowVal.x = VX; rowVal.y = bY + 26; rowVal.alpha = 0
    slotVal.push(rowVal); jsmaf.root.children.push(rowVal)

    const rowHnt = new jsmaf.Text()
    rowHnt.style = 'chint'; rowHnt.text = ' '
    rowHnt.x = HX; rowHnt.y = bY + 28; rowHnt.alpha = 0
    slotHnt.push(rowHnt); jsmaf.root.children.push(rowHnt)
  }

  // Scroll indicators
  const upInd = new jsmaf.Text()
  upInd.style = 'cscroll'; upInd.text = '▲  Scroll up'
  upInd.x = SW / 2 - 70; upInd.y = HDR + 2; upInd.alpha = 0
  jsmaf.root.children.push(upInd)

  const dnInd = new jsmaf.Text()
  dnInd.style = 'cscroll'; dnInd.text = '▼  More below'
  dnInd.x = SW / 2 - 70; dnInd.y = SY + VIS * (BH + GAP) + 4; dnInd.alpha = 0
  jsmaf.root.children.push(dnInd)

  // ── State ─────────────────────────────────────────────────────────────────
  let cur = 0; let scrollOff = 0

  function getVal (idx: number): string {
    const o = opts[idx]!; const k = o.key as keyof Cfg
    if (o.type === 'toggle') return C[k] ? 'ON' : 'OFF'
    if (k === 'jb_behavior') return jbLabels[C.jb_behavior] || jbLabels[0]!
    if (k === 'theme') { const ti = availableThemes.indexOf(C.theme); return themeLabels[ti >= 0 ? ti : 0]! }
    if (k === 'exp_core') return 'Core ' + C.exp_core
    if (k === 'exp_grooms') return '' + C.exp_grooms
    if (k === 'exp_races') return '' + C.exp_races
    if (k === 'exp_timeout') return C.exp_timeout + 's'
    return ''
  }

  function clamp () {
    if (cur < scrollOff) scrollOff = cur
    else if (cur >= scrollOff + VIS) scrollOff = cur - VIS + 1
  }

  // ── Render — updates properties only, never adds/removes children ─────────
  function renderRows () {
    upInd.alpha = scrollOff > 0 ? 1.0 : 0
    dnInd.alpha = (scrollOff + VIS) < TOTAL ? 1.0 : 0

    for (let s = 0; s < VIS; s++) {
      const idx = scrollOff + s
      if (idx >= TOTAL) {
        slotSecLn[s]!.alpha = 0; slotBg[s]!.alpha  = 0; slotGlw[s]!.alpha = 0
        slotBar[s]!.alpha   = 0; slotSec[s]!.alpha  = 0; slotLbl[s]!.alpha = 0
        slotArr[s]!.alpha   = 0; slotVal[s]!.alpha  = 0; slotHnt[s]!.alpha = 0
        continue
      }

<<<<<<< HEAD
      const o      = opts[idx]!
      const sel    = idx === cur
      const val    = getVal(idx)
      const isOn   = o.type === 'toggle' && val === 'ON'
      const isCycle = o.type === 'cycle'
=======
      const o = opts[idx]!
      const sel = idx === cur
      const val = getVal(idx)
      const isOn = o.type === 'toggle' && val === 'ON'
      const isCycle = o.type === 'cycle'
      const bY = SY + s * (BH + GAP)

      // Section divider (shown only when section changes)
>>>>>>> 2007f94d1e913bb26f17c671f76df1d9ca9e0b9b
      const prevSec = idx > 0 ? opts[idx - 1]!.section : ''
      const showSec = o.section !== prevSec

      slotSecLn[s]!.alpha = showSec ? 0.15 : 0

      slotBg[s]!.alpha       = sel ? 0.18 : 0.06
      slotBg[s]!.borderColor = sel ? 'rgba(0,200,230,0.86)' : 'rgba(0,160,180,0.15)'
      slotBg[s]!.borderWidth = sel ? 2 : 1

      slotGlw[s]!.alpha = sel ? 0.045 : 0
      slotBar[s]!.alpha = sel ? 1.0   : 0.36

      if (showSec) {
        slotSec[s]!.text  = '▸ ' + o.section
        slotSec[s]!.alpha = 1.0
        slotLbl[s]!.y     = slotBg[s]!.y + 28
      } else {
        slotSec[s]!.alpha = 0
        slotLbl[s]!.y     = slotBg[s]!.y + 26
      }

<<<<<<< HEAD
      slotLbl[s]!.style = sel ? 'cwhite' : 'cmuted'
      slotLbl[s]!.text  = o.label
      slotLbl[s]!.alpha = 1.0
=======
      // Row background
      const rowBg = new Image({ url: WHITE, x: PAD, y: bY, width: RW, height: BH })
      rowBg.alpha = sel ? 0.20 : 0.07
      rowBg.borderColor = sel ? 'rgba(175,80,255,0.88)' : 'rgba(120,60,200,0.16)'
      rowBg.borderWidth = sel ? 2 : 1
      jsmaf.root.children.push(rowBg)
>>>>>>> 2007f94d1e913bb26f17c671f76df1d9ca9e0b9b

      slotArr[s]!.style = sel ? 'carrsel' : 'carrow'
      slotArr[s]!.alpha = isCycle ? 1.0 : 0

<<<<<<< HEAD
      slotVal[s]!.style = o.type === 'toggle'
        ? (isOn ? 'con' : 'coff')
        : (sel  ? 'cselval' : 'cval')
      slotVal[s]!.text  = val
      slotVal[s]!.alpha = 1.0
=======
      // Selection glow
      if (sel) {
        const glw = new Image({ url: PURPLE, x: PAD, y: bY, width: RW, height: BH })
        glw.alpha = 0.05; glw.borderWidth = 0
        jsmaf.root.children.push(glw)
      }

      // Section label — style BEFORE text
      if (o.section !== prevSec) {
        const secLbl = new jsmaf.Text()
        secLbl.style = 'csec'; secLbl.text = '▸ ' + o.section
        secLbl.x = PAD + 12; secLbl.y = bY + 8; secLbl.alpha = 1.0
        jsmaf.root.children.push(secLbl)
      }

      // Option label
      const lbl = new jsmaf.Text()
      lbl.style = sel ? 'cwhite' : 'cmuted'
      lbl.text = o.label
      lbl.x = PAD + 12; lbl.y = bY + (o.section !== prevSec ? 28 : 26); lbl.alpha = 1.0
      jsmaf.root.children.push(lbl)

      // Cycle arrow
      if (isCycle) {
        const arr = new jsmaf.Text()
        arr.style = sel ? 'carrsel' : 'carrow'
        arr.text = '›'
        arr.x = VX - 24; arr.y = bY + 26; arr.alpha = 1.0
        jsmaf.root.children.push(arr)
      }

      // Value
      const vt = new jsmaf.Text()
      vt.style = o.type === 'toggle'
        ? (isOn ? 'con' : 'coff')
        : (sel ? 'cselval' : 'cval')
      vt.text = val
      vt.x = VX; vt.y = bY + 26; vt.alpha = 1.0
      jsmaf.root.children.push(vt)
>>>>>>> 2007f94d1e913bb26f17c671f76df1d9ca9e0b9b

      slotHnt[s]!.text  = o.hint
      slotHnt[s]!.alpha = 1.0
    }
  }

  // ── Save / Load ───────────────────────────────────────────────────────────
  function saveConfig (done?: () => void) {
    if (!configLoaded) { if (done) done(); return }
    const out = {
      config: {
        autolapse: C.autolapse,
        autopoop: C.autopoop,
        autoclose: C.autoclose,
        autoclose_delay: C.autoclose_delay,
        music: C.music,
        jb_behavior: C.jb_behavior,
        theme: C.theme,
        exploit: {
          core: C.exp_core,
          rtprio: 256,
          grooms: C.exp_grooms,
          races: C.exp_races,
          alias: 100,
          sds: 64,
          workers: 2,
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
          C.autolapse = G.autolapse || false; C.autopoop = G.autopoop || false
          C.autoclose = G.autoclose || false; C.autoclose_delay = G.autoclose_delay || 0
          C.music = G.music !== false; C.jb_behavior = G.jb_behavior || 0
          C.theme = (G.theme && availableThemes.includes(G.theme)) ? G.theme : 'default'
          if (d.payloads && Array.isArray(d.payloads)) userPayloads = d.payloads.slice()
          if (G.exploit) {
            const ex = G.exploit
            if (ex.core !== undefined) C.exp_core = ex.core
            if (ex.grooms !== undefined) C.exp_grooms = ex.grooms
            if (ex.races !== undefined) C.exp_races = ex.races
            if (ex.timeout_s !== undefined) C.exp_timeout = ex.timeout_s
          }
        }
        configLoaded = true; renderRows()
        if (C.music) { if (typeof startBgmIfEnabled === 'function') startBgmIfEnabled() } else { if (typeof stopBgm === 'function') stopBgm() }
      } catch (e) { log('Parse: ' + (e as Error).message); configLoaded = true; renderRows() }
    })
  }

  // ── Cycle / Toggle ────────────────────────────────────────────────────────
  function onPress () {
    const o = opts[cur]; if (!o) return
    const k = o.key as keyof Cfg
    if (o.type === 'cycle') {
      if (k === 'jb_behavior') C.jb_behavior = (C.jb_behavior + 1) % jbLabels.length
      else if (k === 'theme') { const ti = availableThemes.indexOf(C.theme); C.theme = availableThemes[(ti + 1) % availableThemes.length]! } else if (k === 'exp_core') C.exp_core = (C.exp_core + 1) % 6
      else if (k === 'exp_grooms') { const v = [128, 256, 512, 768, 1024, 1280]; const i = v.indexOf(C.exp_grooms); C.exp_grooms = v[(i + 1) % v.length]! } else if (k === 'exp_races') { const v = [50, 75, 100, 150, 200, 300]; const i = v.indexOf(C.exp_races); C.exp_races = v[(i + 1) % v.length]! } else if (k === 'exp_timeout') { const v = [5, 8, 10, 15, 20]; const i = v.indexOf(C.exp_timeout); C.exp_timeout = v[(i + 1) % v.length]! }
    } else {
      if (k === 'autolapse' || k === 'autopoop' || k === 'autoclose' || k === 'music') {
        C[k] = !C[k]
        if (k === 'music') {
          if (typeof CONFIG !== 'undefined') CONFIG.music = C.music
          if (C.music) { if (typeof startBgmIfEnabled === 'function') startBgmIfEnabled() } else { if (typeof stopBgm === 'function') stopBgm() }
        }
        if (k === 'autolapse' && C.autolapse) C.autopoop = false
        if (k === 'autopoop' && C.autopoop) C.autolapse = false
      }
    }
    renderRows(); saveConfig()
  }

  // ── Input ─────────────────────────────────────────────────────────────────
  const confirmKey = jsmaf.circleIsAdvanceButton ? 13 : 14
  const backKey = jsmaf.circleIsAdvanceButton ? 14 : 13

  jsmaf.onKeyDown = function (kc: number) {
    if (kc === 6 || kc === 5) {
      cur = (cur + 1) % TOTAL; sfxCur(); clamp(); renderRows()
    } else if (kc === 4 || kc === 7) {
      cur = (cur - 1 + TOTAL) % TOTAL; sfxCur(); clamp(); renderRows()
    } else if (kc === confirmKey) {
      sfxOk(); onPress()
    } else if (kc === backKey) {
      sfxBack()
      saveConfig(function () {
        try {
          include('themes/' + (typeof CONFIG !== 'undefined' && CONFIG.theme ? CONFIG.theme : 'default') + '/main.js')
        } catch (e) { log('Back error: ' + (e as Error).message) }
      })
    }
  }

  renderRows(); loadConfig()
  log('Config UI loaded — ' + TOTAL + ' options.')
  ;((_a, _b, _c) => {})(libc_addr, GREEN, RED)
})()

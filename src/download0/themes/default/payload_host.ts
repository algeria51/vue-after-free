import { fn, mem, BigInt } from 'download0/types'
import { binloader_init } from 'download0/binloader'
import { libc_addr } from 'download0/userland'
import { lang } from 'download0/languages'
import { checkJailbroken } from 'download0/check-jailbroken'

;(function () {
  if (typeof libc_addr === 'undefined') include('userland.js')
  include('check-jailbroken.js')
  if (typeof startBgmIfEnabled === 'function') startBgmIfEnabled()

  // ── Pixels ────────────────────────────────────────────────────────────────
  const DARK = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGPg4RMDAABaADEUPDZQAAAAAElFTkSuQmCC'
  const WHITE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC'
  const CYAN = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNguPQMAAKOAbnVoJuKAAAAAElFTkSuQmCC'
  const RED = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP47xYAAAPdAZZlZDzjAAAAAElFTkSuQmCC'

  // ── Layout ────────────────────────────────────────────────────────────────
  const SW = 1920; const SH = 1080; const PAD = 80
  const HDR = 160; const FTR = 50
  const BW = SW - PAD * 2; const BH = 88; const GAP = 6
  const AVAIL = SH - HDR - FTR - 24
  const MAXR = Math.min(9, Math.floor(AVAIL / (BH + GAP)))
  const SY = HDR + 12

  const SFX_CUR = 'file:///../download0/sfx/cursor.wav'
  const SFX_OK = 'file:///../download0/sfx/confirm.wav'
  const SFX_BACK = 'file:///../download0/sfx/cancel.wav'

  const poolCur = Array.from({ length: 8 }, () => { const c = new jsmaf.AudioClip(); c.volume = 1.0; return c })
  const poolOk = Array.from({ length: 4 }, () => { const c = new jsmaf.AudioClip(); c.volume = 1.0; return c })
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
    try { poolBack[idxBack]!.open(SFX_BACK); idxBack = (idxBack + 1) % poolBack.length } catch (_e) {}
  }

  is_jailbroken = checkJailbroken()

  // ── Scan payloads ─────────────────────────────────────────────────────────
  try { fn.register(0x05, 'ph_open', ['bigint', 'bigint', 'bigint'], 'bigint') } catch (_e) {}
  try { fn.register(0x06, 'ph_close', ['bigint'], 'bigint') } catch (_e) {}
  try { fn.register(0x110, 'ph_getdnts', ['bigint', 'bigint', 'bigint'], 'bigint') } catch (_e) {}
  try { fn.register(0x03, 'ph_read', ['bigint', 'bigint', 'bigint'], 'bigint') } catch (_e) {}

  type FEntry = { name: string; path: string; ext: string }
  const fileList: FEntry[] = []
  const scanPaths = ['/download0/payloads']
  if (is_jailbroken) scanPaths.push('/data/payloads')

  const paddr = mem.malloc(256); const dbuf = mem.malloc(4096)
  for (const sp of scanPaths) {
    for (let i = 0; i < sp.length; i++) mem.view(paddr).setUint8(i, sp.charCodeAt(i))
    mem.view(paddr).setUint8(sp.length, 0)
    const fd = fn.ph_open(paddr, new BigInt(0, 0), new BigInt(0, 0))
    if (!fd.eq(new BigInt(0xffffffff, 0xffffffff))) {
      const cnt = fn.ph_getdnts(fd, dbuf, new BigInt(0, 4096))
      if (!cnt.eq(new BigInt(0xffffffff, 0xffffffff)) && cnt.lo > 0) {
        let off = 0
        while (off < cnt.lo) {
          const rl = mem.view(dbuf.add(new BigInt(0, off + 4))).getUint16(0, true)
          const dt = mem.view(dbuf.add(new BigInt(0, off + 6))).getUint8(0)
          const nl = mem.view(dbuf.add(new BigInt(0, off + 7))).getUint8(0)
          let name = ''
          for (let i = 0; i < nl; i++) name += String.fromCharCode(mem.view(dbuf.add(new BigInt(0, off + 8 + i))).getUint8(0))
          if (dt === 8 && name !== '.' && name !== '..') {
            const low = name.toLowerCase()
            if (low.endsWith('.elf') || low.endsWith('.bin') || low.endsWith('.js')) { fileList.push({ name, path: sp + '/' + name, ext: (name.split('.').pop() || '').toUpperCase() }) }
          }
          off += rl
        }
      }
      fn.ph_close(fd)
    }
  }
  log('Payloads found: ' + fileList.length)

  const TOTAL = fileList.length

  // ── Styles ────────────────────────────────────────────────────────────────
  jsmaf.root.children.length = 0

  new Style({ name: 'ptitle', color: 'rgb(255,255,255)', size: 30 })
  new Style({ name: 'pcount', color: 'rgba(120,235,255,0.60)', size: 16 })
  new Style({ name: 'pwhite', color: 'rgb(255,255,255)', size: 22 })
  new Style({ name: 'pmuted', color: 'rgba(195,240,255,0.62)', size: 22 })
  new Style({ name: 'pnum', color: 'rgba(0,210,230,0.38)', size: 15 })
  new Style({ name: 'pnumsel', color: 'rgb(0,230,250)', size: 15 })
  new Style({ name: 'pbadge', color: 'rgba(0,200,230,0.75)', size: 12 })
  new Style({ name: 'pbsel', color: 'rgb(0,230,250)', size: 12 })
  new Style({ name: 'ppath', color: 'rgba(160,235,255,0.28)', size: 13 })
  new Style({ name: 'pscroll', color: 'rgba(0,220,240,0.75)', size: 16 })
  new Style({ name: 'pback', color: 'rgba(255,100,110,0.90)', size: 20 })
  new Style({ name: 'pfooter', color: 'rgba(120,230,255,0.26)', size: 15 })
  new Style({ name: 'pempty', color: 'rgba(195,240,255,0.70)', size: 28 })
  new Style({ name: 'pemptsb', color: 'rgba(160,235,255,0.42)', size: 18 })

  // ── Static scene ──────────────────────────────────────────────────────────
  const bg = new Image({ url: DARK, x: 0, y: 0, width: SW, height: SH })
  bg.alpha = 1.0; bg.borderWidth = 0
  jsmaf.root.children.push(bg)

  const topStrip = new Image({ url: CYAN, x: 0, y: 0, width: SW, height: 3 })
  topStrip.alpha = 0.80; topStrip.borderWidth = 0
  jsmaf.root.children.push(topStrip)

  const gl = new Image({ url: CYAN, x: 0, y: 0, width: 700, height: 480 })
  gl.alpha = 0.022; gl.borderWidth = 0
  jsmaf.root.children.push(gl)

  // Header
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
  ttl.style = 'ptitle'; ttl.text = (lang.payloadMenu || 'PAYLOAD MENU').toUpperCase()
  ttl.x = PAD; ttl.y = 36; ttl.alpha = 1.0
  jsmaf.root.children.push(ttl)

  const cntT = new jsmaf.Text()
  cntT.style = 'pcount'
  cntT.text = TOTAL === 0
    ? 'No payloads found'
    : TOTAL + ' file' + (TOTAL !== 1 ? 's' : '') + ' available'
  cntT.x = PAD; cntT.y = 90; cntT.alpha = 1.0
  jsmaf.root.children.push(cntT)

  // Back label
  const navY = SH - FTR - 54
  const backT = new jsmaf.Text()
  backT.style = 'pback'
  backT.text = jsmaf.circleIsAdvanceButton ? lang.xToGoBack : lang.oToGoBack
  backT.x = PAD; backT.y = navY + 10; backT.alpha = 1.0
  jsmaf.root.children.push(backT)

  // Footer
  const fLine = new Image({ url: CYAN, x: 0, y: SH - FTR, width: SW, height: 1 })
  fLine.alpha = 0.18; fLine.borderWidth = 0
  jsmaf.root.children.push(fLine)

  const fBg = new Image({ url: WHITE, x: 0, y: SH - FTR + 1, width: SW, height: FTR - 1 })
  fBg.alpha = 0.05; fBg.borderWidth = 0
  jsmaf.root.children.push(fBg)

  const clbl = jsmaf.circleIsAdvanceButton ? 'O' : 'X'
  const blbl = jsmaf.circleIsAdvanceButton ? 'X' : 'O'
  const fTxt = new jsmaf.Text()
  fTxt.style = 'pfooter'
  fTxt.text = '↑↓  Navigate    ' + clbl + '  Launch    ' + blbl + '  Back'
  fTxt.x = SW / 2 - 200; fTxt.y = SH - FTR + 18; fTxt.alpha = 1.0
  jsmaf.root.children.push(fTxt)

  // ── PRE-ALLOCATED SLOTS ───────────────────────────────────────────────────
  // FIX: All dynamic elements are created ONCE here and stored in arrays.
  // renderRows() only updates their properties (alpha, text, style).
  // This avoids the invisible-text bug caused by children.length truncation.

  const slotBg: Image[] = []
  const slotGlw: Image[] = []
  const slotBar: Image[] = []
  const slotNum: jsmaf.Text[] = []
  const slotLbl: jsmaf.Text[] = []
  const slotPth: jsmaf.Text[] = []
  const slotBdg: jsmaf.Text[] = []

  for (let s = 0; s < MAXR; s++) {
    const bY = SY + s * (BH + GAP)

    const rowBg = new Image({ url: WHITE, x: PAD, y: bY, width: BW, height: BH })
    rowBg.alpha = 0; rowBg.borderWidth = 1
    slotBg.push(rowBg); jsmaf.root.children.push(rowBg)

    const rowGlw = new Image({ url: CYAN, x: PAD, y: bY, width: BW, height: BH })
    rowGlw.alpha = 0; rowGlw.borderWidth = 0
    slotGlw.push(rowGlw); jsmaf.root.children.push(rowGlw)

    const rowBar = new Image({ url: CYAN, x: PAD, y: bY, width: 4, height: BH })
    rowBar.alpha = 0; rowBar.borderWidth = 0
    slotBar.push(rowBar); jsmaf.root.children.push(rowBar)

    // Create Text objects with a space to ensure they're registered by the engine
    const rowNum = new jsmaf.Text()
    rowNum.style = 'pnum'; rowNum.text = ' '
    rowNum.x = PAD + 16; rowNum.y = bY + 32; rowNum.alpha = 0
    slotNum.push(rowNum); jsmaf.root.children.push(rowNum)

    const rowLbl = new jsmaf.Text()
    rowLbl.style = 'pmuted'; rowLbl.text = ' '
    rowLbl.x = PAD + 56; rowLbl.y = bY + 18; rowLbl.alpha = 0
    slotLbl.push(rowLbl); jsmaf.root.children.push(rowLbl)

    const rowPth = new jsmaf.Text()
    rowPth.style = 'ppath'; rowPth.text = ' '
    rowPth.x = PAD + 56; rowPth.y = bY + 56; rowPth.alpha = 0
    slotPth.push(rowPth); jsmaf.root.children.push(rowPth)

    const rowBdg = new jsmaf.Text()
    rowBdg.style = 'pbadge'; rowBdg.text = ' '
    rowBdg.x = PAD + BW - 120; rowBdg.y = bY + 34; rowBdg.alpha = 0
    slotBdg.push(rowBdg); jsmaf.root.children.push(rowBdg)
  }

  // Scroll indicators (pre-allocated, hidden by default)
  const upInd = new jsmaf.Text()
  upInd.style = 'pscroll'; upInd.text = '▲  Scroll up'
  upInd.x = SW / 2 - 70; upInd.y = HDR + 2; upInd.alpha = 0
  jsmaf.root.children.push(upInd)

  const dnInd = new jsmaf.Text()
  dnInd.style = 'pscroll'; dnInd.text = '▼  More below'
  dnInd.x = SW / 2 - 70; dnInd.y = SY + MAXR * (BH + GAP) + 4; dnInd.alpha = 0
  jsmaf.root.children.push(dnInd)

  // Empty state (pre-allocated, hidden by default)
  const emTxt = new jsmaf.Text()
  emTxt.style = 'pempty'; emTxt.text = '◈   No Payloads Found'
  emTxt.x = SW / 2 - 190; emTxt.y = SH / 2 - 70; emTxt.alpha = 0
  jsmaf.root.children.push(emTxt)

  const emSub1 = new jsmaf.Text()
  emSub1.style = 'pemptsb'; emSub1.text = 'Place  .elf  /  .bin  /  .js  files in:'
  emSub1.x = SW / 2 - 225; emSub1.y = SH / 2 + 4; emSub1.alpha = 0
  jsmaf.root.children.push(emSub1)

  const emSub2 = new jsmaf.Text()
  emSub2.style = 'pemptsb'; emSub2.text = '/download0/payloads/'
  emSub2.x = SW / 2 - 128; emSub2.y = SH / 2 + 44; emSub2.alpha = 0
  jsmaf.root.children.push(emSub2)

  const emSub3 = new jsmaf.Text()
  emSub3.style = 'pemptsb'; emSub3.text = '/data/payloads/   (also supported)'
  emSub3.x = SW / 2 - 198; emSub3.y = SH / 2 + 84; emSub3.alpha = 0
  jsmaf.root.children.push(emSub3)

  // ── State ─────────────────────────────────────────────────────────────────
  let cur = 0; let scrollOff = 0

  function clamp () {
    if (cur < scrollOff) scrollOff = cur
    else if (cur >= scrollOff + MAXR) scrollOff = cur - MAXR + 1
  }

  // ── Render — updates properties only, never adds/removes children ─────────
  function renderRows () {
    if (TOTAL === 0) {
      emTxt.alpha = 1.0; emSub1.alpha = 1.0; emSub2.alpha = 1.0
      emSub3.alpha = is_jailbroken ? 1.0 : 0
      upInd.alpha = 0; dnInd.alpha = 0
      for (let s = 0; s < MAXR; s++) {
        slotBg[s]!.alpha = 0; slotGlw[s]!.alpha = 0; slotBar[s]!.alpha = 0
        slotNum[s]!.alpha = 0; slotLbl[s]!.alpha = 0
        slotPth[s]!.alpha = 0; slotBdg[s]!.alpha = 0
      }
      return
    }

    emTxt.alpha = 0; emSub1.alpha = 0; emSub2.alpha = 0; emSub3.alpha = 0
    upInd.alpha = scrollOff > 0 ? 1.0 : 0
    dnInd.alpha = (scrollOff + MAXR) < TOTAL ? 1.0 : 0

    for (let s = 0; s < MAXR; s++) {
      const idx = scrollOff + s
      if (idx >= TOTAL) {
        slotBg[s]!.alpha = 0; slotGlw[s]!.alpha = 0; slotBar[s]!.alpha = 0
        slotNum[s]!.alpha = 0; slotLbl[s]!.alpha = 0
        slotPth[s]!.alpha = 0; slotBdg[s]!.alpha = 0
        continue
      }

      const f = fileList[idx]!
      const sel = idx === cur

      let disp = f.name.replace(/\.(elf|bin|js)$/i, '')
      if (disp.length > 68) disp = disp.slice(0, 66) + '..'
      const hint = f.path.startsWith('/data/') ? '/data/payloads' : '/download0/payloads'

      slotBg[s]!.alpha = sel ? 0.20 : 0.06
      slotBg[s]!.borderColor = sel ? 'rgba(0,200,230,0.90)' : 'rgba(0,160,180,0.18)'
      slotBg[s]!.borderWidth = sel ? 2 : 1

      slotGlw[s]!.alpha = sel ? 0.055 : 0
      slotBar[s]!.alpha = sel ? 1.0 : 0.38

      slotNum[s]!.style = sel ? 'pnumsel' : 'pnum'
      slotNum[s]!.text = String(idx + 1).padStart(2, '0')
      slotNum[s]!.alpha = 1.0

      slotLbl[s]!.style = sel ? 'pwhite' : 'pmuted'
      slotLbl[s]!.text = disp
      slotLbl[s]!.alpha = 1.0

      slotPth[s]!.text = hint
      slotPth[s]!.alpha = 1.0

      slotBdg[s]!.style = sel ? 'pbsel' : 'pbadge'
      slotBdg[s]!.text = f.ext
      slotBdg[s]!.alpha = 1.0
    }
  }

  // ── Launch ────────────────────────────────────────────────────────────────
  function launchPayload () {
    if (TOTAL === 0) return
    const entry = fileList[cur]; if (!entry) return
    log('Launching: ' + entry.name)
    try {
      if (entry.name.toLowerCase().endsWith('.js')) {
        if (entry.path.startsWith('/download0/')) {
          include('payloads/' + entry.name)
        } else {
          const pa = mem.malloc(256)
          for (let i = 0; i < entry.path.length; i++) mem.view(pa).setUint8(i, entry.path.charCodeAt(i))
          mem.view(pa).setUint8(entry.path.length, 0)
          const fd = fn.ph_open(pa, new BigInt(0, 0), new BigInt(0, 0))
          if (!fd.eq(new BigInt(0xffffffff, 0xffffffff))) {
            const b = mem.malloc(0x100000)
            const rlen = fn.ph_read(fd, b, new BigInt(0, 0x100000)); fn.ph_close(fd)
            let code = ''; const len = (rlen instanceof BigInt) ? rlen.lo : rlen
            for (let i = 0; i < len; i++) code += String.fromCharCode(mem.view(b).getUint8(i))
            jsmaf.eval(code)
          }
        }
      } else {
        include('binloader.js')
        const { bl_load_from_file } = binloader_init()
        bl_load_from_file(entry.path)
      }
    } catch (e) { log('Launch error: ' + (e as Error).message) }
  }

  // ── Input ─────────────────────────────────────────────────────────────────
  const confirmKey = jsmaf.circleIsAdvanceButton ? 13 : 14
  const backKey = jsmaf.circleIsAdvanceButton ? 14 : 13

  jsmaf.onKeyDown = function (kc: number) {
    if (kc === 6 || kc === 5) {
      if (TOTAL > 0) { cur = (cur + 1) % TOTAL; sfxCur(); clamp(); renderRows() }
    } else if (kc === 4 || kc === 7) {
      if (TOTAL > 0) { cur = (cur - 1 + TOTAL) % TOTAL; sfxCur(); clamp(); renderRows() }
    } else if (kc === confirmKey) {
      sfxOk(); launchPayload()
    } else if (kc === backKey) {
      sfxBack()
      try {
        include('themes/' + (typeof CONFIG !== 'undefined' && CONFIG.theme ? CONFIG.theme : 'default') + '/main.js')
      } catch (e) { log('Back error: ' + (e as Error).message) }
    }
  }

  renderRows()
  log('Payload host loaded — ' + TOTAL + ' files | ' + MAXR + ' visible rows.')
  ;((_a) => {})(RED)
})()

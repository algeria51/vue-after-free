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
  const DARK = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNg4xACAAA4ACGcHPdwAAAAAElFTkSuQmCC'
  const WHITE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC'
  const CYAN = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGMIOPEfAAODAhiMwlb1AAAAAElFTkSuQmCC'
  const RED = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4HxAAAAPxAaAHMjeOAAAAAElFTkSuQmCC'

  // ── Layout ────────────────────────────────────────────────────────────────
  const SW = 1920; const SH = 1080; const PAD = 80
  const HDR = 150; const FTR = 50
  const BW = SW - PAD * 2; const BH = 84; const GAP = 10
  const AVAIL = SH - HDR - FTR - 24
  const MAXR = Math.min(9, Math.floor(AVAIL / (BH + GAP)))
  const SY = HDR + 12

  const SFX_CUR = 'file:///../download0/sfx/cursor.wav'
  const SFX_OK = 'file:///../download0/sfx/confirm.wav'
  const SFX_BACK = 'file:///../download0/sfx/cancel.wav'

  // ── FIX: Pre-created audio pools ──────────────────────────────────────────
  const poolCur = [new jsmaf.AudioClip(), new jsmaf.AudioClip(), new jsmaf.AudioClip()]
  const poolOk = [new jsmaf.AudioClip(), new jsmaf.AudioClip()]
  const poolBack = [new jsmaf.AudioClip(), new jsmaf.AudioClip()]
  poolCur.forEach(c => { c.volume = 1.0 })
  poolOk.forEach(c => { c.volume = 1.0 })
  poolBack.forEach(c => { c.volume = 1.0 })
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

  // ── Styles (simple names, no underscores) ─────────────────────────────────
  jsmaf.root.children.length = 0

  new Style({ name: 'ptitle', color: 'rgb(255,255,255)', size: 30 })
  new Style({ name: 'pcount', color: 'rgba(100,210,255,0.60)', size: 16 })
  new Style({ name: 'pwhite', color: 'rgb(255,255,255)', size: 22 })
  new Style({ name: 'pmuted', color: 'rgba(220,235,255,0.60)', size: 22 })
  new Style({ name: 'pnum', color: 'rgba(80,200,255,0.40)', size: 15 })
  new Style({ name: 'pnumsel', color: 'rgb(80,215,255)', size: 15 })
  new Style({ name: 'pbadge', color: 'rgba(80,210,255,0.75)', size: 13 })
  new Style({ name: 'pbsel', color: 'rgb(80,230,255)', size: 13 })
  new Style({ name: 'ppath', color: 'rgba(180,210,255,0.25)', size: 13 })
  new Style({ name: 'pscroll', color: 'rgba(100,210,255,0.70)', size: 16 })
  new Style({ name: 'pback', color: 'rgba(255,110,110,0.90)', size: 20 })
  new Style({ name: 'pfooter', color: 'rgba(200,220,255,0.28)', size: 16 })
  new Style({ name: 'pempty', color: 'rgba(220,235,255,0.60)', size: 28 })
  new Style({ name: 'pemptsb', color: 'rgba(180,210,255,0.35)', size: 18 })

  // ── Background ────────────────────────────────────────────────────────────
  const bg = new Image({ url: DARK, x: 0, y: 0, width: SW, height: SH })
  bg.alpha = 1.0; bg.borderWidth = 0
  jsmaf.root.children.push(bg)

  const gl = new Image({ url: CYAN, x: 0, y: 0, width: 700, height: 450 })
  gl.alpha = 0.04; gl.borderWidth = 0
  jsmaf.root.children.push(gl)

  // ── Header ────────────────────────────────────────────────────────────────
  const hBg = new Image({ url: WHITE, x: 0, y: 0, width: SW, height: HDR })
  hBg.alpha = 0.05; hBg.borderWidth = 0
  jsmaf.root.children.push(hBg)

  const hBar = new Image({ url: CYAN, x: 0, y: 0, width: 5, height: HDR })
  hBar.alpha = 1.0; hBar.borderWidth = 0
  jsmaf.root.children.push(hBar)

  const hDiv = new Image({ url: CYAN, x: 0, y: HDR - 1, width: SW, height: 1 })
  hDiv.alpha = 0.25; hDiv.borderWidth = 0
  jsmaf.root.children.push(hDiv)

  const ttl = new jsmaf.Text()
  ttl.text = (lang.payloadMenu || 'PAYLOAD MENU').toUpperCase()
  ttl.x = PAD; ttl.y = 38; ttl.style = 'ptitle'; ttl.alpha = 1.0
  jsmaf.root.children.push(ttl)

  const cntT = new jsmaf.Text()
  cntT.text = fileList.length === 0
    ? 'No payloads found'
    : fileList.length + ' file' + (fileList.length !== 1 ? 's' : '') + ' available'
  cntT.x = PAD; cntT.y = 92; cntT.style = 'pcount'; cntT.alpha = 1.0
  jsmaf.root.children.push(cntT)

  // ── Row slots ─────────────────────────────────────────────────────────────
  // Each slot: Image (bg) + Image (left bar) + Text elements
  // FIX: jsmaf.Text has NO .visible property — we use Image.visible for bg/bar
  //      and clear text content to '' for invisible rows.
  // FIX: Always set .alpha = 1.0 on every Text element so it renders.
  const sBtns: Image[] = []
  const sBars: Image[] = []
  const sNums: jsmaf.Text[] = []
  const sBdgs: jsmaf.Text[] = []
  const sLbls: jsmaf.Text[] = []
  const sPths: jsmaf.Text[] = []

  for (let s = 0; s < MAXR; s++) {
    const bY = SY + s * (BH + GAP)

    const btn = new Image({ url: WHITE, x: PAD, y: bY, width: BW, height: BH })
    btn.alpha = 0.07; btn.borderColor = 'rgba(80,180,255,0.14)'; btn.borderWidth = 1
    sBtns.push(btn); jsmaf.root.children.push(btn)

    const bar = new Image({ url: CYAN, x: PAD, y: bY, width: 4, height: BH })
    bar.alpha = 0.45; bar.borderWidth = 0
    sBars.push(bar); jsmaf.root.children.push(bar)

    // NOTE: always set alpha = 1.0 on every Text or it may default to 0 (invisible)
    const num = new jsmaf.Text()
    num.text = ''; num.x = PAD + 14; num.y = bY + 36; num.style = 'pnum'; num.alpha = 1.0
    sNums.push(num); jsmaf.root.children.push(num)

    const bdg = new jsmaf.Text()
    bdg.text = ''; bdg.x = PAD + 52; bdg.y = bY + 14; bdg.style = 'pbadge'; bdg.alpha = 1.0
    sBdgs.push(bdg); jsmaf.root.children.push(bdg)

    const lbl = new jsmaf.Text()
    lbl.text = ''; lbl.x = PAD + 52; lbl.y = bY + 36; lbl.style = 'pmuted'; lbl.alpha = 1.0
    sLbls.push(lbl); jsmaf.root.children.push(lbl)

    const pth = new jsmaf.Text()
    pth.text = ''; pth.x = PAD + 52; pth.y = bY + 62; pth.style = 'ppath'; pth.alpha = 1.0
    sPths.push(pth); jsmaf.root.children.push(pth)
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  // Pushed AFTER slots so it renders on top of any hidden slot backgrounds
  if (fileList.length === 0) {
    const em = new jsmaf.Text()
    em.text = '◈   No Payloads Found'
    em.x = SW / 2 - 185; em.y = SH / 2 - 60; em.style = 'pempty'; em.alpha = 1.0
    jsmaf.root.children.push(em)

    const eh1 = new jsmaf.Text()
    eh1.text = 'Place  .elf  /  .bin  /  .js  files in:'
    eh1.x = SW / 2 - 220; eh1.y = SH / 2 + 10; eh1.style = 'pemptsb'; eh1.alpha = 1.0
    jsmaf.root.children.push(eh1)

    const eh2 = new jsmaf.Text()
    eh2.text = '/download0/payloads/'
    eh2.x = SW / 2 - 125; eh2.y = SH / 2 + 50; eh2.style = 'pemptsb'; eh2.alpha = 1.0
    jsmaf.root.children.push(eh2)

    if (is_jailbroken) {
      const eh3 = new jsmaf.Text()
      eh3.text = '/data/payloads/   (also supported)'
      eh3.x = SW / 2 - 195; eh3.y = SH / 2 + 90; eh3.style = 'pemptsb'; eh3.alpha = 1.0
      jsmaf.root.children.push(eh3)
    }
  }

  // ── Scroll hints ──────────────────────────────────────────────────────────
  const navY = SH - FTR - 56

  // Using text trick: set text='' to hide, set content to show
  const arrUp = new jsmaf.Text()
  arrUp.text = ''; arrUp.x = SW / 2 - 70; arrUp.y = navY - 6
  arrUp.style = 'pscroll'; arrUp.alpha = 1.0
  jsmaf.root.children.push(arrUp)

  const arrDn = new jsmaf.Text()
  arrDn.text = ''; arrDn.x = SW / 2 - 70; arrDn.y = navY + 24
  arrDn.style = 'pscroll'; arrDn.alpha = 1.0
  jsmaf.root.children.push(arrDn)

  const backT = new jsmaf.Text()
  backT.text = jsmaf.circleIsAdvanceButton ? lang.xToGoBack : lang.oToGoBack
  backT.x = PAD; backT.y = navY + 10; backT.style = 'pback'; backT.alpha = 1.0
  jsmaf.root.children.push(backT)

  // ── Footer ────────────────────────────────────────────────────────────────
  const fLine = new Image({ url: CYAN, x: 0, y: SH - FTR, width: SW, height: 1 })
  fLine.alpha = 0.18; fLine.borderWidth = 0
  jsmaf.root.children.push(fLine)

  const fBg = new Image({ url: WHITE, x: 0, y: SH - FTR + 1, width: SW, height: FTR - 1 })
  fBg.alpha = 0.07; fBg.borderWidth = 0
  jsmaf.root.children.push(fBg)

  const clbl = jsmaf.circleIsAdvanceButton ? 'O' : 'X'
  const blbl = jsmaf.circleIsAdvanceButton ? 'X' : 'O'
  const fTxt = new jsmaf.Text()
  fTxt.text = '↑↓  Navigate    ' + clbl + '  Launch    ' + blbl + '  Back'
  fTxt.x = SW / 2 - 210; fTxt.y = SH - FTR + 17; fTxt.style = 'pfooter'; fTxt.alpha = 1.0
  jsmaf.root.children.push(fTxt)

  // ── State ─────────────────────────────────────────────────────────────────
  let cur = 0; let scrollOff = 0
  const TOTAL = fileList.length

  function clamp () {
    if (cur < scrollOff) scrollOff = cur
    else if (cur >= scrollOff + MAXR) scrollOff = cur - MAXR + 1
  }

  function renderRows () {
    for (let s = 0; s < MAXR; s++) {
      const idx = scrollOff + s
      const vis = idx < TOTAL

      // Image supports .visible
      sBtns[s]!.visible = vis
      sBars[s]!.visible = vis

      // Text does NOT support .visible — clear content when off-screen
      if (!vis) {
        sNums[s]!.text = ''; sBdgs[s]!.text = ''
        sLbls[s]!.text = ''; sPths[s]!.text = ''
        continue
      }

      const f = fileList[idx]!
      const sel = idx === cur
      let disp = f.name.replace(/\.(elf|bin|js)$/i, '')
      if (disp.length > 62) disp = disp.slice(0, 60) + '..'
      const hint = f.path.startsWith('/data/') ? '/data/payloads' : '/download0/payloads'

      sBtns[s]!.alpha = sel ? 0.22 : 0.07
      sBtns[s]!.borderColor = sel ? 'rgba(80,215,255,0.90)' : 'rgba(80,180,255,0.14)'
      sBtns[s]!.borderWidth = sel ? 2 : 1
      sBars[s]!.alpha = sel ? 1.0 : 0.45

      sNums[s]!.text = String(idx + 1).padStart(2, '0')
      sNums[s]!.style = sel ? 'pnumsel' : 'pnum'
      sBdgs[s]!.text = f.ext
      sBdgs[s]!.style = sel ? 'pbsel' : 'pbadge'
      sLbls[s]!.text = disp
      sLbls[s]!.style = sel ? 'pwhite' : 'pmuted'
      sPths[s]!.text = hint

      // Ensure alpha=1 each render pass to be safe
      sNums[s]!.alpha = 1.0; sBdgs[s]!.alpha = 1.0
      sLbls[s]!.alpha = 1.0; sPths[s]!.alpha = 1.0
    }
    arrUp.text = scrollOff > 0 ? '▲  Scroll up' : ''
    arrDn.text = TOTAL > 0 && (scrollOff + MAXR) < TOTAL ? '▼  More below' : ''
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

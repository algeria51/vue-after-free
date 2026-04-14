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
  const PURPLE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNY7/YfAAOcAfXVA39DAAAAAElFTkSuQmCC'
  const RED = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4HxAAAAPxAaAHMjeOAAAAAElFTkSuQmCC'

  // ── Layout ────────────────────────────────────────────────────────────────
  const SW = 1920; const SH = 1080; const PAD = 80
  const HDR = 150; const FTR = 50
  const BW = SW - PAD * 2; const BH = 90; const GAP = 8
  const AVAIL = SH - HDR - FTR - 24
  const MAXR = Math.min(9, Math.floor(AVAIL / (BH + GAP)))
  const SY = HDR + 12

  const SFX_CUR = 'file:///../download0/sfx/cursor.wav'
  const SFX_OK = 'file:///../download0/sfx/confirm.wav'
  const SFX_BACK = 'file:///../download0/sfx/cancel.wav'

  // ── Audio pools — large pools prevent drop-outs on rapid navigation ───────
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

  // ── Styles ────────────────────────────────────────────────────────────────
  jsmaf.root.children.length = 0

  new Style({ name: 'ptitle', color: 'rgb(255,255,255)', size: 30 })
  new Style({ name: 'pcount', color: 'rgba(200,150,255,0.70)', size: 16 })
  new Style({ name: 'pwhite', color: 'rgb(255,255,255)', size: 22 })
  new Style({ name: 'pmuted', color: 'rgba(220,210,255,0.65)', size: 22 })
  new Style({ name: 'pnum', color: 'rgba(175,80,255,0.45)', size: 15 })
  new Style({ name: 'pnumsel', color: 'rgb(215,170,255)', size: 15 })
  new Style({ name: 'pbadge', color: 'rgba(175,80,255,0.80)', size: 12 })
  new Style({ name: 'pbsel', color: 'rgb(215,175,255)', size: 12 })
  new Style({ name: 'ppath', color: 'rgba(200,180,255,0.32)', size: 13 })
  new Style({ name: 'pscroll', color: 'rgba(200,150,255,0.80)', size: 16 })
  new Style({ name: 'pback', color: 'rgba(255,110,110,0.90)', size: 20 })
  new Style({ name: 'pfooter', color: 'rgba(210,200,255,0.30)', size: 16 })
  new Style({ name: 'pempty', color: 'rgba(220,210,255,0.70)', size: 28 })
  new Style({ name: 'pemptsb', color: 'rgba(200,180,255,0.42)', size: 18 })

  // ── Static scene elements ─────────────────────────────────────────────────
  // All elements pushed here persist across renderRows() calls.

  const bg = new Image({ url: DARK, x: 0, y: 0, width: SW, height: SH })
  bg.alpha = 1.0; bg.borderWidth = 0
  jsmaf.root.children.push(bg)

  const gl = new Image({ url: PURPLE, x: 0, y: 0, width: 750, height: 480 })
  gl.alpha = 0.04; gl.borderWidth = 0
  jsmaf.root.children.push(gl)

  // Header
  const hBg = new Image({ url: WHITE, x: 0, y: 0, width: SW, height: HDR })
  hBg.alpha = 0.05; hBg.borderWidth = 0
  jsmaf.root.children.push(hBg)

  const hBar = new Image({ url: PURPLE, x: 0, y: 0, width: 5, height: HDR })
  hBar.alpha = 1.0; hBar.borderWidth = 0
  jsmaf.root.children.push(hBar)

  const hDiv = new Image({ url: PURPLE, x: 0, y: HDR - 1, width: SW, height: 1 })
  hDiv.alpha = 0.30; hDiv.borderWidth = 0
  jsmaf.root.children.push(hDiv)

  // Header title — style set BEFORE text to guarantee rendering
  const ttl = new jsmaf.Text()
  ttl.style = 'ptitle'; ttl.text = (lang.payloadMenu || 'PAYLOAD MENU').toUpperCase()
  ttl.x = PAD; ttl.y = 38; ttl.alpha = 1.0
  jsmaf.root.children.push(ttl)

  const TOTAL = fileList.length
  const cntT = new jsmaf.Text()
  cntT.style = 'pcount'
  cntT.text = TOTAL === 0
    ? 'No payloads found'
    : TOTAL + ' file' + (TOTAL !== 1 ? 's' : '') + ' available'
  cntT.x = PAD; cntT.y = 90; cntT.alpha = 1.0
  jsmaf.root.children.push(cntT)

  // Navigation bar (always visible at bottom of list area)
  const navY = SH - FTR - 58

  const backT = new jsmaf.Text()
  backT.style = 'pback'
  backT.text = jsmaf.circleIsAdvanceButton ? lang.xToGoBack : lang.oToGoBack
  backT.x = PAD; backT.y = navY + 10; backT.alpha = 1.0
  jsmaf.root.children.push(backT)

  // Footer
  const fLine = new Image({ url: PURPLE, x: 0, y: SH - FTR, width: SW, height: 1 })
  fLine.alpha = 0.22; fLine.borderWidth = 0
  jsmaf.root.children.push(fLine)

  const fBg = new Image({ url: WHITE, x: 0, y: SH - FTR + 1, width: SW, height: FTR - 1 })
  fBg.alpha = 0.06; fBg.borderWidth = 0
  jsmaf.root.children.push(fBg)

  const clbl = jsmaf.circleIsAdvanceButton ? 'O' : 'X'
  const blbl = jsmaf.circleIsAdvanceButton ? 'X' : 'O'
  const fTxt = new jsmaf.Text()
  fTxt.style = 'pfooter'
  fTxt.text = '↑↓  Navigate    ' + clbl + '  Launch    ' + blbl + '  Back'
  fTxt.x = SW / 2 - 210; fTxt.y = SH - FTR + 17; fTxt.alpha = 1.0
  jsmaf.root.children.push(fTxt)

  // ── STATIC_IDX: children up to here are always kept ──────────────────────
  // renderRows() will truncate back to this index and re-push slot elements.
  // This "full redraw" approach guarantees Text elements are created with
  // content already set before push, which fixes the invisible-text bug.
  const STATIC_IDX = jsmaf.root.children.length

  // ── State ─────────────────────────────────────────────────────────────────
  let cur = 0; let scrollOff = 0

  function clamp () {
    if (cur < scrollOff) scrollOff = cur
    else if (cur >= scrollOff + MAXR) scrollOff = cur - MAXR + 1
  }

  // ── Full redraw — dynamic elements are rebuilt on every navigation ─────────
  function renderRows () {
    // Remove all dynamic elements, keep static ones
    jsmaf.root.children.length = STATIC_IDX

    // Empty state
    if (TOTAL === 0) {
      const em = new jsmaf.Text()
      em.style = 'pempty'; em.text = '◈   No Payloads Found'
      em.x = SW / 2 - 190; em.y = SH / 2 - 70; em.alpha = 1.0
      jsmaf.root.children.push(em)

      const eh1 = new jsmaf.Text()
      eh1.style = 'pemptsb'; eh1.text = 'Place  .elf  /  .bin  /  .js  files in:'
      eh1.x = SW / 2 - 225; eh1.y = SH / 2 + 4; eh1.alpha = 1.0
      jsmaf.root.children.push(eh1)

      const eh2 = new jsmaf.Text()
      eh2.style = 'pemptsb'; eh2.text = '/download0/payloads/'
      eh2.x = SW / 2 - 128; eh2.y = SH / 2 + 44; eh2.alpha = 1.0
      jsmaf.root.children.push(eh2)

      if (is_jailbroken) {
        const eh3 = new jsmaf.Text()
        eh3.style = 'pemptsb'; eh3.text = '/data/payloads/   (also supported)'
        eh3.x = SW / 2 - 198; eh3.y = SH / 2 + 84; eh3.alpha = 1.0
        jsmaf.root.children.push(eh3)
      }
      return
    }

    // Scroll up indicator
    if (scrollOff > 0) {
      const up = new jsmaf.Text()
      up.style = 'pscroll'; up.text = '▲  Scroll up'
      up.x = SW / 2 - 70; up.y = HDR + 2; up.alpha = 1.0
      jsmaf.root.children.push(up)
    }

    // Visible rows — created fresh with real data, then pushed
    for (let s = 0; s < MAXR; s++) {
      const idx = scrollOff + s
      if (idx >= TOTAL) break

      const f = fileList[idx]!
      const sel = idx === cur
      const bY = SY + s * (BH + GAP)

      let disp = f.name.replace(/\.(elf|bin|js)$/i, '')
      if (disp.length > 68) disp = disp.slice(0, 66) + '..'
      const hint = f.path.startsWith('/data/') ? '/data/payloads' : '/download0/payloads'

      // Row background — Image supports .visible and all properties
      const btn = new Image({ url: WHITE, x: PAD, y: bY, width: BW, height: BH })
      btn.alpha = sel ? 0.22 : 0.07
      btn.borderColor = sel ? 'rgba(175,80,255,0.92)' : 'rgba(120,60,200,0.20)'
      btn.borderWidth = sel ? 2 : 1
      jsmaf.root.children.push(btn)

      // Left accent bar
      const bar = new Image({ url: PURPLE, x: PAD, y: bY, width: 5, height: BH })
      bar.alpha = sel ? 1.0 : 0.45
      jsmaf.root.children.push(bar)

      // Selection glow overlay
      if (sel) {
        const glw = new Image({ url: PURPLE, x: PAD, y: bY, width: BW, height: BH })
        glw.alpha = 0.06; glw.borderWidth = 0
        jsmaf.root.children.push(glw)
      }

      // Row number — style set BEFORE text
      const num = new jsmaf.Text()
      num.style = sel ? 'pnumsel' : 'pnum'
      num.text = String(idx + 1).padStart(2, '0')
      num.x = PAD + 16; num.y = bY + 34; num.alpha = 1.0
      jsmaf.root.children.push(num)

      // File name — primary content
      const lbl = new jsmaf.Text()
      lbl.style = sel ? 'pwhite' : 'pmuted'
      lbl.text = disp
      lbl.x = PAD + 56; lbl.y = bY + 20; lbl.alpha = 1.0
      jsmaf.root.children.push(lbl)

      // Path — secondary info
      const pth = new jsmaf.Text()
      pth.style = 'ppath'
      pth.text = hint
      pth.x = PAD + 56; pth.y = bY + 58; pth.alpha = 1.0
      jsmaf.root.children.push(pth)

      // Extension badge — right-aligned
      const bdgX = PAD + BW - 120
      const bdg = new jsmaf.Text()
      bdg.style = sel ? 'pbsel' : 'pbadge'
      bdg.text = f.ext
      bdg.x = bdgX; bdg.y = bY + 36; bdg.alpha = 1.0
      jsmaf.root.children.push(bdg)
    }

    // Scroll down indicator
    if ((scrollOff + MAXR) < TOTAL) {
      const dn = new jsmaf.Text()
      dn.style = 'pscroll'; dn.text = '▼  More below'
      dn.x = SW / 2 - 70; dn.y = SY + MAXR * (BH + GAP) + 4; dn.alpha = 1.0
      jsmaf.root.children.push(dn)
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

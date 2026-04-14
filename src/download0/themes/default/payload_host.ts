import { fn, mem, BigInt } from 'download0/types'
import { binloader_init } from 'download0/binloader'
import { libc_addr } from 'download0/userland'
import { lang } from 'download0/languages'
import { checkJailbroken } from 'download0/check-jailbroken'

;(function () {
  if (typeof libc_addr === 'undefined') include('userland.js')
  include('check-jailbroken.js')
  if (typeof startBgmIfEnabled === 'function') startBgmIfEnabled()

  // ── Inline pixels ─────────────────────────────────────────────────────────
  const DARK_PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNg4xACAAA4ACGcHPdwAAAAAElFTkSuQmCC'
  const WHITE_PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC'
  const CYAN_PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGMIOPEfAAODAhiMwlb1AAAAAElFTkSuQmCC'
  const RED_PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4HxAAAAPxAaAHMjeOAAAAAElFTkSuQmCC'

  // ── Layout constants ──────────────────────────────────────────────────────
  const SW = 1920
  const SH = 1080
  const PAD_X = 80
  const HEADER_H = 138
  const FOOTER_H = 46
  const AVAIL_H = SH - HEADER_H - FOOTER_H - 24
  const BTN_W = SW - PAD_X * 2
  const BTN_H = 82
  const BTN_GAP = 8
  const MAX_ROWS = Math.min(9, Math.floor(AVAIL_H / (BTN_H + BTN_GAP)))
  const START_Y = HEADER_H + 12

  const SFX_CUR = 'file:///../download0/sfx/cursor.wav'
  const SFX_OK = 'file:///../download0/sfx/confirm.wav'
  const SFX_BACK = 'file:///../download0/sfx/cancel.wav'

  // ── FIX: Audio pool — prevents GC from destroying clips mid-play ──────────
  const _sfxPool: jsmaf.AudioClip[] = []
  function sfx (url: string) {
    if (typeof CONFIG !== 'undefined' && CONFIG.music === false) return
    try {
      const c = new jsmaf.AudioClip()
      _sfxPool.push(c)
      if (_sfxPool.length > 8) _sfxPool.splice(0, _sfxPool.length - 8)
      c.volume = 1.0
      c.open(url)
    } catch (_e) {}
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

  const paddr = mem.malloc(256)
  const dbuf = mem.malloc(4096)

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
          for (let i = 0; i < nl; i++) { name += String.fromCharCode(mem.view(dbuf.add(new BigInt(0, off + 8 + i))).getUint8(0)) }
          if (dt === 8 && name !== '.' && name !== '..') {
            const low = name.toLowerCase()
            if (low.endsWith('.elf') || low.endsWith('.bin') || low.endsWith('.js')) {
              fileList.push({ name, path: sp + '/' + name, ext: (name.split('.').pop() || '').toUpperCase() })
            }
          }
          off += rl
        }
      }
      fn.ph_close(fd)
    }
  }
  log('Payloads found: ' + fileList.length)

  // ── Styles — 'ph_' prefix prevents collision with other screens ───────────
  jsmaf.root.children.length = 0

  new Style({ name: 'ph_title', color: 'rgb(255,255,255)', size: 30 })
  new Style({ name: 'ph_count', color: 'rgba(120,210,255,0.55)', size: 16 })
  new Style({ name: 'ph_white', color: 'rgb(255,255,255)', size: 21 })
  new Style({ name: 'ph_muted', color: 'rgba(255,255,255,0.55)', size: 21 })
  new Style({ name: 'ph_lnum', color: 'rgba(120,200,255,0.35)', size: 14 })
  new Style({ name: 'ph_lnumsel', color: 'rgba(80,210,255,0.95)', size: 14 })
  new Style({ name: 'ph_badge', color: 'rgba(80,210,255,0.80)', size: 13 })
  new Style({ name: 'ph_bsel', color: 'rgb(80,230,255)', size: 13 })
  new Style({ name: 'ph_path', color: 'rgba(255,255,255,0.22)', size: 14 })
  new Style({ name: 'ph_scroll', color: 'rgba(120,200,255,0.65)', size: 16 })
  new Style({ name: 'ph_back', color: 'rgba(255,120,120,0.85)', size: 20 })
  new Style({ name: 'ph_footer', color: 'rgba(255,255,255,0.30)', size: 16 })
  new Style({ name: 'ph_empty', color: 'rgba(255,255,255,0.55)', size: 26 })
  new Style({ name: 'ph_emptysb', color: 'rgba(255,255,255,0.28)', size: 17 })

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
  ttl.text = (lang.payloadMenu || 'PAYLOAD MENU').toUpperCase()
  ttl.x = PAD_X; ttl.y = 36; ttl.style = 'ph_title'
  jsmaf.root.children.push(ttl)

  const cntTxt = new jsmaf.Text()
  cntTxt.text = fileList.length === 0
    ? (lang.noPayloads || 'No payloads found')
    : fileList.length + ' file' + (fileList.length !== 1 ? 's' : '') + ' available'
  cntTxt.x = PAD_X; cntTxt.y = 90; cntTxt.style = 'ph_count'
  jsmaf.root.children.push(cntTxt)

  // ── Slot widgets (single-column, full-width) ───────────────────────────────
  // Created first so empty-state text renders on top
  const slotBtns: Image[] = []
  const slotBars: Image[] = []
  const slotNums: jsmaf.Text[] = []
  const slotBadges: jsmaf.Text[] = []
  const slotLabels: jsmaf.Text[] = []
  const slotPaths: jsmaf.Text[] = []

  for (let s = 0; s < MAX_ROWS; s++) {
    const bY = START_Y + s * (BTN_H + BTN_GAP)

    const btn = new Image({ url: WHITE_PX, x: PAD_X, y: bY, width: BTN_W, height: BTN_H })
    btn.alpha = 0.07; btn.borderColor = 'rgba(120,200,255,0.18)'; btn.borderWidth = 1
    slotBtns.push(btn); jsmaf.root.children.push(btn)

    const bar = new Image({ url: CYAN_PX, x: PAD_X, y: bY, width: 4, height: BTN_H })
    bar.alpha = 0.50; bar.borderWidth = 0
    slotBars.push(bar); jsmaf.root.children.push(bar)

    // FIX: init text to '' so ghost '--' doesn't appear when TOTAL=0
    // (jsmaf.Text does not support .visible — only Image does)
    const num = new jsmaf.Text()
    num.text = ''; num.x = PAD_X + 14; num.y = bY + 34; num.style = 'ph_lnum'
    slotNums.push(num); jsmaf.root.children.push(num)

    const bdg = new jsmaf.Text()
    bdg.text = ''; bdg.x = PAD_X + 52; bdg.y = bY + 14; bdg.style = 'ph_badge'
    slotBadges.push(bdg); jsmaf.root.children.push(bdg)

    const lbl = new jsmaf.Text()
    lbl.text = ''; lbl.x = PAD_X + 52; lbl.y = bY + 36; lbl.style = 'ph_muted'
    slotLabels.push(lbl); jsmaf.root.children.push(lbl)

    const pth = new jsmaf.Text()
    pth.text = ''; pth.x = PAD_X + 52; pth.y = bY + 60; pth.style = 'ph_path'
    slotPaths.push(pth); jsmaf.root.children.push(pth)
  }

  // ── Empty state — pushed AFTER slots so it renders on top ─────────────────
  if (fileList.length === 0) {
    const em = new jsmaf.Text()
    em.text = 'No Payloads Found'
    em.x = SW / 2 - 140; em.y = SH / 2 - 60; em.style = 'ph_empty'
    jsmaf.root.children.push(em)

    const eh1 = new jsmaf.Text()
    eh1.text = 'Place  .elf  /  .bin  /  .js  files in:'
    eh1.x = SW / 2 - 225; eh1.y = SH / 2 + 10; eh1.style = 'ph_emptysb'
    jsmaf.root.children.push(eh1)

    const eh2 = new jsmaf.Text()
    eh2.text = '/download0/payloads/'
    eh2.x = SW / 2 - 120; eh2.y = SH / 2 + 50; eh2.style = 'ph_emptysb'
    jsmaf.root.children.push(eh2)

    if (is_jailbroken) {
      const eh3 = new jsmaf.Text()
      eh3.text = '/data/payloads/  (also supported)'
      eh3.x = SW / 2 - 185; eh3.y = SH / 2 + 90; eh3.style = 'ph_emptysb'
      jsmaf.root.children.push(eh3)
    }
  }

  // ── Scroll indicators ─────────────────────────────────────────────────────
  const navY = SH - FOOTER_H - 54

  const arrowUp = new jsmaf.Text()
  arrowUp.text = '▲  Scroll up'
  arrowUp.x = SW / 2 - 68; arrowUp.y = navY - 6; arrowUp.style = 'ph_scroll'
  jsmaf.root.children.push(arrowUp)

  const arrowDn = new jsmaf.Text()
  arrowDn.text = '▼  More below'
  arrowDn.x = SW / 2 - 68; arrowDn.y = navY + 22; arrowDn.style = 'ph_scroll'
  jsmaf.root.children.push(arrowDn)

  const bt = new jsmaf.Text()
  bt.text = jsmaf.circleIsAdvanceButton ? lang.xToGoBack : lang.oToGoBack
  bt.x = PAD_X; bt.y = navY + 10; bt.style = 'ph_back'
  jsmaf.root.children.push(bt)

  // ── Footer ────────────────────────────────────────────────────────────────
  const footLine = new Image({ url: CYAN_PX, x: 0, y: SH - FOOTER_H, width: SW, height: 1 })
  footLine.alpha = 0.18; footLine.borderWidth = 0
  jsmaf.root.children.push(footLine)

  const footBg = new Image({ url: WHITE_PX, x: 0, y: SH - FOOTER_H + 1, width: SW, height: FOOTER_H - 1 })
  footBg.alpha = 0.09; footBg.borderWidth = 0
  jsmaf.root.children.push(footBg)

  const confirmLabel = jsmaf.circleIsAdvanceButton ? 'O' : 'X'
  const backLabel = jsmaf.circleIsAdvanceButton ? 'X' : 'O'
  const fh = new jsmaf.Text()
  fh.text = '↑↓  Navigate    ' + confirmLabel + '  Launch    ' + backLabel + '  Back'
  fh.x = SW / 2 - 210; fh.y = SH - FOOTER_H + 15; fh.style = 'ph_footer'
  jsmaf.root.children.push(fh)

  // ── State ─────────────────────────────────────────────────────────────────
  let cur = 0; let scrollOff = 0
  const TOTAL = fileList.length

  function clamp () {
    if (cur < scrollOff) scrollOff = cur
    else if (cur >= scrollOff + MAX_ROWS) scrollOff = cur - MAX_ROWS + 1
  }

  function renderRows () {
    for (let s = 0; s < MAX_ROWS; s++) {
      const idx = scrollOff + s
      const vis = idx < TOTAL

      // Image supports .visible; jsmaf.Text does NOT — so we also clear
      // all text fields when not visible to prevent ghost content
      slotBtns[s]!.visible = vis
      slotBars[s]!.visible = vis

      if (!vis) {
        slotNums[s]!.text = ''
        slotBadges[s]!.text = ''
        slotLabels[s]!.text = ''
        slotPaths[s]!.text = ''
        continue
      }

      const f = fileList[idx]!
      const sel = idx === cur
      let disp = f.name.replace(/\.(elf|bin|js)$/i, '')
      if (disp.length > 60) disp = disp.slice(0, 58) + '..'
      const pathHint = f.path.startsWith('/data/') ? '/data/payloads' : '/download0/payloads'

      slotBtns[s]!.alpha = sel ? 0.22 : 0.07
      slotBtns[s]!.borderColor = sel ? 'rgba(80,210,255,0.85)' : 'rgba(120,200,255,0.18)'
      slotBtns[s]!.borderWidth = sel ? 2 : 1
      slotBars[s]!.alpha = sel ? 1.0 : 0.50

      slotNums[s]!.text = String(idx + 1).padStart(2, '0')
      slotNums[s]!.style = sel ? 'ph_lnumsel' : 'ph_lnum'
      slotBadges[s]!.text = f.ext
      slotBadges[s]!.style = sel ? 'ph_bsel' : 'ph_badge'
      slotLabels[s]!.text = disp
      slotLabels[s]!.style = sel ? 'ph_white' : 'ph_muted'
      slotPaths[s]!.text = pathHint
    }
    // Use alpha trick for scroll arrows since jsmaf.Text has no .visible
    arrowUp.text = scrollOff > 0 ? '▲  Scroll up' : ''
    arrowDn.text = TOTAL > 0 && (scrollOff + MAX_ROWS) < TOTAL ? '▼  More below' : ''
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
            let code = ''
            const len = (rlen instanceof BigInt) ? rlen.lo : rlen
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
      if (TOTAL > 0) { cur = (cur + 1) % TOTAL; sfx(SFX_CUR); clamp(); renderRows() }
    } else if (kc === 4 || kc === 7) {
      if (TOTAL > 0) { cur = (cur - 1 + TOTAL) % TOTAL; sfx(SFX_CUR); clamp(); renderRows() }
    } else if (kc === confirmKey) {
      sfx(SFX_OK); launchPayload()
    } else if (kc === backKey) {
      sfx(SFX_BACK)
      try {
        include('themes/' + (typeof CONFIG !== 'undefined' && CONFIG.theme ? CONFIG.theme : 'default') + '/main.js')
      } catch (e) { log('Back error: ' + (e as Error).message) }
    }
  }

  renderRows()
  log('Payload host loaded — ' + TOTAL + ' files | ' + MAX_ROWS + ' visible rows.')
  ;((_a) => {})(RED_PX)
})()

import { fn, mem, BigInt } from 'download0/types'
import { binloader_init } from 'download0/binloader'
import { libc_addr } from 'download0/userland'
import { lang } from 'download0/languages'
import { checkJailbroken } from 'download0/check-jailbroken'

;(function () {
  if (typeof libc_addr === 'undefined') include('userland.js')
  include('check-jailbroken.js')
  if (typeof startBgmIfEnabled === 'function') startBgmIfEnabled()

  // ─── Palette ───────────────────────────────────────────────────────────────
  const DARK  = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNg4+ADAAA0AB0VS5vvAAAAAElFTkSuQmCC'
  const WHITE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC'
  const AMBER = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4v9MIAASlAeurtfG0AAAAAElFTkSuQmCC'
  const RED   = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP44BYAAAOwAYeW+1bOAAAAAElFTkSuQmCC'

  // ─── Layout ────────────────────────────────────────────────────────────────
  const SW = 1920; const SH = 1080; const PAD = 80
  const HDR = 160; const FTR = 52
  const BACK_STRIP = 64
  const BW = SW - PAD * 2; const BH = 90; const GAP = 8
  const AVAIL = SH - HDR - FTR - BACK_STRIP - 16
  const MAXR  = Math.min(9, Math.floor(AVAIL / (BH + GAP)))
  const SY    = HDR + 14

  // ─── Audio ─────────────────────────────────────────────────────────────────
  const SFX_CUR  = 'file:///../download0/sfx/cursor.wav'
  const SFX_OK   = 'file:///../download0/sfx/confirm.wav'
  const SFX_BACK = 'file:///../download0/sfx/cancel.wav'
  const poolCur: jsmaf.AudioClip[] = []; const poolOk: jsmaf.AudioClip[] = []; const poolBack: jsmaf.AudioClip[] = []
  for (let _i = 0; _i < 8; _i++) { const c = new jsmaf.AudioClip(); c.volume = 1.0; poolCur.push(c) }
  for (let _i = 0; _i < 4; _i++) { const c = new jsmaf.AudioClip(); c.volume = 1.0; poolOk.push(c) }
  for (let _i = 0; _i < 4; _i++) { const c = new jsmaf.AudioClip(); c.volume = 1.0; poolBack.push(c) }
  let pCur = 0; let pOk = 0; let pBack = 0
  function sfxCur  () { if (typeof CONFIG !== 'undefined' && CONFIG.music === false) return; try { poolCur[pCur]!.open(SFX_CUR);  pCur  = (pCur+1)%poolCur.length  } catch (_e) {} }
  function sfxOk   () { if (typeof CONFIG !== 'undefined' && CONFIG.music === false) return; try { poolOk[pOk]!.open(SFX_OK);    pOk   = (pOk+1)%poolOk.length   } catch (_e) {} }
  function sfxBack () { if (typeof CONFIG !== 'undefined' && CONFIG.music === false) return; try { poolBack[pBack]!.open(SFX_BACK); pBack = (pBack+1)%poolBack.length } catch (_e) {} }

  is_jailbroken = checkJailbroken()

  // ─── Payload scan (same logic as original) ─────────────────────────────────
  try { fn.register(0x05, 'ph_open',    ['bigint','bigint','bigint'], 'bigint') } catch (_e) {}
  try { fn.register(0x06, 'ph_close',   ['bigint'],                  'bigint') } catch (_e) {}
  try { fn.register(0x110,'ph_getdnts', ['bigint','bigint','bigint'], 'bigint') } catch (_e) {}
  try { fn.register(0x03, 'ph_read',    ['bigint','bigint','bigint'], 'bigint') } catch (_e) {}

  type FE = { name: string; path: string; ext: string }
  const fileList: FE[] = []
  const scanPaths = ['/download0/payloads']
  if (is_jailbroken) scanPaths.push('/data/payloads')

  const paddr = mem.malloc(256); const dbuf = mem.malloc(4096)
  for (let si = 0; si < scanPaths.length; si++) {
    const sp = scanPaths[si]!
    for (let i = 0; i < sp.length; i++) mem.view(paddr).setUint8(i, sp.charCodeAt(i))
    mem.view(paddr).setUint8(sp.length, 0)
    const fd = fn.ph_open(paddr, new BigInt(0, 0), new BigInt(0, 0))
    if (!fd.eq(new BigInt(0xffffffff, 0xffffffff))) {
      const cnt = fn.ph_getdnts(fd, dbuf, new BigInt(0, 4096))
      if (!cnt.eq(new BigInt(0xffffffff, 0xffffffff)) && cnt.lo > 0) {
        let off = 0
        while (off < cnt.lo) {
          const rl  = mem.view(dbuf.add(new BigInt(0, off+4))).getUint16(0, true)
          const dt  = mem.view(dbuf.add(new BigInt(0, off+6))).getUint8(0)
          const nl  = mem.view(dbuf.add(new BigInt(0, off+7))).getUint8(0)
          let name = ''
          for (let i = 0; i < nl; i++) name += String.fromCharCode(mem.view(dbuf.add(new BigInt(0, off+8+i))).getUint8(0))
          if (dt === 8 && name !== '.' && name !== '..') {
            const low = name.toLowerCase()
            if (low.endsWith('.elf') || low.endsWith('.bin') || low.endsWith('.js'))
              fileList.push({ name, path: sp + '/' + name, ext: (name.split('.').pop() || '').toUpperCase() })
          }
          off += rl
        }
      }
      fn.ph_close(fd)
    }
  }
  log('Payloads found: ' + fileList.length)
  const TOTAL = fileList.length

  // ─── Build scene ───────────────────────────────────────────────────────────
  jsmaf.root.children.length = 0

  // Styles
  new Style({ name: 'ptitle',  color: 'rgb(255,255,255)',          size: 30 })
  new Style({ name: 'pcount',  color: 'rgba(255,210,120,0.70)',    size: 16 })
  new Style({ name: 'pwhite',  color: 'rgb(255,255,255)',          size: 23 })
  new Style({ name: 'pmuted',  color: 'rgba(235,228,212,0.92)',    size: 23 })
  new Style({ name: 'pnum',    color: 'rgba(255,185,50,0.50)',     size: 15 })
  new Style({ name: 'pnumsel', color: 'rgb(255,210,80)',           size: 15 })
  new Style({ name: 'pbadge',  color: 'rgba(255,185,50,0.85)',     size: 12 })
  new Style({ name: 'pbsel',   color: 'rgb(255,215,100)',          size: 12 })
  new Style({ name: 'ppath',   color: 'rgba(200,190,160,0.48)',    size: 13 })
  new Style({ name: 'pscroll', color: 'rgba(255,200,80,0.85)',     size: 16 })
  new Style({ name: 'pback',   color: 'rgba(240,80,90,0.95)',      size: 20 })
  new Style({ name: 'pftr',    color: 'rgba(255,215,130,0.38)',    size: 15 })
  new Style({ name: 'pempty',  color: 'rgba(235,228,212,0.90)',    size: 28 })
  new Style({ name: 'pemsub',  color: 'rgba(200,190,160,0.62)',    size: 18 })

  // Background
  const bg = new Image({ url: DARK, x: 0, y: 0, width: SW, height: SH })
  bg.alpha = 1.0; bg.borderWidth = 0; jsmaf.root.children.push(bg)
  const gl = new Image({ url: AMBER, x: 0, y: 0, width: 700, height: 460 })
  gl.alpha = 0.030; gl.borderWidth = 0; jsmaf.root.children.push(gl)

  // Header
  const topBar = new Image({ url: AMBER, x: 0, y: 0, width: SW, height: 3 })
  topBar.alpha = 0.88; topBar.borderWidth = 0; jsmaf.root.children.push(topBar)
  const hBg = new Image({ url: WHITE, x: 0, y: 0, width: SW, height: HDR })
  hBg.alpha = 0.058; hBg.borderWidth = 0; jsmaf.root.children.push(hBg)
  const hAccent = new Image({ url: AMBER, x: 0, y: 0, width: 5, height: HDR })
  hAccent.alpha = 1.0; hAccent.borderWidth = 0; jsmaf.root.children.push(hAccent)
  const hLine = new Image({ url: AMBER, x: 0, y: HDR - 1, width: SW, height: 1 })
  hLine.alpha = 0.24; hLine.borderWidth = 0; jsmaf.root.children.push(hLine)

  const ttl = new jsmaf.Text()
  ttl.style = 'ptitle'; ttl.text = (lang.payloadMenu || 'PAYLOAD MENU').toUpperCase()
  ttl.x = PAD; ttl.y = 38; jsmaf.root.children.push(ttl)
  const cntT = new jsmaf.Text()
  cntT.style = 'pcount'
  cntT.text = TOTAL === 0 ? 'No payloads found' : TOTAL + ' file' + (TOTAL !== 1 ? 's' : '') + ' available'
  cntT.x = PAD; cntT.y = 102; jsmaf.root.children.push(cntT)

  // Back strip (above footer)
  const bsY = SH - FTR - BACK_STRIP
  const bsSep = new Image({ url: AMBER, x: 0, y: bsY, width: SW, height: 1 })
  bsSep.alpha = 0.16; bsSep.borderWidth = 0; jsmaf.root.children.push(bsSep)
  const bsBg = new Image({ url: WHITE, x: 0, y: bsY + 1, width: SW, height: BACK_STRIP - 1 })
  bsBg.alpha = 0.04; bsBg.borderWidth = 0; jsmaf.root.children.push(bsBg)
  const backT = new jsmaf.Text()
  backT.style = 'pback'
  backT.text = jsmaf.circleIsAdvanceButton ? lang.xToGoBack : lang.oToGoBack
  backT.x = PAD; backT.y = bsY + 18; jsmaf.root.children.push(backT)

  // Footer
  const fLine = new Image({ url: AMBER, x: 0, y: SH - FTR, width: SW, height: 1 })
  fLine.alpha = 0.24; fLine.borderWidth = 0; jsmaf.root.children.push(fLine)
  const fBg = new Image({ url: WHITE, x: 0, y: SH - FTR + 1, width: SW, height: FTR - 1 })
  fBg.alpha = 0.05; fBg.borderWidth = 0; jsmaf.root.children.push(fBg)
  const clbl = jsmaf.circleIsAdvanceButton ? 'O' : 'X'; const blbl = jsmaf.circleIsAdvanceButton ? 'X' : 'O'
  const fTxt = new jsmaf.Text()
  fTxt.style = 'pftr'; fTxt.text = '↑↓  Navigate    ' + clbl + '  Launch    ' + blbl + '  Back'
  fTxt.x = SW / 2 - 200; fTxt.y = SH - FTR + 18; jsmaf.root.children.push(fTxt)

  // ── Scroll indicators ──────────────────────────────────────────────────────
  // Created AFTER the rows section so they render on top.
  // They start with empty text — set in renderRows().
  const upInd = new jsmaf.Text()
  upInd.style = 'pscroll'; upInd.text = ''; upInd.x = SW / 2 - 70; upInd.y = HDR + 2
  jsmaf.root.children.push(upInd)
  const dnInd = new jsmaf.Text()
  dnInd.style = 'pscroll'; dnInd.text = ''; dnInd.x = SW / 2 - 70; dnInd.y = SY + MAXR * (BH + GAP) + 6
  jsmaf.root.children.push(dnInd)

  // ─── EMPTY STATE ───────────────────────────────────────────────────────────
  // Only visible when TOTAL === 0. Use plain Text — no Image.visible needed.
  if (TOTAL === 0) {
    const emTxt = new jsmaf.Text()
    emTxt.style = 'pempty'; emTxt.text = '◈   No Payloads Found'
    emTxt.x = SW / 2 - 200; emTxt.y = SH / 2 - 80; jsmaf.root.children.push(emTxt)
    const emS1 = new jsmaf.Text()
    emS1.style = 'pemsub'; emS1.text = 'Place  .elf  /  .bin  /  .js  files in:'
    emS1.x = SW / 2 - 232; emS1.y = SH / 2; jsmaf.root.children.push(emS1)
    const emS2 = new jsmaf.Text()
    emS2.style = 'pemsub'; emS2.text = '/download0/payloads/'
    emS2.x = SW / 2 - 130; emS2.y = SH / 2 + 42; jsmaf.root.children.push(emS2)
    if (is_jailbroken) {
      const emS3 = new jsmaf.Text()
      emS3.style = 'pemsub'; emS3.text = '/data/payloads/   (also supported)'
      emS3.x = SW / 2 - 200; emS3.y = SH / 2 + 84; jsmaf.root.children.push(emS3)
    }
  }

  // ─── PRE-ALLOCATED VISIBLE ROW SLOTS ──────────────────────────────────────
  //
  // KEY FIX: Never use `visible: false` in the constructor — old WebKit on PS4
  // may ignore it. Instead all slot images start fully OPAQUE (alpha > 0) but
  // we immediately call renderRows() which sets alpha=0 on unused slots.
  // Text elements are hidden by setting .text = '' (empty string renders nothing).
  //
  const sBg:  Image[]      = []; const sGlw: Image[]      = []
  const sBar: Image[]      = []; const sNum: jsmaf.Text[] = []
  const sLbl: jsmaf.Text[] = []; const sPth: jsmaf.Text[] = []
  const sBdg: jsmaf.Text[] = []

  for (let s = 0; s < MAXR; s++) {
    const bY = SY + s * (BH + GAP)

    // Background rect — start with alpha 0 (hidden); renderRows() will set it
    const rowBg = new Image({ url: WHITE, x: PAD, y: bY, width: BW, height: BH })
    rowBg.alpha = 0; rowBg.borderWidth = 0
    sBg.push(rowBg); jsmaf.root.children.push(rowBg)

    // Glow overlay
    const rowGlw = new Image({ url: AMBER, x: PAD, y: bY, width: BW, height: BH })
    rowGlw.alpha = 0; rowGlw.borderWidth = 0
    sGlw.push(rowGlw); jsmaf.root.children.push(rowGlw)

    // Left accent bar — start hidden
    const rowBar = new Image({ url: AMBER, x: PAD, y: bY, width: 5, height: BH })
    rowBar.alpha = 0; rowBar.borderWidth = 0
    sBar.push(rowBar); jsmaf.root.children.push(rowBar)

    // Text nodes — start empty (empty text = not rendered)
    const rowNum = new jsmaf.Text()
    rowNum.style = 'pnum'; rowNum.text = ''; rowNum.x = PAD + 18; rowNum.y = bY + 38
    sNum.push(rowNum); jsmaf.root.children.push(rowNum)

    const rowLbl = new jsmaf.Text()
    rowLbl.style = 'pmuted'; rowLbl.text = ''; rowLbl.x = PAD + 58; rowLbl.y = bY + 18
    sLbl.push(rowLbl); jsmaf.root.children.push(rowLbl)

    const rowPth = new jsmaf.Text()
    rowPth.style = 'ppath'; rowPth.text = ''; rowPth.x = PAD + 58; rowPth.y = bY + 58
    sPth.push(rowPth); jsmaf.root.children.push(rowPth)

    const rowBdg = new jsmaf.Text()
    rowBdg.style = 'pbadge'; rowBdg.text = ''; rowBdg.x = PAD + BW - 120; rowBdg.y = bY + 38
    sBdg.push(rowBdg); jsmaf.root.children.push(rowBdg)
  }

  let cur = 0; let scrollOff = 0

  function clamp () {
    if (cur < scrollOff) scrollOff = cur
    else if (cur >= scrollOff + MAXR) scrollOff = cur - MAXR + 1
  }

  function renderRows () {
    upInd.text = scrollOff > 0                 ? '▲  Scroll up'  : ''
    dnInd.text = (scrollOff + MAXR) < TOTAL    ? '▼  More below' : ''

    for (let s = 0; s < MAXR; s++) {
      const idx = scrollOff + s

      if (idx >= TOTAL) {
        // Hide slot: alpha=0 for images, empty text for Text nodes
        sBg[s]!.alpha  = 0; sBg[s]!.borderWidth = 0
        sGlw[s]!.alpha = 0
        sBar[s]!.alpha = 0
        sNum[s]!.text  = ''; sLbl[s]!.text = ''; sPth[s]!.text = ''; sBdg[s]!.text = ''
        continue
      }

      const f = fileList[idx]!; const sel = idx === cur
      let disp = f.name.replace(/\.(elf|bin|js)$/i, '')
      if (disp.length > 68) disp = disp.slice(0, 66) + '..'
      const hint = f.path.startsWith('/data/') ? '/data/payloads' : '/download0/payloads'

      // Background rect
      sBg[s]!.alpha       = sel ? 0.22 : 0.10
      sBg[s]!.borderColor = sel ? 'rgba(255,185,50,0.92)' : 'rgba(255,185,50,0.22)'
      sBg[s]!.borderWidth = sel ? 2 : 1

      // Glow overlay (only on selected)
      sGlw[s]!.alpha = sel ? 0.06 : 0

      // Left accent bar
      sBar[s]!.alpha = sel ? 1.0 : 0.50

      // Text content
      sNum[s]!.style = sel ? 'pnumsel' : 'pnum'
      sNum[s]!.text  = String(idx + 1).padStart(2, '0')
      sLbl[s]!.style = sel ? 'pwhite' : 'pmuted'
      sLbl[s]!.text  = disp
      sPth[s]!.text  = hint
      sBdg[s]!.style = sel ? 'pbsel' : 'pbadge'
      sBdg[s]!.text  = f.ext
    }
  }

  function launchPayload () {
    if (TOTAL === 0) return
    const entry = fileList[cur]; if (!entry) return
    log('Launching: ' + entry.name)
    try {
      if (entry.name.toLowerCase().endsWith('.js')) {
        if (entry.path.startsWith('/download0/')) { include('payloads/' + entry.name) } else {
          const pa = mem.malloc(256)
          for (let i = 0; i < entry.path.length; i++) mem.view(pa).setUint8(i, entry.path.charCodeAt(i))
          mem.view(pa).setUint8(entry.path.length, 0)
          const fd2 = fn.ph_open(pa, new BigInt(0, 0), new BigInt(0, 0))
          if (!fd2.eq(new BigInt(0xffffffff, 0xffffffff))) {
            const b = mem.malloc(0x100000)
            const rlen = fn.ph_read(fd2, b, new BigInt(0, 0x100000)); fn.ph_close(fd2)
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

  const confirmKey = jsmaf.circleIsAdvanceButton ? 13 : 14
  const backKey    = jsmaf.circleIsAdvanceButton ? 14 : 13
  jsmaf.onKeyDown = function (kc: number) {
    if (kc === 6 || kc === 5) {
      if (TOTAL > 0) { cur = (cur + 1) % TOTAL; sfxCur(); clamp(); renderRows() }
    } else if (kc === 4 || kc === 7) {
      if (TOTAL > 0) { cur = (cur - 1 + TOTAL) % TOTAL; sfxCur(); clamp(); renderRows() }
    } else if (kc === confirmKey) { sfxOk(); launchPayload()
    } else if (kc === backKey) {
      sfxBack()
      try { include('themes/' + (typeof CONFIG !== 'undefined' && CONFIG.theme ? CONFIG.theme : 'default') + '/main.js') } catch (e) { log('Back: ' + (e as Error).message) }
    }
  }

  renderRows()
  log('Payload host loaded — ' + TOTAL + ' entries | MAXR=' + MAXR)
  ;((_a) => {})(RED)
})()

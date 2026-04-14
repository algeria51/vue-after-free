import { fn, mem, BigInt } from 'download0/types'
import { binloader_init } from 'download0/binloader'
import { libc_addr } from 'download0/userland'
import { lang } from 'download0/languages'
import { checkJailbroken } from 'download0/check-jailbroken'

;(function () {
  if (typeof libc_addr === 'undefined') include('userland.js')
  include('check-jailbroken.js')
  if (typeof startBgmIfEnabled === 'function') startBgmIfEnabled()

  const DARK  = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNg4xACAAA4ACGcHPdwAAAAAElFTkSuQmCC'
  const WHITE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC'
  const CYAN  = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGMIOPEfAAODAhiMwlb1AAAAAElFTkSuQmCC'
  const RED   = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4HxAAAAPxAaAHMjeOAAAAAElFTkSuQmCC'

  const SW = 1920, SH = 1080, PAD = 80
  const HDR = 155, FTR = 50
  const BW = SW - PAD * 2, BH = 88, GAP = 6
  const AVAIL = SH - HDR - FTR - 24
  const MAXR  = Math.min(9, Math.floor(AVAIL / (BH + GAP)))
  const SY    = HDR + 12

  const SFX_CUR  = 'file:///../download0/sfx/cursor.wav'
  const SFX_OK   = 'file:///../download0/sfx/confirm.wav'
  const SFX_BACK = 'file:///../download0/sfx/cancel.wav'

  // AUDIO POOL — plain for-loop, safe on old WebKit
  const poolCur:  jsmaf.AudioClip[] = []
  const poolOk:   jsmaf.AudioClip[] = []
  const poolBack: jsmaf.AudioClip[] = []
  for (let _i = 0; _i < 8; _i++) { const c = new jsmaf.AudioClip(); c.volume = 1.0; poolCur.push(c)  }
  for (let _i = 0; _i < 4; _i++) { const c = new jsmaf.AudioClip(); c.volume = 1.0; poolOk.push(c)   }
  for (let _i = 0; _i < 4; _i++) { const c = new jsmaf.AudioClip(); c.volume = 1.0; poolBack.push(c) }
  let pCur = 0, pOk = 0, pBack = 0
  function sfxCur()  { if (typeof CONFIG !== 'undefined' && CONFIG.music === false) return; try { poolCur[pCur]!.open(SFX_CUR);   pCur  = (pCur  + 1) % poolCur.length  } catch (_e) {} }
  function sfxOk()   { if (typeof CONFIG !== 'undefined' && CONFIG.music === false) return; try { poolOk[pOk]!.open(SFX_OK);      pOk   = (pOk   + 1) % poolOk.length   } catch (_e) {} }
  function sfxBack() { if (typeof CONFIG !== 'undefined' && CONFIG.music === false) return; try { poolBack[pBack]!.open(SFX_BACK); pBack = (pBack + 1) % poolBack.length  } catch (_e) {} }

  is_jailbroken = checkJailbroken()

  // Scan payloads
  try { fn.register(0x05,  'ph_open',    ['bigint','bigint','bigint'], 'bigint') } catch (_e) {}
  try { fn.register(0x06,  'ph_close',   ['bigint'],                   'bigint') } catch (_e) {}
  try { fn.register(0x110, 'ph_getdnts', ['bigint','bigint','bigint'], 'bigint') } catch (_e) {}
  try { fn.register(0x03,  'ph_read',    ['bigint','bigint','bigint'], 'bigint') } catch (_e) {}

  type FE = { name: string; path: string; ext: string }
  const fileList: FE[] = []
  const scanPaths = ['/download0/payloads']
  if (is_jailbroken) scanPaths.push('/data/payloads')

  const paddr = mem.malloc(256), dbuf = mem.malloc(4096)
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
          const rl = mem.view(dbuf.add(new BigInt(0, off + 4))).getUint16(0, true)
          const dt = mem.view(dbuf.add(new BigInt(0, off + 6))).getUint8(0)
          const nl = mem.view(dbuf.add(new BigInt(0, off + 7))).getUint8(0)
          let name = ''
          for (let i = 0; i < nl; i++) name += String.fromCharCode(mem.view(dbuf.add(new BigInt(0, off + 8 + i))).getUint8(0))
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

  jsmaf.root.children.length = 0

  // Styles
  new Style({ name: 'ptitle',  color: 'rgb(255,255,255)',          size: 30 })
  new Style({ name: 'pcount',  color: 'rgba(100,220,255,0.60)',    size: 16 })
  new Style({ name: 'pwhite',  color: 'rgb(255,255,255)',          size: 22 })
  new Style({ name: 'pmuted',  color: 'rgba(190,235,255,0.65)',    size: 22 })
  new Style({ name: 'pnum',    color: 'rgba(60,215,255,0.40)',     size: 15 })
  new Style({ name: 'pnumsel', color: 'rgb(60,225,255)',           size: 15 })
  new Style({ name: 'pbadge',  color: 'rgba(60,215,255,0.75)',     size: 12 })
  new Style({ name: 'pbsel',   color: 'rgb(60,225,255)',           size: 12 })
  new Style({ name: 'ppath',   color: 'rgba(150,230,255,0.30)',    size: 13 })
  new Style({ name: 'pscroll', color: 'rgba(60,220,255,0.75)',     size: 16 })
  new Style({ name: 'pback',   color: 'rgba(255,100,110,0.90)',    size: 20 })
  new Style({ name: 'pftr',    color: 'rgba(100,225,255,0.28)',    size: 15 })
  new Style({ name: 'pempty',  color: 'rgba(190,235,255,0.70)',    size: 28 })
  new Style({ name: 'pemsub',  color: 'rgba(150,230,255,0.42)',    size: 18 })

  // Background
  const bg = new Image({ url: DARK, x: 0, y: 0, width: SW, height: SH })
  bg.alpha = 1.0; bg.borderWidth = 0; jsmaf.root.children.push(bg)
  const topLine = new Image({ url: CYAN, x: 0, y: 0, width: SW, height: 3 })
  topLine.alpha = 0.75; topLine.borderWidth = 0; jsmaf.root.children.push(topLine)
  const gl = new Image({ url: CYAN, x: 0, y: 0, width: 700, height: 480 })
  gl.alpha = 0.022; gl.borderWidth = 0; jsmaf.root.children.push(gl)

  // Header
  const hBg = new Image({ url: WHITE, x: 0, y: 0, width: SW, height: HDR })
  hBg.alpha = 0.04; hBg.borderWidth = 0; jsmaf.root.children.push(hBg)
  const hAccent = new Image({ url: CYAN, x: 0, y: 0, width: 4, height: HDR })
  hAccent.alpha = 1.0; hAccent.borderWidth = 0; jsmaf.root.children.push(hAccent)
  const hLine = new Image({ url: CYAN, x: 0, y: HDR - 1, width: SW, height: 1 })
  hLine.alpha = 0.18; hLine.borderWidth = 0; jsmaf.root.children.push(hLine)

  const ttl = new jsmaf.Text()
  ttl.style = 'ptitle'; ttl.text = (lang.payloadMenu || 'PAYLOAD MENU').toUpperCase()
  ttl.x = PAD; ttl.y = 36; jsmaf.root.children.push(ttl)
  const cntT = new jsmaf.Text()
  cntT.style = 'pcount'
  cntT.text = TOTAL === 0 ? 'No payloads found' : TOTAL + ' file' + (TOTAL !== 1 ? 's' : '') + ' available'
  cntT.x = PAD; cntT.y = 92; jsmaf.root.children.push(cntT)

  // Back + Footer
  const navY = SH - FTR - 54
  const backT = new jsmaf.Text()
  backT.style = 'pback'; backT.text = jsmaf.circleIsAdvanceButton ? lang.xToGoBack : lang.oToGoBack
  backT.x = PAD; backT.y = navY + 10; jsmaf.root.children.push(backT)
  const fLine = new Image({ url: CYAN, x: 0, y: SH - FTR, width: SW, height: 1 })
  fLine.alpha = 0.18; fLine.borderWidth = 0; jsmaf.root.children.push(fLine)
  const fBg = new Image({ url: WHITE, x: 0, y: SH - FTR + 1, width: SW, height: FTR - 1 })
  fBg.alpha = 0.05; fBg.borderWidth = 0; jsmaf.root.children.push(fBg)
  const clbl = jsmaf.circleIsAdvanceButton ? 'O' : 'X', blbl = jsmaf.circleIsAdvanceButton ? 'X' : 'O'
  const fTxt = new jsmaf.Text()
  fTxt.style = 'pftr'; fTxt.text = '↑↓  Navigate    ' + clbl + '  Launch    ' + blbl + '  Back'
  fTxt.x = SW / 2 - 200; fTxt.y = SH - FTR + 18; jsmaf.root.children.push(fTxt)

  // ═══════════════════════════════════════════════════════════════════════
  // PRE-ALLOCATED SLOTS
  // Strategy: Image uses .visible for show/hide (works reliably).
  //           Text uses .text = '' to hide, .text = content to show.
  //           NEVER rely on Text.alpha — may not be implemented in engine.
  // ═══════════════════════════════════════════════════════════════════════
  const sBg:  Image[]      = []
  const sGlw: Image[]      = []
  const sBar: Image[]      = []
  const sNum: jsmaf.Text[] = []
  const sLbl: jsmaf.Text[] = []
  const sPth: jsmaf.Text[] = []
  const sBdg: jsmaf.Text[] = []

  for (let s = 0; s < MAXR; s++) {
    const bY = SY + s * (BH + GAP)

    const rowBg = new Image({ url: WHITE, x: PAD, y: bY, width: BW, height: BH, visible: false })
    rowBg.alpha = 0.06; rowBg.borderWidth = 1
    sBg.push(rowBg); jsmaf.root.children.push(rowBg)

    const rowGlw = new Image({ url: CYAN, x: PAD, y: bY, width: BW, height: BH, visible: false })
    rowGlw.alpha = 0.055; rowGlw.borderWidth = 0
    sGlw.push(rowGlw); jsmaf.root.children.push(rowGlw)

    const rowBar = new Image({ url: CYAN, x: PAD, y: bY, width: 4, height: BH, visible: false })
    rowBar.alpha = 0.38; rowBar.borderWidth = 0
    sBar.push(rowBar); jsmaf.root.children.push(rowBar)

    // Text: initialized with single space so engine registers the element,
    // hidden by setting .text = '' (empty text renders nothing)
    const rowNum = new jsmaf.Text()
    rowNum.style = 'pnum'; rowNum.text = ''; rowNum.x = PAD + 16; rowNum.y = bY + 32
    sNum.push(rowNum); jsmaf.root.children.push(rowNum)

    const rowLbl = new jsmaf.Text()
    rowLbl.style = 'pmuted'; rowLbl.text = ''; rowLbl.x = PAD + 56; rowLbl.y = bY + 18
    sLbl.push(rowLbl); jsmaf.root.children.push(rowLbl)

    const rowPth = new jsmaf.Text()
    rowPth.style = 'ppath'; rowPth.text = ''; rowPth.x = PAD + 56; rowPth.y = bY + 56
    sPth.push(rowPth); jsmaf.root.children.push(rowPth)

    const rowBdg = new jsmaf.Text()
    rowBdg.style = 'pbadge'; rowBdg.text = ''; rowBdg.x = PAD + BW - 120; rowBdg.y = bY + 34
    sBdg.push(rowBdg); jsmaf.root.children.push(rowBdg)
  }

  // Scroll indicators — hidden by setting text = ''
  const upInd = new jsmaf.Text()
  upInd.style = 'pscroll'; upInd.text = ''; upInd.x = SW / 2 - 70; upInd.y = HDR + 2
  jsmaf.root.children.push(upInd)
  const dnInd = new jsmaf.Text()
  dnInd.style = 'pscroll'; dnInd.text = ''; dnInd.x = SW / 2 - 70; dnInd.y = SY + MAXR * (BH + GAP) + 4
  jsmaf.root.children.push(dnInd)

  // Empty state — hidden by setting text = ''
  const emTxt = new jsmaf.Text()
  emTxt.style = 'pempty'; emTxt.text = ''; emTxt.x = SW / 2 - 190; emTxt.y = SH / 2 - 70
  jsmaf.root.children.push(emTxt)
  const emS1 = new jsmaf.Text()
  emS1.style = 'pemsub'; emS1.text = ''; emS1.x = SW / 2 - 225; emS1.y = SH / 2 + 4
  jsmaf.root.children.push(emS1)
  const emS2 = new jsmaf.Text()
  emS2.style = 'pemsub'; emS2.text = ''; emS2.x = SW / 2 - 128; emS2.y = SH / 2 + 44
  jsmaf.root.children.push(emS2)
  const emS3 = new jsmaf.Text()
  emS3.style = 'pemsub'; emS3.text = ''; emS3.x = SW / 2 - 198; emS3.y = SH / 2 + 84
  jsmaf.root.children.push(emS3)

  let cur = 0, scrollOff = 0

  function clamp () {
    if (cur < scrollOff) scrollOff = cur
    else if (cur >= scrollOff + MAXR) scrollOff = cur - MAXR + 1
  }

  function renderRows () {
    if (TOTAL === 0) {
      // Show empty state via text content; hide all slots via Image.visible
      emTxt.text = '◈   No Payloads Found'
      emS1.text  = 'Place  .elf  /  .bin  /  .js  files in:'
      emS2.text  = '/download0/payloads/'
      emS3.text  = is_jailbroken ? '/data/payloads/   (also supported)' : ''
      upInd.text = ''; dnInd.text = ''
      for (let s = 0; s < MAXR; s++) {
        sBg[s]!.visible = false; sGlw[s]!.visible = false; sBar[s]!.visible = false
        sNum[s]!.text = ''; sLbl[s]!.text = ''; sPth[s]!.text = ''; sBdg[s]!.text = ''
      }
      return
    }
    // Hide empty state
    emTxt.text = ''; emS1.text = ''; emS2.text = ''; emS3.text = ''
    upInd.text = scrollOff > 0 ? '▲  Scroll up' : ''
    dnInd.text = (scrollOff + MAXR) < TOTAL ? '▼  More below' : ''

    for (let s = 0; s < MAXR; s++) {
      const idx = scrollOff + s
      if (idx >= TOTAL) {
        // Hide this slot — Image.visible + empty text
        sBg[s]!.visible = false; sGlw[s]!.visible = false; sBar[s]!.visible = false
        sNum[s]!.text = ''; sLbl[s]!.text = ''; sPth[s]!.text = ''; sBdg[s]!.text = ''
        continue
      }
      // Show this slot
      const f = fileList[idx]!
      const sel = idx === cur
      let disp = f.name.replace(/\.(elf|bin|js)$/i, '')
      if (disp.length > 68) disp = disp.slice(0, 66) + '..'
      const hint = f.path.startsWith('/data/') ? '/data/payloads' : '/download0/payloads'

      sBg[s]!.visible  = true
      sBg[s]!.alpha    = sel ? 0.20 : 0.06
      sBg[s]!.borderColor = sel ? 'rgba(60,200,230,0.90)' : 'rgba(60,160,180,0.18)'
      sBg[s]!.borderWidth = sel ? 2 : 1

      sGlw[s]!.visible = sel
      sBar[s]!.visible = true
      sBar[s]!.alpha   = sel ? 1.0 : 0.38

      // Text: just set content — empty = invisible, non-empty = visible
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
        if (entry.path.startsWith('/download0/')) { include('payloads/' + entry.name) }
        else {
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
    } else if (kc === confirmKey) { sfxOk(); launchPayload() }
    else if (kc === backKey) {
      sfxBack()
      try { include('themes/' + (typeof CONFIG !== 'undefined' && CONFIG.theme ? CONFIG.theme : 'default') + '/main.js') }
      catch (e) { log('Back: ' + (e as Error).message) }
    }
  }

  renderRows()
  log('Payload host loaded — ' + TOTAL + ' entries | ' + MAXR + ' slots')
  ;((_a) => {})(RED)
})()

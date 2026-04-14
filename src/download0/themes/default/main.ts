import { lang } from 'download0/languages'
import { libc_addr } from 'download0/userland'

;(function () {
  include('languages.js')
  log('Loading main menu...')
  if (typeof startBgmIfEnabled === 'function') startBgmIfEnabled()

  // ─── Palette (1×1 PNG pixels) ──────────────────────────────────────────────
  const DARK  = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNg4+ADAAA0AB0VS5vvAAAAAElFTkSuQmCC'
  const WHITE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC'
  const AMBER = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4v9MIAASlAeurtfG0AAAAAElFTkSuQmCC'
  const RED   = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP44BYAAAOwAYeW+1bOAAAAAElFTkSuQmCC'

  // ─── Layout ────────────────────────────────────────────────────────────────
  const SW = 1920; const SH = 1080; const CX = SW / 2
  const HDR = 160; const FTR = 52
  const BW = 720; const BH = 100; const BL = CX - BW / 2
  const SY = 264; const GAP = 18

  // ─── Audio pool ────────────────────────────────────────────────────────────
  const SFX_CUR  = 'file:///../download0/sfx/cursor.wav'
  const SFX_OK   = 'file:///../download0/sfx/confirm.wav'
  const SFX_BACK = 'file:///../download0/sfx/cancel.wav'
  const poolCur: jsmaf.AudioClip[] = []; const poolOk: jsmaf.AudioClip[] = []; const poolBck: jsmaf.AudioClip[] = []
  for (let _i = 0; _i < 8; _i++) { const c = new jsmaf.AudioClip(); c.volume = 1.0; poolCur.push(c) }
  for (let _i = 0; _i < 4; _i++) { const c = new jsmaf.AudioClip(); c.volume = 1.0; poolOk.push(c) }
  for (let _i = 0; _i < 4; _i++) { const c = new jsmaf.AudioClip(); c.volume = 1.0; poolBck.push(c) }
  let pCur = 0; let pOk = 0; let pBck = 0
  function sfxCur  () { if (typeof CONFIG !== 'undefined' && CONFIG.music === false) return; try { poolCur[pCur]!.open(SFX_CUR);  pCur = (pCur+1)%poolCur.length  } catch (_e) {} }
  function sfxOk   () { if (typeof CONFIG !== 'undefined' && CONFIG.music === false) return; try { poolOk[pOk]!.open(SFX_OK);    pOk  = (pOk+1)%poolOk.length   } catch (_e) {} }
  function sfxBack () { if (typeof CONFIG !== 'undefined' && CONFIG.music === false) return; try { poolBck[pBck]!.open(SFX_BACK); pBck = (pBck+1)%poolBck.length } catch (_e) {} }

  jsmaf.root.children.length = 0

  // ─── Styles ────────────────────────────────────────────────────────────────
  new Style({ name: 'logo',   color: 'rgb(255,185,50)',         size: 54 })
  new Style({ name: 'sub',    color: 'rgba(255,230,160,0.52)',  size: 17 })
  new Style({ name: 'label',  color: 'rgba(235,228,212,0.88)', size: 28 })
  new Style({ name: 'sel',    color: 'rgb(255,255,255)',        size: 28 })
  new Style({ name: 'num',    color: 'rgba(255,185,50,0.38)',   size: 13 })
  new Style({ name: 'numsel', color: 'rgb(255,200,80)',         size: 13 })
  new Style({ name: 'arr',    color: 'rgba(255,255,255,0.22)',  size: 28 })
  new Style({ name: 'arrsel', color: 'rgb(255,185,50)',         size: 28 })
  new Style({ name: 'exit',   color: 'rgb(255,90,100)',         size: 28 })
  new Style({ name: 'exitd',  color: 'rgba(255,90,100,0.58)',   size: 28 })
  new Style({ name: 'ftr',    color: 'rgba(255,215,130,0.36)',  size: 15 })

  // ─── Background ────────────────────────────────────────────────────────────
  const bg = new Image({ url: DARK, x: 0, y: 0, width: SW, height: SH })
  bg.alpha = 1.0; bg.borderWidth = 0; jsmaf.root.children.push(bg)
  // Amber glow top-left
  const gl = new Image({ url: AMBER, x: -80, y: -80, width: 700, height: 450 })
  gl.alpha = 0.030; gl.borderWidth = 0; jsmaf.root.children.push(gl)

  // ─── Header ────────────────────────────────────────────────────────────────
  const topBar = new Image({ url: AMBER, x: 0, y: 0, width: SW, height: 3 })
  topBar.alpha = 0.88; topBar.borderWidth = 0; jsmaf.root.children.push(topBar)
  const hBg = new Image({ url: WHITE, x: 0, y: 0, width: SW, height: HDR })
  hBg.alpha = 0.058; hBg.borderWidth = 0; jsmaf.root.children.push(hBg)
  const hAccent = new Image({ url: AMBER, x: 0, y: 0, width: 5, height: HDR })
  hAccent.alpha = 1.0; hAccent.borderWidth = 0; jsmaf.root.children.push(hAccent)
  const hLine = new Image({ url: AMBER, x: 0, y: HDR - 1, width: SW, height: 1 })
  hLine.alpha = 0.24; hLine.borderWidth = 0; jsmaf.root.children.push(hLine)

  const logoT = new jsmaf.Text()
  logoT.style = 'logo'; logoT.text = 'VAF-FREE'; logoT.x = CX - 128; logoT.y = 30
  jsmaf.root.children.push(logoT)
  const subT = new jsmaf.Text()
  subT.style = 'sub'; subT.text = 'PlayStation 4  ·  Jailbreak & Payload Manager'
  subT.x = CX - 228; subT.y = 112; jsmaf.root.children.push(subT)

  // ─── Menu buttons ──────────────────────────────────────────────────────────
  type Item = { label: string; script: string; num: string; ic: string }
  const items: Item[] = [
    { label: lang.jailbreak,   script: 'loader.js',       num: '01', ic: '⚡' },
    { label: lang.payloadMenu, script: 'payload_host.js', num: '02', ic: '◈'  },
    { label: lang.config,      script: 'config_ui.js',    num: '03', ic: '⚙'  },
  ]
  const btns: Image[] = []; const glws: Image[] = []; const bars: Image[] = []
  const txts: jsmaf.Text[] = []; const nums: jsmaf.Text[] = []; const arrs: jsmaf.Text[] = []
  const oB: { x: number; y: number }[] = []; const oT: { x: number; y: number }[] = []

  for (let i = 0; i < items.length; i++) {
    const o = items[i]!; const bY = SY + i * (BH + GAP)
    const btn = new Image({ url: WHITE, x: BL, y: bY, width: BW, height: BH })
    btn.alpha = 0.08; btn.borderColor = 'rgba(255,185,50,0.20)'; btn.borderWidth = 1
    btns.push(btn); jsmaf.root.children.push(btn)
    const glw = new Image({ url: AMBER, x: BL, y: bY, width: BW, height: BH })
    glw.alpha = 0; glw.borderWidth = 0
    glws.push(glw); jsmaf.root.children.push(glw)
    const bar = new Image({ url: AMBER, x: BL, y: bY, width: 5, height: BH })
    bar.alpha = 0.52; bar.borderWidth = 0
    bars.push(bar); jsmaf.root.children.push(bar)
    const num = new jsmaf.Text()
    num.style = 'num'; num.text = o.num; num.x = BL + 22; num.y = bY + BH - 28
    nums.push(num); jsmaf.root.children.push(num)
    const txt = new jsmaf.Text()
    txt.style = 'label'; txt.text = o.ic + '   ' + o.label.toUpperCase()
    txt.x = BL + 68; txt.y = bY + 38
    txts.push(txt); jsmaf.root.children.push(txt)
    const arrow = new jsmaf.Text()
    arrow.style = 'arr'; arrow.text = '›'; arrow.x = BL + BW - 52; arrow.y = bY + 36
    arrs.push(arrow); jsmaf.root.children.push(arrow)
    oB.push({ x: BL, y: bY }); oT.push({ x: txt.x, y: txt.y })
  }

  // ─── Exit button ───────────────────────────────────────────────────────────
  const eY = SY + items.length * (BH + GAP) + 24
  const eBt = new Image({ url: WHITE, x: BL, y: eY, width: BW, height: BH })
  eBt.alpha = 0.05; eBt.borderColor = 'rgba(240,70,80,0.24)'; eBt.borderWidth = 1
  btns.push(eBt); jsmaf.root.children.push(eBt)
  const eGlw = new Image({ url: RED, x: BL, y: eY, width: BW, height: BH })
  eGlw.alpha = 0; eGlw.borderWidth = 0
  glws.push(eGlw); jsmaf.root.children.push(eGlw)
  const eBar = new Image({ url: RED, x: BL, y: eY, width: 5, height: BH })
  eBar.alpha = 0.72; eBar.borderWidth = 0
  bars.push(eBar); jsmaf.root.children.push(eBar)
  const eNum = new jsmaf.Text()
  eNum.style = 'num'; eNum.text = '04'; eNum.x = BL + 22; eNum.y = eY + BH - 28
  nums.push(eNum); jsmaf.root.children.push(eNum)
  const eTxt = new jsmaf.Text()
  eTxt.style = 'exitd'; eTxt.text = '✕   ' + lang.exit.toUpperCase()
  eTxt.x = BL + 68; eTxt.y = eY + 38
  txts.push(eTxt); jsmaf.root.children.push(eTxt)
  const eArr = new jsmaf.Text()
  eArr.style = 'arr'; eArr.text = '›'; eArr.x = BL + BW - 52; eArr.y = eY + 36
  arrs.push(eArr); jsmaf.root.children.push(eArr)
  oB.push({ x: BL, y: eY }); oT.push({ x: eTxt.x, y: eTxt.y })

  // ─── Footer ────────────────────────────────────────────────────────────────
  const fLine = new Image({ url: AMBER, x: 0, y: SH - FTR, width: SW, height: 1 })
  fLine.alpha = 0.24; fLine.borderWidth = 0; jsmaf.root.children.push(fLine)
  const fBg = new Image({ url: WHITE, x: 0, y: SH - FTR + 1, width: SW, height: FTR - 1 })
  fBg.alpha = 0.05; fBg.borderWidth = 0; jsmaf.root.children.push(fBg)
  const clbl = jsmaf.circleIsAdvanceButton ? 'O' : 'X'
  const fTxt = new jsmaf.Text()
  fTxt.style = 'ftr'; fTxt.text = '↑↓  Navigate    ' + clbl + '  Select'
  fTxt.x = CX - 120; fTxt.y = SH - FTR + 18; jsmaf.root.children.push(fTxt)

  // ─── Highlight & navigation ────────────────────────────────────────────────
  let cur = 0; let prev = -1
  const TOTAL = btns.length

  function highlight () {
    for (let i = 0; i < TOTAL; i++) {
      const isExit = i === TOTAL - 1; const sel = i === cur
      btns[i]!.alpha       = sel ? 0.22 : isExit ? 0.05 : 0.08
      btns[i]!.borderColor = sel
        ? (isExit ? 'rgba(240,70,80,0.92)' : 'rgba(255,185,50,0.92)')
        : (isExit ? 'rgba(240,70,80,0.24)' : 'rgba(255,185,50,0.20)')
      btns[i]!.borderWidth = sel ? 2 : 1
      glws[i]!.alpha       = sel ? 0.07 : 0
      bars[i]!.alpha       = sel ? 1.0  : isExit ? 0.72 : 0.52
      txts[i]!.style       = sel ? (isExit ? 'exit' : 'sel') : (isExit ? 'exitd' : 'label')
      nums[i]!.style       = sel ? 'numsel' : 'num'
      arrs[i]!.style       = sel ? 'arrsel' : 'arr'
      if (i !== prev || sel) {
        const sc = sel ? 1.016 : 1.0
        const dX = sel ? -Math.round(BW * 0.008) : 0
        const dY = sel ? -Math.round(BH * 0.008) : 0
        btns[i]!.scaleX = sc; btns[i]!.scaleY = sc
        btns[i]!.x = oB[i]!.x + dX; btns[i]!.y = oB[i]!.y + dY
        glws[i]!.x = oB[i]!.x + dX; glws[i]!.y = oB[i]!.y + dY
        txts[i]!.scaleX = sc; txts[i]!.scaleY = sc
        txts[i]!.x = oT[i]!.x + dX
      }
    }
    prev = cur
  }

  const confirmKey = jsmaf.circleIsAdvanceButton ? 13 : 14
  jsmaf.onKeyDown = function (kc: number) {
    if (kc === 6 || kc === 5) { cur = (cur + 1) % TOTAL; sfxCur(); highlight()
    } else if (kc === 4 || kc === 7) { cur = (cur - 1 + TOTAL) % TOTAL; sfxCur(); highlight()
    } else if (kc === confirmKey) {
      sfxOk()
      if (cur === TOTAL - 1) { try { include('includes/kill_vue.js') } catch (_e) {} } else {
        const o = items[cur]; if (!o) return
        if (o.script === 'loader.js') jsmaf.onKeyDown = function () {}
        try {
          if (o.script === 'loader.js') { include(o.script) } else {
            include('themes/' + (typeof CONFIG !== 'undefined' && CONFIG.theme ? CONFIG.theme : 'default') + '/' + o.script)
          }
        } catch (e) { log('Nav error: ' + (e as Error).message) }
      }
    }
  }
  highlight()
  log('Main menu loaded.')
  ;((_a, _b, _c) => {})(libc_addr, sfxBack, RED)
})()

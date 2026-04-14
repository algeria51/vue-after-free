import { lang } from 'download0/languages'
import { libc_addr } from 'download0/userland'

;(function () {
  include('languages.js')
  log('Loading main menu...')
  if (typeof startBgmIfEnabled === 'function') startBgmIfEnabled()

  // ── Pixels ────────────────────────────────────────────────────────────────
  const DARK = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNg4xACAAA4ACGcHPdwAAAAAElFTkSuQmCC'
  const WHITE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC'
  const PURPLE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNY7/YfAAOcAfXVA39DAAAAAElFTkSuQmCC'
  const AMBER = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4v9MIAASlAeurtfG0AAAAAElFTkSuQmCC'
  const RED = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4HxAAAAPxAaAHMjeOAAAAAElFTkSuQmCC'

  // ── Layout ────────────────────────────────────────────────────────────────
  const SW = 1920; const SH = 1080; const CX = SW / 2
  const HDR = 150; const FTR = 50
  const BW = 740; const BH = 100; const BL = CX - BW / 2
  const SY = 240; const GAP = 120

  const SFX_CUR = 'file:///../download0/sfx/cursor.wav'
  const SFX_OK = 'file:///../download0/sfx/confirm.wav'
  const SFX_BACK = 'file:///../download0/sfx/cancel.wav'

  // ── Audio pools — 8 cursor clips prevents drop-outs on rapid input ────────
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

  // ── Styles ────────────────────────────────────────────────────────────────
  jsmaf.root.children.length = 0

  new Style({ name: 'logo', color: 'rgb(220,175,255)', size: 52 })
  new Style({ name: 'sub', color: 'rgba(200,155,255,0.55)', size: 17 })
  new Style({ name: 'label', color: 'rgba(225,215,255,0.85)', size: 28 })
  new Style({ name: 'sel', color: 'rgb(255,255,255)', size: 28 })
  new Style({ name: 'num', color: 'rgba(175,80,255,0.42)', size: 14 })
  new Style({ name: 'numsel', color: 'rgb(210,165,255)', size: 14 })
  new Style({ name: 'arrow', color: 'rgba(255,255,255,0.18)', size: 26 })
  new Style({ name: 'arrsel', color: 'rgb(210,165,255)', size: 26 })
  new Style({ name: 'exit', color: 'rgb(255,100,100)', size: 28 })
  new Style({ name: 'exitd', color: 'rgba(255,100,100,0.48)', size: 28 })
  new Style({ name: 'footer', color: 'rgba(210,200,255,0.30)', size: 16 })

  // ── Background ────────────────────────────────────────────────────────────
  const bg = new Image({ url: DARK, x: 0, y: 0, width: SW, height: SH })
  bg.alpha = 1.0; bg.borderWidth = 0
  jsmaf.root.children.push(bg)

  // Ambient corner glows
  const gl1 = new Image({ url: PURPLE, x: -120, y: -120, width: 900, height: 560 })
  gl1.alpha = 0.05; gl1.borderWidth = 0
  jsmaf.root.children.push(gl1)

  const gl2 = new Image({ url: AMBER, x: SW - 640, y: SH - 440, width: 760, height: 540 })
  gl2.alpha = 0.03; gl2.borderWidth = 0
  jsmaf.root.children.push(gl2)

  // ── Header ────────────────────────────────────────────────────────────────
  const hBg = new Image({ url: WHITE, x: 0, y: 0, width: SW, height: HDR })
  hBg.alpha = 0.05; hBg.borderWidth = 0
  jsmaf.root.children.push(hBg)

  const hBar = new Image({ url: PURPLE, x: 0, y: 0, width: 5, height: HDR })
  hBar.alpha = 1.0; hBar.borderWidth = 0
  jsmaf.root.children.push(hBar)

  const hDiv = new Image({ url: PURPLE, x: 0, y: HDR - 1, width: SW, height: 1 })
  hDiv.alpha = 0.30; hDiv.borderWidth = 0
  jsmaf.root.children.push(hDiv)

  const hGlow = new Image({ url: PURPLE, x: CX - 240, y: 14, width: 480, height: 90 })
  hGlow.alpha = 0.06; hGlow.borderWidth = 0
  jsmaf.root.children.push(hGlow)

  const logoT = new jsmaf.Text()
  logoT.style = 'logo'; logoT.text = 'VAF-FREE'
  logoT.x = CX - 134; logoT.y = 28; logoT.alpha = 1.0
  jsmaf.root.children.push(logoT)

  const subT = new jsmaf.Text()
  subT.style = 'sub'; subT.text = 'PlayStation 4  ·  Jailbreak & Payload Manager'
  subT.x = CX - 220; subT.y = 96; subT.alpha = 1.0
  jsmaf.root.children.push(subT)

  // ── Menu items ────────────────────────────────────────────────────────────
  type MenuItem = { label: string; script: string; num: string; icon: string }
  const items: MenuItem[] = [
    { label: lang.jailbreak, script: 'loader.js', num: '01', icon: '⚡' },
    { label: lang.payloadMenu, script: 'payload_host.js', num: '02', icon: '◈' },
    { label: lang.config, script: 'config_ui.js', num: '03', icon: '⚙' },
  ]

  const btns: Image[] = []
  const bars: Image[] = []
  const glws: Image[] = []
  const txts: jsmaf.Text[] = []
  const nums: jsmaf.Text[] = []
  const arrs: jsmaf.Text[] = []
  const origB: { x: number;y: number }[] = []
  const origT: { x: number;y: number }[] = []

  for (let i = 0; i < items.length; i++) {
    const o = items[i]!
    const bY = SY + i * GAP

    const btn = new Image({ url: WHITE, x: BL, y: bY, width: BW, height: BH })
    btn.alpha = 0.07; btn.borderColor = 'rgba(175,80,255,0.18)'; btn.borderWidth = 1
    btns.push(btn); jsmaf.root.children.push(btn)

    const glw = new Image({ url: PURPLE, x: BL, y: bY, width: BW, height: BH })
    glw.alpha = 0; glw.borderWidth = 0
    glws.push(glw); jsmaf.root.children.push(glw)

    const bar = new Image({ url: PURPLE, x: BL, y: bY, width: 5, height: BH })
    bar.alpha = 0.50; bar.borderWidth = 0
    bars.push(bar); jsmaf.root.children.push(bar)

    const num = new jsmaf.Text()
    num.style = 'num'; num.text = o.num
    num.x = BL + 20; num.y = bY + 50; num.alpha = 1.0
    nums.push(num); jsmaf.root.children.push(num)

    const txt = new jsmaf.Text()
    txt.style = 'label'; txt.text = o.icon + '  ' + o.label.toUpperCase()
    txt.x = BL + 60; txt.y = bY + 38; txt.alpha = 1.0
    txts.push(txt); jsmaf.root.children.push(txt)

    const arr = new jsmaf.Text()
    arr.style = 'arrow'; arr.text = '›'
    arr.x = BL + BW - 50; arr.y = bY + 36; arr.alpha = 1.0
    arrs.push(arr); jsmaf.root.children.push(arr)

    origB.push({ x: BL, y: bY })
    origT.push({ x: txt.x, y: txt.y })
  }

  // Exit button
  const eY = SY + items.length * GAP + 28
  const eBt = new Image({ url: WHITE, x: BL, y: eY, width: BW, height: BH })
  eBt.alpha = 0.05; eBt.borderColor = 'rgba(255,80,80,0.22)'; eBt.borderWidth = 1
  btns.push(eBt); jsmaf.root.children.push(eBt)

  const eGlw = new Image({ url: RED, x: BL, y: eY, width: BW, height: BH })
  eGlw.alpha = 0; eGlw.borderWidth = 0
  glws.push(eGlw); jsmaf.root.children.push(eGlw)

  const eBar = new Image({ url: RED, x: BL, y: eY, width: 5, height: BH })
  eBar.alpha = 0.75; eBar.borderWidth = 0
  bars.push(eBar); jsmaf.root.children.push(eBar)

  const eNum = new jsmaf.Text()
  eNum.style = 'num'; eNum.text = '04'
  eNum.x = BL + 20; eNum.y = eY + 50; eNum.alpha = 1.0
  nums.push(eNum); jsmaf.root.children.push(eNum)

  const eTxt = new jsmaf.Text()
  eTxt.style = 'exitd'; eTxt.text = '✕  ' + lang.exit.toUpperCase()
  eTxt.x = BL + 60; eTxt.y = eY + 38; eTxt.alpha = 1.0
  txts.push(eTxt); jsmaf.root.children.push(eTxt)

  const eArr = new jsmaf.Text()
  eArr.style = 'arrow'; eArr.text = '›'
  eArr.x = BL + BW - 50; eArr.y = eY + 36; eArr.alpha = 1.0
  arrs.push(eArr); jsmaf.root.children.push(eArr)

  origB.push({ x: BL, y: eY })
  origT.push({ x: eTxt.x, y: eTxt.y })

  // ── Footer ────────────────────────────────────────────────────────────────
  const fLine = new Image({ url: PURPLE, x: 0, y: SH - FTR, width: SW, height: 1 })
  fLine.alpha = 0.22; fLine.borderWidth = 0
  jsmaf.root.children.push(fLine)

  const fBg = new Image({ url: WHITE, x: 0, y: SH - FTR + 1, width: SW, height: FTR - 1 })
  fBg.alpha = 0.06; fBg.borderWidth = 0
  jsmaf.root.children.push(fBg)

  const clbl = jsmaf.circleIsAdvanceButton ? 'O' : 'X'
  const fTxt = new jsmaf.Text()
  fTxt.style = 'footer'; fTxt.text = '↑↓  Navigate    ' + clbl + '  Select'
  fTxt.x = CX - 130; fTxt.y = SH - FTR + 17; fTxt.alpha = 1.0
  jsmaf.root.children.push(fTxt)

  // ── Selection ─────────────────────────────────────────────────────────────
  let cur = 0; let prev = -1
  const TOTAL = btns.length

  function highlight () {
    for (let i = 0; i < TOTAL; i++) {
      const isExit = i === TOTAL - 1
      const sel = i === cur

      btns[i]!.alpha = sel ? 0.22 : (isExit ? 0.05 : 0.07)
      btns[i]!.borderColor = sel
        ? (isExit ? 'rgba(255,100,100,0.90)' : 'rgba(175,80,255,0.90)')
        : (isExit ? 'rgba(255,80,80,0.22)' : 'rgba(175,80,255,0.18)')
      btns[i]!.borderWidth = sel ? 2 : 1
      glws[i]!.alpha = sel ? 0.07 : 0
      bars[i]!.alpha = sel ? 1.0 : (isExit ? 0.75 : 0.50)
      txts[i]!.style = sel ? (isExit ? 'exit' : 'sel') : (isExit ? 'exitd' : 'label')
      nums[i]!.style = sel ? 'numsel' : 'num'
      arrs[i]!.style = sel ? 'arrsel' : 'arrow'
      txts[i]!.alpha = 1.0
      nums[i]!.alpha = 1.0
      arrs[i]!.alpha = 1.0

      if (i !== prev || sel) {
        const sc = sel ? 1.020 : 1.0
        const dX = sel ? -Math.round(BW * 0.010) : 0
        const dY = sel ? -Math.round(BH * 0.010) : 0
        btns[i]!.scaleX = sc; btns[i]!.scaleY = sc
        btns[i]!.x = origB[i]!.x + dX; btns[i]!.y = origB[i]!.y + dY
        glws[i]!.x = origB[i]!.x + dX; glws[i]!.y = origB[i]!.y + dY
        txts[i]!.scaleX = sc; txts[i]!.scaleY = sc
        txts[i]!.x = origT[i]!.x + dX
      }
    }
    prev = cur
  }

  // ── Input ─────────────────────────────────────────────────────────────────
  const confirmKey = jsmaf.circleIsAdvanceButton ? 13 : 14

  jsmaf.onKeyDown = function (kc: number) {
    if (kc === 6 || kc === 5) {
      cur = (cur + 1) % TOTAL; sfxCur(); highlight()
    } else if (kc === 4 || kc === 7) {
      cur = (cur - 1 + TOTAL) % TOTAL; sfxCur(); highlight()
    } else if (kc === confirmKey) {
      sfxOk()
      if (cur === TOTAL - 1) {
        try { include('includes/kill_vue.js') } catch (_e) {}
      } else {
        const o = items[cur]; if (!o) return
        if (o.script === 'loader.js') jsmaf.onKeyDown = function () {}
        try {
          if (o.script === 'loader.js') {
            include(o.script)
          } else {
            include('themes/' + (typeof CONFIG !== 'undefined' && CONFIG.theme ? CONFIG.theme : 'default') + '/' + o.script)
          }
        } catch (e) { log('Nav error: ' + (e as Error).message) }
      }
    }
  }

  highlight()
  log('Main menu loaded.')
  ;((_a, _b, _c) => {})(libc_addr, sfxBack, AMBER)
})()

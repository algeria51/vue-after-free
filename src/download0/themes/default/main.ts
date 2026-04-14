import { lang } from 'download0/languages'
import { libc_addr } from 'download0/userland'

;(function () {
  include('languages.js')
  log('Loading main menu...')
  if (typeof startBgmIfEnabled === 'function') startBgmIfEnabled()

  // ── Pixels ────────────────────────────────────────────────────────────────
  const DARK = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNg4xACAAA4ACGcHPdwAAAAAElFTkSuQmCC'
  const WHITE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC'
  const CYAN = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGMIOPEfAAODAhiMwlb1AAAAAElFTkSuQmCC'
  const RED = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4HxAAAAPxAaAHMjeOAAAAAElFTkSuQmCC'
  const BLUE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNgYHj+nwoAA7QCCMmFsCAAAAAASUVORK5CYII='

  // ── Layout ────────────────────────────────────────────────────────────────
  const SW = 1920; const SH = 1080; const CX = SW / 2
  const HDR = 150; const FTR = 50
  const BW = 720; const BH = 96; const BL = CX - BW / 2
  const SY = 260; const GAP = 118

  const SFX_CUR = 'file:///../download0/sfx/cursor.wav'
  const SFX_OK = 'file:///../download0/sfx/confirm.wav'
  const SFX_BACK = 'file:///../download0/sfx/cancel.wav'

  // ── FIX: Pre-created audio pools — GC cannot collect them ─────────────────
  // Using 3 clips per sound and cycling ensures continuous playback even when
  // pressing buttons rapidly, because references stay alive in the IIFE scope
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

  // ── Styles (simple names, no underscores) ─────────────────────────────────
  jsmaf.root.children.length = 0

  new Style({ name: 'logo', color: 'rgb(80,215,255)', size: 50 })
  new Style({ name: 'sub', color: 'rgba(150,215,255,0.55)', size: 17 })
  new Style({ name: 'label', color: 'rgba(230,240,255,0.85)', size: 28 })
  new Style({ name: 'sel', color: 'rgb(255,255,255)', size: 28 })
  new Style({ name: 'num', color: 'rgba(80,210,255,0.40)', size: 14 })
  new Style({ name: 'numsel', color: 'rgb(80,210,255)', size: 14 })
  new Style({ name: 'arrow', color: 'rgba(255,255,255,0.18)', size: 24 })
  new Style({ name: 'arrsel', color: 'rgb(80,210,255)', size: 24 })
  new Style({ name: 'exit', color: 'rgb(255,100,100)', size: 28 })
  new Style({ name: 'exitd', color: 'rgba(255,100,100,0.45)', size: 28 })
  new Style({ name: 'footer', color: 'rgba(200,220,255,0.28)', size: 16 })

  // ── Background ────────────────────────────────────────────────────────────
  const bg = new Image({ url: DARK, x: 0, y: 0, width: SW, height: SH })
  bg.alpha = 1.0; bg.borderWidth = 0
  jsmaf.root.children.push(bg)

  // Ambient corner glows
  const gl1 = new Image({ url: CYAN, x: -80, y: -80, width: 800, height: 500 })
  gl1.alpha = 0.05; gl1.borderWidth = 0
  jsmaf.root.children.push(gl1)

  const gl2 = new Image({ url: BLUE, x: SW - 600, y: SH - 400, width: 700, height: 500 })
  gl2.alpha = 0.04; gl2.borderWidth = 0
  jsmaf.root.children.push(gl2)

  // ── Header ────────────────────────────────────────────────────────────────
  const hBg = new Image({ url: WHITE, x: 0, y: 0, width: SW, height: HDR })
  hBg.alpha = 0.05; hBg.borderWidth = 0
  jsmaf.root.children.push(hBg)

  // Accent stripe left
  const hBar = new Image({ url: CYAN, x: 0, y: 0, width: 5, height: HDR })
  hBar.alpha = 1.0; hBar.borderWidth = 0
  jsmaf.root.children.push(hBar)

  // Header bottom divider
  const hDiv = new Image({ url: CYAN, x: 0, y: HDR - 1, width: SW, height: 1 })
  hDiv.alpha = 0.25; hDiv.borderWidth = 0
  jsmaf.root.children.push(hDiv)

  // Glow accent behind title
  const hGlow = new Image({ url: CYAN, x: CX - 220, y: 18, width: 440, height: 80 })
  hGlow.alpha = 0.06; hGlow.borderWidth = 0
  jsmaf.root.children.push(hGlow)

  const logoT = new jsmaf.Text()
  logoT.text = 'VAF-FREE'; logoT.x = CX - 118; logoT.y = 34
  logoT.style = 'logo'; logoT.alpha = 1.0
  jsmaf.root.children.push(logoT)

  const subT = new jsmaf.Text()
  subT.text = 'PlayStation 4  ·  Jailbreak & Payload Manager'
  subT.x = CX - 210; subT.y = 96; subT.style = 'sub'; subT.alpha = 1.0
  jsmaf.root.children.push(subT)

  // ── Buttons ───────────────────────────────────────────────────────────────
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
    btn.alpha = 0.07; btn.borderColor = 'rgba(80,180,255,0.15)'; btn.borderWidth = 1
    btns.push(btn); jsmaf.root.children.push(btn)

    // Selection glow (behind bar)
    const glw = new Image({ url: CYAN, x: BL, y: bY, width: BW, height: BH })
    glw.alpha = 0; glw.borderWidth = 0
    glws.push(glw); jsmaf.root.children.push(glw)

    const bar = new Image({ url: CYAN, x: BL, y: bY, width: 4, height: BH })
    bar.alpha = 0.45; bar.borderWidth = 0
    bars.push(bar); jsmaf.root.children.push(bar)

    const num = new jsmaf.Text(); num.text = o.num
    num.x = BL + 18; num.y = bY + 44; num.style = 'num'; num.alpha = 1.0
    nums.push(num); jsmaf.root.children.push(num)

    // icon + label
    const txt = new jsmaf.Text(); txt.text = o.icon + '  ' + o.label.toUpperCase()
    txt.x = BL + 54; txt.y = bY + 35; txt.style = 'label'; txt.alpha = 1.0
    txts.push(txt); jsmaf.root.children.push(txt)

    const arr = new jsmaf.Text(); arr.text = '›'
    arr.x = BL + BW - 44; arr.y = bY + 32; arr.style = 'arrow'; arr.alpha = 1.0
    arrs.push(arr); jsmaf.root.children.push(arr)

    origB.push({ x: BL, y: bY })
    origT.push({ x: txt.x, y: txt.y })
  }

  // Exit button
  const eY = SY + items.length * GAP + 24
  const eBt = new Image({ url: WHITE, x: BL, y: eY, width: BW, height: BH })
  eBt.alpha = 0.05; eBt.borderColor = 'rgba(255,80,80,0.20)'; eBt.borderWidth = 1
  btns.push(eBt); jsmaf.root.children.push(eBt)

  const eGlw = new Image({ url: RED, x: BL, y: eY, width: BW, height: BH })
  eGlw.alpha = 0; eGlw.borderWidth = 0
  glws.push(eGlw); jsmaf.root.children.push(eGlw)

  const eBar = new Image({ url: RED, x: BL, y: eY, width: 4, height: BH })
  eBar.alpha = 0.70; eBar.borderWidth = 0
  bars.push(eBar); jsmaf.root.children.push(eBar)

  const eNum = new jsmaf.Text(); eNum.text = '04'
  eNum.x = BL + 18; eNum.y = eY + 44; eNum.style = 'num'; eNum.alpha = 1.0
  nums.push(eNum); jsmaf.root.children.push(eNum)

  const eTxt = new jsmaf.Text(); eTxt.text = '✕  ' + lang.exit.toUpperCase()
  eTxt.x = BL + 54; eTxt.y = eY + 35; eTxt.style = 'exitd'; eTxt.alpha = 1.0
  txts.push(eTxt); jsmaf.root.children.push(eTxt)

  const eArr = new jsmaf.Text(); eArr.text = '›'
  eArr.x = BL + BW - 44; eArr.y = eY + 32; eArr.style = 'arrow'; eArr.alpha = 1.0
  arrs.push(eArr); jsmaf.root.children.push(eArr)

  origB.push({ x: BL, y: eY })
  origT.push({ x: eTxt.x, y: eTxt.y })

  // ── Footer ────────────────────────────────────────────────────────────────
  const fLine = new Image({ url: CYAN, x: 0, y: SH - FTR, width: SW, height: 1 })
  fLine.alpha = 0.18; fLine.borderWidth = 0
  jsmaf.root.children.push(fLine)

  const fBg = new Image({ url: WHITE, x: 0, y: SH - FTR + 1, width: SW, height: FTR - 1 })
  fBg.alpha = 0.07; fBg.borderWidth = 0
  jsmaf.root.children.push(fBg)

  const clbl = jsmaf.circleIsAdvanceButton ? 'O' : 'X'
  const fTxt = new jsmaf.Text()
  fTxt.text = '↑↓  Navigate    ' + clbl + '  Select'
  fTxt.x = CX - 130; fTxt.y = SH - FTR + 17; fTxt.style = 'footer'; fTxt.alpha = 1.0
  jsmaf.root.children.push(fTxt)

  // ── Selection logic ───────────────────────────────────────────────────────
  let cur = 0; let prev = -1
  const TOTAL = btns.length

  function highlight () {
    for (let i = 0; i < TOTAL; i++) {
      const isExit = i === TOTAL - 1
      const sel = i === cur

      btns[i]!.alpha = sel ? 0.20 : (isExit ? 0.05 : 0.07)
      btns[i]!.borderColor = sel
        ? (isExit ? 'rgba(255,100,100,0.85)' : 'rgba(80,210,255,0.85)')
        : (isExit ? 'rgba(255,80,80,0.20)' : 'rgba(80,180,255,0.15)')
      btns[i]!.borderWidth = sel ? 2 : 1
      glws[i]!.alpha = sel ? 0.06 : 0
      bars[i]!.alpha = sel ? 1.0 : (isExit ? 0.70 : 0.45)
      txts[i]!.style = sel ? (isExit ? 'exit' : 'sel') : (isExit ? 'exitd' : 'label')
      nums[i]!.style = sel ? 'numsel' : 'num'
      arrs[i]!.style = sel ? 'arrsel' : 'arrow'
      txts[i]!.alpha = 1.0
      nums[i]!.alpha = 1.0
      arrs[i]!.alpha = 1.0

      if (i !== prev || sel) {
        const sc = sel ? 1.022 : 1.0
        const dX = sel ? -Math.round(BW * 0.011) : 0
        const dY = sel ? -Math.round(BH * 0.011) : 0
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
  ;((_a, _b, _c) => {})(libc_addr, sfxBack, BLUE)
})()

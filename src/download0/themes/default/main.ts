import { lang } from 'download0/languages'
import { libc_addr } from 'download0/userland'

;(function () {
  include('languages.js')
  log('Loading main menu...')
  if (typeof startBgmIfEnabled === 'function') startBgmIfEnabled()

  // ── Pixels ────────────────────────────────────────────────────────────────
  const DARK   = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGPg4RMDAABaADEUPDZQAAAAAElFTkSuQmCC'
  const WHITE  = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC'
  const CYAN   = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNguPQMAAKOAbnVoJuKAAAAAElFTkSuQmCC'
  const AMBER  = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4v4UBAARpAbSv3l+wAAAAAElFTkSuQmCC'
  const RED    = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP47xYAAAPdAZZlZDzjAAAAAElFTkSuQmCC'

  // ── Layout ────────────────────────────────────────────────────────────────
  const SW = 1920, SH = 1080, CX = SW / 2
  const HDR = 160, FTR = 50
  const BW = 720, BH = 96, BL = CX - BW / 2
  const SY = 230, GAP = 22

  const SFX_CUR  = 'file:///../download0/sfx/cursor.wav'
  const SFX_OK   = 'file:///../download0/sfx/confirm.wav'
  const SFX_BACK = 'file:///../download0/sfx/cancel.wav'

  const poolCur  = Array.from({ length: 8 }, () => { const c = new jsmaf.AudioClip(); c.volume = 1.0; return c })
  const poolOk   = Array.from({ length: 4 }, () => { const c = new jsmaf.AudioClip(); c.volume = 1.0; return c })
  const poolBack = Array.from({ length: 4 }, () => { const c = new jsmaf.AudioClip(); c.volume = 1.0; return c })
  let idxCur = 0, idxOk = 0, idxBack = 0

  function sfxCur () {
    if (typeof CONFIG !== 'undefined' && CONFIG.music === false) return
    try { poolCur[idxCur]!.open(SFX_CUR);   idxCur  = (idxCur  + 1) % poolCur.length  } catch (_e) {}
  }
  function sfxOk () {
    if (typeof CONFIG !== 'undefined' && CONFIG.music === false) return
    try { poolOk[idxOk]!.open(SFX_OK);      idxOk   = (idxOk   + 1) % poolOk.length   } catch (_e) {}
  }
  function sfxBack () {
    if (typeof CONFIG !== 'undefined' && CONFIG.music === false) return
    try { poolBack[idxBack]!.open(SFX_BACK); idxBack = (idxBack + 1) % poolBack.length  } catch (_e) {}
  }

  jsmaf.root.children.length = 0

  new Style({ name: 'logo',   color: 'rgb(0,220,240)',          size: 54 })
  new Style({ name: 'sub',    color: 'rgba(120,235,255,0.42)',  size: 17 })
  new Style({ name: 'label',  color: 'rgba(195,240,255,0.78)',  size: 27 })
  new Style({ name: 'sel',    color: 'rgb(255,255,255)',         size: 27 })
  new Style({ name: 'num',    color: 'rgba(0,210,230,0.32)',    size: 13 })
  new Style({ name: 'numsel', color: 'rgb(0,230,250)',          size: 13 })
  new Style({ name: 'arrow',  color: 'rgba(255,255,255,0.14)', size: 26 })
  new Style({ name: 'arrsel', color: 'rgb(0,230,250)',          size: 26 })
  new Style({ name: 'exit',   color: 'rgb(255,90,100)',         size: 27 })
  new Style({ name: 'exitd',  color: 'rgba(255,90,100,0.48)',   size: 27 })
  new Style({ name: 'footer', color: 'rgba(120,230,255,0.26)', size: 15 })

  // Background
  const bg = new Image({ url: DARK, x: 0, y: 0, width: SW, height: SH })
  bg.alpha = 1.0; bg.borderWidth = 0
  jsmaf.root.children.push(bg)

  const topStrip = new Image({ url: CYAN, x: 0, y: 0, width: SW, height: 3 })
  topStrip.alpha = 0.80; topStrip.borderWidth = 0
  jsmaf.root.children.push(topStrip)

  const gl1 = new Image({ url: CYAN, x: -200, y: -150, width: 900, height: 600 })
  gl1.alpha = 0.022; gl1.borderWidth = 0
  jsmaf.root.children.push(gl1)

  const gl2 = new Image({ url: AMBER, x: SW - 600, y: SH - 400, width: 700, height: 500 })
  gl2.alpha = 0.016; gl2.borderWidth = 0
  jsmaf.root.children.push(gl2)

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

  const hGlow = new Image({ url: CYAN, x: CX - 300, y: 0, width: 600, height: HDR })
  hGlow.alpha = 0.025; hGlow.borderWidth = 0
  jsmaf.root.children.push(hGlow)

  const logoT = new jsmaf.Text()
  logoT.style = 'logo'; logoT.text = 'VAF-FREE'
  logoT.x = CX - 122; logoT.y = 26; logoT.alpha = 1.0
  jsmaf.root.children.push(logoT)

  const subT = new jsmaf.Text()
  subT.style = 'sub'; subT.text = 'PlayStation 4  ·  Jailbreak & Payload Manager'
  subT.x = CX - 220; subT.y = 108; subT.alpha = 1.0
  jsmaf.root.children.push(subT)

  // Menu items
  type MenuItem = { label: string; script: string; num: string; icon: string }
  const items: MenuItem[] = [
    { label: lang.jailbreak,   script: 'loader.js',       num: '01', icon: '⚡' },
    { label: lang.payloadMenu, script: 'payload_host.js', num: '02', icon: '◈' },
    { label: lang.config,      script: 'config_ui.js',    num: '03', icon: '⚙' },
  ]

  const btns: Image[]      = []
  const bars: Image[]      = []
  const glws: Image[]      = []
  const txts: jsmaf.Text[] = []
  const nums: jsmaf.Text[] = []
  const arrs: jsmaf.Text[] = []
  const origB: {x:number;y:number}[] = []
  const origT: {x:number;y:number}[] = []

  for (let i = 0; i < items.length; i++) {
    const o = items[i]!
    const bY = SY + i * (BH + GAP)

    const btn = new Image({ url: WHITE, x: BL, y: bY, width: BW, height: BH })
    btn.alpha = 0.06; btn.borderColor = 'rgba(0,200,230,0.16)'; btn.borderWidth = 1
    btns.push(btn); jsmaf.root.children.push(btn)

    const glw = new Image({ url: CYAN, x: BL, y: bY, width: BW, height: BH })
    glw.alpha = 0; glw.borderWidth = 0
    glws.push(glw); jsmaf.root.children.push(glw)

    const bar = new Image({ url: CYAN, x: BL, y: bY, width: 4, height: BH })
    bar.alpha = 0.40; bar.borderWidth = 0
    bars.push(bar); jsmaf.root.children.push(bar)

    const num = new jsmaf.Text()
    num.style = 'num'; num.text = o.num
    num.x = BL + 22; num.y = bY + BH - 26; num.alpha = 1.0
    nums.push(num); jsmaf.root.children.push(num)

    const txt = new jsmaf.Text()
    txt.style = 'label'; txt.text = o.icon + '   ' + o.label.toUpperCase()
    txt.x = BL + 62; txt.y = bY + 36; txt.alpha = 1.0
    txts.push(txt); jsmaf.root.children.push(txt)

    const arr = new jsmaf.Text()
    arr.style = 'arrow'; arr.text = '›'
    arr.x = BL + BW - 52; arr.y = bY + 34; arr.alpha = 1.0
    arrs.push(arr); jsmaf.root.children.push(arr)

    origB.push({ x: BL, y: bY })
    origT.push({ x: txt.x, y: txt.y })
  }

  // Exit button
  const eY = SY + items.length * (BH + GAP) + 20
  const eBt = new Image({ url: WHITE, x: BL, y: eY, width: BW, height: BH })
  eBt.alpha = 0.04; eBt.borderColor = 'rgba(255,80,90,0.20)'; eBt.borderWidth = 1
  btns.push(eBt); jsmaf.root.children.push(eBt)

  const eGlw = new Image({ url: RED, x: BL, y: eY, width: BW, height: BH })
  eGlw.alpha = 0; eGlw.borderWidth = 0
  glws.push(eGlw); jsmaf.root.children.push(eGlw)

  const eBar = new Image({ url: RED, x: BL, y: eY, width: 4, height: BH })
  eBar.alpha = 0.60; eBar.borderWidth = 0
  bars.push(eBar); jsmaf.root.children.push(eBar)

  const eNum = new jsmaf.Text()
  eNum.style = 'num'; eNum.text = '04'
  eNum.x = BL + 22; eNum.y = eY + BH - 26; eNum.alpha = 1.0
  nums.push(eNum); jsmaf.root.children.push(eNum)

  const eTxt = new jsmaf.Text()
  eTxt.style = 'exitd'; eTxt.text = '✕   ' + lang.exit.toUpperCase()
  eTxt.x = BL + 62; eTxt.y = eY + 36; eTxt.alpha = 1.0
  txts.push(eTxt); jsmaf.root.children.push(eTxt)

  const eArr = new jsmaf.Text()
  eArr.style = 'arrow'; eArr.text = '›'
  eArr.x = BL + BW - 52; eArr.y = eY + 34; eArr.alpha = 1.0
  arrs.push(eArr); jsmaf.root.children.push(eArr)

  origB.push({ x: BL, y: eY })
  origT.push({ x: eTxt.x, y: eTxt.y })

  // Footer
  const fLine = new Image({ url: CYAN, x: 0, y: SH - FTR, width: SW, height: 1 })
  fLine.alpha = 0.18; fLine.borderWidth = 0
  jsmaf.root.children.push(fLine)

  const fBg = new Image({ url: WHITE, x: 0, y: SH - FTR + 1, width: SW, height: FTR - 1 })
  fBg.alpha = 0.05; fBg.borderWidth = 0
  jsmaf.root.children.push(fBg)

  const clbl = jsmaf.circleIsAdvanceButton ? 'O' : 'X'
  const fTxt = new jsmaf.Text()
  fTxt.style = 'footer'; fTxt.text = '↑↓  Navigate    ' + clbl + '  Select'
  fTxt.x = CX - 120; fTxt.y = SH - FTR + 18; fTxt.alpha = 1.0
  jsmaf.root.children.push(fTxt)

  let cur = 0; let prev = -1
  const TOTAL = btns.length

  function highlight () {
    for (let i = 0; i < TOTAL; i++) {
      const isExit = i === TOTAL - 1
      const sel    = i === cur

      btns[i]!.alpha       = sel ? 0.20 : (isExit ? 0.04 : 0.06)
      btns[i]!.borderColor = sel
        ? (isExit ? 'rgba(255,80,90,0.88)' : 'rgba(0,200,230,0.88)')
        : (isExit ? 'rgba(255,80,90,0.20)' : 'rgba(0,200,230,0.16)')
      btns[i]!.borderWidth = sel ? 2 : 1
      glws[i]!.alpha       = sel ? 0.06 : 0
      bars[i]!.alpha       = sel ? 1.0  : (isExit ? 0.60 : 0.40)
      txts[i]!.style       = sel ? (isExit ? 'exit' : 'sel') : (isExit ? 'exitd' : 'label')
      nums[i]!.style       = sel ? 'numsel' : 'num'
      arrs[i]!.style       = sel ? 'arrsel' : 'arrow'
      txts[i]!.alpha       = 1.0
      nums[i]!.alpha       = 1.0
      arrs[i]!.alpha       = 1.0

      if (i !== prev || sel) {
        const sc = sel ? 1.018 : 1.0
        const dX = sel ? -Math.round(BW * 0.009) : 0
        const dY = sel ? -Math.round(BH * 0.009) : 0
        btns[i]!.scaleX = sc; btns[i]!.scaleY = sc
        btns[i]!.x = origB[i]!.x + dX; btns[i]!.y = origB[i]!.y + dY
        glws[i]!.x = origB[i]!.x + dX; glws[i]!.y = origB[i]!.y + dY
        txts[i]!.scaleX = sc; txts[i]!.scaleY = sc
        txts[i]!.x = origT[i]!.x + dX
      }
    }
    prev = cur
  }

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

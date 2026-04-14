import { lang } from 'download0/languages'
import { libc_addr } from 'download0/userland'

;(function () {
  include('languages.js')
  log('Loading main menu...')

  if (typeof startBgmIfEnabled === 'function') startBgmIfEnabled()

  // ── Inline pixels ─────────────────────────────────────────────────────────
  const DARK_PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNg4xACAAA4ACGcHPdwAAAAAElFTkSuQmCC'
  const WHITE_PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC'
  const CYAN_PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGMIOPEfAAODAhiMwlb1AAAAAElFTkSuQmCC'
  const RED_PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4HxAAAAPxAaAHMjeOAAAAAElFTkSuQmCC'

  // ── Layout constants ──────────────────────────────────────────────────────
  const SW = 1920
  const SH = 1080
  const CX = SW / 2
  const HEADER_H = 138
  const FOOTER_H = 46
  const BTN_W = 700
  const BTN_H = 92
  const BTN_L = CX - BTN_W / 2
  const START_Y = 290
  const GAP = 114

  const SFX_CUR = 'file:///../download0/sfx/cursor.wav'
  const SFX_OK = 'file:///../download0/sfx/confirm.wav'
  const SFX_BCK = 'file:///../download0/sfx/cancel.wav'

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

  // ── Styles — 'm_' prefix prevents collision with other screens ────────────
  jsmaf.root.children.length = 0

  new Style({ name: 'm_logo', color: 'rgb(80,210,255)', size: 46 })
  new Style({ name: 'm_logosub', color: 'rgba(160,220,255,0.55)', size: 17 })
  new Style({ name: 'm_label', color: 'rgba(255,255,255,0.88)', size: 26 })
  new Style({ name: 'm_sel', color: 'rgb(120,225,255)', size: 26 })
  new Style({ name: 'm_num', color: 'rgba(120,200,255,0.36)', size: 14 })
  new Style({ name: 'm_numsel', color: 'rgba(80,210,255,1.00)', size: 14 })
  new Style({ name: 'm_arrow', color: 'rgba(255,255,255,0.22)', size: 22 })
  new Style({ name: 'm_arrsel', color: 'rgba(80,210,255,0.95)', size: 22 })
  new Style({ name: 'm_exit', color: 'rgb(255,110,110)', size: 26 })
  new Style({ name: 'm_exitd', color: 'rgba(255,110,110,0.48)', size: 26 })
  new Style({ name: 'm_footer', color: 'rgba(255,255,255,0.30)', size: 16 })

  // ── Background ────────────────────────────────────────────────────────────
  const bgBase = new Image({ url: DARK_PX, x: 0, y: 0, width: SW, height: SH })
  bgBase.alpha = 1.0; bgBase.borderWidth = 0
  jsmaf.root.children.push(bgBase)

  const glow1 = new Image({ url: CYAN_PX, x: 0, y: 0, width: 700, height: 380 })
  glow1.alpha = 0.04; glow1.borderWidth = 0
  jsmaf.root.children.push(glow1)

  const glow2 = new Image({ url: CYAN_PX, x: SW - 480, y: SH - 280, width: 480, height: 280 })
  glow2.alpha = 0.025; glow2.borderWidth = 0
  jsmaf.root.children.push(glow2)

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

  const logoTxt = new jsmaf.Text()
  logoTxt.text = 'VAF-FREE'
  logoTxt.x = CX - 110; logoTxt.y = 30; logoTxt.style = 'm_logo'
  jsmaf.root.children.push(logoTxt)

  const logoSub = new jsmaf.Text()
  logoSub.text = 'PlayStation 4  ·  Jailbreak & Payload Tool'
  logoSub.x = CX - 196; logoSub.y = 92; logoSub.style = 'm_logosub'
  jsmaf.root.children.push(logoSub)

  // ── Menu items ────────────────────────────────────────────────────────────
  type MenuItem = { label: string; script: string; num: string }
  const menuOptions: MenuItem[] = [
    { label: lang.jailbreak, script: 'loader.js', num: '01' },
    { label: lang.payloadMenu, script: 'payload_host.js', num: '02' },
    { label: lang.config, script: 'config_ui.js', num: '03' },
  ]

  const btns: Image[] = []
  const bars: Image[] = []
  const texts: jsmaf.Text[] = []
  const nums: jsmaf.Text[] = []
  const arrs: jsmaf.Text[] = []
  const origB: { x: number; y: number }[] = []
  const origT: { x: number; y: number }[] = []

  for (let i = 0; i < menuOptions.length; i++) {
    const o = menuOptions[i]!
    const bY = START_Y + i * GAP

    const btn = new Image({ url: WHITE_PX, x: BTN_L, y: bY, width: BTN_W, height: BTN_H })
    btn.alpha = 0.07; btn.borderColor = 'rgba(120,200,255,0.18)'; btn.borderWidth = 1
    btns.push(btn); jsmaf.root.children.push(btn)

    const bar = new Image({ url: CYAN_PX, x: BTN_L, y: bY, width: 4, height: BTN_H })
    bar.alpha = 0.55; bar.borderWidth = 0
    bars.push(bar); jsmaf.root.children.push(bar)

    const num = new jsmaf.Text(); num.text = o.num
    num.x = BTN_L + 18; num.y = bY + 42; num.style = 'm_num'
    nums.push(num); jsmaf.root.children.push(num)

    const txt = new jsmaf.Text(); txt.text = o.label.toUpperCase()
    txt.x = BTN_L + 58; txt.y = bY + 34; txt.style = 'm_label'
    texts.push(txt); jsmaf.root.children.push(txt)

    const arr = new jsmaf.Text(); arr.text = '›'
    arr.x = BTN_L + BTN_W - 42; arr.y = bY + 30; arr.style = 'm_arrow'
    arrs.push(arr); jsmaf.root.children.push(arr)

    origB.push({ x: BTN_L, y: bY })
    origT.push({ x: txt.x, y: txt.y })
  }

  // Exit button
  const exitY = START_Y + menuOptions.length * GAP + 22
  const exitBtn = new Image({ url: WHITE_PX, x: BTN_L, y: exitY, width: BTN_W, height: BTN_H })
  exitBtn.alpha = 0.055; exitBtn.borderColor = 'rgba(255,80,80,0.22)'; exitBtn.borderWidth = 1
  btns.push(exitBtn); jsmaf.root.children.push(exitBtn)

  const exitBar = new Image({ url: RED_PX, x: BTN_L, y: exitY, width: 4, height: BTN_H })
  exitBar.alpha = 0.75; exitBar.borderWidth = 0
  bars.push(exitBar); jsmaf.root.children.push(exitBar)

  const exitNum = new jsmaf.Text(); exitNum.text = '04'
  exitNum.x = BTN_L + 18; exitNum.y = exitY + 42; exitNum.style = 'm_num'
  nums.push(exitNum); jsmaf.root.children.push(exitNum)

  const exitTxt = new jsmaf.Text(); exitTxt.text = lang.exit.toUpperCase()
  exitTxt.x = BTN_L + 58; exitTxt.y = exitY + 34; exitTxt.style = 'm_exitd'
  texts.push(exitTxt); jsmaf.root.children.push(exitTxt)

  const exitArr = new jsmaf.Text(); exitArr.text = '›'
  exitArr.x = BTN_L + BTN_W - 42; exitArr.y = exitY + 30; exitArr.style = 'm_arrow'
  arrs.push(exitArr); jsmaf.root.children.push(exitArr)

  origB.push({ x: BTN_L, y: exitY })
  origT.push({ x: exitTxt.x, y: exitTxt.y })

  // ── Footer ────────────────────────────────────────────────────────────────
  const footLine = new Image({ url: CYAN_PX, x: 0, y: SH - FOOTER_H, width: SW, height: 1 })
  footLine.alpha = 0.18; footLine.borderWidth = 0
  jsmaf.root.children.push(footLine)

  const footBg = new Image({ url: WHITE_PX, x: 0, y: SH - FOOTER_H + 1, width: SW, height: FOOTER_H - 1 })
  footBg.alpha = 0.09; footBg.borderWidth = 0
  jsmaf.root.children.push(footBg)

  const confirmLabel = jsmaf.circleIsAdvanceButton ? 'O' : 'X'
  const fh = new jsmaf.Text()
  fh.text = '↑↓  Navigate    ' + confirmLabel + '  Select'
  fh.x = CX - 130; fh.y = SH - FOOTER_H + 15; fh.style = 'm_footer'
  jsmaf.root.children.push(fh)

  // ── Highlight ─────────────────────────────────────────────────────────────
  let cur = 0; let prev = -1
  const TOTAL = btns.length

  function highlight () {
    for (let i = 0; i < TOTAL; i++) {
      const isExit = i === TOTAL - 1
      const sel = i === cur

      btns[i]!.alpha = sel ? 0.22 : (isExit ? 0.055 : 0.07)
      btns[i]!.borderColor = sel
        ? (isExit ? 'rgba(255,110,110,0.85)' : 'rgba(80,210,255,0.85)')
        : (isExit ? 'rgba(255,80,80,0.22)' : 'rgba(120,200,255,0.18)')
      btns[i]!.borderWidth = sel ? 2 : 1
      bars[i]!.alpha = sel ? 1.0 : (isExit ? 0.75 : 0.55)
      texts[i]!.style = sel ? (isExit ? 'm_exit' : 'm_sel') : (isExit ? 'm_exitd' : 'm_label')
      nums[i]!.style = sel ? 'm_numsel' : 'm_num'
      arrs[i]!.style = sel ? 'm_arrsel' : 'm_arrow'

      if (i !== prev || sel) {
        const sc = sel ? 1.020 : 1.0
        const dX = sel ? -Math.round(BTN_W * 0.010) : 0
        const dY = sel ? -Math.round(BTN_H * 0.010) : 0
        btns[i]!.scaleX = sc; btns[i]!.scaleY = sc
        btns[i]!.x = origB[i]!.x + dX; btns[i]!.y = origB[i]!.y + dY
        texts[i]!.scaleX = sc; texts[i]!.scaleY = sc
        texts[i]!.x = origT[i]!.x + dX
      }
    }
    prev = cur
  }

  // ── Input ─────────────────────────────────────────────────────────────────
  const confirmKey = jsmaf.circleIsAdvanceButton ? 13 : 14

  jsmaf.onKeyDown = function (kc: number) {
    if (kc === 6 || kc === 5) {
      cur = (cur + 1) % TOTAL; sfx(SFX_CUR); highlight()
    } else if (kc === 4 || kc === 7) {
      cur = (cur - 1 + TOTAL) % TOTAL; sfx(SFX_CUR); highlight()
    } else if (kc === confirmKey) {
      sfx(SFX_OK)
      if (cur === TOTAL - 1) {
        try { include('includes/kill_vue.js') } catch (_e) {}
      } else {
        const o = menuOptions[cur]; if (!o) return
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
  ;((_a, _b) => {})(libc_addr, SFX_BCK)
})()

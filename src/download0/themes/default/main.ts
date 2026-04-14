import { lang } from 'download0/languages'
import { libc_addr } from 'download0/userland'

;(function () {
  include('languages.js')
  log('Loading main menu...')

  if (typeof startBgmIfEnabled === 'function') startBgmIfEnabled()

  // ── Constants ─────────────────────────────────────────────────────────────
  const SW      = 1920
  const SH      = 1080
  const CX      = SW / 2
  const BTN_W   = 600
  const BTN_H   = 88
  const BTN_L   = CX - BTN_W / 2
  const START_Y = 340
  const GAP     = 108
  const BG_URL  = 'file:///../download0/img/multiview_bg_VAF.png'
  const BTN_URL = 'file:///../download0/img/NeonBtn.png'
  const SFX_CUR = 'file:///../download0/sfx/cursor.wav'
  const SFX_OK  = 'file:///../download0/sfx/confirm.wav'
  const SFX_BCK = 'file:///../download0/sfx/cancel.wav'

  function sfx (url: string) {
    if (typeof CONFIG !== 'undefined' && CONFIG.music === false) return
    try { const c = new jsmaf.AudioClip(); c.volume = 1.0; c.open(url) } catch (_e) { /* no audio */ }
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  jsmaf.root.children.length = 0

  new Style({ name: 'label',  color: 'rgb(255,255,255)',        size: 26 })
  new Style({ name: 'sel',    color: 'rgb(255,255,255)',        size: 26 })
  new Style({ name: 'num',    color: 'rgba(255,255,255,0.28)',  size: 15 })
  new Style({ name: 'numsel', color: 'rgba(120,210,255,0.90)', size: 15 })
  new Style({ name: 'arrow',  color: 'rgba(255,255,255,0.25)', size: 20 })
  new Style({ name: 'arrsel', color: 'rgba(120,200,255,0.80)', size: 20 })
  new Style({ name: 'footer', color: 'rgba(255,255,255,0.28)', size: 16 })
  new Style({ name: 'exit',   color: 'rgb(255,100,100)',        size: 26 })
  new Style({ name: 'exitd',  color: 'rgba(255,100,100,0.45)', size: 26 })

  // ── Background ────────────────────────────────────────────────────────────
  jsmaf.root.children.push(new Image({ url: BG_URL, x: 0, y: 0, width: SW, height: SH }))

  // ── Header ────────────────────────────────────────────────────────────────
  const hdr = new Image({ url: BTN_URL, x: 0, y: 0, width: SW, height: 120, alpha: 0.14 })
  hdr.borderColor = 'rgba(120,200,255,0.12)'; hdr.borderWidth = 0
  jsmaf.root.children.push(hdr)

  const hdrAccent = new Image({ url: BTN_URL, x: 0, y: 0, width: 5, height: 120, alpha: 1.0 })
  hdrAccent.borderColor = 'rgb(80,200,255)'; hdrAccent.borderWidth = 0
  jsmaf.root.children.push(hdrAccent)

  // Logo — centered
  jsmaf.root.children.push(new Image({
    url: 'file:///../download0/img/logo.png',
    x: CX - 180, y: 36, width: 360, height: 204
  }))

  // Divider below logo area
  const div = new Image({ url: BTN_URL, x: BTN_L - 40, y: 280, width: BTN_W + 80, height: 1, alpha: 0.22 })
  div.borderColor = 'rgba(120,200,255,0.4)'; div.borderWidth = 0
  jsmaf.root.children.push(div)

  // ── Menu options ──────────────────────────────────────────────────────────
  type MenuItem = { label: string; script: string; num: string }
  const menuOptions: MenuItem[] = [
    { label: lang.jailbreak,   script: 'loader.js',       num: '01' },
    { label: lang.payloadMenu, script: 'payload_host.js', num: '02' },
    { label: lang.config,      script: 'config_ui.js',    num: '03' },
  ]

  const btns:  Image[]      = []
  const bars:  Image[]      = []
  const texts: jsmaf.Text[] = []
  const nums:  jsmaf.Text[] = []
  const arrs:  jsmaf.Text[] = []
  const origB: { x: number; y: number }[] = []
  const origT: { x: number; y: number }[] = []

  for (let i = 0; i < menuOptions.length; i++) {
    const o  = menuOptions[i]!
    const bY = START_Y + i * GAP

    const btn = new Image({ url: BTN_URL, x: BTN_L, y: bY, width: BTN_W, height: BTN_H, alpha: 0.10 })
    btn.borderColor = 'rgba(255,255,255,0.14)'; btn.borderWidth = 1
    btns.push(btn); jsmaf.root.children.push(btn)

    const bar = new Image({ url: BTN_URL, x: BTN_L, y: bY, width: 5, height: BTN_H, alpha: 0.28 })
    bar.borderColor = 'rgb(120,200,255)'; bar.borderWidth = 0
    bars.push(bar); jsmaf.root.children.push(bar)

    const num = new jsmaf.Text(); num.text = o.num
    num.x = BTN_L + 14; num.y = bY + 36; num.style = 'num'
    nums.push(num); jsmaf.root.children.push(num)

    const txt = new jsmaf.Text(); txt.text = o.label.toUpperCase()
    txt.x = BTN_L + 52; txt.y = bY + 31; txt.style = 'label'
    texts.push(txt); jsmaf.root.children.push(txt)

    const arr = new jsmaf.Text(); arr.text = '›'
    arr.x = BTN_L + BTN_W - 36; arr.y = bY + 28; arr.style = 'arrow'
    arrs.push(arr); jsmaf.root.children.push(arr)

    origB.push({ x: BTN_L, y: bY })
    origT.push({ x: txt.x, y: txt.y })
  }

  // ── Exit button ───────────────────────────────────────────────────────────
  const exitY   = START_Y + menuOptions.length * GAP + 18
  const exitBtn = new Image({ url: BTN_URL, x: BTN_L, y: exitY, width: BTN_W, height: BTN_H, alpha: 0.08 })
  exitBtn.borderColor = 'rgba(255,80,80,0.16)'; exitBtn.borderWidth = 1
  btns.push(exitBtn); jsmaf.root.children.push(exitBtn)

  const exitBar = new Image({ url: BTN_URL, x: BTN_L, y: exitY, width: 5, height: BTN_H, alpha: 0.28 })
  exitBar.borderColor = 'rgb(255,100,100)'; exitBar.borderWidth = 0
  bars.push(exitBar); jsmaf.root.children.push(exitBar)

  const exitNum = new jsmaf.Text(); exitNum.text = '04'
  exitNum.x = BTN_L + 14; exitNum.y = exitY + 36; exitNum.style = 'num'
  nums.push(exitNum); jsmaf.root.children.push(exitNum)

  const exitTxt = new jsmaf.Text(); exitTxt.text = lang.exit.toUpperCase()
  exitTxt.x = BTN_L + 52; exitTxt.y = exitY + 31; exitTxt.style = 'exitd'
  texts.push(exitTxt); jsmaf.root.children.push(exitTxt)

  const exitArr = new jsmaf.Text(); exitArr.text = '›'
  exitArr.x = BTN_L + BTN_W - 36; exitArr.y = exitY + 28; exitArr.style = 'arrow'
  arrs.push(exitArr); jsmaf.root.children.push(exitArr)

  origB.push({ x: BTN_L, y: exitY })
  origT.push({ x: exitTxt.x, y: exitTxt.y })

  // ── Footer ────────────────────────────────────────────────────────────────
  const FOOTER_H = 44
  const footBg = new Image({ url: BTN_URL, x: 0, y: SH - FOOTER_H, width: SW, height: FOOTER_H, alpha: 0.40 })
  footBg.borderColor = 'transparent'; footBg.borderWidth = 0
  jsmaf.root.children.push(footBg)

  const confirmLabel = jsmaf.circleIsAdvanceButton ? 'O' : 'X'
  const fh = new jsmaf.Text()
  fh.text = '↑↓  Navigate    ' + confirmLabel + '  Select'
  fh.x = CX - 140; fh.y = SH - FOOTER_H + 14; fh.style = 'footer'
  jsmaf.root.children.push(fh)

  // ── Highlight ─────────────────────────────────────────────────────────────
  let cur = 0; let prev = -1
  const TOTAL = btns.length

  function highlight () {
    for (let i = 0; i < TOTAL; i++) {
      const isExit = i === TOTAL - 1
      const sel    = i === cur

      btns[i]!.alpha       = sel ? 0.24 : (isExit ? 0.08 : 0.10)
      btns[i]!.borderColor = sel
        ? (isExit ? 'rgba(255,80,80,0.70)' : 'rgba(120,200,255,0.70)')
        : (isExit ? 'rgba(255,80,80,0.16)' : 'rgba(255,255,255,0.14)')
      btns[i]!.borderWidth = sel ? 2 : 1
      bars[i]!.alpha       = sel ? 1.0 : 0.28
      bars[i]!.borderColor = sel
        ? (isExit ? 'rgb(255,100,100)' : 'rgb(80,220,255)')
        : (isExit ? 'rgb(255,100,100)' : 'rgb(120,200,255)')

      texts[i]!.style = sel ? (isExit ? 'exit' : 'sel') : (isExit ? 'exitd' : 'label')
      nums[i]!.style  = sel ? 'numsel' : 'num'
      arrs[i]!.style  = sel ? 'arrsel' : 'arrow'

      if (i !== prev || sel) {
        const sc = sel ? 1.03 : 1.0
        const dX = sel ? -(BTN_W * 0.03) / 2 : 0
        const dY = sel ? -(BTN_H * 0.03) / 2 : 0
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
        try { include('includes/kill_vue.js') } catch (_e) { /* ignore */ }
      } else {
        const o = menuOptions[cur]; if (!o) return
        if (o.script === 'loader.js') jsmaf.onKeyDown = function () { /* locked */ }
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
  ;((_a, _b) => {})(libc_addr, SFX_BCK) // suppress unused import warnings
})()

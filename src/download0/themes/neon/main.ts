import { lang, useImageText, textImageBase } from 'download0/languages'
import { libc_addr } from 'download0/userland'

;(function () {
  include('languages.js')
  log('Loading neon main menu...')

  let currentButton = 0
  const buttons: Image[] = []
  const buttonTexts: (Image | jsmaf.Text)[] = []
  const buttonOrigPos: { x: number; y: number }[] = []
  const textOrigPos: { x: number; y: number }[] = []

  // ── Palette ───────────────────────────────────────────────────────────────
  const C_CYAN = 'rgb(0,255,224)'
  const C_CYAN_DIM = 'rgba(0,255,224,0.35)'
  const C_WHITE = 'rgb(255,255,255)'
  const C_DIM = 'rgba(255,255,255,0.28)'
  const C_PURPLE = 'rgba(160,80,255,0.65)'

  // ── SFX ───────────────────────────────────────────────────────────────────
  const SFX_CURSOR = 'file:///../download0/sfx/cursor.wav'
  const SFX_CONFIRM = 'file:///../download0/sfx/confirm.wav'
  const SFX_CANCEL = 'file:///../download0/sfx/cancel.wav'
  function playSound (url: string) {
    if (typeof CONFIG !== 'undefined' && CONFIG.music === false) return
    try { const clip = new jsmaf.AudioClip(); clip.volume = 1.0; clip.open(url) } catch (e) { log('SFX: ' + (e as Error).message) }
  }

  // ── Reset Scene ───────────────────────────────────────────────────────────
  jsmaf.root.children.length = 0

  // ── Styles ────────────────────────────────────────────────────────────────
  new Style({ name: 'white', color: C_WHITE, size: 28 })
  new Style({ name: 'cyan', color: C_CYAN, size: 28 })
  new Style({ name: 'dim', color: C_DIM, size: 26 })
  new Style({ name: 'subdim', color: C_CYAN_DIM, size: 18 })
  new Style({ name: 'purple', color: C_PURPLE, size: 24 })
  new Style({ name: 'footer', color: 'rgba(0,255,224,0.25)', size: 18 })

  if (typeof startBgmIfEnabled === 'function') startBgmIfEnabled()

  // ── Background ────────────────────────────────────────────────────────────
  const bg = new Image({ url: 'file:///../download0/img/NeonBG.png', x: 0, y: 0, width: 1920, height: 1080 })
  jsmaf.root.children.push(bg)

  // ── Corner Brackets ───────────────────────────────────────────────────────
  // Top-left
  const cornerTL1 = new Image({ url: 'file:///../download0/img/NeonBG.png', x: 58, y: 20, width: 42, height: 2, alpha: 0.35 })
  const cornerTL2 = new Image({ url: 'file:///../download0/img/NeonBG.png', x: 58, y: 20, width: 2, height: 42, alpha: 0.35 })
  // Top-right
  const cornerTR1 = new Image({ url: 'file:///../download0/img/NeonBG.png', x: 1820, y: 20, width: 42, height: 2, alpha: 0.35 })
  const cornerTR2 = new Image({ url: 'file:///../download0/img/NeonBG.png', x: 1860, y: 20, width: 2, height: 42, alpha: 0.35 })
  // Bottom-left
  const cornerBL1 = new Image({ url: 'file:///../download0/img/NeonBG.png', x: 58, y: 1000, width: 42, height: 2, alpha: 0.25 })
  const cornerBL2 = new Image({ url: 'file:///../download0/img/NeonBG.png', x: 58, y: 960, width: 2, height: 42, alpha: 0.25 })
  // Bottom-right
  const cornerBR1 = new Image({ url: 'file:///../download0/img/NeonBG.png', x: 1820, y: 1000, width: 42, height: 2, alpha: 0.25 })
  const cornerBR2 = new Image({ url: 'file:///../download0/img/NeonBG.png', x: 1860, y: 960, width: 2, height: 42, alpha: 0.25 })
  ;[cornerTL1, cornerTL2, cornerTR1, cornerTR2, cornerBL1, cornerBL2, cornerBR1, cornerBR2].forEach(c => {
    c.borderColor = C_CYAN; c.borderWidth = 0; jsmaf.root.children.push(c)
  })

  // ── Layout Constants ──────────────────────────────────────────────────────
  const CX = 960          // center X
  const btnW = 620
  const btnH = 90
  const startY = 420
  const spacing = 118
  const btnLeft = CX - btnW / 2

  // ── Logo ──────────────────────────────────────────────────────────────────
  const logo = new Image({ url: 'file:///../download0/img/logo.png', x: CX - 160, y: 130, width: 320, height: 180 })
  jsmaf.root.children.push(logo)

  // ── Title text ────────────────────────────────────────────────────────────
  const subtitle = new jsmaf.Text()
  subtitle.text = 'PS4  JAILBREAK  SYSTEM'
  subtitle.x = CX - 165
  subtitle.y = 324
  subtitle.style = 'subdim'
  jsmaf.root.children.push(subtitle)

  // ── Divider line ─────────────────────────────────────────────────────────
  const divL = new Image({ url: 'file:///../download0/img/NeonBG.png', x: btnLeft, y: 370, width: btnW, height: 1, alpha: 0.45 })
  divL.borderColor = C_CYAN; divL.borderWidth = 0
  jsmaf.root.children.push(divL)

  // ── Menu Options ──────────────────────────────────────────────────────────
  const menuOptions = [
    { label: lang.jailbreak, script: 'loader.js', imgKey: 'jailbreak', num: '01' },
    { label: lang.payloadMenu, script: 'payload_host.js', imgKey: 'payloadMenu', num: '02' },
    { label: lang.config, script: 'config_ui.js', imgKey: 'config', num: '03' },
  ]

  const buttonImg = 'file:///../download0/img/NeonBG.png'

  for (let i = 0; i < menuOptions.length; i++) {
    const opt = menuOptions[i]!
    const btnX = btnLeft
    const btnY = startY + i * spacing

    // button bg
    const btn = new Image({ url: buttonImg, x: btnX, y: btnY, width: btnW, height: btnH, alpha: 0.06 })
    btn.borderColor = 'rgba(0,255,224,0.18)'
    btn.borderWidth = 1
    buttons.push(btn)
    jsmaf.root.children.push(btn)

    // left accent bar
    const bar = new Image({ url: buttonImg, x: btnX, y: btnY, width: 3, height: btnH, alpha: 0.22 })
    bar.borderColor = C_CYAN; bar.borderWidth = 0
    jsmaf.root.children.push(bar)

    // number label
    const num = new jsmaf.Text()
    num.text = opt.num
    num.x = btnX + 28
    num.y = btnY + 28
    num.style = 'subdim'
    jsmaf.root.children.push(num)

    // main label
    let btnText: Image | jsmaf.Text
    if (typeof useImageText !== 'undefined' && useImageText) {
      btnText = new Image({ url: textImageBase + opt.imgKey + '.png', x: btnX + 90, y: btnY + 18, width: 300, height: 54 })
    } else {
      const t = new jsmaf.Text()
      t.text = opt.label.toUpperCase()
      t.x = btnX + 90
      t.y = btnY + 28
      t.style = 'dim'
      btnText = t
    }
    buttonTexts.push(btnText)
    jsmaf.root.children.push(btnText)

    // arrow ›
    const arr = new jsmaf.Text()
    arr.text = '>'
    arr.x = btnX + btnW - 50
    arr.y = btnY + 28
    arr.style = 'subdim'
    jsmaf.root.children.push(arr)

    buttonOrigPos.push({ x: btnX, y: btnY })
    textOrigPos.push({ x: btnText.x, y: btnText.y })
  }

  // ── Exit Button ───────────────────────────────────────────────────────────
  const exitY = startY + menuOptions.length * spacing + 20
  const exitBtn = new Image({ url: buttonImg, x: btnLeft, y: exitY, width: btnW, height: btnH, alpha: 0.0 })
  exitBtn.borderColor = 'transparent'; exitBtn.borderWidth = 0
  buttons.push(exitBtn)
  jsmaf.root.children.push(exitBtn)

  const exitDash = new Image({ url: buttonImg, x: btnLeft + 90, y: exitY + 44, width: 36, height: 1, alpha: 0.55 })
  exitDash.borderColor = C_PURPLE; exitDash.borderWidth = 0
  jsmaf.root.children.push(exitDash)

  let exitText: Image | jsmaf.Text
  if (typeof useImageText !== 'undefined' && useImageText) {
    exitText = new Image({ url: textImageBase + 'exit.png', x: btnLeft + 140, y: exitY + 18, width: 200, height: 54 })
  } else {
    const t = new jsmaf.Text()
    t.text = lang.exit.toUpperCase()
    t.x = btnLeft + 140
    t.y = exitY + 28
    t.style = 'purple'
    exitText = t
  }
  buttonTexts.push(exitText)
  jsmaf.root.children.push(exitText)
  buttonOrigPos.push({ x: btnLeft, y: exitY })
  textOrigPos.push({ x: exitText.x, y: exitText.y })

  // ── Footer ────────────────────────────────────────────────────────────────
  const footerHints = ['  Navigate', '  Select', '  Back']
  const footerKeys = ['\u2191\u2193', 'X', 'O']
  let fx = CX - 280
  for (let i = 0; i < 3; i++) {
    const k = new jsmaf.Text(); k.text = footerKeys[i]!; k.x = fx; k.y = 1046; k.style = 'footer'
    jsmaf.root.children.push(k)
    const h = new jsmaf.Text(); h.text = footerHints[i]!; h.x = fx + 22; h.y = 1046; h.style = 'footer'
    jsmaf.root.children.push(h)
    fx += 190
  }

  // ── Highlight ─────────────────────────────────────────────────────────────
  let prevButton = -1

  function updateHighlight () {
    const prev = buttons[prevButton]
    if (prev && prevButton !== currentButton) {
      prev.alpha = 0.06
      prev.borderColor = 'rgba(0,255,224,0.18)'
      const pt = buttonTexts[prevButton]
      if (pt && 'style' in pt) (pt as jsmaf.Text).style = prevButton === buttons.length - 1 ? 'purple' : 'dim'
    }

    const cur = buttons[currentButton]
    if (cur) {
      cur.alpha = 0.12
      cur.borderColor = 'rgba(0,255,224,0.6)'
    }
    const ct = buttonTexts[currentButton]
    if (ct && 'style' in ct) (ct as jsmaf.Text).style = currentButton === buttons.length - 1 ? 'cyan' : 'white'

    prevButton = currentButton
  }

  // ── Input ─────────────────────────────────────────────────────────────────
  function handleButtonPress () {
    if (currentButton === buttons.length - 1) {
      playSound(SFX_CANCEL)
      try { include('includes/kill_vue.js') } catch (e) {}
      jsmaf.exit()
    } else {
      const opt = menuOptions[currentButton]
      if (!opt) return
      playSound(SFX_CONFIRM)
      if (opt.script === 'loader.js') jsmaf.onKeyDown = function () {}
      log('Loading ' + opt.script)
      try {
        if (opt.script.includes('loader.js')) {
          include(opt.script)
        } else {
          include('themes/' + (typeof CONFIG !== 'undefined' && CONFIG.theme ? CONFIG.theme : 'neon') + '/' + opt.script)
        }
      } catch (e) { log('ERROR: ' + (e as Error).message) }
    }
  }

  const confirmKey = jsmaf.circleIsAdvanceButton ? 13 : 14

  jsmaf.onKeyDown = function (keyCode) {
    if (keyCode === 6 || keyCode === 5) {
      currentButton = (currentButton + 1) % buttons.length
      playSound(SFX_CURSOR); updateHighlight()
    } else if (keyCode === 4 || keyCode === 7) {
      currentButton = (currentButton - 1 + buttons.length) % buttons.length
      playSound(SFX_CURSOR); updateHighlight()
    } else if (keyCode === confirmKey) {
      handleButtonPress()
    }
  }

  updateHighlight()
  log('Neon main menu loaded.')
})()

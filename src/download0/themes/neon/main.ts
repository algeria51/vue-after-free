import { lang, useImageText, textImageBase } from 'download0/languages'
import { libc_addr } from 'download0/userland'
import { fn, BigInt } from 'download0/types'

(function () {
  include('languages.js')
  log('Loading neon main menu...')

  let currentButton = 0
  const buttons: Image[] = []
  const buttonTexts: (Image | jsmaf.Text)[] = []
  const buttonGlows: Image[] = []
  const buttonOrigPos: { x: number, y: number }[] = []
  const textOrigPos: { x: number, y: number }[] = []

  // ── Neon Palette ─────────────────────────────────────────────────────────────
  const COLOR_CYAN = 'rgb(0,220,255)'
  const COLOR_CYAN_BRIGHT = 'rgb(100,255,255)'
  const COLOR_PURPLE = 'rgb(170,80,255)'
  const COLOR_WHITE = 'rgb(255,255,255)'
  const COLOR_WHITE_DIM = 'rgba(255,255,255,0.55)'
  const COLOR_WHITE_FAINT = 'rgba(255,255,255,0.22)'

  const buttonImg = 'file:///assets/img/button_over_9.png'

  // ── Sound Helpers ─────────────────────────────────────────────────────────────
  const SFX_CURSOR = 'file:///../download0/sfx/cursor.wav'
  const SFX_CONFIRM = 'file:///../download0/sfx/confirm.wav'
  const SFX_CANCEL = 'file:///../download0/sfx/cancel.wav'

  function playSound (url: string) {
    try {
      const clip = new jsmaf.AudioClip()
      clip.volume = 1.0
      clip.open(url)
    } catch (e) {
      log('SFX error: ' + (e as Error).message)
    }
  }

  // ── Reset Scene ───────────────────────────────────────────────────────────────
  jsmaf.root.children.length = 0

  // ── Text Styles ───────────────────────────────────────────────────────────────
  new Style({ name: 'white', color: COLOR_WHITE, size: 26 })
  new Style({ name: 'sel', color: COLOR_CYAN_BRIGHT, size: 27 })
  new Style({ name: 'dim', color: COLOR_WHITE_DIM, size: 24 })
  new Style({ name: 'faint', color: COLOR_WHITE_FAINT, size: 20 })
  new Style({ name: 'cyan', color: COLOR_CYAN, size: 26 })
  new Style({ name: 'purple', color: COLOR_PURPLE, size: 26 })

  if (typeof startBgmIfEnabled === 'function') {
    startBgmIfEnabled()
  }

  // ── Background ────────────────────────────────────────────────────────────────
  const bg = new Image({
    url: 'file:///../download0/img/multiview_bg_VAF.png',
    x: 0,
    y: 0,
    width: 1920,
    height: 1080
  })
  jsmaf.root.children.push(bg)

  // Deep dark overlay — stronger than default for neon contrast
  const overlay = new Image({
    url: buttonImg,
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
    alpha: 0.86
  })
  jsmaf.root.children.push(overlay)

  // ── Right decorative panel ────────────────────────────────────────────────────
  const rightPanel = new Image({
    url: buttonImg,
    x: 1340,
    y: 0,
    width: 580,
    height: 1080,
    alpha: 0.28
  })
  jsmaf.root.children.push(rightPanel)

  const panelBorder = new Image({
    url: buttonImg,
    x: 1338,
    y: 0,
    width: 2,
    height: 1080,
    alpha: 0.55
  })
  panelBorder.borderColor = COLOR_CYAN
  panelBorder.borderWidth = 0
  jsmaf.root.children.push(panelBorder)

  // ── Layout constants ──────────────────────────────────────────────────────────
  const panelLeft = 140
  const buttonWidth = 560
  const buttonHeight = 76
  const startY = 430
  const spacing = 110

  // ── Logo — top-left aligned ───────────────────────────────────────────────────
  const logo = new Image({
    url: 'file:///../download0/img/logo.png',
    x: panelLeft,
    y: 60,
    width: 480,
    height: 270
  })
  jsmaf.root.children.push(logo)

  // Cyan separator line
  const sep1 = new Image({
    url: buttonImg,
    x: panelLeft,
    y: 344,
    width: buttonWidth,
    height: 2,
    alpha: 0.9
  })
  sep1.borderColor = COLOR_CYAN
  sep1.borderWidth = 0
  jsmaf.root.children.push(sep1)

  // Purple fade line below
  const sep2 = new Image({
    url: buttonImg,
    x: panelLeft + 60,
    y: 350,
    width: buttonWidth - 120,
    height: 1,
    alpha: 0.4
  })
  sep2.borderColor = COLOR_PURPLE
  sep2.borderWidth = 0
  jsmaf.root.children.push(sep2)

  // Right panel decorative labels
  const lblMain = new jsmaf.Text()
  lblMain.text = 'VUE-AFTER-FREE'
  lblMain.x = 1375
  lblMain.y = 470
  lblMain.style = 'faint'
  jsmaf.root.children.push(lblMain)

  const lblSub = new jsmaf.Text()
  lblSub.text = 'PS4  JAILBREAK'
  lblSub.x = 1395
  lblSub.y = 510
  lblSub.style = 'faint'
  jsmaf.root.children.push(lblSub)

  const lblVer = new jsmaf.Text()
  lblVer.text = 'NEON'
  lblVer.x = 1600
  lblVer.y = 80
  lblVer.style = 'faint'
  jsmaf.root.children.push(lblVer)

  // Left vertical accent bar
  const leftBar = new Image({
    url: buttonImg,
    x: panelLeft - 18,
    y: startY - 8,
    width: 3,
    height: 4 * spacing + 16,
    alpha: 0.55
  })
  leftBar.borderColor = COLOR_CYAN
  leftBar.borderWidth = 0
  jsmaf.root.children.push(leftBar)

  // ── Menu Buttons ─────────────────────────────────────────────────────────────
  const menuOptions = [
    { label: lang.jailbreak, script: 'loader.js', imgKey: 'jailbreak' },
    { label: lang.payloadMenu, script: 'payload_host.js', imgKey: 'payloadMenu' },
    { label: lang.config, script: 'config_ui.js', imgKey: 'config' }
  ]

  for (let i = 0; i < menuOptions.length; i++) {
    const btnX = panelLeft
    const btnY = startY + i * spacing

    const glow = new Image({
      url: buttonImg,
      x: btnX - 8,
      y: btnY - 8,
      width: buttonWidth + 16,
      height: buttonHeight + 16,
      alpha: 0,
      visible: false
    })
    buttonGlows.push(glow)
    jsmaf.root.children.push(glow)

    const button = new Image({
      url: buttonImg,
      x: btnX,
      y: btnY,
      width: buttonWidth,
      height: buttonHeight,
      alpha: 0.30
    })
    buttons.push(button)
    jsmaf.root.children.push(button)

    let btnText: Image | jsmaf.Text
    if (useImageText) {
      btnText = new Image({
        url: textImageBase + menuOptions[i]!.imgKey + '.png',
        x: btnX + 24,
        y: btnY + 13,
        width: 300,
        height: 50
      })
    } else {
      btnText = new jsmaf.Text()
      btnText.text = menuOptions[i]!.label
      btnText.x = btnX + 30
      btnText.y = btnY + buttonHeight / 2 - 13
      btnText.style = 'white'
    }
    buttonTexts.push(btnText)
    jsmaf.root.children.push(btnText)

    buttonOrigPos.push({ x: btnX, y: btnY })
    textOrigPos.push({ x: btnText.x, y: btnText.y })
  }

  // ── Exit Button ───────────────────────────────────────────────────────────────
  const exitX = panelLeft
  const exitY = startY + menuOptions.length * spacing + 44

  const exitGlow = new Image({
    url: buttonImg,
    x: exitX - 8,
    y: exitY - 8,
    width: buttonWidth + 16,
    height: buttonHeight + 16,
    alpha: 0,
    visible: false
  })
  buttonGlows.push(exitGlow)
  jsmaf.root.children.push(exitGlow)

  const exitButton = new Image({
    url: buttonImg,
    x: exitX,
    y: exitY,
    width: buttonWidth,
    height: buttonHeight,
    alpha: 0.20
  })
  buttons.push(exitButton)
  jsmaf.root.children.push(exitButton)

  let exitText: Image | jsmaf.Text
  if (useImageText) {
    exitText = new Image({
      url: textImageBase + 'exit.png',
      x: exitX + 24,
      y: exitY + 13,
      width: 300,
      height: 50
    })
  } else {
    exitText = new jsmaf.Text()
    exitText.text = lang.exit
    exitText.x = exitX + 30
    exitText.y = exitY + buttonHeight / 2 - 13
    exitText.style = 'dim'
  }
  buttonTexts.push(exitText)
  jsmaf.root.children.push(exitText)

  buttonOrigPos.push({ x: exitX, y: exitY })
  textOrigPos.push({ x: exitText.x, y: exitText.y })

  // ── Footer Bar ────────────────────────────────────────────────────────────────
  const footerBg = new Image({
    url: buttonImg,
    x: 0,
    y: 1038,
    width: 1920,
    height: 42,
    alpha: 0.40
  })
  jsmaf.root.children.push(footerBg)

  const footerLine = new Image({
    url: buttonImg,
    x: 0,
    y: 1037,
    width: 1920,
    height: 1,
    alpha: 0.6
  })
  footerLine.borderColor = COLOR_CYAN
  footerLine.borderWidth = 0
  jsmaf.root.children.push(footerLine)

  const footerHint = new jsmaf.Text()
  footerHint.text = '↑↓  Navigate        ✕  Select        ○  Back'
  footerHint.x = panelLeft
  footerHint.y = 1048
  footerHint.style = 'faint'
  jsmaf.root.children.push(footerHint)

  // ── Animation (easeOut — snappier than default easeInOut) ────────────────────
  let zoomInInterval: number | null = null
  let zoomOutInterval: number | null = null
  let prevButton = -1

  function easeOut (t: number) {
    return 1 - Math.pow(1 - t, 3)
  }

  function animateZoomIn (
    btn: Image, text: Image | jsmaf.Text, glow: Image,
    btnOrigX: number, btnOrigY: number,
    textOrigX: number, textOrigY: number
  ) {
    if (zoomInInterval) jsmaf.clearInterval(zoomInInterval)
    const startScale = btn.scaleX || 1.0
    const endScale = 1.05
    const duration = 130
    let elapsed = 0
    const step = 13

    glow.visible = true
    zoomInInterval = jsmaf.setInterval(function () {
      elapsed += step
      const t = Math.min(elapsed / duration, 1)
      const eased = easeOut(t)
      const scale = startScale + (endScale - startScale) * eased

      btn.scaleX = scale
      btn.scaleY = scale
      btn.x = btnOrigX - (buttonWidth * (scale - 1)) / 2
      btn.y = btnOrigY - (buttonHeight * (scale - 1)) / 2
      text.scaleX = scale
      text.scaleY = scale
      text.x = textOrigX - (buttonWidth * (scale - 1)) / 2
      text.y = textOrigY - (buttonHeight * (scale - 1)) / 2
      glow.alpha = eased * 0.45

      if (t >= 1 && zoomInInterval) {
        jsmaf.clearInterval(zoomInInterval)
        zoomInInterval = null
      }
    }, step)
  }

  function animateZoomOut (
    btn: Image, text: Image | jsmaf.Text, glow: Image,
    btnOrigX: number, btnOrigY: number,
    textOrigX: number, textOrigY: number
  ) {
    if (zoomOutInterval) jsmaf.clearInterval(zoomOutInterval)
    const startScale = btn.scaleX || 1.05
    const endScale = 1.0
    const duration = 130
    let elapsed = 0
    const step = 13

    zoomOutInterval = jsmaf.setInterval(function () {
      elapsed += step
      const t = Math.min(elapsed / duration, 1)
      const eased = easeOut(t)
      const scale = startScale + (endScale - startScale) * eased

      btn.scaleX = scale
      btn.scaleY = scale
      btn.x = btnOrigX - (buttonWidth * (scale - 1)) / 2
      btn.y = btnOrigY - (buttonHeight * (scale - 1)) / 2
      text.scaleX = scale
      text.scaleY = scale
      text.x = textOrigX - (buttonWidth * (scale - 1)) / 2
      text.y = textOrigY - (buttonHeight * (scale - 1)) / 2
      glow.alpha = (1 - eased) * 0.45

      if (t >= 1 && zoomOutInterval) {
        jsmaf.clearInterval(zoomOutInterval)
        zoomOutInterval = null
        glow.visible = false
      }
    }, step)
  }

  // ── Highlight ─────────────────────────────────────────────────────────────────
  function updateHighlight () {
    const prevBtn = buttons[prevButton]
    const prevGlow = buttonGlows[prevButton]
    if (prevButton >= 0 && prevButton !== currentButton && prevBtn && prevGlow) {
      prevBtn.alpha = prevButton === buttons.length - 1 ? 0.20 : 0.30
      prevBtn.borderColor = 'transparent'
      prevBtn.borderWidth = 0
      animateZoomOut(
        prevBtn, buttonTexts[prevButton]!, prevGlow,
        buttonOrigPos[prevButton]!.x, buttonOrigPos[prevButton]!.y,
        textOrigPos[prevButton]!.x, textOrigPos[prevButton]!.y
      )
    }

    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i]
      const glow = buttonGlows[i]
      const text = buttonTexts[i]
      const origBtn = buttonOrigPos[i]
      const origTxt = textOrigPos[i]
      if (!button || !glow || !text || !origBtn || !origTxt) continue

      const isExit = (i === buttons.length - 1)

      if (i === currentButton) {
        button.alpha = 1.0
        button.borderColor = isExit ? COLOR_PURPLE : COLOR_CYAN
        button.borderWidth = 2
        if (!useImageText) {
          (text as jsmaf.Text).style = isExit ? 'purple' : 'sel'
        }
        animateZoomIn(button, text, glow,
          origBtn.x, origBtn.y, origTxt.x, origTxt.y)
      } else if (i !== prevButton) {
        button.alpha = isExit ? 0.20 : 0.30
        button.borderColor = 'transparent'
        button.borderWidth = 0
        button.scaleX = 1.0
        button.scaleY = 1.0
        button.x = origBtn.x
        button.y = origBtn.y
        text.scaleX = 1.0
        text.scaleY = 1.0
        text.x = origTxt.x
        text.y = origTxt.y
        glow.visible = false
        if (!useImageText) {
          (text as jsmaf.Text).style = isExit ? 'dim' : 'white'
        }
      }
    }

    prevButton = currentButton
  }

  // ── Input ─────────────────────────────────────────────────────────────────────
  function handleButtonPress () {
    const isExit = (currentButton === buttons.length - 1)
    if (isExit) {
      playSound(SFX_CANCEL)
      include('includes/kill_vue.js')
    } else if (currentButton < menuOptions.length) {
      const opt = menuOptions[currentButton]
      if (!opt) return
      playSound(SFX_CONFIRM)
      if (opt.script === 'loader.js') {
        jsmaf.onKeyDown = function () {}
      }
      log('Loading ' + opt.script + '...')
      try {
        if (opt.script.includes('loader.js')) {
          include(opt.script)
        } else {
          include('themes/' + (typeof CONFIG !== 'undefined' && CONFIG.theme
            ? CONFIG.theme
            : 'neon') + '/' + opt.script)
        }
      } catch (e) {
        log('ERROR loading ' + opt.script + ': ' + (e as Error).message)
        if ((e as Error).stack) log((e as Error).stack!)
      }
    }
  }

  jsmaf.onKeyDown = function (keyCode) {
    if (keyCode === 6 || keyCode === 5) {
      currentButton = (currentButton + 1) % buttons.length
      playSound(SFX_CURSOR)
      updateHighlight()
    } else if (keyCode === 4 || keyCode === 7) {
      currentButton = (currentButton - 1 + buttons.length) % buttons.length
      playSound(SFX_CURSOR)
      updateHighlight()
    } else if (keyCode === 14) {
      handleButtonPress()
    }
  }

  updateHighlight()
  log('Neon main menu loaded.')
})()

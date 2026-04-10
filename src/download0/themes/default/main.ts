import { lang, useImageText, textImageBase } from 'download0/languages'
import { libc_addr } from 'download0/userland'
import { fn, BigInt } from 'download0/types'

(function () {
  include('languages.js')
  log('Loading main menu...')

  let currentButton = 0
  const buttons: Image[] = []
  const buttonTexts: (Image | jsmaf.Text)[] = []
  const buttonGlows: Image[] = []
  const buttonOrigPos: { x: number, y: number }[] = []
  const textOrigPos: { x: number, y: number }[] = []

  // ── Professional Dark Theme ──────────────────────────────────────────────────
  const COLOR_RED = 'rgb(220,40,40)'
  const COLOR_RED_BRIGHT = 'rgb(255,75,75)'
  const COLOR_WHITE = 'rgb(255,255,255)'
  const COLOR_WHITE_DIM = 'rgba(255,255,255,0.55)'
  const COLOR_WHITE_FAINT = 'rgba(255,255,255,0.3)'

  const normalButtonImg = 'file:///assets/img/button_over_9.png'
  const selectedButtonImg = 'file:///assets/img/button_over_9.png'

  // ── Sound helpers ────────────────────────────────────────────────────────────
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

  // ── Reset scene ──────────────────────────────────────────────────────────────
  jsmaf.root.children.length = 0

  // ── Styles ───────────────────────────────────────────────────────────────────
  new Style({ name: 'white', color: COLOR_WHITE, size: 25 })
  new Style({ name: 'selected', color: COLOR_WHITE, size: 26 })
  new Style({ name: 'dim', color: COLOR_WHITE_DIM, size: 23 })
  new Style({ name: 'faint', color: COLOR_WHITE_FAINT, size: 21 })
  new Style({ name: 'red', color: COLOR_RED_BRIGHT, size: 25 })

  if (typeof startBgmIfEnabled === 'function') {
    startBgmIfEnabled()
  }

  // ── Background ───────────────────────────────────────────────────────────────
  const background = new Image({
    url: 'file:///../download0/img/multiview_bg_VAF.png',
    x: 0,
    y: 0,
    width: 1920,
    height: 1080
  })
  jsmaf.root.children.push(background)

  // Full dark overlay for readability
  const darkOverlay = new Image({
    url: normalButtonImg,
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
    alpha: 0.68
  })
  jsmaf.root.children.push(darkOverlay)

  // Bottom vignette
  const bottomVignette = new Image({
    url: normalButtonImg,
    x: 0,
    y: 680,
    width: 1920,
    height: 400,
    alpha: 0.4
  })
  jsmaf.root.children.push(bottomVignette)

  // ── Logo ─────────────────────────────────────────────────────────────────────
  const centerX = 960
  const logoW = 580
  const logoH = 327

  const logo = new Image({
    url: 'file:///../download0/img/logo.png',
    x: centerX - logoW / 2,
    y: 28,
    width: logoW,
    height: logoH
  })
  jsmaf.root.children.push(logo)

  // ── Separator under logo ─────────────────────────────────────────────────────
  const sepOuter = new Image({
    url: normalButtonImg,
    x: centerX - 300,
    y: 368,
    width: 600,
    height: 1,
    alpha: 0.18
  })
  jsmaf.root.children.push(sepOuter)

  const sepMain = new Image({
    url: normalButtonImg,
    x: centerX - 200,
    y: 372,
    width: 400,
    height: 3,
    alpha: 0.95
  })
  sepMain.borderColor = COLOR_RED
  sepMain.borderWidth = 0
  jsmaf.root.children.push(sepMain)

  const sepInner = new Image({
    url: normalButtonImg,
    x: centerX - 55,
    y: 378,
    width: 110,
    height: 1,
    alpha: 0.45
  })
  jsmaf.root.children.push(sepInner)

  // ── Menu options ─────────────────────────────────────────────────────────────
  const menuOptions = [
    { label: lang.jailbreak, script: 'loader.js', imgKey: 'jailbreak' },
    { label: lang.payloadMenu, script: 'payload_host.js', imgKey: 'payloadMenu' },
    { label: lang.config, script: 'config_ui.js', imgKey: 'config' }
  ]

  const startY = 415
  const buttonSpacing = 112
  const buttonWidth = 480
  const buttonHeight = 78

  for (let i = 0; i < menuOptions.length; i++) {
    const btnX = centerX - buttonWidth / 2
    const btnY = startY + i * buttonSpacing

    const button = new Image({
      url: normalButtonImg,
      x: btnX,
      y: btnY,
      width: buttonWidth,
      height: buttonHeight,
      alpha: 0.55
    })
    buttons.push(button)
    jsmaf.root.children.push(button)

    const glow = new Image({
      url: normalButtonImg,
      x: btnX - 5,
      y: btnY - 5,
      width: buttonWidth + 10,
      height: buttonHeight + 10,
      alpha: 0,
      visible: false
    })
    buttonGlows.push(glow)
    jsmaf.root.children.push(glow)

    let btnText: Image | jsmaf.Text
    if (useImageText) {
      btnText = new Image({
        url: textImageBase + menuOptions[i]!.imgKey + '.png',
        x: btnX + 28,
        y: btnY + 14,
        width: 300,
        height: 50
      })
    } else {
      btnText = new jsmaf.Text()
      btnText.text = menuOptions[i]!.label
      btnText.x = btnX + buttonWidth / 2 - 60
      btnText.y = btnY + buttonHeight / 2 - 13
      btnText.style = 'white'
    }
    buttonTexts.push(btnText)
    jsmaf.root.children.push(btnText)

    buttonOrigPos.push({ x: btnX, y: btnY })
    textOrigPos.push({ x: btnText.x, y: btnText.y })
  }

  // ── Exit button ───────────────────────────────────────────────────────────────
  const exitX = centerX - buttonWidth / 2
  const exitY = startY + menuOptions.length * buttonSpacing + 40

  const exitButton = new Image({
    url: normalButtonImg,
    x: exitX,
    y: exitY,
    width: buttonWidth,
    height: buttonHeight,
    alpha: 0.35
  })
  buttons.push(exitButton)
  jsmaf.root.children.push(exitButton)

  const exitGlow = new Image({
    url: normalButtonImg,
    x: exitX - 5,
    y: exitY - 5,
    width: buttonWidth + 10,
    height: buttonHeight + 10,
    alpha: 0,
    visible: false
  })
  buttonGlows.push(exitGlow)
  jsmaf.root.children.push(exitGlow)

  let exitText: Image | jsmaf.Text
  if (useImageText) {
    exitText = new Image({
      url: textImageBase + 'exit.png',
      x: exitX + 28,
      y: exitY + 14,
      width: 300,
      height: 50
    })
  } else {
    exitText = new jsmaf.Text()
    exitText.text = lang.exit
    exitText.x = exitX + buttonWidth / 2 - 20
    exitText.y = exitY + buttonHeight / 2 - 13
    exitText.style = 'dim'
  }
  buttonTexts.push(exitText)
  jsmaf.root.children.push(exitText)

  buttonOrigPos.push({ x: exitX, y: exitY })
  textOrigPos.push({ x: exitText.x, y: exitText.y })

  // ── Footer navigation hint ────────────────────────────────────────────────────
  const hint = new jsmaf.Text()
  hint.text = 'Navigate  ↑↓      Select  ✕      Back  ○'
  hint.x = centerX - 195
  hint.y = 1022
  hint.style = 'faint'
  jsmaf.root.children.push(hint)

  // ── Easing ───────────────────────────────────────────────────────────────────
  function easeOut (t: number) {
    return 1 - Math.pow(1 - t, 3)
  }

  // ── Animation ────────────────────────────────────────────────────────────────
  let zoomInInterval: number | null = null
  let zoomOutInterval: number | null = null
  let prevButton = -1

  function animateZoomIn (btn: Image, text: Image | jsmaf.Text, glow: Image,
    btnOrigX: number, btnOrigY: number,
    textOrigX: number, textOrigY: number) {
    if (zoomInInterval) jsmaf.clearInterval(zoomInInterval)
    const startScale = btn.scaleX || 1.0
    const endScale = 1.06
    const duration = 140
    let elapsed = 0
    const step = 14

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
      glow.alpha = eased * 0.42

      if (t >= 1 && zoomInInterval) {
        jsmaf.clearInterval(zoomInInterval)
        zoomInInterval = null
      }
    }, step)
  }

  function animateZoomOut (btn: Image, text: Image | jsmaf.Text, glow: Image,
    btnOrigX: number, btnOrigY: number,
    textOrigX: number, textOrigY: number) {
    if (zoomOutInterval) jsmaf.clearInterval(zoomOutInterval)
    const startScale = btn.scaleX || 1.06
    const endScale = 1.0
    const duration = 140
    let elapsed = 0
    const step = 14

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
      glow.alpha = (1 - eased) * 0.42

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
      prevBtn.url = normalButtonImg
      prevBtn.alpha = prevButton === buttons.length - 1 ? 0.35 : 0.55
      prevBtn.borderColor = 'transparent'
      prevBtn.borderWidth = 0
      animateZoomOut(prevBtn, buttonTexts[prevButton]!, prevGlow,
        buttonOrigPos[prevButton]!.x, buttonOrigPos[prevButton]!.y,
        textOrigPos[prevButton]!.x, textOrigPos[prevButton]!.y)
    }

    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i]
      const glow = buttonGlows[i]
      const buttonText = buttonTexts[i]
      const origBtn = buttonOrigPos[i]
      const origTxt = textOrigPos[i]
      if (!button || !buttonText || !origBtn || !origTxt || !glow) continue

      const isExit = (i === buttons.length - 1)

      if (i === currentButton) {
        button.url = selectedButtonImg
        button.alpha = 1.0
        button.borderColor = isExit ? COLOR_WHITE_DIM : COLOR_RED_BRIGHT
        button.borderWidth = 3
        animateZoomIn(button, buttonText, glow,
          origBtn.x, origBtn.y, origTxt.x, origTxt.y)
        if (!useImageText) {
          (buttonText as jsmaf.Text).style = isExit ? 'red' : 'selected'
        }
      } else if (i !== prevButton) {
        button.url = normalButtonImg
        button.alpha = isExit ? 0.35 : 0.55
        button.borderColor = 'transparent'
        button.borderWidth = 0
        button.scaleX = 1.0
        button.scaleY = 1.0
        button.x = origBtn.x
        button.y = origBtn.y
        buttonText.scaleX = 1.0
        buttonText.scaleY = 1.0
        buttonText.x = origTxt.x
        buttonText.y = origTxt.y
        glow.visible = false
        if (!useImageText) {
          (buttonText as jsmaf.Text).style = isExit ? 'dim' : 'white'
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
      const selectedOption = menuOptions[currentButton]
      if (!selectedOption) return
      playSound(SFX_CONFIRM)
      if (selectedOption.script === 'loader.js') {
        jsmaf.onKeyDown = function () {}
      }
      log('Loading ' + selectedOption.script + '...')
      try {
        if (selectedOption.script.includes('loader.js')) {
          include(selectedOption.script)
        } else {
          include('themes/' + (typeof CONFIG !== 'undefined' && CONFIG.theme ? CONFIG.theme : 'default') + '/' + selectedOption.script)
        }
      } catch (e) {
        log('ERROR loading ' + selectedOption.script + ': ' + (e as Error).message)
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
  log('Main menu loaded.')
})()

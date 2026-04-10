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

  // Red jailbreak theme colors
  const COLOR_RED_BRIGHT = 'rgb(255,60,60)'
  const COLOR_RED_MID = 'rgb(200,30,30)'
  const COLOR_RED_DARK = 'rgb(120,10,10)'
  const COLOR_WHITE = 'white'
  const COLOR_GREY = 'rgba(255,255,255,0.45)'

  const normalButtonImg = 'file:///assets/img/button_over_9.png'
  const selectedButtonImg = 'file:///assets/img/button_over_9.png'

  jsmaf.root.children.length = 0

  new Style({ name: 'white', color: COLOR_WHITE, size: 24 })
  new Style({ name: 'title', color: COLOR_WHITE, size: 36 })
  new Style({ name: 'red', color: COLOR_RED_BRIGHT, size: 26 })
  new Style({ name: 'selected', color: COLOR_WHITE, size: 26 })
  new Style({ name: 'dim', color: COLOR_GREY, size: 22 })

  if (typeof startBgmIfEnabled === 'function') {
    startBgmIfEnabled()
  }

  // ── Background ──────────────────────────────────────────────────────────────
  const background = new Image({
    url: 'file:///../download0/img/multiview_bg_VAF.png',
    x: 0,
    y: 0,
    width: 1920,
    height: 1080
  })
  jsmaf.root.children.push(background)

  // Dark vignette overlay for depth
  const vignette = new Image({
    url: 'file:///assets/img/button_over_9.png',
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
    alpha: 0.55
  })
  jsmaf.root.children.push(vignette)

  // ── Logo ────────────────────────────────────────────────────────────────────
  const centerX = 960
  const logoWidth = 560
  const logoHeight = 316

  const logo = new Image({
    url: 'file:///../download0/img/logo.png',
    x: centerX - logoWidth / 2,
    y: 40,
    width: logoWidth,
    height: logoHeight
  })
  jsmaf.root.children.push(logo)

  // Red accent line under logo
  const accentLine = new Image({
    url: 'file:///assets/img/button_over_9.png',
    x: centerX - 220,
    y: 370,
    width: 440,
    height: 3,
    alpha: 0.9
  })
  accentLine.borderColor = COLOR_RED_BRIGHT
  accentLine.borderWidth = 0
  jsmaf.root.children.push(accentLine)

  // ── Menu options ─────────────────────────────────────────────────────────────
  const menuOptions = [
    { label: lang.jailbreak, script: 'loader.js', imgKey: 'jailbreak' },
    { label: lang.payloadMenu, script: 'payload_host.js', imgKey: 'payloadMenu' },
    { label: lang.config, script: 'config_ui.js', imgKey: 'config' }
  ]

  const startY = 420
  const buttonSpacing = 110
  const buttonWidth = 460
  const buttonHeight = 76

  for (let i = 0; i < menuOptions.length; i++) {
    const btnX = centerX - buttonWidth / 2
    const btnY = startY + i * buttonSpacing

    // Button background
    const button = new Image({
      url: normalButtonImg,
      x: btnX,
      y: btnY,
      width: buttonWidth,
      height: buttonHeight,
      alpha: 0.6
    })
    buttons.push(button)
    jsmaf.root.children.push(button)

    // Glow placeholder (reuse button_over_9 tinted)
    const glow = new Image({
      url: normalButtonImg,
      x: btnX - 6,
      y: btnY - 6,
      width: buttonWidth + 12,
      height: buttonHeight + 12,
      alpha: 0,
      visible: false
    })
    buttonGlows.push(glow)
    jsmaf.root.children.push(glow)

    // Button text / image
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
      btnText.x = btnX + buttonWidth / 2 - 60
      btnText.y = btnY + buttonHeight / 2 - 13
      btnText.style = 'white'
    }
    buttonTexts.push(btnText)
    jsmaf.root.children.push(btnText)

    buttonOrigPos.push({ x: btnX, y: btnY })
    textOrigPos.push({ x: btnText.x, y: btnText.y })
  }

  // ── Exit button ──────────────────────────────────────────────────────────────
  const exitX = centerX - buttonWidth / 2
  const exitY = startY + menuOptions.length * buttonSpacing + 50

  const exitButton = new Image({
    url: normalButtonImg,
    x: exitX,
    y: exitY,
    width: buttonWidth,
    height: buttonHeight,
    alpha: 0.45
  })
  buttons.push(exitButton)
  jsmaf.root.children.push(exitButton)

  const exitGlow = new Image({
    url: normalButtonImg,
    x: exitX - 6,
    y: exitY - 6,
    width: buttonWidth + 12,
    height: buttonHeight + 12,
    alpha: 0,
    visible: false
  })
  buttonGlows.push(exitGlow)
  jsmaf.root.children.push(exitGlow)

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
    exitText.x = exitX + buttonWidth / 2 - 20
    exitText.y = exitY + buttonHeight / 2 - 13
    exitText.style = 'dim'
  }
  buttonTexts.push(exitText)
  jsmaf.root.children.push(exitText)

  buttonOrigPos.push({ x: exitX, y: exitY })
  textOrigPos.push({ x: exitText.x, y: exitText.y })

  // ── Animation helpers ────────────────────────────────────────────────────────
  let zoomInInterval: number | null = null
  let zoomOutInterval: number | null = null
  let prevButton = -1

  function easeInOut (t: number) {
    return (1 - Math.cos(t * Math.PI)) / 2
  }

  function animateZoomIn (btn: Image, text: Image | jsmaf.Text, glow: Image,
    btnOrigX: number, btnOrigY: number,
    textOrigX: number, textOrigY: number) {
    if (zoomInInterval) jsmaf.clearInterval(zoomInInterval)
    const startScale = btn.scaleX || 1.0
    const endScale = 1.08
    const duration = 160
    let elapsed = 0
    const step = 16

    glow.visible = true
    zoomInInterval = jsmaf.setInterval(function () {
      elapsed += step
      const t = Math.min(elapsed / duration, 1)
      const eased = easeInOut(t)
      const scale = startScale + (endScale - startScale) * eased

      btn.scaleX = scale
      btn.scaleY = scale
      btn.x = btnOrigX - (buttonWidth * (scale - 1)) / 2
      btn.y = btnOrigY - (buttonHeight * (scale - 1)) / 2
      text.scaleX = scale
      text.scaleY = scale
      text.x = textOrigX - (buttonWidth * (scale - 1)) / 2
      text.y = textOrigY - (buttonHeight * (scale - 1)) / 2
      glow.alpha = eased * 0.5

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
    const startScale = btn.scaleX || 1.08
    const endScale = 1.0
    const duration = 160
    let elapsed = 0
    const step = 16

    zoomOutInterval = jsmaf.setInterval(function () {
      elapsed += step
      const t = Math.min(elapsed / duration, 1)
      const eased = easeInOut(t)
      const scale = startScale + (endScale - startScale) * eased

      btn.scaleX = scale
      btn.scaleY = scale
      btn.x = btnOrigX - (buttonWidth * (scale - 1)) / 2
      btn.y = btnOrigY - (buttonHeight * (scale - 1)) / 2
      text.scaleX = scale
      text.scaleY = scale
      text.x = textOrigX - (buttonWidth * (scale - 1)) / 2
      text.y = textOrigY - (buttonHeight * (scale - 1)) / 2
      glow.alpha = (1 - eased) * 0.5

      if (t >= 1 && zoomOutInterval) {
        jsmaf.clearInterval(zoomOutInterval)
        zoomOutInterval = null
        glow.visible = false
      }
    }, step)
  }

  // ── Highlight logic ──────────────────────────────────────────────────────────
  function updateHighlight () {
    const prevBtn = buttons[prevButton]
    const prevGlow = buttonGlows[prevButton]
    if (prevButton >= 0 && prevButton !== currentButton && prevBtn && prevGlow) {
      prevBtn.url = normalButtonImg
      prevBtn.alpha = 0.6
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

      if (i === currentButton) {
        button.url = selectedButtonImg
        button.alpha = 1.0
        button.borderColor = COLOR_RED_BRIGHT
        button.borderWidth = 4
        animateZoomIn(button, buttonText, glow,
          origBtn.x, origBtn.y, origTxt.x, origTxt.y)
        if (!useImageText) {
          (buttonText as jsmaf.Text).style = (i === buttons.length - 1) ? 'red' : 'selected'
        }
      } else if (i !== prevButton) {
        button.url = normalButtonImg
        button.alpha = i === buttons.length - 1 ? 0.45 : 0.6
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
          (buttonText as jsmaf.Text).style = (i === buttons.length - 1) ? 'dim' : 'white'
        }
      }
    }

    prevButton = currentButton
  }

  // ── Input handling ───────────────────────────────────────────────────────────
  function handleButtonPress () {
    if (currentButton === buttons.length - 1) {
      include('includes/kill_vue.js')
    } else if (currentButton < menuOptions.length) {
      const selectedOption = menuOptions[currentButton]
      if (!selectedOption) return
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
      updateHighlight()
    } else if (keyCode === 4 || keyCode === 7) {
      currentButton = (currentButton - 1 + buttons.length) % buttons.length
      updateHighlight()
    } else if (keyCode === 14) {
      handleButtonPress()
    }
  }

  updateHighlight()
  log('Main menu loaded.')
})()

import { lang } from 'download0/languages'
import { libc_addr } from 'download0/userland'
import { fn, mem, BigInt } from 'download0/types'

;(function () {
  if (typeof libc_addr === 'undefined') { log('Loading userland.js...'); include('userland.js') }
  include('check-jailbroken.js')
  if (typeof startBgmIfEnabled === 'function') startBgmIfEnabled()
  const is_jailbroken = checkJailbroken()

  jsmaf.root.children.length = 0

  const C_CYAN = 'rgb(0,255,224)'
  const C_CYAN_DIM = 'rgba(0,255,224,0.35)'
  const C_WHITE = 'rgb(255,255,255)'
  const C_DIM = 'rgba(255,255,255,0.28)'
  const C_PURPLE = 'rgba(160,80,255,0.65)'

  const SFX_CURSOR = 'file:///../download0/sfx/cursor.wav'
  const SFX_CONFIRM = 'file:///../download0/sfx/confirm.wav'
  const SFX_CANCEL = 'file:///../download0/sfx/cancel.wav'
  function playSound (url: string) {
    if (typeof CONFIG !== 'undefined' && CONFIG.music === false) return
    try { const clip = new jsmaf.AudioClip(); clip.volume = 1.0; clip.open(url) } catch (e) {}
  }

  new Style({ name: 'white', color: C_WHITE, size: 24 })
  new Style({ name: 'cyan', color: C_CYAN, size: 24 })
  new Style({ name: 'dim', color: C_DIM, size: 22 })
  new Style({ name: 'subdim', color: C_CYAN_DIM, size: 17 })
  new Style({ name: 'purple', color: C_PURPLE, size: 22 })
  new Style({ name: 'footer', color: 'rgba(0,255,224,0.25)', size: 17 })

  const bg = new Image({ url: 'file:///../download0/img/NeonBG.png', x: 0, y: 0, width: 1920, height: 1080 })
  jsmaf.root.children.push(bg)

  const buttonImg = 'file:///../download0/img/NeonBG.png'
  const CX = 960; const btnW = 620; const btnLeft = CX - btnW / 2

  // Header
  const titleTxt = new jsmaf.Text()
  titleTxt.text = 'PAYLOAD MENU'; titleTxt.x = CX - 120; titleTxt.y = 120; titleTxt.style = 'cyan'
  jsmaf.root.children.push(titleTxt)

  const subTxt = new jsmaf.Text()
  subTxt.text = 'SELECT A PAYLOAD TO LAUNCH'; subTxt.x = CX - 160; subTxt.y = 158; subTxt.style = 'subdim'
  jsmaf.root.children.push(subTxt)

  const divL = new Image({ url: buttonImg, x: btnLeft, y: 195, width: btnW, height: 1, alpha: 0.4 })
  divL.borderColor = C_CYAN; divL.borderWidth = 0
  jsmaf.root.children.push(divL)

  // Scan paths & file list
  fn.register(0x05, 'open_sys', ['bigint', 'bigint', 'bigint'], 'bigint')
  fn.register(0x06, 'close_sys', ['bigint'], 'bigint')
  fn.register(0x110, 'getdents', ['bigint', 'bigint', 'bigint'], 'bigint')
  fn.register(0x03, 'read_sys', ['bigint', 'bigint', 'bigint'], 'bigint')

  const scanPaths: string[] = ['/download0/payloads']
  if (is_jailbroken) {
    scanPaths.push('/data/payloads')
    for (let i = 0; i <= 7; i++) scanPaths.push('/mnt/usb' + i + '/payloads')
  }

  const fileList: { name: string;path: string }[] = []
  const path_addr = mem.malloc(256); const buf = mem.malloc(4096)
  for (const p of scanPaths) {
    for (let i = 0; i < p.length; i++) mem.view(path_addr).setUint8(i, p.charCodeAt(i))
    mem.view(path_addr).setUint8(p.length, 0)
    const fd = fn.open_sys(path_addr, new BigInt(0, 0), new BigInt(0, 0))
    if (!fd.eq(new BigInt(0xffffffff, 0xffffffff))) {
      const count = fn.getdents(fd, buf, new BigInt(0, 4096))
      if (!count.eq(new BigInt(0xffffffff, 0xffffffff)) && count.lo > 0) {
        let off = 0
        while (off < count.lo) {
          const reclen = mem.view(buf.add(new BigInt(0, off + 4))).getUint16(0, true)
          const dtype = mem.view(buf.add(new BigInt(0, off + 6))).getUint8(0)
          const dnamlen = mem.view(buf.add(new BigInt(0, off + 7))).getUint8(0)
          let name = ''
          for (let j = 0; j < dnamlen; j++) name += String.fromCharCode(mem.view(buf.add(new BigInt(0, off + 8 + j))).getUint8(0))
          if (dtype === 8 && name !== '.' && name !== '..') {
            const low = name.toLowerCase()
            if (low.endsWith('.elf') || low.endsWith('.bin') || low.endsWith('.js')) fileList.push({ name, path: p + '/' + name })
          }
          off += reclen
        }
      }
      fn.close_sys(fd)
    }
  }

  // Build list UI - centered single column
  const buttons: Image[] = []
  const buttonTexts: jsmaf.Text[] = []
  let currentButton = 0; let prevButton = -1
  const itemH = 72; const itemSpacing = 84
  const startY = 230

  if (fileList.length === 0) {
    const empty = new jsmaf.Text(); empty.text = 'NO PAYLOADS FOUND'; empty.x = CX - 120; empty.y = 420; empty.style = 'dim'
    jsmaf.root.children.push(empty)
  }

  const maxShow = Math.min(fileList.length, 8)
  for (let i = 0; i < maxShow; i++) {
    const btnY = startY + i * itemSpacing
    const btn = new Image({ url: buttonImg, x: btnLeft, y: btnY, width: btnW, height: itemH, alpha: 0.06 })
    btn.borderColor = 'rgba(0,255,224,0.18)'; btn.borderWidth = 1
    buttons.push(btn); jsmaf.root.children.push(btn)

    const bar = new Image({ url: buttonImg, x: btnLeft, y: btnY, width: 3, height: itemH, alpha: 0.22 })
    bar.borderColor = C_CYAN; bar.borderWidth = 0; jsmaf.root.children.push(bar)

    const num = new jsmaf.Text(); num.text = String(i + 1).padStart(2, '0'); num.x = btnLeft + 22; num.y = btnY + 22; num.style = 'subdim'
    jsmaf.root.children.push(num)

    let disp = fileList[i]!.name; if (disp.length > 36) disp = disp.substring(0, 33) + '...'
    const t = new jsmaf.Text(); t.text = disp.toUpperCase(); t.x = btnLeft + 80; t.y = btnY + 22; t.style = 'dim'
    buttonTexts.push(t); jsmaf.root.children.push(t)
  }

  // Back button
  const backY = startY + maxShow * itemSpacing + 16
  const backBtn = new Image({ url: buttonImg, x: btnLeft, y: backY, width: btnW, height: itemH, alpha: 0 })
  backBtn.borderColor = 'transparent'; backBtn.borderWidth = 0
  buttons.push(backBtn); jsmaf.root.children.push(backBtn)
  const backDash = new Image({ url: buttonImg, x: btnLeft + 80, y: backY + 34, width: 30, height: 1, alpha: 0.5 })
  backDash.borderColor = C_PURPLE; backDash.borderWidth = 0; jsmaf.root.children.push(backDash)
  const backT = new jsmaf.Text(); backT.text = 'BACK'; backT.x = btnLeft + 124; backT.y = backY + 22; backT.style = 'purple'
  buttonTexts.push(backT); jsmaf.root.children.push(backT)

  // Footer
  const footerHints = ['  Navigate', '  Select', '  Back']
  const footerKeys = ['\u2191\u2193', 'X', 'O']
  let fx = CX - 280
  for (let i = 0; i < 3; i++) {
    const k = new jsmaf.Text(); k.text = footerKeys[i]!; k.x = fx; k.y = 1046; k.style = 'footer'; jsmaf.root.children.push(k)
    const h = new jsmaf.Text(); h.text = footerHints[i]!; h.x = fx + 22; h.y = 1046; h.style = 'footer'; jsmaf.root.children.push(h)
    fx += 190
  }

  function updateHighlight () {
    const prev = buttons[prevButton]
    if (prev && prevButton !== currentButton) {
      prev.alpha = 0.06; prev.borderColor = 'rgba(0,255,224,0.18)'
      const pt = buttonTexts[prevButton]; if (pt) pt.style = prevButton === buttons.length - 1 ? 'purple' : 'dim'
    }
    const cur = buttons[currentButton]
    if (cur) { cur.alpha = 0.12; cur.borderColor = 'rgba(0,255,224,0.6)' }
    const ct = buttonTexts[currentButton]; if (ct) ct.style = currentButton === buttons.length - 1 ? 'cyan' : 'white'
    prevButton = currentButton
  }

  function handleButtonPress () {
    if (currentButton === buttons.length - 1) {
      playSound(SFX_CANCEL)
      try { include('themes/' + (typeof CONFIG !== 'undefined' && CONFIG.theme ? CONFIG.theme : 'neon') + '/main.js') } catch (e) { log('ERROR: ' + (e as Error).message) }
      return
    }
    const entry = fileList[currentButton]; if (!entry) return
    playSound(SFX_CONFIRM); log('Loading: ' + entry.name)
    try {
      if (entry.name.toLowerCase().endsWith('.js')) {
        if (entry.path.startsWith('/download0/')) include('payloads/' + entry.name)
        else {
          const p = mem.malloc(256)
          for (let i = 0; i < entry.path.length; i++) mem.view(p).setUint8(i, entry.path.charCodeAt(i))
          mem.view(p).setUint8(entry.path.length, 0)
          const fd2 = fn.open_sys(p, new BigInt(0, 0), new BigInt(0, 0))
          if (!fd2.eq(new BigInt(0xffffffff, 0xffffffff))) {
            const b2 = mem.malloc(1024 * 1024); const rdlen = fn.read_sys(fd2, b2, new BigInt(0, 1024 * 1024)); fn.close_sys(fd2)
            let code = ''; const len = (rdlen instanceof BigInt) ? rdlen.lo : (rdlen as number)
            for (let i = 0; i < len; i++) code += String.fromCharCode(mem.view(b2).getUint8(i))
            eval(code) // eslint-disable-line no-eval
          }
        }
      } else {
        include('binloader.js'); const { bl_load_from_file } = binloader_init(); bl_load_from_file(entry.path)
      }
    } catch (e) { log('ERROR: ' + (e as Error).message) }
  }

  const confirmKey = jsmaf.circleIsAdvanceButton ? 13 : 14

  jsmaf.onKeyDown = function (keyCode) {
    if (keyCode === 6 || keyCode === 5) { currentButton = (currentButton + 1) % buttons.length; playSound(SFX_CURSOR); updateHighlight() } else if (keyCode === 4 || keyCode === 7) { currentButton = (currentButton - 1 + buttons.length) % buttons.length; playSound(SFX_CURSOR); updateHighlight() } else if (keyCode === confirmKey) handleButtonPress()
  }

  updateHighlight()
  log('Neon payload host loaded. Files: ' + fileList.length)
})()

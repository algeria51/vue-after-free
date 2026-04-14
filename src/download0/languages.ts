// Localised UI strings — detected from jsmaf.locale at runtime.
// Text is always rendered programmatically (no image fallbacks).

export const lang: Record<string, string> = {
  jailbreak:        'Jailbreak',
  payloadMenu:      'Payload Menu',
  config:           'Settings',
  exit:             'Exit',
  autoLapse:        'Auto Lapse',
  autoPoop:         'Auto Poop',
  autoClose:        'Auto Close',
  music:            'Music',
  jbBehavior:       'JB Behavior',
  jbBehaviorAuto:   'Auto Detect',
  jbBehaviorNetctrl:'NetControl',
  jbBehaviorLapse:  'Lapse',
  theme:            'Theme',
  xToGoBack:        'X  Back',
  oToGoBack:        'O  Back',
}

const locale: string = jsmaf.locale || 'en'
log('Locale: ' + locale)

switch (locale) {
  case 'ar':
    lang.jailbreak        = 'كسر الحماية'
    lang.payloadMenu      = 'قائمة الحمولة'
    lang.config           = 'الإعدادات'
    lang.exit             = 'خروج'
    lang.autoLapse        = 'Auto Lapse'
    lang.autoPoop         = 'Auto Poop'
    lang.autoClose        = 'إغلاق تلقائي'
    lang.music            = 'موسيقى'
    lang.jbBehavior       = 'نوع التهكير'
    lang.jbBehaviorAuto   = 'كشف تلقائي'
    lang.jbBehaviorNetctrl= 'NetControl'
    lang.jbBehaviorLapse  = 'Lapse'
    lang.theme            = 'سمة'
    lang.xToGoBack        = 'X  رجوع'
    lang.oToGoBack        = 'O  رجوع'
    break
  case 'de':
    lang.payloadMenu      = 'Payload-Menü'
    lang.config           = 'Einstellungen'
    lang.exit             = 'Beenden'
    lang.autoClose        = 'Auto schließen'
    lang.music            = 'Musik'
    lang.jbBehavior       = 'JB-Verhalten'
    lang.jbBehaviorAuto   = 'Automatisch'
    lang.theme            = 'Thema'
    lang.xToGoBack        = 'X  Zurück'
    lang.oToGoBack        = 'O  Zurück'
    break
  case 'es': case 'es-ES': case 'es-419': case 'es-MX': case 'es-AR': case 'es-CL':
    lang.payloadMenu      = 'Menu de Payloads'
    lang.config           = 'Configuración'
    lang.exit             = 'Salir'
    lang.autoClose        = 'Auto Cerrar'
    lang.music            = 'Música'
    lang.jbBehavior       = 'Comportamiento JB'
    lang.jbBehaviorAuto   = 'Auto Detectar'
    lang.theme            = 'Tema'
    lang.xToGoBack        = 'X  Volver'
    lang.oToGoBack        = 'O  Volver'
    break
  case 'fr':
    lang.payloadMenu      = 'Menu Payload'
    lang.config           = 'Configuration'
    lang.exit             = 'Quitter'
    lang.autoClose        = 'Fermer Auto'
    lang.music            = 'Musique'
    lang.jbBehavior       = 'Comportement JB'
    lang.jbBehaviorAuto   = 'Auto Détecter'
    lang.theme            = 'Thème'
    lang.xToGoBack        = 'X  Retour'
    lang.oToGoBack        = 'O  Retour'
    break
  case 'it':
    lang.payloadMenu      = 'Menu Payload'
    lang.config           = 'Configurazione'
    lang.exit             = 'Esci'
    lang.autoClose        = 'Chiudi Auto'
    lang.music            = 'Musica'
    lang.jbBehavior       = 'Comportamento JB'
    lang.jbBehaviorAuto   = 'Auto Rileva'
    lang.theme            = 'Tema'
    lang.xToGoBack        = 'X  Indietro'
    lang.oToGoBack        = 'O  Indietro'
    break
  case 'ja':
    lang.jailbreak        = '脱獄'
    lang.payloadMenu      = 'ペイロード'
    lang.config           = '設定'
    lang.exit             = '終了'
    lang.autoLapse        = '自動Lapse'
    lang.autoPoop         = '自動Poop'
    lang.autoClose        = '自動終了'
    lang.music            = '音楽'
    lang.jbBehavior       = 'JB動作'
    lang.jbBehaviorAuto   = '自動検出'
    lang.theme            = 'テーマ'
    lang.xToGoBack        = 'X  戻る'
    lang.oToGoBack        = 'O  戻る'
    break
  case 'ko':
    lang.jailbreak        = '탈옥'
    lang.payloadMenu      = '페이로드'
    lang.config           = '설정'
    lang.exit             = '종료'
    lang.autoLapse        = '자동 Lapse'
    lang.autoPoop         = '자동 Poop'
    lang.autoClose        = '자동 닫기'
    lang.music            = '음악'
    lang.jbBehavior       = 'JB 동작'
    lang.jbBehaviorAuto   = '자동 감지'
    lang.theme            = '테마'
    lang.xToGoBack        = 'X  뒤로'
    lang.oToGoBack        = 'O  뒤로'
    break
  case 'nl':
    lang.payloadMenu      = 'Payload Menu'
    lang.config           = 'Instellingen'
    lang.exit             = 'Afsluiten'
    lang.autoClose        = 'Auto Sluiten'
    lang.music            = 'Muziek'
    lang.jbBehavior       = 'JB Gedrag'
    lang.jbBehaviorAuto   = 'Auto Detectie'
    lang.theme            = 'Thema'
    lang.xToGoBack        = 'X  Terug'
    lang.oToGoBack        = 'O  Terug'
    break
  case 'pl':
    lang.payloadMenu      = 'Menu Payload'
    lang.config           = 'Konfiguracja'
    lang.exit             = 'Wyjście'
    lang.autoClose        = 'Auto Zamknij'
    lang.music            = 'Muzyka'
    lang.jbBehavior       = 'Zachowanie JB'
    lang.jbBehaviorAuto   = 'Auto Wykryj'
    lang.theme            = 'Motyw'
    lang.xToGoBack        = 'X  Wróć'
    lang.oToGoBack        = 'O  Wróć'
    break
  case 'pt':
    lang.payloadMenu      = 'Menu de Payloads'
    lang.config           = 'Configuração'
    lang.exit             = 'Sair'
    lang.autoClose        = 'Fechar Auto'
    lang.music            = 'Música'
    lang.jbBehavior       = 'Comportamento JB'
    lang.jbBehaviorAuto   = 'Auto Detectar'
    lang.theme            = 'Tema'
    lang.xToGoBack        = 'X  Voltar'
    lang.oToGoBack        = 'O  Voltar'
    break
  case 'tr':
    lang.payloadMenu      = 'Payload Menüsü'
    lang.config           = 'Ayarlar'
    lang.exit             = 'Çıkış'
    lang.autoClose        = 'Otomatik Kapat'
    lang.music            = 'Müzik'
    lang.jbBehavior       = 'JB Davranışı'
    lang.jbBehaviorAuto   = 'Otomatik Algılama'
    lang.theme            = 'Tema'
    lang.xToGoBack        = 'X  Geri'
    lang.oToGoBack        = 'O  Geri'
    break
  case 'zh':
    lang.jailbreak        = '越狱'
    lang.payloadMenu      = '载荷菜单'
    lang.config           = '设置'
    lang.exit             = '退出'
    lang.autoLapse        = '自动Lapse'
    lang.autoPoop         = '自动Poop'
    lang.autoClose        = '自动关闭'
    lang.music            = '音乐'
    lang.jbBehavior       = 'JB行为'
    lang.jbBehaviorAuto   = '自动检测'
    lang.theme            = '主题'
    lang.xToGoBack        = 'X  返回'
    lang.oToGoBack        = 'O  返回'
    break
  default: // 'en' and everything else
    break
}

log('Language ready: ' + locale)

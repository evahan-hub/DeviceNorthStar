/* Device Studio — schema-driven settings model.
   A subset of the ~143 merchant-facing settings across 26 groups (TerminalSettings v3).
   The control panel renders entirely from this schema, so new groups/fields appear
   automatically. Each group declares a `preview` binding to the simulator. */
(function () {
  const groups = [
    {
      id: 'homeScreen', level: 'policy', category: 'Customization – branding', title: 'Home screen', icon: 'image', preview: 'home',
      desc: 'Idle screen shown between transactions.',
      fields: [
        { id: 'theme', label: 'Theme', type: 'segmented', options: ['Dark', 'Light', 'Brand'], default: 'Dark' },
        { id: 'brandColor', label: 'Brand colour', type: 'color', default: '#00D16A', dependsOn: { theme: 'Brand' } },
        { id: 'showLogo', label: 'Show store logo', type: 'toggle', default: true },
        { id: 'greeting', label: 'Greeting text', type: 'text', default: 'Welcome to Lightspeed', placeholder: 'Welcome', valueInput: true },
      ],
    },
    {
      id: 'gratuities', level: 'policy', category: 'PaymentFeatures', title: 'Tipping (gratuities)', icon: 'percent', preview: 'tipping',
      desc: 'Prompt the cardholder to add a tip.',
      unsupported: { SoftPOS: false },
      fields: [
        { id: 'enabled', label: 'Enable tipping', type: 'toggle', default: true },
        { id: 'presets', label: 'Preset percentages', type: 'numbers', default: [5, 10, 15], dependsOn: { enabled: true }, valueInput: true },
        { id: 'allowCustom', label: 'Allow custom amount', type: 'toggle', default: true, dependsOn: { enabled: true } },
        { id: 'allowNoTip', label: 'Show "No tip" option', type: 'toggle', default: true, dependsOn: { enabled: true } },
      ],
    },
    {
      id: 'receiptPrinting', level: 'policy', category: 'Receipts', title: 'Receipts', icon: 'receipt', preview: 'receipt',
      desc: 'Printed and digital receipt content.',
      unsupportedOn: ['SoftPOS', 'e355'],
      fields: [
        { id: 'printMerchant', label: 'Print merchant copy', type: 'toggle', default: true },
        { id: 'header', label: 'Receipt header', type: 'text', default: 'Lightspeed F&B', valueInput: true },
        { id: 'footer', label: 'Receipt footer', type: 'text', default: 'Thank you for shopping with us', valueInput: true },
        { id: 'printLogo', label: 'Print logo on receipt', type: 'toggle', default: true },
      ],
    },
    {
      id: 'payment', level: 'policy', category: 'PaymentFeatures', title: 'Payment', icon: 'card', preview: 'transaction',
      desc: 'How the payment flow behaves.',
      fields: [
        { id: 'amountEntry', label: 'Amount entry', type: 'segmented', options: ['Keypad', 'Fixed'], default: 'Keypad' },
        { id: 'contactless', label: 'Contactless', type: 'toggle', default: true },
        { id: 'confirmAmount', label: 'Confirm amount screen', type: 'toggle', default: true },
      ],
    },
    {
      id: 'japan', level: 'policy', category: 'PaymentFeatures', title: 'Japan market (F&B)', icon: 'globe', preview: 'transaction', market: 'Japan',
      desc: 'Local acceptance and tax rules for the Japanese market.',
      fields: [
        { id: 'jcb', label: 'Accept JCB', type: 'toggle', default: false },
        { id: 'emoney', label: 'e-money (iD, QUICPay)', type: 'toggle', default: false },
        { id: 'transitIC', label: 'Transit IC (Suica, PASMO)', type: 'toggle', default: false },
        { id: 'qrWallets', label: 'QR wallets (PayPay, Rakuten Pay, au PAY)', type: 'toggle', default: false },
        { id: 'taxMode', label: 'Consumption tax', type: 'segmented', options: ['Standard 10%', 'Reduced 8% (takeaway)'], default: 'Standard 10%' },
        { id: 'officialReceipt', label: 'Offer 領収書 (official receipt)', type: 'toggle', default: false },
      ],
    },
    {
      id: 'dcc', level: 'policy', category: 'PaymentFeatures', title: 'Dynamic currency conversion', icon: 'globe', preview: 'transaction',
      desc: 'Let international cardholders pay in their home currency.',
      fields: [
        { id: 'enabled', label: 'Offer DCC', type: 'toggle', default: false },
        { id: 'markup', label: 'Markup', type: 'percent', default: 3.5, dependsOn: { enabled: true }, valueInput: true },
      ],
    },
    {
      id: 'localization', level: 'policy', category: 'Localization', title: 'Language & region', icon: 'globe', preview: 'home',
      desc: 'Languages shown to the cardholder.',
      fields: [
        { id: 'language', label: 'Primary language', type: 'select', options: ['English', 'German', 'French', 'Dutch', 'Spanish', 'Japanese'], default: 'English' },
        { id: 'secondary', label: 'Secondary language', type: 'select', options: ['None', 'German', 'French', 'Dutch', 'Spanish'], default: 'None' },
      ],
    },
    {
      id: 'connectivity', level: 'device', category: 'Connectivity', title: 'Connectivity', icon: 'wifi', preview: null,
      desc: 'Network configuration for the device.',
      unsupportedOn: ['SoftPOS'], // SoftPOS uses the host phone's own network
      fields: [
        { id: 'wifi', label: 'Wi-Fi', type: 'toggle', default: true },
        { id: 'ssid', label: 'Wi-Fi network (SSID)', type: 'text', default: 'Lightspeed-POS', dependsOn: { wifi: true } },
        { id: 'sim', label: 'Mobile data (SIM)', type: 'toggle', default: true },
      ],
    },
    {
      id: 'standalone', level: 'device', category: 'Hardware', title: 'Standalone & timeouts', icon: 'timer', preview: null,
      desc: 'Use the device without a connected POS.',
      unsupportedOn: ['SoftPOS'], // the phone's own POS app owns the session
      fields: [
        { id: 'standalone', label: 'Standalone mode', type: 'toggle', default: false },
        { id: 'screenTimeout', label: 'Screen timeout (seconds)', type: 'number', default: 60 },
      ],
    },
    {
      id: 'hardware', level: 'device', category: 'Hardware', title: 'Hardware & peripherals', icon: 'terminal-2', preview: null,
      desc: 'Physical capabilities and connected peripherals.',
      fields: [
        { id: 'barcode', label: 'Barcode scanner', type: 'toggle', default: false },
        { id: 'printer', label: 'Receipt printer', type: 'segmented', options: ['Built-in', 'External', 'None'], default: 'Built-in' },
        { id: 'brightness', label: 'Screen brightness', type: 'segmented', options: ['Auto', 'Low', 'High'], default: 'Auto' },
      ],
    },
    {
      id: 'passcodes', level: 'device', category: 'Passcodes', title: 'Passcodes', icon: 'settings', preview: null,
      desc: 'Per-device security codes.',
      fields: [
        { id: 'adminLock', label: 'Require admin passcode', type: 'toggle', default: true },
        { id: 'supervisor', label: 'Supervisor passcode', type: 'toggle', default: false },
        { id: 'autolock', label: 'Auto-lock after (minutes)', type: 'number', default: 5 },
      ],
    },
    {
      id: 'mobile', level: 'device', category: 'Mobile', title: 'Mobile (SoftPOS)', icon: 'mobile', preview: null,
      desc: 'SoftPOS attestation and per-device mobile config.',
      unsupportedOn: ['Terminal'], // SoftPOS-only category
      fields: [
        { id: 'attestation', label: 'Integrity attestation', type: 'toggle', default: true },
        { id: 'tapToPay', label: 'Tap to Pay on iPhone', type: 'toggle', default: true },
        { id: 'reverify', label: 'Re-verify every (days)', type: 'number', default: 30 },
      ],
    },
    {
      id: 'diagnostics', level: 'device', category: 'Diagnostics', title: 'Diagnostics', icon: 'help-center', preview: null,
      desc: 'Logging and troubleshooting for this device.',
      fields: [
        { id: 'remoteLogs', label: 'Remote logging', type: 'toggle', default: true },
        { id: 'logLevel', label: 'Log level', type: 'select', options: ['Error', 'Info', 'Debug'], default: 'Info' },
      ],
    },
    {
      id: 'deviceDisplay', level: 'device', category: 'Customization – per-unit UI', title: 'Device display', icon: 'image', preview: null,
      desc: 'Per-device screen options not covered by store branding.',
      fields: [
        { id: 'deviceName', label: 'Device name', type: 'text', default: 'Front counter 1', valueInput: true },
        { id: 'orientation', label: 'Orientation', type: 'segmented', options: ['Auto', 'Portrait', 'Landscape'], default: 'Auto' },
        { id: 'nightMode', label: 'Night-mode dimming', type: 'toggle', default: false },
      ],
    },
  ];

  // Language sample strings for the simulator.
  const i18n = {
    English: { welcome: 'Welcome', present: 'Present card', tip: 'Add a tip?', approved: 'Approved', noTip: 'No tip', custom: 'Other', total: 'Total', thanks: 'Thank you' },
    German: { welcome: 'Willkommen', present: 'Karte vorhalten', tip: 'Trinkgeld?', approved: 'Genehmigt', noTip: 'Kein Trinkgeld', custom: 'Andere', total: 'Gesamt', thanks: 'Danke' },
    French: { welcome: 'Bienvenue', present: 'Présentez la carte', tip: 'Pourboire ?', approved: 'Approuvé', noTip: 'Aucun', custom: 'Autre', total: 'Total', thanks: 'Merci' },
    Dutch: { welcome: 'Welkom', present: 'Kaart aanbieden', tip: 'Fooi?', approved: 'Goedgekeurd', noTip: 'Geen fooi', custom: 'Anders', total: 'Totaal', thanks: 'Bedankt' },
    Spanish: { welcome: 'Bienvenido', present: 'Acerque la tarjeta', tip: '¿Propina?', approved: 'Aprobado', noTip: 'Sin propina', custom: 'Otro', total: 'Total', thanks: 'Gracias' },
    Japanese: { welcome: 'ようこそ', present: 'カードをかざす', tip: 'チップ？', approved: '承認済み', noTip: 'なし', custom: 'その他', total: '合計', thanks: 'ありがとう' },
  };

  function defaults() {
    const v = {};
    groups.forEach((g) => { v[g.id] = {}; g.fields.forEach((f) => { v[g.id][f.id] = Array.isArray(f.default) ? f.default.slice() : f.default; }); });
    return v;
  }

  window.SCHEMA = { groups, i18n, defaults };
})();

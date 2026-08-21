/* Device North Star — mock data layer.
   Attaches everything to window.DATA. Grounded in the PRD's baseline signals. */
(function () {
  const fmt = (n) => n.toLocaleString('en-US');

  // ---- Fleet KPIs (PRD baseline signals) ----
  const kpis = [
    { id: 'active', title: 'Active terminals', value: '656,720', raw: 656720, trend: 2.1, dir: 'positive', hint: 'Terminals seen online in the last 30 days.' },
    { id: 'transacting', title: 'Transacting terminals', value: '419,559', raw: 419559, trend: 1.4, dir: 'positive', hint: 'Terminals that processed at least one payment.' },
    { id: 'gap', title: 'Active, not trading', value: '36.1%', raw: 36.1, trend: 1.2, dir: 'negative', hint: 'Active terminals with zero transactions — the reliability gap.' },
    { id: 'auth', title: 'Authorisation rate', value: '94.2%', raw: 94.2, trend: 0.3, dir: 'positive', hint: 'Approved / total authorisation attempts.' },
    { id: 'atv', title: 'Avg. transaction value', value: '€48.10', raw: 48.1, trend: 0.8, dir: 'positive', hint: 'Average transaction value across the fleet.' },
    { id: 'dcc', title: 'DCC acceptance rate', value: '41.0%', raw: 41, trend: 3.6, dir: 'positive', hint: 'DCC offers accepted by cardholders. Enabled on ~126k terminals.' },
    { id: 'offline', title: 'Offline-payment usage', value: '3.2%', raw: 3.2, trend: 0.1, dir: 'neutral', hint: 'Share of payments processed via store-and-forward.' },
  ];

  // ---- Chart series ----
  const months = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  const volumeTrend = {
    labels: months,
    series: [
      { name: 'IPP (in-store)', color: 'var(--lume-royalblue)', points: [62, 64, 71, 88, 66, 63, 68, 70, 72, 75, 78, 81] },
      { name: 'Checkout (online)', color: 'var(--lume-skyblue)', points: [40, 42, 45, 58, 44, 43, 47, 49, 50, 52, 55, 57] },
    ],
    unit: '€M',
  };
  const authTrend = {
    labels: months,
    series: [{ name: 'Auth rate', color: 'var(--lume-royalblue)', points: [92.1, 92.4, 92.0, 91.6, 92.8, 93.1, 93.4, 93.6, 93.9, 94.0, 94.1, 94.2] }],
    unit: '%', min: 88, max: 96,
  };
  const notTradingTrend = {
    labels: months,
    series: [{ name: 'Active, not trading', color: 'var(--b-color-decorative-red)', points: [39.2, 38.9, 38.5, 38.1, 37.6, 37.3, 37.0, 36.8, 36.6, 36.4, 36.2, 36.1] }],
    unit: '%', min: 30, max: 42,
  };
  const featureAdoption = {
    labels: months,
    series: [
      { name: 'DCC', color: 'var(--lume-royalblue)', points: [14, 15, 16, 16, 17, 17, 18, 18, 19, 19, 19, 19] },
      { name: 'Tipping', color: 'var(--lume-skyblue)', points: [22, 22, 23, 24, 24, 25, 26, 27, 27, 28, 29, 30] },
      { name: 'Installments', color: 'var(--lume-violet)', points: [0.6, 0.7, 0.7, 0.8, 0.8, 0.9, 1.0, 1.0, 1.05, 1.08, 1.1, 1.1] },
    ],
    unit: '%', min: 0, max: 34,
  };

  // ---- Data grids ----
  const featureByModel = {
    columns: ['Terminal model', 'Terminals', 'DCC', 'Tipping', 'Contactless', 'Auth rate'],
    rows: [
      ['AMS1 (countertop)', '184,203', '48%', '31%', '99%', '94.6%'],
      ['S1F2 (portable)', '142,880', '39%', '44%', '100%', '94.1%'],
      ['V400m (portable)', '96,540', '52%', '28%', '100%', '93.8%'],
      ['e355 (mobile)', '61,220', '21%', '18%', '98%', '92.9%'],
      ['SoftPOS (Android)', '38,110', '4%', '22%', '100%', '91.7%'],
      ['NYC1 (kiosk)', '12,406', '61%', '2%', '99%', '95.2%'],
    ],
  };
  const storesAttention = {
    columns: ['Store', 'Location', 'Issue', 'Devices affected'],
    rows: [
      ['Berlin Mitte Flagship', 'Berlin, DE', 'Config error — DCC', '6'],
      ['Paris Rivoli', 'Paris, FR', 'Firmware out of date', '11'],
      ['London Oxford St', 'London, GB', '4 terminals offline', '4'],
      ['Amsterdam Kalverstr.', 'Amsterdam, NL', 'PCI attestation due', '9'],
      ['Tokyo Shibuya', 'Tokyo, JP', 'Not boarded', '3'],
    ],
  };
  const notTransacting = {
    columns: ['Reason', 'Terminals', 'Share'],
    rows: [
      ['Offline / no connectivity', '104,882', '44%'],
      ['Not boarded', '61,540', '26%'],
      ['Configuration error', '41,190', '17%'],
      ['Inventory / not deployed', '23,860', '10%'],
      ['Hardware fault', '5,689', '3%'],
    ],
  };
  const compliance = {
    columns: ['Terminal model', 'On latest firmware', 'PCI attested', 'Action'],
    rows: [
      ['AMS1 (countertop)', '96%', '99%', 'Update 7,368'],
      ['S1F2 (portable)', '88%', '97%', 'Update 17,145'],
      ['V400m (portable)', '91%', '100%', 'Update 8,688'],
      ['e355 (mobile)', '74%', '92%', 'Update 15,917'],
      ['SoftPOS (Android)', '99%', '100%', '—'],
    ],
  };
  const notReadyReasons = {
    columns: ['Not-ready reason', 'Terminals', 'Share'],
    rows: notTransacting.rows,
  };

  // ---- Stores & devices ----
  const models = [
    { id: 'AMS1', name: 'AMS1', className: 'countertop', printer: true, battery: false },
    { id: 'S1F2', name: 'S1F2', className: 'portable', printer: true, battery: true },
    { id: 'V400m', name: 'V400m', className: 'portable', printer: true, battery: true },
    { id: 'e355', name: 'e355', className: 'mobile', printer: false, battery: true },
    { id: 'SoftPOS', name: 'Tap to Pay', className: 'softpos', printer: false, battery: true },
  ];

  const storeSeed = [
    ['st-berlin', 'Berlin Mitte Flagship', 'Berlin', 'DE', 'Flagship', 'red'],
    ['st-paris', 'Paris Rivoli', 'Paris', 'FR', 'Flagship', 'yellow'],
    ['st-london', 'London Oxford St', 'London', 'GB', 'Retail', 'yellow'],
    ['st-ams', 'Amsterdam Kalverstraat', 'Amsterdam', 'NL', 'Retail', 'yellow'],
    ['st-tokyo', 'Tokyo Shibuya', 'Tokyo', 'JP', 'Retail', 'red'],
    ['st-nyc', 'New York SoHo', 'New York', 'US', 'Flagship', 'green'],
    ['st-madrid', 'Madrid Gran Vía', 'Madrid', 'ES', 'Retail', 'green'],
    ['st-milan', 'Milan Duomo', 'Milan', 'IT', 'Popup', 'green'],
  ];

  const firstNames = ['AMS1', 'S1F2', 'V400m', 'e355', 'SoftPOS'];
  let devSeq = 1000;
  function makeDevice(store, modelId, status) {
    const m = models.find((x) => x.id === modelId);
    devSeq += 7;
    const serial = modelId.toUpperCase().replace(/[^A-Z0-9]/g, '') + '-' + (devSeq * 31 % 900000 + 100000);
    return {
      id: 's' + devSeq,
      serial,
      model: modelId,
      className: m.className,
      storeId: store.id,
      storeName: store.name,
      status, // Trading | Not trading | Offline
      connectivity: status === 'Offline' ? 'Offline' : (Math.random() > 0.5 ? 'Wi-Fi' : 'Mobile'),
      battery: m.battery ? Math.floor(30 + Math.random() * 70) : null,
      firmware: Math.random() > 0.2 ? 'Up to date' : 'Update available',
      lastSeen: status === 'Offline' ? '3 days ago' : (Math.floor(Math.random() * 55) + 1) + ' min ago',
      dcc: Math.random() > 0.55,
      tipping: Math.random() > 0.5,
    };
  }

  const stores = storeSeed.map(([id, name, city, cc, type, health]) => {
    const store = {
      id, name, city, country: cc, type, health,
      timezone: { DE: 'Europe/Berlin', FR: 'Europe/Paris', GB: 'Europe/London', NL: 'Europe/Amsterdam', JP: 'Asia/Tokyo', US: 'America/New_York', ES: 'Europe/Madrid', IT: 'Europe/Rome' }[cc],
      currency: { DE: 'EUR', FR: 'EUR', GB: 'GBP', NL: 'EUR', JP: 'JPY', US: 'USD', ES: 'EUR', IT: 'EUR' }[cc],
      mid: 'MID_' + cc + '_' + (Math.floor(Math.random() * 9000) + 1000),
      address: city + ' city centre',
    };
    return store;
  });

  const devices = [];
  const perStore = { 'st-berlin': 18, 'st-paris': 22, 'st-london': 14, 'st-ams': 16, 'st-tokyo': 9, 'st-nyc': 20, 'st-madrid': 12, 'st-milan': 6 };
  stores.forEach((s) => {
    const n = perStore[s.id] || 10;
    for (let i = 0; i < n; i++) {
      const modelId = models[i % models.length].id;
      let status = 'Trading';
      if (s.health === 'red' && i % 3 === 0) status = 'Not trading';
      else if (s.health === 'red' && i % 5 === 0) status = 'Offline';
      else if (s.health === 'yellow' && i % 6 === 0) status = 'Offline';
      devices.push(makeDevice(s, modelId, status));
    }
  });
  stores.forEach((s) => {
    const list = devices.filter((d) => d.storeId === s.id);
    s.deviceCount = list.length;
    s.trading = list.filter((d) => d.status === 'Trading').length;
    s.notReady = list.length - s.trading;
  });

  // ---- Natural-language canned answers ----
  const nlAnswers = [
    {
      match: ['dcc', 'germany', 'de', 'retail'],
      question: 'How many DCC-enabled terminals in Retail stores in DE?',
      answer: 'You have 3,912 DCC-enabled terminals across 41 Retail stores in Germany — 46% of the German Retail fleet.',
      metric: { value: '3,912', label: 'DCC-enabled · DE Retail', trend: 4.1, dir: 'positive' },
      grid: { columns: [
        'Store',
        { label: 'DCC terminals', info: 'Terminals in this store with Dynamic Currency Conversion enabled.' },
        { label: 'Acceptance', info: 'Share of eligible foreign-card transactions where the shopper accepted DCC (paid in their home currency).' },
      ], rows: [['Berlin Mitte Flagship', '6', '52%'], ['Munich Marienplatz', '9', '48%'], ['Hamburg Mönckeberg', '7', '39%'], ['Frankfurt Zeil', '5', '44%']] },
    },
    {
      match: ['not', 'trading', 'transact'],
      question: 'Which terminals are active but not trading, and why?',
      answer: '236,161 active terminals (36%) are not trading. The biggest driver is offline / connectivity (44%), followed by not-boarded (26%).',
      metric: { value: '236,161', label: 'Active, not trading', trend: 1.2, dir: 'negative' },
      grid: notReadyReasons,
    },
    {
      match: ['tipping', 'gratuit'],
      question: 'How is tipping configured across my fleet?',
      answer: 'Tipping is enabled on ~30% of your tipping-capable fleet (~170,400 of ~522,900 terminals). Adoption is highest on S1F2 portables (44%) and lowest on SoftPOS (22%) and e355 (18%).',
      metric: { value: '30%', label: 'Fleet tipping adoption · ~170,400 terminals', trend: 2.0, dir: 'positive' },
      grid: { columns: [
        'Model',
        { label: 'Devices', info: 'Total terminals of this model in your fleet.' },
        { label: 'Tipping on', info: 'Share of this model’s terminals that have the tipping prompt enabled.' },
        { label: 'Avg tip', info: 'Average tip left, as a % of the transaction amount, on terminals where tipping is enabled.' },
        { label: 'Status', info: 'Tipping performance vs the fleet benchmark. “Underperforming” = attach rate or average tip well below peers — usually because the tipping prompt is off by default or the staff-facing flow lets it be skipped.' },
      ], rows: [
        ['S1F2', '184,203', '44%', '11.4%', 'Healthy'],
        ['AMS1', '96,540', '31%', '9.1%', 'OK'],
        ['V400m', '142,880', '28%', '8.7%', 'OK'],
        ['SoftPOS', '38,110', '22%', '6.2%', 'Underperforming'],
        ['e355', '61,220', '18%', '5.5%', 'Underperforming'],
      ] },
      note: 'SoftPOS and e355 underperform because the tipping prompt is off by default and the flow lets staff skip the screen. Turning on the tipping step with preset amounts (10 / 15 / 20%) typically lifts attach by 8–12 points.',
      actions: [
        { label: 'Enable tipping on SoftPOS & e355', icon: 'checkmark', msg: 'Enabling tipping on 2 underperforming models (99,330 devices)…' },
        { label: 'Set presets 10 / 15 / 20%', icon: 'percent', msg: 'Applying tip presets 10 / 15 / 20% across the fleet…' },
      ],
      deepDive: { prompt: 'Do you want to deep dive with revenue optimisation?', label: 'Deep dive with revenue optimisation', q: 'revenue optimisation deep dive' },
    },
    {
      match: ['revenue', 'optimis', 'optimiz'],
      question: 'Where can I optimise revenue across the fleet?',
      answer: 'Your biggest payments-revenue levers are DCC and authorisation-rate features. DCC is eligible-but-off on 49 terminals (~€22k/mo). Tipping raises in-store ticket size (+~€18k/mo) — a complementary, point-of-sale revenue feature rather than a payments-optimisation lever.',
      metric: { value: '+~€58k/mo', label: 'Identified revenue opportunity', trend: 6.0, dir: 'positive' },
      grid: { columns: ['Lever', 'Type', 'Opportunity', 'Status'], rows: [
        ['DCC', 'Payments revenue optimisation', '+~€22k/mo', '49 eligible off'],
        ['Auth-rate (tokens, retries)', 'Payments revenue optimisation', '+~€18k/mo', 'Review'],
        ['Tipping', 'In-store revenue (ticket size)', '+~€18k/mo', '2 models off'],
      ] },
      note: '“Revenue optimisation” at Adyen refers to payments-side levers — DCC, network tokens, auto-retries and routing. Tipping is a point-of-sale feature that raises ticket size; it complements revenue optimisation but is tracked separately.',
    },
    {
      match: ['firmware', 'update', 'compliance', 'pci'],
      question: 'Which models need a firmware update?',
      answer: '49,118 terminals are not on the latest firmware. e355 mobiles are furthest behind (74% up to date).',
      metric: { value: '49,118', label: 'Awaiting firmware update', trend: 5.0, dir: 'negative' },
      grid: compliance,
    },
    // ---- Location AI · JTBD 1: Look up a device ----
    {
      match: ['why isn', 'terminal working', 'not working', 'look up a device'],
      question: "Why isn't this terminal working?",
      answer: '6 terminals across your locations are online but not trading right now. The most common cause is a lost Wi-Fi connection after a firmware update. Enter or scan a device ID to run a full diagnosis.',
      metric: { value: '6', label: 'Terminals not trading · needs attention', trend: 2.0, dir: 'negative' },
      grid: { columns: [
        'Device ID',
        'Store',
        { label: 'Issue', info: 'Why this terminal is online but not accepting payments.' },
        'Last seen',
      ], rows: [
        ['SFO1-0544000067', 'Amsterdam Centrum', 'Offline · Wi-Fi lost', '3h ago'],
        ['V400m-0231889014', 'Rotterdam Beurs', 'Boarded · not trading', '1d ago'],
        ['AMS1-0455120983', 'Utrecht Centraal', 'SDK expired', '5h ago'],
        ['e285-0091334220', 'Den Haag Centrum', 'Offline', '2h ago'],
        ['NYC1-0788451002', 'Eindhoven', 'Battery critical', '20m ago'],
        ['P630-0345990871', 'Groningen', 'Boarded · not trading', '2d ago'],
      ] },
      note: 'Tip: type a device ID (e.g. SFO1-0544000067) to run a full diagnosis with one-click fixes.',
      deepDive: { prompt: 'Diagnose SFO1-0544000067 (offline for 3h)?', label: 'Diagnose SFO1-0544000067', q: 'SFO1-0544000067' },
    },
    // ---- Location AI · JTBD 2: Device reassignment ----
    {
      match: ['stuck', 'mid-move', 'reassign', 'in transit', 'stuck in reassignment'],
      question: 'Which devices are stuck mid-move?',
      answer: '9 devices are stuck between locations — 4 boarded-but-not-trading, 3 over 48h in transit, and 2 unassigned-but-online. Smart routing suggests the best destination store for each.',
      metric: { value: '9', label: 'Devices stuck in reassignment', trend: 3.0, dir: 'negative' },
      grid: { columns: [
        'Device ID',
        { label: 'State', info: 'Where the device stalled: boarded but not trading, in transit >48h, or unassigned but online.' },
        'Stuck for',
        { label: 'Suggested destination', info: 'Best store ranked by proximity, stock gap and recent volume.' },
      ], rows: [
        ['V400m-0231889014', 'Boarded · not trading', '52h', 'Rotterdam Beurs · stock gap'],
        ['AMS1-0455120983', 'In transit', '3d', 'Utrecht Centraal · nearest'],
        ['S1F2-0912440087', 'Unassigned · online', '26h', 'Amsterdam Centrum · volume'],
        ['e285-0091334220', 'In transit', '2d', 'Den Haag Centrum · nearest'],
        ['P630-0345990871', 'Boarded · not trading', '61h', 'Groningen · stock gap'],
      ] },
      note: 'Smart suggestions rank destinations by proximity, stock gap and volume. Bulk-routing writes a reason code and logs who moved what, when, to the audit trail.',
      actions: [
        { label: 'Bulk-route to suggested stores', icon: 'checkmark', msg: 'Routing 9 devices to their suggested destinations…' },
        { label: 'Return unassigned to inventory', icon: 'package', msg: 'Returning 2 unassigned devices to inventory…' },
      ],
    },
    // ---- Location AI · device diagnosis (triggered by typing a terminal ID) ----
    {
      diag: true,
      match: ['sfo1-0544000067', 'diagnose'],
      question: 'Diagnose terminal SFO1-0544000067',
      answer: 'SFO1-0544000067 (Adyen SFO1 · Amsterdam Centrum) has been offline for 3h 12m. Root cause: it dropped off Wi-Fi during last night’s firmware update and failed to re-board — so it’s active but not trading.',
      metric: { value: 'Offline · 3h 12m', label: 'SFO1-0544000067 · Amsterdam Centrum', trend: null, dir: 'negative' },
      grid: { columns: [
        'Check',
        'Status',
        'Detail',
      ], rows: [
        ['Connectivity', 'Offline', 'Wi-Fi lost · last seen 3h 12m ago'],
        ['Battery', 'OK', 'Mains powered'],
        ['SDK', 'Expired', 'Android 2.13.0 · expired Apr 2026'],
        ['Firmware', 'Behind', 'Castles 1.126.5 → 1.133.3 available'],
        ['Last transaction', '18h ago', '€42.10 · approved'],
        ['Boarding', 'Not trading', 'Re-board failed after the update'],
      ] },
      note: 'Most likely fix: re-sync the config and reconnect to Wi-Fi. If it stays offline, restart the terminal; if boarding still fails, reassign it to Amsterdam Centrum to force a fresh board.',
      actions: [
        { label: 'Restart terminal', icon: 'refresh', msg: 'Sending restart to SFO1-0544000067…' },
        { label: 'Re-sync config', icon: 'settings', msg: 'Re-syncing configuration to SFO1-0544000067…' },
        { label: 'Reassign to Amsterdam Centrum', icon: 'store', msg: 'Reassigning SFO1-0544000067…' },
      ],
      deepDive: { prompt: 'Want me to fix this now — re-sync config and reconnect to Wi-Fi?', label: 'Fix this terminal', q: 'resolve SFO1-0544000067' },
    },
    // ---- Location AI · resolution (after user confirms the fix) ----
    {
      resolve: true,
      match: ['resolve', 'fix', 'solve'],
      question: 'Fix terminal SFO1-0544000067',
      answer: '✓ Re-synced the config and reconnected SFO1-0544000067 to Wi-Fi. The terminal is back online and boarded — it processed a €12.40 test authorisation successfully.',
      metric: { value: 'Online · trading', label: 'SFO1-0544000067 · resolved', trend: null, dir: 'positive' },
      grid: { columns: ['Step', 'Result'], rows: [
        ['Reconnect Wi-Fi', 'Connected · signal good'],
        ['Re-sync config', 'Applied · v1.133.3'],
        ['Re-board', 'Success'],
        ['Test transaction', '€12.40 · approved'],
      ] },
      note: 'Logged to the audit trail: config re-sync + Wi-Fi reconnect by you, just now. No support ticket needed.',
    },
  ];

  /* SDK & OS Health — Tap to Pay & card readers (PRD addendum, single 25-device fleet). */
  const sdkHealth = {
    asOf: '2026-08-16',
    totalDevices: 25,
    sdk: {
      kpis: {
        upcomingAndroid: { inDays: 13, version: '2.14.0' },
        upcomingIos: { inDays: 132, version: '3.18.0' },
        expiring: { count: 3, pct: 12.0 },
        expired: { count: 15, pct: 60.0 },
        supported: { count: 7, pct: 28.0 },
        total: 25,
      },
      installed: [
        { platform: 'Android', version: '2.15.0', status: 'Supported', expiry: 'Mar 15, 2027', devices: 4, stores: 1, accounts: 3 },
        { platform: 'Android', version: '2.14.0', status: 'Expiring', expiry: 'Aug 29, 2026', devices: 3, stores: 0, accounts: 1 },
        { platform: 'Android', version: '2.13.0', status: 'Expired', expiry: 'Apr 18, 2026', devices: 1, stores: 0, accounts: 1 },
        { platform: 'Android', version: '2.11.0', status: 'Expired', expiry: 'Jun 6, 2026', devices: 1, stores: 0, accounts: 1 },
        { platform: 'Android', version: '2.8.1', status: 'Expired', expiry: 'Dec 29, 2025', devices: 1, stores: 0, accounts: 1 },
        { platform: 'Android', version: '2.5.1', status: 'Expired', expiry: 'Jan 5, 2026', devices: 2, stores: 0, accounts: 2 },
        { platform: 'iOS', version: '3.18.0', status: 'Supported', expiry: 'Dec 26, 2026', devices: 2, stores: 1, accounts: 2 },
        { platform: 'iOS', version: '3.16.0', status: 'Supported', expiry: 'Nov 30, 2026', devices: 1, stores: 0, accounts: 1 },
        { platform: 'iOS', version: '3.14.0', status: 'Expired', expiry: 'Jul 8, 2026', devices: 8, stores: 2, accounts: 4 },
        { platform: 'iOS', version: '3.12.0', status: 'Expired', expiry: 'Feb 12, 2026', devices: 1, stores: 0, accounts: 1 },
        { platform: 'iOS', version: '3.10.0', status: 'Expired', expiry: 'Nov 3, 2025', devices: 1, stores: 0, accounts: 1 },
      ],
    },
    os: {
      kpis: { minAndroid: '12', minIos: '17.0', onMinimum: 0, onUnsupported: 0 },
      installed: [
        { platform: 'Android', version: '16', status: 'Supported', devices: 12, stores: 1, accounts: 5 },
        { platform: 'Android', version: '15', status: 'Supported', devices: 4, stores: 0, accounts: 3 },
        { platform: 'Android', version: '14', status: 'Supported', devices: 2, stores: 0, accounts: 2 },
        { platform: 'Android', version: '13', status: 'Supported', devices: 1, stores: 0, accounts: 1 },
        { platform: 'iOS', version: '18.5', status: 'Supported', devices: 1, stores: 0, accounts: 1 },
        { platform: 'iOS', version: '18.4', status: 'Supported', devices: 1, stores: 0, accounts: 1 },
        { platform: 'iOS', version: '18.0.1', status: 'Supported', devices: 1, stores: 1, accounts: 1 },
        { platform: 'iOS', version: '17.6', status: 'Supported', devices: 1, stores: 0, accounts: 1 },
        { platform: 'iOS', version: '17.3', status: 'Supported', devices: 2, stores: 0, accounts: 1 },
      ],
    },
  };

  /* Firmware / Terminal software health — modelled on the "Terminal software" pages
     (Updates / Releases / Default versions). Same 25-device fleet as SDK health. */
  const firmwareHealth = {
    asOf: '2026-08-16',
    totalDevices: 25,
    summary: {
      onLatest: { count: 17, pct: 68 },
      behind: { count: 8, pct: 32 },      // update available — action required
      scheduled: 2,                        // pending scheduled updates
      failed: 1,                           // failed updates — urgent
      nextUpdate: { version: 'Castles Android 1.126.5', date: 'Mar 26' },
    },
    updates: [
      { batch: 'Update 2026-06-03 · Batch5782', validation: 'Cancelled', status: '-', version: 'Verifone VOS 1.120.12', scheduled: '2026-06-06', total: 1, pct: '1%', successful: 0, failed: 0, pending: 0, cancelled: 1, created: 'Jun 3, 2026 · adamsz' },
      { batch: 'Update 2026-05-21 · Batch5731', validation: 'Cancelled', status: '-', version: 'Castles Android 1.130.4', scheduled: '2026-05-21', total: 2, pct: '5%', successful: 1, failed: 0, pending: 0, cancelled: 1, created: 'May 21, 2026 · dallas' },
      { batch: 'Update 2026-05-09 · Batch5647', validation: 'Approved', status: 'Finished', version: 'Verifone VOS 1.120.12', scheduled: '2026-05-10', total: 1, pct: '1%', successful: 1, failed: 0, pending: 0, cancelled: 0, created: 'May 9, 2026 · adamsz' },
      { batch: 'Update 2026-03-23 · Batch5230', validation: 'Approved', status: 'Finished', version: 'Castles Android 1.126.5', scheduled: '2026-03-27', total: 1, pct: '2%', successful: 1, failed: 0, pending: 0, cancelled: 0, created: 'Mar 23, 2026 · aidan' },
      { batch: 'Update 2026-03-23 · Batch5229', validation: 'Approved', status: 'Finished', version: 'Castles Android 1.126.5', scheduled: '2026-03-31', total: 1, pct: '2%', successful: 1, failed: 0, pending: 0, cancelled: 0, created: 'Mar 23, 2026 · aidan' },
      { batch: 'Update 2026-03-23 · Batch5227', validation: 'Approved', status: 'Scheduled', version: 'Castles Android 1.126.5', scheduled: '2026-03-26', total: 1, pct: '2%', successful: 0, failed: 0, pending: 1, cancelled: 0, created: 'Mar 23, 2026 · aidan' },
      { batch: 'Update 2026-03-23 · Batch5228', validation: 'Approved', status: 'Finished', version: 'Castles Android 1.126.5', scheduled: '2026-03-27', total: 1, pct: '2%', successful: 1, failed: 0, pending: 0, cancelled: 0, created: 'Mar 23, 2026 · aidan' },
      { batch: 'Update 2026-03-23 · Batch5226', validation: 'Approved', status: 'Finished', version: 'Castles Android 1.126.5', scheduled: '2026-03-23', total: 2, pct: '4%', successful: 2, failed: 0, pending: 0, cancelled: 0, created: 'Mar 23, 2026 · aidan' },
      { batch: 'Update 2026-03-23 · Batch5225', validation: 'Approved', status: 'Failed', version: 'Castles Android 1.126.5', scheduled: '2026-03-31', total: 2, pct: '4%', successful: 1, failed: 1, pending: 0, cancelled: 0, created: 'Mar 23, 2026 · aidan' },
      { batch: 'Update 2025-05-22 · Batch3230', validation: 'Cancelled', status: '-', version: 'Verifone VOS 1.117.0', scheduled: '2025-05-24', total: 1, pct: '25%', successful: 0, failed: 0, pending: 0, cancelled: 1, created: 'May 22, 2025 · martinw' },
      { batch: 'Update 2025-05-22 · Batch3229', validation: 'Cancelled', status: '-', version: 'Verifone VOS 1.117.0', scheduled: '2025-05-23', total: 3, pct: '75%', successful: 0, failed: 0, pending: 0, cancelled: 3, created: 'May 22, 2025 · martinw' },
      { batch: 'Update 2025-05-22 · Batch3228', validation: 'Cancelled', status: '-', version: 'Verifone VOS 1.117.0', scheduled: '2025-05-23', total: 1, pct: '100%', successful: 0, failed: 0, pending: 0, cancelled: 1, created: 'May 22, 2025 · martinw' },
      { batch: 'Update 2025-03-25 · Batch2838', validation: 'Approved', status: 'Finished', version: 'Verifone VOS 1.114.8', scheduled: '2025-03-25', total: 1, pct: '1%', successful: 1, failed: 0, pending: 0, cancelled: 0, created: 'Mar 25, 2025 · elizabethv' },
      { batch: 'Update 2024-11-08 · Batch1813', validation: 'Approved', status: 'Finished', version: 'Verifone VOS 1.109.10', scheduled: '2024-11-08', total: 1, pct: '1%', successful: 1, failed: 0, pending: 0, cancelled: 0, created: 'Nov 8, 2024 · benk' },
    ],
    releases: [
      { family: 'Datecs Android', version: 'V1.122', stable: '1.133.3', beta: '1.122.0', date: '9 Sep 2025' },
      { family: 'Verifone Android', version: 'V1.129', stable: '1.133.3', beta: '1.129.2', date: '22 May 2026' },
      { family: 'Verifone VOS', version: 'V1.170', stable: '1.170.17', beta: '1.170.13', date: '21 Apr 2026' },
      { family: 'Castles Android', version: 'V26.8', stable: '1.133.3', beta: '26.8.1400', date: '14 Aug 2026' },
    ],
    defaults: [
      { model: 'AMS1', family: 'Castles Android', version: '1.133.3', level: 'Company' },
      { model: 'M400', family: 'Verifone VOS', version: '1.120.12', level: 'Company' },
      { model: 'V400cPlus', family: 'Verifone VOS', version: '1.120.12', level: 'Company' },
      { model: 'P630', family: 'Verifone Android', version: '1.133.3', level: 'Company' },
      { model: 'S1U2', family: 'Castles Android', version: '1.133.3', level: 'Company' },
      { model: 'VX820', family: 'Verifone eVo', version: '1.51.0', level: 'Company' },
      { model: 'V210', family: 'Verifone VOS', version: '1.120.12', level: 'Company' },
      { model: 'MX925', family: 'Verifone VOS', version: '1.46.1.0', level: 'Company' },
      { model: 'e315', family: 'Verifone eVo', version: '1.51.0', level: 'Company' },
      { model: 'V400m', family: 'Verifone VOS', version: '1.120.12', level: 'Company' },
      { model: 'V240mPlus', family: 'Verifone VOS', version: '1.120.12', level: 'Company' },
      { model: 'e285p', family: 'Verifone VOS', version: '1.120.12', level: 'Company' },
      { model: 'e315M', family: 'Verifone eVo', version: '1.51.0', level: 'Company' },
      { model: 'UX410', family: 'Verifone VOS', version: '1.100.10', level: 'Company' },
      { model: 'S1F4Pro', family: 'Castles Android', version: '1.128.5', level: 'Company' },
      { model: 'M450', family: 'Verifone Android', version: '1.133.3', level: 'Company' },
      { model: 'P400Plus', family: 'Verifone VOS', version: '1.120.12', level: 'Company' },
    ],
  };

  window.DATA = {
    fmt, kpis, volumeTrend, authTrend, notTradingTrend, featureAdoption,
    featureByModel, storesAttention, notTransacting, compliance, notReadyReasons,
    models, stores, devices, nlAnswers, sdkHealth, firmwareHealth,
  };
})();

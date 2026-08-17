# Device Customer Area — North Star PRD (Draft)

**Status:** Draft for review · **Owner:** Devices / IPP Platform · **Last updated:** 2026-08-15

Two Customer Area (CA) products that turn a fragmented, table-heavy device experience into a single, queryable fleet layer and a single, wizard-driven configuration surface.

1. **Device Intelligence** — the bird's-eye view: one dashboard that answers any fleet question and lets merchants navigate stores and devices.
2. **Device Studio** — the configuration wizard: set up one device or thousands with a live preview of the result.

---

## 1. Why now (vision alignment)

This PRD delivers **Phase 2 ("One fleet, one view")** and seeds **Phase 3 ("Beyond operating the fleet")** of the Device product approach.

- **Merchant jobs first** — merchants ask "are my stores ready to trade, and where can I improve?", not "which page holds this setting?".
- **Reliable by default** — surface non-trading and misconfigured devices before they cost a sale.
- **Build once, expose everywhere** — one fleet data model behind UI, API, and MCP/agent surfaces.
- **Intentional complexity** — put configuration complexity in a guided wizard, not across dozens of tables.

Baseline signals it addresses (from IPP dashboards): **656,720 active terminals but only 419,559 transacting (~36% active-but-not-trading)**; DCC enabled on only **~126k terminals**; installments on **~7,201**; a long tail of terminal models and use cases.

---

## 2. Problem

Today the device experience in CA is a set of **separate data-table menus** — Device list, Stores, Device settings, Terminal software, Terminal apps, Terminal themes, Orders & returns, Tap to Pay & card readers. Consequences:

- **No bird's-eye view.** The TFM catalog defines **955 terminal property types**, of which only **~143 across 26 groups are merchant-facing in CA** (Management API v3 `TerminalSettings`); the rest are internal or internal-tool-only. Everything is edited **one terminal at a time**, so a simple question like *"how many of Lightspeed's terminals have DCC enabled?"* requires manual export and stitching.
- **Duplicate pages, no shared model.** Each menu re-implements its own table over the same entities (store → device → settings), a symptom of a missing shared fleet data model.
- **Configuration is hard to imagine.** With hundreds of settings, merchants can't picture how a change will look on the device before they apply it.

**Terminal property catalog (verified, adyen-main):**

| Category class | Property types | Merchant-facing? |
|---|---|---|
| TfmInternalPropertyTypes | 271 | No (internal) |
| TfmReceiptsPropertyTypes | 262 | Partial (subset in CA) |
| TfmPaymentFeaturesPropertyTypes | 145 | Partial (subset in CA) |
| TfmCustomizationPropertyTypes | 140 | Partial (subset in CA) |
| TfmIntegrationPropertyTypes | 41 | Partial |
| TfmConnectivityPropertyTypes | 33 | Partial |
| TfmHardwarePropertyTypes | 20 | Partial |
| TfmDiagnosticsPropertyTypes | 12 | No (internal) |
| TfmPasscodesPropertyTypes | 12 | Partial |
| TfmLocalizationPropertyTypes | 9 | Partial |
| TfmMobilePropertyTypes | 9 | Partial |
| TfmAdminPropertyTypes | 1 | No (internal) |
| **Total** | **955** | **~143 merchant-facing across 26 groups** |

---

## 3. Goals & non-goals

**Goals**
- Replace the redundant device data-table menus with two products.
- Let merchants answer any fleet question in one place, in their own words.
- Let merchants configure a single device or in bulk, with an immediate visual preview.
- Cut manual Adyen intervention and support contacts (ties to the H2 goal of −15% IPP contact rate).

**Non-goals (this PRD)**
- **Initial integration & first-time configuration** — lives in a separate menu, aligned with the **OneFlow** initiative. Device Intelligence and Device Studio cover **BAU: monitoring, configuration changes, and troubleshooting** of an existing fleet.
- Building new payment features themselves (Studio only exposes/edits existing settings).

**Menus these two products replace or absorb**

| Legacy CA menu | Absorbed into |
|---|---|
| Device list | Device Intelligence (fleet view + All devices modal) |
| Stores (list) | Device Intelligence (All stores modal) |
| Device settings | Device Studio |
| Terminal software / apps / themes | Device Studio (as setting groups) + Device Intelligence (compliance signals) |
| Orders & returns | Device Intelligence CTAs (order / replace / return) |

---

## 4. Users & top jobs

Primary: **enterprise & platform (AfP) merchants operating large fleets** across multiple stores. Secondary: **internal Adyen ops** (Support, Implementation) doing the same jobs on merchants' behalf.

Top jobs-to-be-done:
1. "Is my fleet healthy and trading?" → Device Intelligence default view.
2. "How many of my devices do X?" → Device Intelligence natural-language search.
3. "Move this device to another store / order a replacement." → Device Intelligence modals + CTAs.
4. "Change a setting and see how it will look — on one device or many." → Device Studio.
5. "Why is this terminal failing / not transacting?" → Device Intelligence drilldown → Device Studio.

---

# Product 1 — Device Intelligence

## 5.1 Summary

A configurable dashboard that unifies **all device and payment-channel information** (IPP terminals + SoftPOS + Checkout) into one bird's-eye view, with drill-down into stores and individual devices, and natural-language search. Think **Looker/Amplitude/Mixpanel-style customizable analytics** fused with **fleet operations** (reassign, order, export).

## 5.2 What it solves
- Removes the "no bird's-eye view" gap: one queryable fleet layer instead of per-terminal tables.
- Replaces duplicate Device list / Stores / report menus with one surface.

## 5.3 User journey (as authored)

1. Merchant opens Device Intelligence and sees a **default, recommended view** (summary numbers + graphs + data grids).
2. They **customize** which widgets/metrics they see and save the layout.
3. They **search in natural language** ("how many DCC-enabled terminals in Retail stores in DE?") and get an answer + a saveable tile.
4. They open the **All stores** view: every location, with the device list under each.
5. They click a store → **full-page modal**: that store's settings + all devices under it.
6. In the store modal they **select devices and reassign** to another store or to inventory.
7. They click a device → **full-page modal → Device Studio** (settings).
8. Persistent CTAs let them **order / replace / return** devices and **export** any data.

## 5.4 Key capabilities

| # | Capability | Behavior | Pattern reference |
|---|---|---|---|
| 1 | Default recommended view | On first visit, a curated set of tiles (summary KPIs, trend graphs, data grids). | DCC report in CA (Fig. A) |
| 2 | Configurable widgets | Add/remove/resize tiles; pick metrics, filters, breakdowns; save named views. | Looker / Amplitude / Mixpanel dashboards (Fig. B) |
| 3 | Natural-language search | Ask a fleet question in plain language; returns a number, chart, or grid, with a "save as tile" action. | Notion/Confluence AI, Mixpanel MCP/AI |
| 4 | Per-topic explore | Drill from a tile into a filterable, sortable explore table (per feature, per model, per store). | Looker Explore (Fig. D) |
| 5 | All stores modal | List every store/location with rolled-up device counts and health. | — |
| 6 | Store modal (full page) | Store settings + all devices under the store; select devices → reassign to another store or inventory. | — |
| 7 | Device modal (full page) | Opens Device Studio for that device's settings. | — |
| 8 | Fleet CTAs | Order / replace / return devices (absorbs Orders & returns). | — |
| 9 | Export | Export any tile or grid to CSV/report. | DCC report Export (Fig. A) |

## 5.5 Default view — illustrative tiles (v1)

> The illustrations below (and the Looker/DCC references) show **how** the intelligence could be presented, not the exact metrics. The actual dataset and default recommendations will be defined with stakeholders (see §9).

Modeled on the existing **DCC report** (Fig. A) generalized across channels:
- **Summary KPIs:** Active terminals, Transacting terminals, Active-but-not-transacting %, Auth rate, ATV, DCC acceptance rate, Offline-payment usage.
- **Graphs:** Volume trend (IPP vs Checkout), Auth-rate trend, Feature adoption over time.
- **Data grids:** Feature usage by terminal model; Stores needing attention; Terminals not transacting; Firmware/PCI compliance.
- **Not-ready reasons** grid (mirrors DCC "not-offered reasons"): why terminals aren't trading (offline, unboarded, config error, connectivity).

## 5.6 Data & presentation approach

- **New presentation/query layer, not the existing Looker semantic model.** Looker, Amplitude, and Mixpanel are cited only as **UI/interaction references** for how the intelligence can be shown. Device Intelligence gets its own layer purpose-built for the merchant CA experience.
- **Underlying sources it can draw from:** postfm/terminal-management (stores, devices, TFM properties), terminal-software-management (firmware/bundles), terminal-monitoring (health/telemetry), and payment-outcome data (auth rates, DCC, offline usage, declines) from IPP + Checkout.
- **Shared fleet data model (new):** a single queryable layer joining store → device → config → outcomes, so tiles, natural-language search, and explore all read one source (removes the duplicate tables).

## 5.7 Information architecture

```
Device Intelligence
├── Default / saved dashboard (configurable tiles)
│   ├── Natural-language search bar
│   └── Tiles → per-topic Explore
├── All stores  (list → Store modal)
│   └── Store modal: store settings + devices → select → reassign
│         └── Device modal → Device Studio
└── Global CTAs: Order / Replace / Return · Export
```

## 5.8 Permissions, scale, edge cases
- Respect CA roles (view vs configure vs order). Ops act on behalf of merchant with audit logging.
- Scale to 650k+ terminals and 100+ companies (platforms see submerchant hierarchy).
- Empty/edge: no devices yet → guide to OneFlow onboarding; partial data → show freshness/last-sync.

## 5.9 Success metrics
- Shrink active-but-not-transacting gap (baseline ~36%).
- % of fleet questions answered self-serve (NL search success rate).
- Reduction in device/report-related support contacts.
- Adoption: saved views per merchant; export usage.

---

# Product 2 — Device Studio

## 6.1 Summary

A **wizard-style configuration studio** (full-page modal or embedded) with a **control panel on the left** and a **live simulator on the right**. Configure one device, or many at once, and see the result immediately. Think **Square site/link builders and Stripe Checkout studio** applied to device settings, and the **Terminal theme builder** for the simulator.

## 6.2 What it solves
- Hundreds of settings are hard to configure and impossible to picture. Studio makes configuration **guided, visual, and bulk-capable**, with immediate feedback.

## 6.3 User journey (as authored)

1. Merchant enters Studio (from a device modal, a store modal, or standalone).
2. In the **control panel** they set **scope**: device type (Terminal / SoftPOS), and single vs multiple devices (optionally by store).
3. The control panel shows the **merchant-facing settings** relevant to that scope.
4. As they change a setting, the **simulator updates in real time**.
5. Settings that need values (e.g. Tipping) show the **high-level toggle on the control panel** and the **value inputs on the right**, next to the preview.
6. They apply to the selected device(s), single or in bulk.

## 6.4 Key capabilities

| # | Capability | Behavior | Pattern reference |
|---|---|---|---|
| 1 | Scope selector | Device type (Terminal / SoftPOS) × single / multiple (× store). Drives which settings show. | Square wizard "Purpose/Details" step (Fig. F) |
| 2 | Schema-driven control panel | Renders merchant-facing settings from a config schema so new portfolio settings appear automatically (scalable). | Square customize panel (Fig. E) |
| 3 | Live simulator | Renders the resulting screen(s) in real time as settings change. | Terminal theme builder; Stripe Checkout studio; LivePreview pattern |
| 4 | Value inputs beside preview | For settings needing values (tipping %, receipt text), inputs sit on the right with the preview. | Square/Stripe live preview |
| 5 | Bulk apply | Apply the same config to many devices/stores; show affected count and diff before commit. | — |
| 6 | Generic screen rendering | Simulator draws generic screens sized to device classes (not pixel-perfect device art). | Terminal theme builder |
| 7 | Scalable modal component | One component carries any settings group; grows with the device portfolio. | — |

## 6.5 Settings model

- **Merchant-facing surface:** ~143 settings across **26 groups** (`TerminalSettings` v3): cardholderReceipt, connectivity, dcc, gratuities, hardware, homeScreen, kioskMode, localization, moto, nexo, offlineProcessing, opi, passcodes, payAtTable, payment, receiptOptions, receiptPrinting, refunds, signature, standalone, storeAndForward, surcharge, tapToPay, terminalInstructions, timeouts, wifiProfiles.
- **Rendering rule:** each group = a control-panel section; each setting = a field described by the config schema (type, allowed values, dependencies, preview binding). Internal-only properties (the bulk of the 955-property catalog, incl. all 271 `Internal` types) are excluded from the merchant surface.
- **Preview binding:** settings declare whether/how they affect the simulator (e.g. `gratuities` → tipping screen; `homeScreen`/themes → idle screen; `receiptPrinting` → receipt preview). Settings with no visual effect show a confirmation state instead.
- **Scalability:** because the panel is schema-driven, growth in the property catalog (955 today) surfaces new merchant-facing settings automatically without bespoke screens.

## 6.6 Simulator approach
- Render **generic screen frames by device class/size** (countertop, portable, mobile/SoftPOS, large-screen), not realistic device photos.
- Compose screens from setting-driven components (idle/home, payment, tipping, receipt, error/offline).
- For multi-device scope, preview the **representative screen per device class** in the selection.

## 6.7 Bulk, validation, safety
- Show scope summary ("Apply to 342 terminals across 12 stores") and a **diff** before commit.
- Validate against device capabilities (e.g. tipping unsupported on a model → flagged, excluded).
- Audit every change (who, what, scope) — reuses device-setting audit-log capability.

## 6.8 Success metrics
- Time to configure a setting (single and bulk) ↓.
- Config-related support contacts ↓ (H2 target: −60% for SoftPOS config).
- Adoption of bulk configuration; custom-rule creation.

---

## 7. How the two products fit together

```
Device Intelligence (know)  ──drill──►  Device Studio (change)
   fleet view, search,                    scoped wizard +
   stores/devices, CTAs                   live simulator
        ▲                                      │
        └───────────  shared fleet data model  ┘
     (store → device → config → outcomes; UI + API + MCP)
```

Initial integration/first config stays in a **separate OneFlow-aligned menu**; these two cover ongoing BAU, configuration, and troubleshooting.

---

## 8. Phasing

- **Phase 2a:** shared fleet data model + Device Intelligence default view (DCC-style tiles) + All stores/devices modals + reassign; retire Device list & Stores menus.
- **Phase 2b:** configurable widgets + natural-language search + per-topic explore; Device Studio v1 (single + core groups) with simulator; retire Device settings menu.
- **Phase 3:** join payments data for recommendations ("similar merchants enable DCC"), bulk Studio at fleet scale, MCP/agent parity, export/reporting depth.

---

## 9. Open questions (to validate)
- **Default recommendations / dataset:** which KPIs, graphs, and grids make up the default view — to be defined and revised with stakeholders. (The tiles in §5.5 are illustrative only.)
- **Natural-language search layer:** confirmed as a **new purpose-built layer** (not the existing Looker semantic model); open items are accuracy bar for launch and build vs buy for the NL/query engine.
- Simulator fidelity: which setting groups must be visual for v1?
- Bulk-apply guardrails: max scope, approval for large changes.
- Ownership of the shared fleet data model across IPP/Checkout/data teams.

---

## 10. References

**CA / internal (screenshots — illustrative of presentation, not exact data):**
- **Fig. A — DCC report (CA):** KPI cards (offered, accepted, acceptance rate, markup, avg markup/tx), count/volume/rate charts, ATV, not-offered-reasons grid, per-merchant breakdown, Export. → default-view tile blueprint.
- **Fig. B — Looker "IPP – Insights: Ecommerce & POS":** trend + KPI tiles + merchant overview grid. → configurable widgets.
- **Fig. C — Looker "IPP – Feature Enablement & Usage":** feature usage by terminal model; lowest-auth-rate merchants. → feature-adoption tiles.
- **Fig. D — Looker Explore "IPP – Terminal Products/Features Daily":** filterable explore grid. → per-topic drilldown.
- **Fig. E — Square customize builder:** left control panel + live preview. → Studio control panel.
- **Fig. F — Square "Create link" wizard:** purpose/details steps + live phone preview. → Studio scope + preview.

**Internal data (verified in adyen-main):**
- `ipp/platform/terminal-management/common/tfmconfiguration/.../entities/postfm/properties/` → **955 terminal property types** across 12 category classes (271 Internal, 262 Receipts, 145 PaymentFeatures, 140 Customization, 41 Integration, 33 Connectivity, 20 Hardware, 12 Diagnostics, 12 Passcodes, 9 Localization, 9 Mobile, 1 Admin).
- `configurationapi/.../ManagementService-v3.json` → **26 groups, ~143 merchant-facing settings** (`TerminalSettings`).
- `configurationapi/.../ipp/converter/` → 36 setting-group converters.
- `ipp/platform/terminal-management/webapp/postfm` → stores/devices/TFM properties/supply chain.
- IPP dashboards → 656,720 active / 419,559 transacting terminals; DCC ~126k terminals; installments ~7,201.

**External product patterns:**
- Stripe Checkout studio — https://docs.stripe.com/payments/checkout-studio
- Stripe Apps design patterns — https://docs.stripe.com/stripe-apps/patterns
- Live preview pattern — https://ui-patterns.com/patterns/LivePreview
- Wizard/stepper pattern — https://uxpatterns.dev/patterns/advanced/wizard
- Mixpanel MCP (natural-language analytics) — https://docs.mixpanel.com/docs/mcp

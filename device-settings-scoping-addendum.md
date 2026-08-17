# Device Settings — Level Scoping Rules (PRD addendum)

**Status:** Draft for review · **Owner:** Devices / IPP Platform · **Last updated:** 2026-08-16
**Companion to:** Device Customer Area — North Star PRD (Device Intelligence + Device Studio)

This addendum defines **which terminal settings appear on which CA screen** (Company, Merchant, Store, Device), so each account level has clean, predictable behavior. Editing a Store must not drag in device-only settings, and a Device screen must make inheritance obvious.

---

## 1. Why this is needed (context)

- The TFM catalog has **955 terminal property types**; **~143 across 26 groups are merchant-facing** in CA.
- Today the data model resolves settings by **inheritance** (`Psp → Company → Merchant → Store → Profile → Terminal`, most-specific-wins).
- **The scope flags do not separate levels:** Store allows 955/955, Terminal 952, Account 954. **Zero properties are flagged device-only.** So today every terminal setting is also store-settable.
- Consequence: **level separation must be enforced as a product rule (curated allow-list per screen) now**, and ideally moved into the data model later (add an authoritative "owning level" + `inheritable` flag; split `Account` into `Company` and `Merchant`).

---

## 2. Principles

1. **Each screen shows what that level is responsible for**, not everything the DB technically allows.
2. **Inheritance is transparent, never hidden.** A device shows where each value comes from and lets the user override with intent.
3. **Device-only settings live only on the Device screen.** They never appear at Store/Merchant/Company.
4. **Policy settings are set high, seen low.** Settings set at Merchant/Store are shown as inherited (read-only) on the Device screen.
5. **Internal is never surfaced** to merchants on any screen.

---

## 3. Rule — Store screen

**Purpose:** manage the payment and presentation policy that applies to **all devices in a location**, plus the store record itself. Editing a store must not require touching device internals.

- **Show at Store level:**
  - **Receipts** — receipt content/branding for the location.
  - **PaymentFeatures** — DCC, surcharge, tipping/gratuity, MOTO, refunds, offline limits.
  - **Localization** — language, timezone, currency.
  - **Customization (store-branding subset)** — theme, home/idle screen, logo.
  - **Integrations** — optional; include only if ECR/POS integration is managed per store/lane.
- **Hide from Store (Device-only):** Connectivity, Hardware, Passcodes, Mobile, Diagnostics, and the **per-unit UI subset of Customization**.
- **Never surface:** Internal, Admin (and the 271 Internal types).
- **Store information** (name, address, hours, contact) reads/writes the **Store entity**, not `tfmproperty`, and is always independent of device settings.

Values set here become the **inherited default** for every device in the store.

---

## 4. Rule — Device settings screen

**Purpose:** configure and troubleshoot a **single physical device** (or a selected set in bulk), showing the **complete effective configuration** with clear inheritance. This is the only place device-specific settings are edited.

### 4.1 What to show

- **Device-only settings — editable here and nowhere else:**
  - **Connectivity** (wifi profiles, cellular, ethernet, network priority)
  - **Hardware** (physical capabilities, peripherals)
  - **Passcodes** (per-device security)
  - **Mobile** (SoftPOS attestation / per-device mobile config)
  - **Diagnostics** (device logs, troubleshooting)
  - **Customization (per-unit UI subset)** — device-specific UI not covered by store branding.
- **Inherited policy settings — shown, not primary-edited here:**
  - Receipts, PaymentFeatures, Localization, store-branding Customization, Integrations.
  - Displayed **read-only with a source badge** ("Inherited from Store / Merchant / Company") and the effective value.
  - An explicit, permission-gated **"Override for this device"** action turns a read-only inherited value into a device-level override.
- **Never surface:** Internal, Admin.

### 4.2 Inheritance behavior

- Every setting shows **its source level and value**. If overridden at the device, show **both** the device value and the inherited default it replaced.
- **Override** creates a device-level `tfmproperty`; **"Reset to inherited"** deletes it and reverts to the upstream default.
- Overrides are **permission-gated** and **audit-logged** (who, what, previous value, scope).

### 4.3 Bulk behavior

- Bulk applies to **device-only settings** across a selected set (e.g. all terminals in a store, or a model family).
- Show a **scope summary and diff** before commit ("Apply to 342 terminals across 12 stores; 18 unsupported and excluded").
- Validate against **device capability** (e.g. a setting unsupported by a model is flagged and excluded, not silently applied).

### 4.4 Troubleshooting context (Device screen only)

- Device operational state alongside settings: last sync, firmware/PCI compliance, connectivity status, config version, boarding/transacting state.
- Deep-link from Device Intelligence "not-trading / misconfigured" signals straight into the relevant setting group here.

---

## 5. Rule — Merchant and Company screens (brief)

- **Merchant account screen:** set organization-wide **policy defaults** (PaymentFeatures, Receipts, Localization, branding) that inherit down to all stores/devices. No device-only categories.
- **Company account screen:** same policy categories at the top of the hierarchy; used for group-wide defaults.
- **Model limitation:** the current flags treat Company and Merchant as one `Account` scope. Until the model splits them, these two screens share the same allow-list and are distinguished only by the account node being edited. Splitting `Account → Company | Merchant` is a prerequisite for fully independent behavior.

---

## 6. Screen × category matrix (target)

| Category | Company | Merchant | Store | Device |
|---|---|---|---|---|
| PaymentFeatures | default | default | default | inherited (override) |
| Receipts | default | default | default | inherited (override) |
| Localization | default | default | default | inherited (override) |
| Customization – branding | default | default | **edit** | inherited (override) |
| Integrations | default | default | optional | inherited (override) |
| Customization – per-unit UI | – | – | – | **edit** |
| Connectivity | – | – | – | **edit** |
| Hardware | – | – | – | **edit** |
| Passcodes | – | – | – | **edit** |
| Mobile | – | – | – | **edit** |
| Diagnostics | – | – | – | **edit** |
| Internal / Admin | never | never | never | never |

"default" = sets inherited default; "edit" = primary edit surface; "inherited (override)" = read-only with explicit override; "–" = not shown.

---

## 7. Enforcement & sequencing

- **Now (product-enforced):** implement a **curated allow-list per screen** keyed on `TfmPropertyCategory` (plus a branding-vs-per-unit split within Customization). The DB still allows all levels; the UI restricts.
- **Next (model-enforced):** add per-property **owning level** + `inheritable` flag, and **split `Account` into `Company` and `Merchant`**, so scoping lives in the data and API, not just the UI.
- The Customization category needs a **branding vs per-unit UI sub-tag** to route its properties correctly; today the split is judgment-based.

---

## 8. Acceptance criteria

- Editing a Store never shows or changes Connectivity, Hardware, Passcodes, Mobile, or Diagnostics settings.
- The Device screen shows every effective merchant-facing setting with its source level; device-only categories are editable, inherited policy categories are read-only until explicitly overridden.
- "Reset to inherited" removes the device override and restores the upstream value.
- No Internal or Admin property is visible on any merchant screen.
- Bulk device edits show a diff and exclude unsupported models before commit.

---

## 9. Open questions

- Customization split: which specific properties are "store branding" vs "per-unit UI"? Needs a sub-classification pass (135 of 141 are `device.*`-named, so naming won't decide it).
- Should Integrations sit at Store or Merchant by default?
- Override governance: which roles may override inherited policy at the device level?
- Company vs Merchant split timeline (model change dependency).

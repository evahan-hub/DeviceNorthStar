# Fleet Intelligence — SDK & OS Health module (PRD addendum)

**Status:** Draft for review · **Owner:** Devices / IPP Platform · **Last updated:** 2026-08-16
**Companion to:** Device Customer Area — North Star PRD
**Naming:** "Device Intelligence" is renamed **Fleet Intelligence** throughout.

Adds an **SDK & OS Health** module (source: the "Tap to Pay & card readers" page) to Fleet Intelligence: a compact **summary tile** on the main page, and an **Explore** action that opens a **full-screen detail** mirroring the reference screen. All numbers below are mock data, internally consistent (single fleet of **25 devices**) and reconcile with every KPI card.

---

## 1. Where it lives

- **Fleet Intelligence (main page):** one **SDK & OS Health summary tile** among the other bird's-eye tiles. Shows the few numbers that drive action, plus a mini distribution bar.
- **Explore -> full-screen popup:** the detailed page (SDK KPIs + Installed SDKs table + OS KPIs + Installed OS versions table) with filters, sorting, pagination, release notes, and drill-down into affected devices/stores/merchants.

```
Fleet Intelligence
+------------------------------------------------------------------+
| ... other tiles (fleet size, transacting gap, geography, ...)    |
| +--------------------------------------------------------------+ |
| |  SDK & OS Health  (Tap to Pay & card readers)   [ Explore > ]| |
| |                                                              | |
| |  15 devices on EXPIRED SDKs        60%   (urgent)            | |
| |   3 devices on EXPIRING SDKs       12%   (warning)           | |
| |  Next expiry: Android 2.14.0 in 13 days                      | |
| |  Unsupported OS: 0    Minimum OS: 0                          | |
| |                                                              | |
| |  SDK mix  [#####  expired 15 ][## expiring 3][### supp. 7]   | |
| +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
```

Clicking **Explore** opens:

```
[ X ]  SDK & OS Health — Tap to Pay & card readers        [ Filters v ] [ Export ]
------------------------------------------------------------------------------------
 SDK versions
 [ Upcoming Android SDK expiry ] [ Upcoming iOS SDK expiry ] [ Devices on expiring SDKs ] [ Total devices in fleet ]
 [ In 13 days (2.14.0)         ] [ In 132 days (3.18.0)     ] [ 3 (12.00%)                ] [ 25                      ]

 Installed SDKs (i)                                          [ platform v ][ status v ][ search ]
 Platform | SDK Version | Status | Expiry date | Devices | Stores | Merchant accounts | (Release notes)
 ... 11 rows, 5/page ...

 OS versions
 [ Minimum Android version ] [ Minimum iOS version ] [ Devices on minimum OS version ] [ Devices on unsupported OS ]
 [ 12                      ] [ 17.0                ] [ 0                             ] [ 0                         ]

 Installed OS versions (i)                                   [ platform v ][ status v ][ search ]
 Platform | OS version | Status | Devices | Stores | Merchant accounts
 ... 9 rows, 5/page ...
```

---

## 2. Summary tile (mock)

| Metric | Value | Severity | Note |
|---|---|---|---|
| Devices on expired SDKs | 15 (60%) | Urgent | past expiry date |
| Devices on expiring SDKs | 3 (12%) | Warning | within 30 days |
| Next SDK expiry (Android) | 2.14.0 in 13 days | Warning | soonest non-expired |
| Next SDK expiry (iOS) | 3.18.0 in 132 days | Info | soonest non-expired |
| Devices on unsupported OS | 0 | OK | below minimum |
| Devices on minimum OS | 0 | OK | at the floor |
| Total devices in fleet | 25 | - | scope of this view |
| SDK mix | Supported 7 / Expiring 3 / Expired 15 | - | mini stacked bar |

Tile behavior: severity color from the worst metric; the mini bar segments deep-link into the detail pre-filtered by status; **Explore** opens the full-screen detail.

---

## 3. Explore — full-screen detail (mock)

### 3.1 SDK versions — KPI cards
| Card | Value |
|---|---|
| Upcoming Android SDK expiry | In 13 days (2.14.0) |
| Upcoming iOS SDK expiry | In 132 days (3.18.0) |
| Devices on expiring SDKs | 3 (12.00%) |
| Total devices in fleet | 25 |

### 3.2 Installed SDKs (11 items)
| Platform | SDK Version | Status | Expiry date | Devices | Stores | Merchant accounts |
|---|---|---|---:|---:|---:|---:|
| Android | 2.15.0 | Supported | Mar 15, 2027 | 4 | 1 | 3 |
| Android | 2.14.0 | Expiring | Aug 29, 2026 | 3 | 0 | 1 |
| Android | 2.13.0 | Expired | Apr 18, 2026 | 1 | 0 | 1 |
| Android | 2.11.0 | Expired | Jun 6, 2026 | 1 | 0 | 1 |
| Android | 2.8.1 | Expired | Dec 29, 2025 | 1 | 0 | 1 |
| Android | 2.5.1 | Expired | Jan 5, 2026 | 2 | 0 | 2 |
| iOS | 3.18.0 | Supported | Dec 26, 2026 | 2 | 1 | 2 |
| iOS | 3.16.0 | Supported | Nov 30, 2026 | 1 | 0 | 1 |
| iOS | 3.14.0 | Expired | Jul 8, 2026 | 8 | 2 | 4 |
| iOS | 3.12.0 | Expired | Feb 12, 2026 | 1 | 0 | 1 |
| iOS | 3.10.0 | Expired | Nov 3, 2025 | 1 | 0 | 1 |

Totals: 25 devices. Supported 7 / Expiring 3 / Expired 15. Row action: **Release notes**. Reconciles: Android 2.14.0 = 13 days (Expiring) -> "Upcoming Android SDK expiry"; iOS 3.18.0 = 132 days -> "Upcoming iOS SDK expiry"; expiring devices = 3 (2.14.0 only) = 12%.

### 3.3 OS versions — KPI cards
| Card | Value |
|---|---|
| Minimum Android version | 12 |
| Minimum iOS version | 17.0 |
| Devices on minimum OS version | 0 |
| Devices on unsupported OS | 0 |

### 3.4 Installed OS versions (9 items)
| Platform | OS version | Status | Devices | Stores | Merchant accounts |
|---|---|---|---:|---:|---:|
| Android | 16 | Supported | 12 | 1 | 5 |
| Android | 15 | Supported | 4 | 0 | 3 |
| Android | 14 | Supported | 2 | 0 | 2 |
| Android | 13 | Supported | 1 | 0 | 1 |
| iOS | 18.5 | Supported | 1 | 0 | 1 |
| iOS | 18.4 | Supported | 1 | 0 | 1 |
| iOS | 18.0.1 | Supported | 1 | 1 | 1 |
| iOS | 17.6 | Supported | 1 | 0 | 1 |
| iOS | 17.3 | Supported | 2 | 0 | 1 |

Totals: 25 devices, all Supported. No device at the minimum (Android 12 / iOS 17.0) or below -> both cards = 0.

---

## 4. Field & status logic

- **SDK status:** `Expired` (expiry < today) · `Expiring` (today <= expiry <= today+30d) · `Supported` (expiry > today+30d). Today = 2026-08-16.
- **Upcoming expiry card:** soonest **non-expired** SDK per platform (countdown + version), regardless of Expiring/Supported bucket.
- **Devices on expiring SDKs:** count with status = Expiring only (matches 3 / 12%). Expired is surfaced separately (and more urgently) in the summary tile.
- **OS status:** `Supported` (>= minimum) · `Minimum` (== minimum supported) · `Unsupported` (< minimum).
- **Counts columns:** `Devices` (units on that version), `Stores` (distinct stores touched), `Merchant accounts` (distinct accounts) — enables scoping the blast radius.
- **Scope:** the tile/detail respect the current Fleet Intelligence scope (platform / company / merchant / store). Numbers above are one scope; the same schema scales up.

---

## 5. Interactions & actions

- **Filters:** platform (Android/iOS), status, free-text search on version; independent for the SDK and OS tables.
- **Sort:** every column; default Installed SDKs by Status severity then Expiry ascending; Installed OS by Devices descending.
- **Pagination:** 5/page (matches reference), page-size selector, of N items.
- **Row -> drill-down:** clicking a version row opens the affected **devices/stores/merchants** list (deep-link into the Device list pre-filtered by that version) so the user can act.
- **Release notes:** opens the version's notes.
- **Bulk actions (from drill-down or row):** "Schedule update", "Notify merchants on expired/expiring SDKs". Update actions validate device capability before commit (reuse Device Studio bulk rules).
- **Export:** current filtered view to CSV.

---

## 6. Acceptance criteria

- Summary tile shows expired %, expiring %, next-expiry countdown, unsupported-OS count, and a status mini-bar; severity reflects the worst metric.
- Explore opens a full-screen popup with the 4 SDK KPIs, Installed SDKs (11), 4 OS KPIs, and Installed OS versions (9), all reconciling to a 25-device fleet.
- Table filters/sort/pagination behave independently for SDK and OS.
- Every version row drills into affected devices/stores/merchants and exposes Release notes.
- All figures respect the active scope; no Internal-only data is exposed.

---

## 7. Appendix — mock data (JSON, for prototyping)

```json
{
  "scope": "merchant-demo",
  "asOf": "2026-08-16",
  "totalDevicesInFleet": 25,
  "sdk": {
    "kpis": {
      "upcomingAndroidExpiry": {"inDays": 13, "version": "2.14.0"},
      "upcomingIosExpiry": {"inDays": 132, "version": "3.18.0"},
      "devicesOnExpiringSdks": {"count": 3, "pct": 12.0},
      "totalDevicesInFleet": 25
    },
    "installed": [
      {"platform": "Android", "version": "2.15.0", "status": "Supported", "expiry": "2027-03-15", "devices": 4, "stores": 1, "accounts": 3},
      {"platform": "Android", "version": "2.14.0", "status": "Expiring", "expiry": "2026-08-29", "devices": 3, "stores": 0, "accounts": 1},
      {"platform": "Android", "version": "2.13.0", "status": "Expired", "expiry": "2026-04-18", "devices": 1, "stores": 0, "accounts": 1},
      {"platform": "Android", "version": "2.11.0", "status": "Expired", "expiry": "2026-06-06", "devices": 1, "stores": 0, "accounts": 1},
      {"platform": "Android", "version": "2.8.1", "status": "Expired", "expiry": "2025-12-29", "devices": 1, "stores": 0, "accounts": 1},
      {"platform": "Android", "version": "2.5.1", "status": "Expired", "expiry": "2026-01-05", "devices": 2, "stores": 0, "accounts": 2},
      {"platform": "iOS", "version": "3.18.0", "status": "Supported", "expiry": "2026-12-26", "devices": 2, "stores": 1, "accounts": 2},
      {"platform": "iOS", "version": "3.16.0", "status": "Supported", "expiry": "2026-11-30", "devices": 1, "stores": 0, "accounts": 1},
      {"platform": "iOS", "version": "3.14.0", "status": "Expired", "expiry": "2026-07-08", "devices": 8, "stores": 2, "accounts": 4},
      {"platform": "iOS", "version": "3.12.0", "status": "Expired", "expiry": "2026-02-12", "devices": 1, "stores": 0, "accounts": 1},
      {"platform": "iOS", "version": "3.10.0", "status": "Expired", "expiry": "2025-11-03", "devices": 1, "stores": 0, "accounts": 1}
    ]
  },
  "os": {
    "kpis": {
      "minAndroid": "12",
      "minIos": "17.0",
      "devicesOnMinimumOs": 0,
      "devicesOnUnsupportedOs": 0
    },
    "installed": [
      {"platform": "Android", "version": "16", "status": "Supported", "devices": 12, "stores": 1, "accounts": 5},
      {"platform": "Android", "version": "15", "status": "Supported", "devices": 4, "stores": 0, "accounts": 3},
      {"platform": "Android", "version": "14", "status": "Supported", "devices": 2, "stores": 0, "accounts": 2},
      {"platform": "Android", "version": "13", "status": "Supported", "devices": 1, "stores": 0, "accounts": 1},
      {"platform": "iOS", "version": "18.5", "status": "Supported", "devices": 1, "stores": 0, "accounts": 1},
      {"platform": "iOS", "version": "18.4", "status": "Supported", "devices": 1, "stores": 0, "accounts": 1},
      {"platform": "iOS", "version": "18.0.1", "status": "Supported", "devices": 1, "stores": 1, "accounts": 1},
      {"platform": "iOS", "version": "17.6", "status": "Supported", "devices": 1, "stores": 0, "accounts": 1},
      {"platform": "iOS", "version": "17.3", "status": "Supported", "devices": 2, "stores": 0, "accounts": 1}
    ]
  }
}
```

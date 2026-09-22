# Intelligence Studio Demo Inputs

Use these fictional samples in the **Intelligence Studio** tab. They are designed for a short demonstration of the three intake modes.

> Run the **Preview** or **Analyze** action first. Only use the commit or ingest action when you want the sample to update the Knowledge Graph.

## 1. Raw Text Analysis

Open **Intelligence Studio** and choose **Raw Text Analysis & 1-Click Ingest**.

### A. Deterministic Match

This sample includes a known Bitcoin wallet and should demonstrate an exact match when that wallet exists in the seeded database.

```text
=== MARKETPLACE OPERATOR UPDATE ===
Alias: mike_shadow_backup
Email: mike_demo@protonmail.com
Bitcoin: 1b2cToQTkrmsDUUDeP6YDAK34wXuQ
Telegram: @mike_demo_ops

Agora reshipment support profile. Orders are dispatched after escrow confirmation.
All customer messages use encrypted communications.
```

Expected path: `AUTO_MERGE` or a high-confidence deterministic match.

### B. Probabilistic Review Suggestion

This sample avoids the known wallet and emphasizes behavioral and writing-style signals.

```text
=== SERVICE PROFILE ===
Alias: h4cky_boy_support
Email: h4cky_demo@tutanota.com
Bitcoin: 1DemoWalletForReviewSuggestion999999
Telegram: @h4cky_demo_hq

Premium server stress-testing service with live monitoring and automated dispatch.
Fast turnaround, clear service tiers, and escrow-supported customer handling.
```

Expected path: `SUGGESTION`, followed by a review item in **Review Suggestions**.

### C. New Actor Cluster

This sample uses a new identity and unrelated profile details to demonstrate isolation of a novel persona.

```text
=== NEW INTELLIGENCE NOTE ===
Alias: northstar_signal_77
Email: northstar_demo@onionmail.org
Monero: 888tNkZrPN6JsEgekjMnABU4TBzc2Dt29EPAvkFxbTNsYTRQtfVm2mAEDWBTC21qaYZYiGLTimnn6wa2nU5Cbsn682A4n7Z

Independent privacy infrastructure operator offering confidential hosting support.
No confirmed affiliation with existing marketplace identities.
```

Expected path: `NEW_CLUSTER` when no strong existing link is found.

## 2. Single Actor Dossier

Choose **Single Actor Dossier (Preview & Ingest)** and enter the following values.

| Field | Demo value |
|---|---|
| Username | `northstar_dossier_77` |
| Email | `northstar_dossier@protonmail.com` |
| Bitcoin | `1NorthstarDemoWallet999999999999999` |
| Monero | Leave blank |
| PGP fingerprint | `483F3631151FBA4895F9FF8404B63E9BA4772C78` |
| Telegram | `@northstar_dossier` |
| Discord | `northstar_demo#2048` |
| Forum handle | `northstar_signal` |
| Description | `Independent privacy infrastructure operator. Confidential hosting support, encrypted communications, and documented service procedures.` |
| Source dataset | `Live Demonstration Dossier` |
| Analyst name | `Demo_Analyst` |

1. Click **Preview Resolution Forecast**.
2. Explain the match evidence and confidence shown in the preview.
3. Click **Commit Dossier to Knowledge Graph** only when you want to persist it.

## 3. Bulk Dataset Import

Choose **Bulk Dataset Import (Batch Preview & Ingest)** and paste this JSON array:

```json
[
  {
    "username": "mike_bulk_demo",
    "email": "mike_bulk_demo@protonmail.com",
    "bitcoin": "1b2cToQTkrmsDUUDeP6YDAK34wXuQ",
    "telegram": "@mike_bulk_demo",
    "description": "Known marketplace support profile used for deterministic matching."
  },
  {
    "username": "h4cky_bulk_demo",
    "email": "h4cky_bulk_demo@tutanota.com",
    "bitcoin": "1BulkReviewWallet999999999999999",
    "telegram": "@h4cky_bulk_demo",
    "description": "Server stress-testing service with live monitoring and escrow-supported dispatch."
  },
  {
    "username": "northstar_bulk_demo",
    "email": "northstar_bulk_demo@onionmail.org",
    "bitcoin": "1BulkNewClusterWallet999999999999999",
    "description": "Novel privacy infrastructure profile with no confirmed marketplace affiliation."
  }
]
```

1. Click **Preview Dataset Impact**.
2. Point out the per-record actions: merge, suggestion, or new cluster.
3. Use **Execute Batch Ingestion** only if the demo database should be changed.

## Suggested Demo Sequence

1. Run the raw text deterministic sample and show the forecast.
2. Run the probabilistic sample and open **Review Suggestions**.
3. Preview the dossier without committing it.
4. Preview the bulk payload and explain the mixed resolution outcomes.
5. Commit only one sample, if a graph change is needed for the presentation.

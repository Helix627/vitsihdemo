# 🕶️ Darknet Threat Actor Identity Resolution Platform
## Live Demonstration Test Cases & Benchmark Playbook

This document contains ready-to-copy sample test cases for every intake model, every resolution scenario, and every adjudication round.

---

## 📑 Table of Contents
1. [Model 1: Raw Unstructured Text Intake](#1-model-1-raw-unstructured-text-intake)
2. [Model 2: Structured Threat Actor Dossier](#2-model-2-structured-threat-actor-dossier)
3. [Model 3: Bulk JSON Dataset Ingestion](#3-model-3-bulk-json-dataset-ingestion)
4. [Model 4: Multi-Modal Search & Dossier Retrieval](#4-model-4-multi-modal-search--dossier-retrieval)
5. [Model 5: Analyst Review Queue & Graph Verification](#5-model-5-analyst-review-queue--graph-verification)

---

## 1. Model 1: Raw Unstructured Text Intake
**Location in UI:** *Intelligence Intake $\to$ Sub-Tab 1: Raw Text Analysis*

### 🔹 Case 1A: 100% Deterministic Auto-Merge (Shared Bitcoin Wallet)
> **Target:** Links directly to Agora Vendor #1 (`Mike`)

```text
Vendor Alias: Mike_Backup_Node
Marketplace: ShadowBay
Status: Active Escrow Verified Vendor
Bitcoin Deposit Wallet: 1b2cToQTkrmsDUUDeP6YDAK34wXuQ
Contact Email: mike_backup_node@protonmail.com
Telegram: @mike_darknet_direct
Description: Official secondary backup store for Agora vendor Mike. All orders protected via multi-sig automated escrow. Stealth vacuum sealed shipping across EU and US.
```

- **Expected Output:** Extracted wallet `1b2cToQTkrmsDUUDeP6YDAK34wXuQ`, forecast shows **⚡ 100.0% AUTO-MERGE** with Vendor #1 (Mike).

---

### 🔹 Case 1B: 100% Deterministic Auto-Merge (Shared PGP Key)
> **Target:** Links directly to Agora Vendor #1592 (`TheRealSilkRoad`)

```text
URGENT PGP SIGNED ADVISORY:
To all darknet buyers: our primary marketplace listing has moved.
PGP Key Fingerprint: 483F3631151FBA4895F9FF8404B63E9BA4772C78
Contact: silkroad_ops@onionmail.org
Backup Telegram: @silkroad_official_backup
Always encrypt your delivery address with the above public key. Direct deals without PGP encryption will be ignored.
```

- **Expected Output:** Extracted PGP `483F3631151FBA4895F9FF8404B63E9BA4772C78`, forecast shows **⚡ 100.0% AUTO-MERGE** with Vendor #1592 (TheRealSilkRoad).

---

### 🔹 Case 1C: Probabilistic AI Match $\to$ Suggestion Queue (Fuzzy Handle + Stylometry)
> **Target:** Matches Agora Vendor #1594 (`MagicHat`) at **$\approx 68.8\%$ Composite Score**

```text
Vendor Handle: m4gic_hat_seo
Operating Network: ShadowBay Market & Dread Forum
Contact: magichat_seo@safe-mail.net
Deposit Address: 1MagicHatCustomWallet9999999999999
Service Catalog:
Professional darknet SEO optimization, high PR backlinks, domain authority boosting, and web traffic bot networks. Fast turnaround within 24 hours. Full refund guarantee if ranking metrics do not improve. FE required for new buyers.
```

- **Expected Output:** Forecast shows **⚖️ ~68.8% SUGGESTION** with forensic breakdown (*94.5% Jaro-Winkler + 74.0% Stylometry + 100% Escrow overlap*).

---

### 🔹 Case 1D: Novel Threat Actor $\to$ New Standalone Entity ($<65\%$)
> **Target:** No prior match $\to$ Autonomous Cluster Creation

```text
Threat Actor Handle: CyberNebula_ExploitBroker
Contact: nebula_broker@tutanota.de
Bitcoin Address: 1NebulaNovelWallet88888888888888888
Monero Address: 888tNkZrPN6JsEgekjMnABU4TBzc2Dt29EPAvkFxbTNsA2sPGLDctzU66W4sm2ghjWjBg63LJGkUhy6ugPrBBQD1ACYWVm5
Description: Private zero-day broker for enterprise SCADA, industrial PLCs, and cloud hypervisors. Escrow accepted exclusively through designated multisig arbitration nodes. Minimum transaction size: 2.5 BTC.
```

- **Expected Output:** Forecast shows **🆕 NEW ENTITY** ($<65\%$ Match Score) $\to$ creates isolated entity cluster.

---

### 🔹 Case 1E: Crypto Ransomware Extortion Note
> **Target:** Automated entity extraction of Monero, BTC, PGP, and email

```text
ATTENTION: All your enterprise storage clusters have been encrypted with military-grade AES-256 and RSA-4096.
To receive the decryption package, transfer 0.75 BTC to:
Bitcoin: bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq
Monero: 44AFFq5kSiGBoZ4NMDwYtN18obc8AemS33DBLWs3H7otXft3XjrpDtQGeiSTHzFcubDZmCo96hUoWDL14PBBCHnoFXcDpTX
Send transaction hash and proof of payment to:
Email: decryptor_ops@onionmail.org
PGP Fingerprint: 994E8F231A4C5B6D7E8F901234567890ABCDEF12
Telegram: @decryptor_support_bot
You have 72 hours before encryption keys are permanently destroyed.
```

---

## 2. Model 2: Structured Threat Actor Dossier
**Location in UI:** *Intelligence Intake $\to$ Sub-Tab 2: Threat Actor Dossier*

### 🔹 Case 2A: Deterministic Auto-Merge Dossier
- **Target Handle:** `Mike_ShadowBay_Drop`
- **Email:** `mike_shadowbay@protonmail.com`
- **Bitcoin Wallet:** `1b2cToQTkrmsDUUDeP6YDAK34wXuQ`
- **Telegram:** `@mike_drop_eu`
- **Discord:** `mike_ops#1001`
- **Forum Handle:** `mike_underground`
- **Description:** `Agora seller official secondary logistics drop. Vacuum sealed packaging with next-day European dispatch.`
- **Source Dataset:** `Interpol Intelligence Bulletin #88`
- **Result:** Click **Preview** $\to$ **⚡ 100.0% AUTO-MERGE** $\to$ Click **Commit** to enrich Cluster #1.

---

### 🔹 Case 2B: Probabilistic Suggestion Dossier
- **Target Handle:** `mag1c_hat_services`
- **Email:** `magichat_seo@safe-mail.net`
- **Bitcoin Wallet:** `1BatchMagicHatWallet99999999999999`
- **Telegram:** `@magichat_seo_tg`
- **Discord:** `magichat#2026`
- **Description:** `Professional darknet SEO services, high PR backlinks, domain authority boosting, web traffic bot networks. Fast turnaround within 24 hours. Full refund guarantee.`
- **Source Dataset:** `ShadowBay OSINT Ingestion`
- **Result:** Click **Preview** $\to$ **⚖️ ~68.8% SUGGESTION** $\to$ Click **Commit** to push to Review Queue.

---

### 🔹 Case 2C: New Standalone Cluster Dossier
- **Target Handle:** `Quantum_Bulletproof_Hosting`
- **Email:** `quantum_bulletproof@cock.li`
- **Bitcoin Wallet:** `1QuantumNovelWallet33333333333333333`
- **Monero Wallet:** `888tNkZrPN6JsEgekjMnABU4TBzc2Dt29EPAvkFxbTNsA2sPGLDctzU66W4sm2ghjWjBg63LJGkUhy6ugPrBBQD1ACYWVm5`
- **PGP Fingerprint:** `11223344556677889900AABBCCDDEEFF11223344`
- **Telegram:** `@quantum_bulletproof`
- **Description:** `High-speed offshore bulletproof servers, reverse proxy load balancers, DDoS mitigation, and anonymous DMCA ignored VPS hosting.`
- **Source Dataset:** `CTI Feed #409`
- **Result:** Click **Preview** $\to$ **🆕 NEW PERSONA** $\to$ Click **Commit** to spawn new standalone node.

---

## 3. Model 3: Bulk JSON Dataset Ingestion
**Location in UI:** *Intelligence Intake $\to$ Sub-Tab 3: Bulk Dataset*

### 🔹 Batch 3A: Benchmark 3-Record Mixed Batch
Paste this JSON array into the intake textarea:

```json
[
  {
    "username": "mike_bulk_alias",
    "email": "mike_batch@protonmail.com",
    "bitcoin": "1b2cToQTkrmsDUUDeP6YDAK34wXuQ",
    "telegram": "@mike_batch_node",
    "description": "Agora vendor official backup node."
  },
  {
    "username": "m4gic_hat_seo",
    "email": "magichat_bulk@safe-mail.net",
    "bitcoin": "1BatchMagicHatWallet99999999999999",
    "telegram": "@magichat_bulk",
    "description": "SEO services, high PR backlinks, domain authority boosting, web traffic bot networks. Fast turnaround within 24 hours."
  },
  {
    "username": "cyber_nebula_broker",
    "email": "nebula@onionmail.org",
    "bitcoin": "1NebulaBatchWallet999999999999999",
    "telegram": "@nebula_broker",
    "description": "Novel private exploit brokerage for enterprise ERP frameworks."
  }
]
```

#### 🎮 Interactive Features to Demo:
1. Click **1. Preview Batch Linking & Validate**.
2. Notice the 3 distinct resolution categories:
   - **Record #1 (`mike_bulk_alias`):** ⚡ **AUTO-MERGE (100.0%)** $\to$ Matched with Mike
   - **Record #2 (`m4gic_hat_seo`):** ⚖️ **SUGGESTION (68.8%)** $\to$ Matched with MagicHat
   - **Record #3 (`cyber_nebula_broker`):** 🆕 **NEW ENTITY** $\to$ Standalone actor
3. Click category filter pills: `All (3)`, `⚡ Auto-Merges (1)`, `⚖️ Suggestions (1)`, `🆕 New Personas (1)`.
4. Test per-record selection checkboxes `[✓]`.
5. Test **Reject** button on Record #3 $\to$ marks it as `🚫 Excluded`.
6. Click **2. Commit Selected (X of Y Records) to Knowledge Graph**.

---

### 🔹 Batch 3B: 5-Record Comprehensive Darknet Threat Dump

```json
[
  {
    "username": "SilkRoad_Special_Ops",
    "email": "silkroad_eu@protonmail.com",
    "pgp": "483F3631151FBA4895F9FF8404B63E9BA4772C78",
    "telegram": "@silkroad_ops_2026",
    "description": "Primary escrow seller for SilkRoad marketplace. Full stealth dispatch."
  },
  {
    "username": "CardingKing_VIP",
    "email": "cardingking@cock.li",
    "monero": "44AFFq5kSiGBoZ4NMDwYtN18obc8AemS33DBLWs3H7otXft3XjrpDtQGeiSTHzFcubDZmCo96hUoWDL14PBBCHnoFXcDpTX",
    "telegram": "@cardingking_vip",
    "description": "Verified merchant accounts, dumps with pins, and high-balance gift cards."
  },
  {
    "username": "ZeroDay_Oracle_Exploits",
    "email": "zeroday_oracle@onionmail.org",
    "bitcoin": "1OracleZeroDayWallet77777777777777",
    "telegram": "@zeroday_oracle",
    "description": "Private exploit broker and source code vulnerability auditing service."
  },
  {
    "username": "Magic_Hat_Backlinks",
    "email": "magichat_backlinks@safe-mail.net",
    "bitcoin": "1MagicHatBacklinksWallet5555555555",
    "telegram": "@magichat_seo",
    "description": "SEO services, high PR backlinks, domain authority boosting, web traffic bot networks."
  },
  {
    "username": "PassMan_Secondary_Store",
    "email": "passman_admin@yahoo.com",
    "bitcoin": "1b2cToQTkrmsDUUDeP6YDAK34wXuQ",
    "pgp": "2F4C5D998B102A3C4D5E6F7A8B9C0D1E2F3A4B5C",
    "description": "★ PREMIUM CCcam Cardsharing Server ★ 12 Months full package for all Enigma2 decoders."
  }
]
```

---

## 4. Model 4: Multi-Modal Search & Dossier Retrieval
**Location in UI:** *Topbar Search Box or Cross-Marketplace Search Tab*

- **Query 4A (Monero Stealth Address):**  
  `44AFFq5kSiGBoZ4NMDwYtN18obc8AemS33DBLWs3H7otXft3XjrpDtQGeiSTHzFcubDZmCo96hUoWDL14PBBCHnoFXcDpTX`  
  *Result:* Retrieves full actor profile, connected PGP keys, and associated listings.
- **Query 4B (PGP Key Fingerprint):**  
  `483F3631151FBA4895F9FF8404B63E9BA4772C78`  
  *Result:* Locates SilkRoad identity cluster across Agora and ShadowBay.
- **Query 4C (Fuzzy Username):**  
  `MagicHat`  
  *Result:* Matches `MagicHat`, `m4gic_hat_seo`, and SEO aliases.
- **Query 4D (Marketplace Name):**  
  `Agora`  
  *Result:* Returns all active vendors and digital infrastructure on Agora.

---

## 5. Model 5: Analyst Review Queue & Graph Verification
**Location in UI:** *Review Suggestions / Analyst Review Panel*

### 🔹 Round 5A: Adjudicate & Approve Suggestion
1. In the Review Panel, open **Suggestion #4**:
   - **Source:** ShadowBay Vendor #168279 (`m4gic_hat_seo`)
   - **Target:** Agora Vendor #4 (`MagicHat`)
   - **Confidence:** `68.8%`
   - **Forensic Breakdown:** Handle Jaro-Winkler match (94.5%) + 11-d stylometry (74.0%) + Behavioral escrow overlap (100.0%).
2. Click **Approve Merge**:
   - Platform merges the personas into a single entity cluster.
   - Graph automatically evolves: Cytoscape renders a permanent solid green `SAME_AS` edge:
     `ident_4 <---> ident_168279 (Weight: 1.0, Relation: SAME_AS)`.

### 🔹 Round 5B: Split / Dismiss Candidate
1. Select an ambiguous suggestion card.
2. Click **Split** or **Dismiss**.
3. Decision is recorded, keeping both actors segregated as distinct clusters.

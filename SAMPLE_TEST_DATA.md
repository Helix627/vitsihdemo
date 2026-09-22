# 🎯 Darknet Identity Resolution: Live Demo & Test Cases Playbook

**Platform:** Multimodal Cyber Threat Intelligence & Cross-Market Identity Resolution  
**Target Evaluation:** VITISH 2026 / SIH Internal Hackathon Panel Evaluation  
**Supported Ingestion Models:** Raw Unstructured Text, Single Actor Dossier, Bulk Dataset JSON  

---

## 📑 Table of Contents
1. [Master Scenario Matrix](#-master-scenario-matrix)
2. [Model 1: Raw Unstructured Text Analysis (`/analyze`)](#-model-1-raw-unstructured-text-analysis-analyze)
   - [Scenario 1.A: High Confidence Deterministic Match (100% Auto-Merge)](#scenario-1a-high-confidence-deterministic-match-100-auto-merge)
   - [Scenario 1.B: Moderate Confidence Probabilistic Match (80% Suggestion)](#scenario-1b-moderate-confidence-probabilistic-match-80-suggestion)
   - [Scenario 1.C: Novel Darknet Persona (<60% New Cluster)](#scenario-1c-novel-darknet-persona-60-new-cluster)
3. [Model 2: Single Actor Dossier Form (`/analyst/preview` -> `/analyst/submit`)](#-model-2-single-actor-dossier-form-analystpreview---analystsubmit)
   - [Scenario 2.A: Deterministic PGP Fingerprint Match (100% Auto-Merge)](#scenario-2a-deterministic-pgp-fingerprint-match-100-auto-merge)
   - [Scenario 2.B: Stylometric & Leetspeak Correlation (83.8% Suggestion)](#scenario-2b-stylometric--leetspeak-correlation-838-suggestion)
   - [Scenario 2.C: Uncorrelated Threat Actor (New Cluster)](#scenario-2c-uncorrelated-threat-actor-new-cluster)
4. [Model 3: Bulk Dataset Batch Import (`/datasets/preview` -> `/datasets/import`)](#-model-3-bulk-dataset-batch-import-datasetspreview---datasetsimport)
   - [Multi-Record Batch Payload](#multi-record-batch-payload)
   - [Expected Batch Summary Breakdown](#expected-batch-summary-breakdown)
5. [Model 4: Global Multi-Entity Search Verification (`/search`)](#-model-4-global-multi-entity-search-verification-search)
6. [Model 5: Analyst Adjudication & Cluster Merging (`/identity/approve`)](#-model-5-analyst-adjudication--cluster-merging-identityapprove)

---

## 📊 Master Scenario Matrix

| Model | Scenario | Input Format | Resolution Action | Expected Confidence | Matched Entity |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **Model 1: Text** | **1.A** Deterministic Crypto | Raw Forum Dispatch | **`AUTO_MERGE`** | **100.0%** | Vendor **Mike** (Agora) |
| **Model 1: Text** | **1.B** Probabilistic Stylometry | Service Ad / Booter | **`SUGGESTION`** | **80.0%** | Vendor **Hackyboy** (Agora) |
| **Model 1: Text** | **1.C** Novel Persona | Zero-Day Broker Text | **`NEW_CLUSTER`** | **100.0% (Novel)** | Isolated New Node |
| **Model 2: Form** | **2.A** Cryptographic PGP | Structured Dossier | **`AUTO_MERGE`** | **100.0%** | Vendor **Mike** (Agora) |
| **Model 2: Form** | **2.B** Handle & SEO Bio | Structured Dossier | **`SUGGESTION`** | **83.8%** | Vendor **MagicHat** (Agora) |
| **Model 2: Form** | **2.C** Unlinked Profile | Structured Dossier | **`NEW_CLUSTER`** | **100.0% (Novel)** | Isolated New Node |
| **Model 3: Bulk** | **3.A–C** Multi-Market Batch | JSON Array (3 rows) | **Mixed Matrix** | **1 Merge / 1 Sugg / 1 New** | Batch Unified |

---

## 📄 Model 1: Raw Unstructured Text Analysis (`/analyze`)

> **How to execute in UI:**  
> 1. Open the frontend and select **`Intelligence Studio`** tab.  
> 2. Click sub-tab **`1. Raw Text Analysis & 1-Click Ingest`**.  
> 3. Paste the sample text into the input box and click **`Analyze Intelligence Text`**.

---

### Scenario 1.A: High Confidence Deterministic Match (100% Auto-Merge)
* **Goal:** Verify automated Named Entity Recognition (NER) and instant cryptographic linking against the canonical graph.
* **Input Payload:**
```text
=== UNDERGROUND MARKET DISPATCH & RESHIP ADVISORY ===
Operator Handle: mike_shadow_backup
Support Email: mike_ops_batch@protonmail.com
Deposit Wallet (BTC): 1b2cToQTkrmsDUUDeP6YDAK34wXuQ
PGP Key ID: 2F4C5D998B102A3C4D5E6F7A8B9C0D1E2F3A4B5C

Official escrow node for Agora reshipments. All tracking numbers dispatched within 12 hours.
```
* **Expected Response:**
```json
{
  "resolution": {
    "action": "AUTO_MERGE",
    "confidence": 1.0,
    "decision_label": "High Confidence - Deterministic Merge",
    "matched_vendor_id": 1,
    "matched_vendor_name": "Mike",
    "reason": "Exact deterministic match on Bitcoin wallet 1b2cToQTkrmsDUUDeP6YDAK34wXuQ."
  }
}
```

---

### Scenario 1.B: Moderate Confidence Probabilistic Match (80% Suggestion)
* **Goal:** Demonstrate 5-stage stylometric, leetspeak, and neural semantic embedding matching when crypto keys are deliberately rotated.
* **Input Payload:**
```text
=== UNDERGROUND DDOS & SERVER STRESSER BOOTER ===
Operator handle: h4cky_boy_ddos
Contact email: h4cky_ops@tutanota.com
Deposit Bitcoin: 1NewUniqueH4ckyWallet9999999999999
Telegram Support: @h4cky_ddos_hq

New premium DDoS service available: Take down all websites you want. 
Custom stresser scripts for Skype accounts, Minecraft servers, and Xbox game servers.
Instant auto-dispatch and live monitoring dashboard with full escrow protection.
```
* **Expected Response:**
```json
{
  "resolution": {
    "action": "SUGGESTION",
    "confidence": 0.80,
    "decision_label": "Probabilistic Match (Review Required)",
    "matched_vendor_id": 2,
    "matched_vendor_name": "Hackyboy",
    "reason": "Probabilistic correlation (Handle leetspeak & stylometric profile match with Hackyboy)."
  }
}
```

---

### Scenario 1.C: Novel Darknet Persona (<60% New Cluster)
* **Goal:** Demonstrate outlier isolation to prevent false-positive cluster poisoning.
* **Input Payload:**
```text
=== ZEPHYR ZERO-DAY EXPLOIT BROKER ===
Handle: zephyr_quantum_vault_99
XMR: 888tNkZrPN6JsEgekjMnABU4TBzc2Dt29EPAvkFxbTNsYTRQtfVm2mAEDWBTC21qaYZYiGLTimnn6wa2nU5Cbsn682A4n7Z

Offering bespoke hypervisor bypass chains and satellite orbital telemetry decryptors.
Zero affiliation with existing darknet markets. All sales strictly confidential.
```
* **Expected Response:**
```json
{
  "resolution": {
    "action": "NEW_CLUSTER",
    "confidence": 1.0,
    "decision_label": "Novel Actor Persona",
    "matched_vendor_id": null,
    "matched_vendor_name": null,
    "reason": "No strong deterministic or probabilistic linkage found. New persona initialized."
  }
}
```

---

## 👤 Model 2: Single Actor Dossier Form (`/analyst/preview` -> `/analyst/submit`)

> **How to execute in UI:**  
> 1. Select **`Intelligence Studio`** $\rightarrow$ **`2. Single Actor Dossier (Preview & Ingest)`**.  
> 2. Fill the form fields and click **`Preview Resolution Forecast`**.  
> 3. Click **`Commit Dossier to Knowledge Graph`** to permanently update the database.

---

### Scenario 2.A: Deterministic PGP Fingerprint Match (100% Auto-Merge)
* **Form Field Inputs:**
  - **Username / Alias:** `ShadowMike_Alternate`
  - **Contact Email:** `mike_ops_backup@tutanota.com`
  - **PGP Fingerprint (40-hex):** `89404350303E88EFCB03821A187D7448F289BE88`
  - **Bitcoin Address:** `1NewSecondaryWalletForAgoraReship`
  - **Description / Bio:** `Secondary drop profile for Agora orders. All communications encrypted.`
* **Forecasted Resolution:**
  - **Action:** `AUTO_MERGE` | **Target:** `Mike` | **Confidence:** `100.0%`
  - **Trigger Evidence:** PGP fingerprint matches historical Mike public key.

---

### Scenario 2.B: Stylometric & Leetspeak Correlation (83.8% Suggestion)
* **Form Field Inputs:**
  - **Username / Alias:** `m4gic_hat_seo`
  - **Contact Email:** `magichat_ops@safe-mail.net`
  - **Bitcoin Address:** `1UniqueMagicHatBTCWallet99999999999`
  - **Description / Bio:** `SEO services, high PR backlinks, domain authority boosting, web traffic bot networks. Fast turnaround within 24 hours.`
* **Forecasted Resolution:**
  - **Action:** `SUGGESTION` | **Target:** `MagicHat` | **Confidence:** `83.8%`
  - **Multi-Stage Breakdown:**
    - Handle Fuzzy: `82%`
    - Behavioral Overlap: `85%`
    - 11-d Stylometric Vector: `86%`
    - Dense Embedding Cosine: `82%`

---

### Scenario 2.C: Uncorrelated Threat Actor (New Cluster)
* **Form Field Inputs:**
  - **Username / Alias:** `stellar_phantom_99`
  - **Contact Email:** `phantom99@cock.li`
  - **Bitcoin Address:** `1StellarPhantomWalletUnique99999999`
  - **Description / Bio:** `Unregistered boutique bulletproof hosting and offshore DNS bulletproofing.`
* **Forecasted Resolution:**
  - **Action:** `NEW_CLUSTER` | **Target:** `None` | **Confidence:** `100.0% (Novel)`

---

## 📁 Model 3: Bulk Dataset Batch Import (`/datasets/preview` -> `/datasets/import`)

> **How to execute in UI:**  
> 1. Select **`Intelligence Studio`** $\rightarrow$ **`3. Bulk Dataset Import`**.  
> 2. Paste the JSON array below into the code editor.  
> 3. Click **`Preview Dataset Impact`** to inspect the resolution matrix.  
> 4. Click **`Execute Batch Ingestion`** to commit all rows in an atomic SQL transaction.

---

### Multi-Record Batch Payload
```json
[
  {
    "username": "mike_bulk_alias",
    "email": "mike_batch@protonmail.com",
    "bitcoin": "1b2cToQTkrmsDUUDeP6YDAK34wXuQ",
    "description": "Agora vendor official backup node."
  },
  {
    "username": "m4gic_hat_seo",
    "email": "magichat_bulk@safe-mail.net",
    "bitcoin": "1BatchMagicHatWallet99999999999999",
    "description": "SEO services, high PR backlinks, domain authority boosting, web traffic bot networks. Fast turnaround within 24 hours."
  },
  {
    "username": "cyber_nebula_broker",
    "email": "nebula@onionmail.org",
    "bitcoin": "1NebulaBatchWallet999999999999999",
    "description": "Novel private exploit brokerage for enterprise ERP frameworks."
  }
]
```

### Expected Batch Summary Breakdown
* **Total Records Ingested:** `3`
* **Predicted Auto-Merges:** `1` (Hard-linked to Mike via BTC wallet `1b2cToQTkrmsDUUDeP6YDAK34wXuQ`)
* **Predicted Review Suggestions:** `1` (Candidate link generated for MagicHat at `83.8%`)
* **Predicted New Clusters:** `1` (Novel persona `cyber_nebula_broker` allocated new subgraph)

---

## 🔍 Model 4: Global Multi-Entity Search Verification (`/search`)

> **How to execute in UI:**  
> Type any of the queries below into the top navigation search bar. Observe the categorized dropdown and click any entry to animate the graph camera to that node.

| Test Query | Target Entity Type | Expected Matched Result | Category Pill |
| :--- | :--- | :--- | :---: |
| **`Mike`** | Vendor / Alias / Telegram / Discord | `Mike` (Vendor #1), `darkmike#9999`, `@mike_darkops` | **Vendor / Alias / Telegram** |
| **`1b2cToQTkrms`** | Bitcoin Deposit Wallet | `1b2cToQTkrmsDUUDeP6YDAK34wXuQ` | **BTC** |
| **`89404350`** | PGP Public Fingerprint | `89404350303E...F289BE88` | **PGP** |
| **`protonmail`** | Contact Email Address | `jesse_72@protonmail.com`, `mike_ops_batch@protonmail.com` | **Email** |
| **`44AFFq`** | Monero Stealth Address | `44AFFq5kSiGB...oFXcDpTX` | **XMR** |
| **`mike_darkops`** | Telegram Handle | `@mike_darkops` | **Telegram** |

---

## ⚖️ Model 5: Analyst Adjudication & Cluster Merging (`/identity/approve`)

> **How to execute in UI:**  
> 1. Click the **`Review Suggestions`** tab in the top bar.  
> 2. Observe the candidate correlation cards with the 4-stage similarity breakdown meters.  
> 3. Type a rationale into the case notes field (e.g., `Corroborated via Telegram channel and listing syntax`).  
> 4. Click **`Approve & Merge`** $\rightarrow$ Observe toast confirmation and live graph node consolidation.

* **API Verification Payload (`POST /identity/approve`):**
```json
{
  "suggestion_id": 1,
  "analyst_name": "lead_investigator",
  "notes": "Verified cross-market handle correlation and listing description stylometry."
}
```
* **Result:** Merges the source candidate cluster into the target cluster and registers an immutable entry into `analyst_decisions_log`.

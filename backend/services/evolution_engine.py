"""Continuous Intelligence Pipeline & Knowledge Graph Evolution Engine."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Dict, List, Optional, Set, Tuple

from core.logging import logger
from database.connection import get_db_cursor
from database.repositories.identity_repo import IdentityRepository
from database.repositories.relationship_repo import RelationshipRepository
from database.repositories.vendor_repo import VendorRepository
from graph.graph_engine import NetworkXGraphEngine
from pipelines.deterministic_pipeline import DeterministicResolutionPipeline
from pipelines.probabilistic_pipeline import ProbabilisticResolutionPipeline
from services.normalization_service import NormalizationService


class EvolutionEngine:
    """
    Orchestrates continuous threat intelligence intake, dynamic identity enrichment,
    evidence provenance versioning, confidence evolution, and knowledge graph expansion.
    """

    @classmethod
    def get_or_create_identity(cls, cursor, itype: str, raw_val: str, norm_val: str) -> int:
        """Fetch or insert atomic identity into `identities` table."""
        norm_clean = (norm_val or "").strip()
        cursor.execute(
            """
            INSERT INTO identities (identity_type, value, normalized_value)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE identity_id=LAST_INSERT_ID(identity_id);
            """,
            (itype, raw_val, norm_clean),
        )
        new_id = cursor.lastrowid
        if not new_id:
            cursor.execute(
                "SELECT identity_id FROM identities WHERE identity_type = %s AND normalized_value = %s LIMIT 1;",
                (itype, norm_clean),
            )
            row = cursor.fetchone()
            new_id = row["identity_id"] if row else 0
        return new_id

    @classmethod
    def record_provenance(
        cls,
        cursor,
        target_type: str,
        target_id: int,
        source_dataset: str,
        evidence_type: str,
        confidence_before: float,
        confidence_after: float,
        analyst_id: str = "system",
        reason: str = "",
        evidence_payload: Optional[Dict[str, Any]] = None,
    ) -> int:
        """Append permanent, immutable provenance record to `evidence_provenance`."""
        cursor.execute(
            """
            INSERT INTO evidence_provenance (
                target_type, target_id, source_dataset, evidence_type,
                evidence_payload, confidence_before, confidence_after,
                analyst_id, reason, verification_status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'verified');
            """,
            (
                target_type,
                target_id,
                source_dataset,
                evidence_type,
                json.dumps(evidence_payload or {}),
                confidence_before,
                confidence_after,
                analyst_id,
                reason,
            ),
        )
        return cursor.lastrowid

    @classmethod
    def ingest_submission(
        cls,
        payload: Dict[str, Any],
        source_dataset: str = "Analyst Submission",
        analyst_name: str = "analyst_1",
    ) -> Dict[str, Any]:
        """
        Executes the Complete 5-Stage Continuous Intelligence Ingestion Pipeline:
        1. Normalization & Canonicalization
        2. Deterministic Matching & Auto-Merge
        3. Probabilistic Multi-Modal Similarity Evaluation
        4. Analyst Review Filter (60% - 95%)
        5. Knowledge Graph Evolution & Provenance Recording
        """
        logger.info("Ingesting threat intelligence submission from source: %s...", source_dataset)

        # ------------------------------------------------------------------
        # Stage 1: Data Normalization
        # ------------------------------------------------------------------
        raw_username = payload.get("username") or payload.get("alias") or payload.get("user_name") or "unknown_actor"
        norm_username = NormalizationService.normalize_alias(raw_username)
        fuzzy_norm_username = NormalizationService.normalize_username_for_fuzzy(raw_username)

        # Extract/normalize all submitted credentials
        submitted_entities: List[Tuple[str, str, str]] = []  # (type, raw, norm)

        # 1. Alias / Username
        submitted_entities.append(("alias", raw_username, norm_username))

        # 2. Email
        if payload.get("email"):
            norm_e = NormalizationService.normalize_email(payload["email"])
            if norm_e:
                submitted_entities.append(("email", payload["email"], norm_e))

        # 3. Bitcoin Wallet
        if payload.get("bitcoin") or payload.get("wallet") or payload.get("btc"):
            btc_val = payload.get("bitcoin") or payload.get("wallet") or payload.get("btc")
            norm_b = NormalizationService.normalize_wallet(btc_val)
            if norm_b:
                submitted_entities.append(("bitcoin", btc_val, norm_b))

        # 4. Monero Wallet
        if payload.get("monero") or payload.get("xmr"):
            xmr_val = payload.get("monero") or payload.get("xmr")
            norm_x = NormalizationService.normalize_monero(xmr_val)
            if norm_x:
                submitted_entities.append(("monero", xmr_val, norm_x))

        # 5. PGP Fingerprint / Key
        if payload.get("pgp") or payload.get("pgp_key"):
            pgp_val = payload.get("pgp") or payload.get("pgp_key")
            norm_p = NormalizationService.normalize_pgp_fingerprint(pgp_val)
            if norm_p:
                submitted_entities.append(("pgp", pgp_val, norm_p))

        # 6. Telegram
        if payload.get("telegram"):
            norm_t = NormalizationService.normalize_telegram(payload["telegram"])
            if norm_t:
                submitted_entities.append(("telegram", payload["telegram"], norm_t))

        # 7. Discord
        if payload.get("discord"):
            norm_d = NormalizationService.normalize_discord(payload["discord"])
            if norm_d:
                submitted_entities.append(("discord", payload["discord"], norm_d))

        # 8. Forum Handle
        if payload.get("forum_handle") or payload.get("forum_account"):
            fh_val = payload.get("forum_handle") or payload.get("forum_account")
            norm_fh = NormalizationService.normalize_forum_handle(fh_val)
            if norm_fh:
                submitted_entities.append(("forum_handle", fh_val, norm_fh))

        # 9. Onion URL
        if payload.get("onion") or payload.get("onion_url"):
            onion_val = payload.get("onion") or payload.get("onion_url")
            norm_o = NormalizationService.normalize_onion_url(onion_val)
            if norm_o:
                submitted_entities.append(("onion", onion_val, norm_o))

        # 10. Listing URL
        if payload.get("listing_url"):
            l_val = payload.get("listing_url")
            norm_l = NormalizationService.normalize_listing_url(l_val)
            if norm_l:
                submitted_entities.append(("listing_url", l_val, norm_l))

        # ------------------------------------------------------------------
        # Stage 2: Deterministic Resolution
        # ------------------------------------------------------------------
        matched_vendor_id: Optional[int] = None
        exact_match_reason: str = ""
        strong_types = ("pgp", "bitcoin", "monero", "email", "onion", "listing_url")

        with get_db_cursor() as cursor:
            for itype, raw_v, norm_v in submitted_entities:
                if itype in strong_types:
                    cursor.execute(
                        """
                        SELECT vim.vendor_id, v.user_name, i.identity_type, i.value
                        FROM identities i
                        JOIN vendoridentitymap vim ON i.identity_id = vim.identity_id
                        JOIN vendors v ON vim.vendor_id = v.vendor_id
                        WHERE i.identity_type = %s AND i.normalized_value = %s
                        LIMIT 1;
                        """,
                        (itype, norm_v),
                    )
                    row = cursor.fetchone()
                    if row:
                        matched_vendor_id = row["vendor_id"]
                        exact_match_reason = f"Exact {itype.upper()} Match ({row['value']}) with existing Vendor #{row['vendor_id']} ({row['user_name']})"
                        break

        # Check for Explicit Analyst Direct Override Merge
        if not matched_vendor_id and payload.get("force_merge"):
            target_v_hint = payload.get("target_vendor_id") or payload.get("target_vendor")
            if target_v_hint:
                if str(target_v_hint).isdigit():
                    v_obj = VendorRepository.get_vendor_by_id(int(target_v_hint))
                else:
                    v_obj = VendorRepository.get_by_username(str(target_v_hint))
                if v_obj:
                    matched_vendor_id = v_obj["vendor_id"]
                    exact_match_reason = f"Analyst Direct Override Merge with Vendor #{v_obj['vendor_id']} ({v_obj['user_name']})"

        # ------------------------------------------------------------------
        # Branch A: Exact Match Found -> Stage 5 Evolution (Enrich Existing)
        # ------------------------------------------------------------------
        if matched_vendor_id is not None:
            logger.info("Deterministic match / Analyst override found! Enriching existing Vendor #%d (%s)...", matched_vendor_id, exact_match_reason)
            new_nodes_created = 0
            existing_nodes_updated = 0
            relationships_created = 0
            relationships_strengthened = 0

            with get_db_cursor() as cursor:
                # 1. Fetch vendor's primary alias identity ID
                cursor.execute(
                    """
                    SELECT vim.identity_id FROM vendoridentitymap vim
                    JOIN identities i ON vim.identity_id = i.identity_id
                    WHERE vim.vendor_id = %s AND i.identity_type = 'alias'
                    LIMIT 1;
                    """,
                    (matched_vendor_id,),
                )
                alias_row = cursor.fetchone()
                primary_alias_id = alias_row["identity_id"] if alias_row else 0

                # 2. Append all newly submitted digital identities
                for itype, raw_v, norm_v in submitted_entities:
                    ident_id = cls.get_or_create_identity(cursor, itype, raw_v, norm_v)

                    # Map to vendor
                    cursor.execute(
                        """
                        INSERT IGNORE INTO vendoridentitymap (vendor_id, identity_id, source_table, confidence_score)
                        VALUES (%s, %s, %s, 1.0000);
                        """,
                        (matched_vendor_id, ident_id, source_dataset[:64]),
                    )
                    if cursor.rowcount > 0:
                        new_nodes_created += 1
                        # Create edge from alias to new credential
                        if primary_alias_id and primary_alias_id != ident_id:
                            edge_type = f"HAS_{itype.upper()}" if itype in ("email", "bitcoin", "pgp") else "USES"
                            cursor.execute(
                                """
                                INSERT INTO identityrelationships (identity1_id, identity2_id, relationship_type, weight, evidence)
                                VALUES (%s, %s, %s, 1.0000, %s)
                                ON DUPLICATE KEY UPDATE
                                    weight = LEAST(1.0000, weight + 0.05),
                                    evidence = JSON_SET(COALESCE(evidence, '{}'), '$.last_enriched', %s);
                                """,
                                (
                                    min(primary_alias_id, ident_id),
                                    max(primary_alias_id, ident_id),
                                    edge_type,
                                    json.dumps({"source": source_dataset, "evidence": raw_v}),
                                    datetime.utcnow().isoformat(),
                                ),
                            )
                            relationships_created += 1
                    else:
                        existing_nodes_updated += 1
                        relationships_strengthened += 1

                # 3. Log provenance record
                cls.record_provenance(
                    cursor=cursor,
                    target_type="vendor",
                    target_id=matched_vendor_id,
                    source_dataset=source_dataset,
                    evidence_type="Deterministic Credential Match & Enrichment",
                    confidence_before=1.0000,
                    confidence_after=1.0000,
                    analyst_id=analyst_name,
                    reason=exact_match_reason,
                    evidence_payload={"submitted_entities_count": len(submitted_entities), "source": source_dataset},
                )

            # Rebuild graph cache
            NetworkXGraphEngine.build_graph()

            return {
                "status": "DETERMINISTIC_MERGE_SUCCESS",
                "stage": "Stage 2: Deterministic Resolution",
                "vendor_id": matched_vendor_id,
                "confidence_percentage": 100.0,
                "action": "AUTO_MERGED",
                "decision": "AUTO_MERGED",
                "message": f"Successfully enriched existing Vendor #{matched_vendor_id} via {exact_match_reason}.",
                "evolution_report": {
                    "new_nodes_created": new_nodes_created,
                    "existing_nodes_updated": existing_nodes_updated,
                    "relationships_created": relationships_created,
                    "relationships_strengthened": relationships_strengthened,
                    "suggestions_generated": 0,
                    "clusters_merged": 1,
                },
            }

        # ------------------------------------------------------------------
        # Stage 3: Probabilistic Resolution Engine
        # ------------------------------------------------------------------
        logger.info("Deterministic match absent. Running Stage 3 Probabilistic Resolution Engine...")
        query_desc = payload.get("description") or payload.get("profile_description") or raw_username
        prob_matches = ProbabilisticResolutionPipeline.find_probabilistic_matches(
            text=query_desc,
            alias_hint=raw_username,
            top_k=3,
            threshold=0.60,
        )

        best_match = prob_matches[0] if prob_matches else None
        best_conf = (best_match["confidence_percentage"] / 100.0) if best_match else 0.0

        # ------------------------------------------------------------------
        # Branch B: Probabilistic Auto-Link (Confidence >= 95%)
        # ------------------------------------------------------------------
        if best_match and best_conf >= 0.95:
            target_vendor_name = best_match["vendor"]
            logger.info("High probabilistic confidence (%.2f%% >= 95%%). Auto-linking with '%s'...", best_conf * 100, target_vendor_name)

            target_vendor = VendorRepository.get_by_username(target_vendor_name)
            target_vid = target_vendor["vendor_id"] if target_vendor else None

            if target_vid:
                with get_db_cursor() as cursor:
                    for itype, raw_v, norm_v in submitted_entities:
                        ident_id = cls.get_or_create_identity(cursor, itype, raw_v, norm_v)
                        cursor.execute(
                            """
                            INSERT IGNORE INTO vendoridentitymap (vendor_id, identity_id, source_table, confidence_score)
                            VALUES (%s, %s, %s, %s);
                            """,
                            (target_vid, ident_id, source_dataset[:64], best_conf),
                        )

                    cls.record_provenance(
                        cursor=cursor,
                        target_type="vendor",
                        target_id=target_vid,
                        source_dataset=source_dataset,
                        evidence_type="Probabilistic Auto-Link (>= 95%)",
                        confidence_before=0.8500,
                        confidence_after=best_conf,
                        analyst_id=analyst_name,
                        reason=f"Probabilistic multi-attribute match ({best_match['confidence_percentage']}%) with {target_vendor_name}",
                        evidence_payload=best_match.get("breakdown", {}),
                    )

                NetworkXGraphEngine.build_graph()

                return {
                    "status": "PROBABILISTIC_AUTO_LINKED",
                    "stage": "Stage 3 & 5: Probabilistic Resolution & Auto-Linking",
                    "vendor_id": target_vid,
                    "target_vendor": target_vendor_name,
                    "confidence_percentage": best_match["confidence_percentage"],
                    "action": "AUTO_LINKED",
                    "decision": "AUTO_LINKED",
                    "label": "Highly Likely",
                    "message": f"Automatically linked to Vendor '{target_vendor_name}' with {best_match['confidence_percentage']}% confidence.",
                    "evolution_report": {
                        "new_nodes_created": len(submitted_entities),
                        "existing_nodes_updated": 1,
                        "relationships_created": 1,
                        "relationships_strengthened": 1,
                        "suggestions_generated": 0,
                        "clusters_merged": 1,
                    },
                }

        # ------------------------------------------------------------------
        # Branch C: Stage 4 Analyst Review Suggestion (60% <= Conf < 95%)
        # ------------------------------------------------------------------
        if best_match and best_conf >= 0.60:
            target_vendor_name = best_match["vendor"]
            decision_label = "Likely" if best_conf >= 0.80 else "Possible"
            logger.info("Probabilistic match in review zone (%.2f%%). Generating Stage 4 Identity Suggestion...", best_conf * 100)

            # 1. Create a new pending vendor entry so it's visible in graph
            new_vid = cls._create_new_vendor_cluster(submitted_entities, payload, source_dataset, analyst_name)
            target_vendor = VendorRepository.get_by_username(target_vendor_name)
            target_vid = target_vendor["vendor_id"] if target_vendor else None

            # 2. Store suggestion in `identity_suggestions`
            with get_db_cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO identity_suggestions (
                        source_vendor_id, target_vendor_id, source_username, target_username,
                        confidence, decision_label, status, similarity_breakdown, suggested_reason
                    ) VALUES (%s, %s, %s, %s, %s, %s, 'PENDING', %s, %s);
                    """,
                    (
                        new_vid,
                        target_vid,
                        raw_username,
                        target_vendor_name,
                        best_conf,
                        decision_label,
                        json.dumps(best_match.get("breakdown", {})),
                        f"Multi-attribute similarity: {best_match['confidence_percentage']}% ({decision_label})",
                    ),
                )
                suggestion_id = cursor.lastrowid

            NetworkXGraphEngine.build_graph()

            return {
                "status": "SUGGESTION_CREATED",
                "stage": "Stage 4: Analyst Review & Suggestion",
                "vendor_id": new_vid,
                "target_vendor": target_vendor_name,
                "suggestion_id": suggestion_id,
                "confidence_percentage": best_match["confidence_percentage"],
                "action": "SUGGESTION",
                "decision": "SUGGESTED_HIGH" if best_conf >= 0.80 else "SUGGESTED_LOW",
                "label": decision_label,
                "message": f"Generated candidate suggestion linking '{raw_username}' to '{target_vendor_name}' ({best_match['confidence_percentage']}% confidence). Awaiting analyst review.",
                "evolution_report": {
                    "new_nodes_created": len(submitted_entities) + 1,
                    "existing_nodes_updated": 0,
                    "relationships_created": len(submitted_entities),
                    "relationships_strengthened": 0,
                    "suggestions_generated": 1,
                    "clusters_merged": 0,
                },
            }

        # ------------------------------------------------------------------
        # Branch D: New Standalone Identity Cluster (Stage 5 Evolution)
        # ------------------------------------------------------------------
        logger.info("No prior matches found. Creating new standalone Threat Actor cluster...")
        new_vid = cls._create_new_vendor_cluster(submitted_entities, payload, source_dataset, analyst_name)
        NetworkXGraphEngine.build_graph()

        return {
            "status": "NEW_ENTITY_CREATED",
            "stage": "Stage 5: Knowledge Graph Evolution",
            "vendor_id": new_vid,
            "username": raw_username,
            "confidence_percentage": 100.0,
            "action": "NEW_CLUSTER",
            "decision": "NEW_IDENTITY",
            "message": f"Registered new Threat Actor persona #{new_vid} ('{raw_username}') with {len(submitted_entities)} digital identities.",
            "evolution_report": {
                "new_nodes_created": len(submitted_entities) + 1,
                "existing_nodes_updated": 0,
                "relationships_created": len(submitted_entities),
                "relationships_strengthened": 0,
                "suggestions_generated": 0,
                "clusters_merged": 0,
            },
        }

    @classmethod
    def _create_new_vendor_cluster(
        cls,
        submitted_entities: List[Tuple[str, str, str]],
        payload: Dict[str, Any],
        source_dataset: str,
        analyst_name: str,
    ) -> int:
        """Helper to create a new vendor, profile, identities, and intra-cluster relationships."""
        with get_db_cursor() as cursor:
            # 1. Get next vendor_id
            cursor.execute("SELECT COALESCE(MAX(vendor_id), 0) + 1 AS next_id FROM vendors;")
            new_vid = cursor.fetchone()["next_id"]
            username = payload.get("username") or payload.get("alias") or f"Actor_{new_vid}"

            # 2. Insert into `vendors`
            cursor.execute(
                """
                INSERT INTO vendors (vendor_id, user_name, market_id, vendor_link)
                VALUES (%s, %s, %s, %s);
                """,
                (
                    new_vid,
                    username,
                    payload.get("market_id", 1),
                    payload.get("vendor_link") or f"/actor/{new_vid}",
                ),
            )

            # 3. Insert into `vendor_profile`
            cursor.execute(
                """
                INSERT INTO vendor_profile (
                    vendor_id, alias, username, email, bitcoin_wallet
                ) VALUES (%s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    alias = VALUES(alias),
                    username = VALUES(username);
                """,
                (
                    new_vid,
                    username,
                    username,
                    payload.get("email"),
                    payload.get("bitcoin") or payload.get("wallet"),
                ),
            )

            # 4. Map digital identities
            primary_alias_id = None
            for itype, raw_v, norm_v in submitted_entities:
                ident_id = cls.get_or_create_identity(cursor, itype, raw_v, norm_v)
                if itype == "alias" and primary_alias_id is None:
                    primary_alias_id = ident_id

                cursor.execute(
                    """
                    INSERT IGNORE INTO vendoridentitymap (vendor_id, identity_id, source_table, confidence_score)
                    VALUES (%s, %s, %s, 1.0000);
                    """,
                    (new_vid, ident_id, source_dataset[:64]),
                )

                # Edge from Alias to Identity
                if primary_alias_id and primary_alias_id != ident_id:
                    edge_type = f"HAS_{itype.upper()}" if itype in ("email", "bitcoin", "pgp") else "USES"
                    cursor.execute(
                        """
                        INSERT IGNORE INTO identityrelationships (identity1_id, identity2_id, relationship_type, weight, evidence)
                        VALUES (%s, %s, %s, 1.0000, %s);
                        """,
                        (
                            min(primary_alias_id, ident_id),
                            max(primary_alias_id, ident_id),
                            edge_type,
                            json.dumps({"source": source_dataset, "evidence": raw_v}),
                        ),
                    )

            # 5. Record initial provenance
            cls.record_provenance(
                cursor=cursor,
                target_type="vendor",
                target_id=new_vid,
                source_dataset=source_dataset,
                evidence_type="Initial Intelligence Intake",
                confidence_before=0.0000,
                confidence_after=1.0000,
                analyst_id=analyst_name,
                reason=f"New threat actor dossier created via {source_dataset}",
                evidence_payload={"entities_count": len(submitted_entities)},
            )

        return new_vid

    @classmethod
    def approve_suggestion(
        cls,
        suggestion_id: int,
        analyst_name: str = "analyst_1",
        notes: str = "",
    ) -> Dict[str, Any]:
        """
        Stage 4: Analyst Approves Merge:
        1. Merges identity clusters
        2. Creates solid green SAME_AS edge in graph
        3. Logs decision in `analyst_decisions_log` for supervised ML
        4. Appends permanent provenance record
        5. Refreshes Knowledge Graph
        """
        with get_db_cursor() as cursor:
            cursor.execute(
                "SELECT * FROM identity_suggestions WHERE suggestion_id = %s LIMIT 1;",
                (suggestion_id,),
            )
            sugg = cursor.fetchone()
            if not sugg:
                return {"error": f"Suggestion #{suggestion_id} not found."}

            if sugg["status"] != "PENDING":
                return {"error": f"Suggestion #{suggestion_id} is already {sugg['status']}."}

            src_vid = sugg["source_vendor_id"]
            tgt_vid = sugg["target_vendor_id"]
            conf = float(sugg["confidence"])

            # 1. Update suggestion status
            cursor.execute(
                """
                UPDATE identity_suggestions
                SET status = 'APPROVED', reviewed_at = %s, reviewed_by = %s, review_notes = %s
                WHERE suggestion_id = %s;
                """,
                (datetime.utcnow(), analyst_name, notes, suggestion_id),
            )

            # 2. Log analyst training decision (ML Dataset)
            cursor.execute(
                """
                INSERT INTO analyst_decisions_log (
                    suggestion_id, source_vendor, target_vendor, decision,
                    confidence, features_json, analyst_id, notes
                ) VALUES (%s, %s, %s, 'APPROVED', %s, %s, %s, %s);
                """,
                (
                    suggestion_id,
                    sugg["source_username"],
                    sugg["target_username"],
                    conf,
                    json.dumps(sugg["similarity_breakdown"] or {}),
                    analyst_name,
                    notes,
                ),
            )

            # 3. Create confirmed SAME_AS edge between primary identities
            if src_vid and tgt_vid:
                cursor.execute(
                    """
                    SELECT vim.identity_id FROM vendoridentitymap vim
                    JOIN identities i ON vim.identity_id = i.identity_id
                    WHERE vim.vendor_id = %s AND i.identity_type = 'alias' LIMIT 1;
                    """,
                    (src_vid,),
                )
                src_alias = cursor.fetchone()

                cursor.execute(
                    """
                    SELECT vim.identity_id FROM vendoridentitymap vim
                    JOIN identities i ON vim.identity_id = i.identity_id
                    WHERE vim.vendor_id = %s AND i.identity_type = 'alias' LIMIT 1;
                    """,
                    (tgt_vid,),
                )
                tgt_alias = cursor.fetchone()

                if src_alias and tgt_alias:
                    id1, id2 = min(src_alias["identity_id"], tgt_alias["identity_id"]), max(src_alias["identity_id"], tgt_alias["identity_id"])
                    cursor.execute(
                        """
                        INSERT INTO identityrelationships (identity1_id, identity2_id, relationship_type, weight, evidence)
                        VALUES (%s, %s, 'SAME_AS', 1.0000, %s)
                        ON DUPLICATE KEY UPDATE
                            relationship_type = 'SAME_AS',
                            weight = 1.0000,
                            evidence = %s;
                        """,
                        (
                            id1,
                            id2,
                            json.dumps({"action": "analyst_approved_merge", "analyst": analyst_name, "notes": notes}),
                            json.dumps({"action": "analyst_approved_merge", "analyst": analyst_name, "notes": notes}),
                        ),
                    )

            # 4. Log permanent provenance
            cls.record_provenance(
                cursor=cursor,
                target_type="vendor",
                target_id=src_vid or 0,
                source_dataset="Analyst Review Console",
                evidence_type="Manual Merge Approval",
                confidence_before=conf,
                confidence_after=1.0000,
                analyst_id=analyst_name,
                reason=f"Analyst approved merge with Vendor #{tgt_vid} ('{sugg['target_username']}'). Notes: {notes}",
                evidence_payload={"suggestion_id": suggestion_id, "similarity_breakdown": sugg["similarity_breakdown"]},
            )

        # Refresh Knowledge Graph
        NetworkXGraphEngine.build_graph()

        return {
            "success": True,
            "suggestion_id": suggestion_id,
            "status": "APPROVED",
            "action": "MERGED",
            "message": f"Successfully approved merge between '{sugg['source_username']}' and '{sugg['target_username']}'.",
        }

    @classmethod
    def reject_suggestion(
        cls,
        suggestion_id: int,
        analyst_name: str = "analyst_1",
        notes: str = "",
    ) -> Dict[str, Any]:
        """
        Stage 4: Analyst Rejects Merge:
        1. Updates suggestion status to REJECTED
        2. Logs training decision for Supervised ML
        3. Preserves distinct identity separation
        """
        with get_db_cursor() as cursor:
            cursor.execute(
                "SELECT * FROM identity_suggestions WHERE suggestion_id = %s LIMIT 1;",
                (suggestion_id,),
            )
            sugg = cursor.fetchone()
            if not sugg:
                return {"error": f"Suggestion #{suggestion_id} not found."}

            # 1. Update suggestion
            cursor.execute(
                """
                UPDATE identity_suggestions
                SET status = 'REJECTED', reviewed_at = %s, reviewed_by = %s, review_notes = %s
                WHERE suggestion_id = %s;
                """,
                (datetime.utcnow(), analyst_name, notes, suggestion_id),
            )

            # 2. Log training decision
            cursor.execute(
                """
                INSERT INTO analyst_decisions_log (
                    suggestion_id, source_vendor, target_vendor, decision,
                    confidence, features_json, analyst_id, notes
                ) VALUES (%s, %s, %s, 'REJECTED', %s, %s, %s, %s);
                """,
                (
                    suggestion_id,
                    sugg["source_username"],
                    sugg["target_username"],
                    float(sugg["confidence"]),
                    json.dumps(sugg["similarity_breakdown"] or {}),
                    analyst_name,
                    notes,
                ),
            )

        return {
            "success": True,
            "suggestion_id": suggestion_id,
            "status": "REJECTED",
            "action": "KEPT_SEPARATE",
            "message": f"Suggestion #{suggestion_id} rejected. Entities kept distinct.",
        }

    @classmethod
    def get_pending_suggestions(cls, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """Retrieve list of pending suggestions for the Analyst Review Console."""
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT * FROM identity_suggestions
                WHERE status = 'PENDING'
                ORDER BY confidence DESC, created_at DESC
                LIMIT %s OFFSET %s;
                """,
                (limit, offset),
            )
            rows = cursor.fetchall()
            for r in rows:
                if isinstance(r.get("similarity_breakdown"), str):
                    try:
                        r["similarity_breakdown"] = json.loads(r["similarity_breakdown"])
                    except Exception:
                        pass
            return rows

    @classmethod
    def get_provenance_for_target(cls, target_type: str, target_id: int) -> List[Dict[str, Any]]:
        """Retrieve full chronological evidence timeline and confidence progression."""
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT * FROM evidence_provenance
                WHERE target_type = %s AND target_id = %s
                ORDER BY created_at ASC;
                """,
                (target_type, target_id),
            )
            rows = cursor.fetchall()
            for r in rows:
                if isinstance(r.get("evidence_payload"), str):
                    try:
                        r["evidence_payload"] = json.loads(r["evidence_payload"])
                    except Exception:
                        pass
            return rows

    @classmethod
    def preview_submission(cls, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Runs Pre-Ingestion Analysis and Resolution Forecast for a single actor payload
        WITHOUT modifying the database.
        """
        raw_username = payload.get("username") or payload.get("alias") or payload.get("user_name") or "unknown_actor"
        norm_username = NormalizationService.normalize_alias(raw_username)
        fuzzy_norm_username = NormalizationService.normalize_username_for_fuzzy(raw_username)

        # Normalize submitted entities
        normalized_entities: List[Dict[str, str]] = []
        normalized_entities.append({"type": "alias", "raw": raw_username, "normalized": norm_username})

        candidate_checks = []
        if payload.get("email"):
            norm_e = NormalizationService.normalize_email(payload["email"])
            if norm_e:
                normalized_entities.append({"type": "email", "raw": payload["email"], "normalized": norm_e})
                candidate_checks.append(("email", norm_e, payload["email"]))

        if payload.get("bitcoin") or payload.get("wallet") or payload.get("btc"):
            btc_val = payload.get("bitcoin") or payload.get("wallet") or payload.get("btc")
            norm_b = NormalizationService.normalize_wallet(btc_val)
            if norm_b:
                normalized_entities.append({"type": "bitcoin", "raw": btc_val, "normalized": norm_b})
                candidate_checks.append(("bitcoin", norm_b, btc_val))

        if payload.get("monero") or payload.get("xmr"):
            xmr_val = payload.get("monero") or payload.get("xmr")
            norm_x = NormalizationService.normalize_monero(xmr_val)
            if norm_x:
                normalized_entities.append({"type": "monero", "raw": xmr_val, "normalized": norm_x})
                candidate_checks.append(("monero", norm_x, xmr_val))

        if payload.get("pgp") or payload.get("pgp_key"):
            pgp_val = payload.get("pgp") or payload.get("pgp_key")
            norm_p = NormalizationService.normalize_pgp_fingerprint(pgp_val)
            if norm_p:
                normalized_entities.append({"type": "pgp", "raw": pgp_val, "normalized": norm_p})
                candidate_checks.append(("pgp", norm_p, pgp_val))

        if payload.get("telegram"):
            norm_t = NormalizationService.normalize_telegram(payload["telegram"])
            if norm_t:
                normalized_entities.append({"type": "telegram", "raw": payload["telegram"], "normalized": norm_t})
                candidate_checks.append(("telegram", norm_t, payload["telegram"]))

        if payload.get("discord"):
            norm_d = NormalizationService.normalize_discord(payload["discord"])
            if norm_d:
                normalized_entities.append({"type": "discord", "raw": payload["discord"], "normalized": norm_d})
                candidate_checks.append(("discord", norm_d, payload["discord"]))

        if payload.get("forum_handle") or payload.get("forum_account"):
            fh_val = payload.get("forum_handle") or payload.get("forum_account")
            norm_fh = NormalizationService.normalize_forum_handle(fh_val)
            if norm_fh:
                normalized_entities.append({"type": "forum_handle", "raw": fh_val, "normalized": norm_fh})
                candidate_checks.append(("forum_handle", norm_fh, fh_val))

        # OPSEC Evaluation
        full_text_for_opsec = " ".join([
            raw_username,
            payload.get("email", ""),
            payload.get("bitcoin", ""),
            payload.get("monero", ""),
            payload.get("pgp", ""),
            payload.get("telegram", ""),
            payload.get("discord", ""),
            payload.get("description", ""),
        ])
        from services.confidentiality_service import ConfidentialityService
        confidentiality = ConfidentialityService.evaluate(full_text_for_opsec)

        # Check Deterministic Resolution
        linking_forecast = {
            "action": "NEW_CLUSTER",
            "forecast_type": "new_entity",
            "target_vendor_id": None,
            "target_vendor_name": None,
            "confidence_percentage": 100.0,
            "matched_identifier": None,
            "explanation": "No prior matching credentials found in database. Ingesting will establish a new, standalone Threat Actor cluster in the Knowledge Graph.",
        }

        matched_vendor_id = None
        target_vendor_name = ""
        matched_id_type = ""
        matched_id_val = ""

        with get_db_cursor() as cursor:
            for itype, norm_val, raw_val in candidate_checks:
                cursor.execute(
                    """
                    SELECT i.identity_id, i.identity_type, i.normalized_value, v.vendor_id, v.user_name AS vendor_name
                    FROM identities i
                    JOIN vendoridentitymap vim ON i.identity_id = vim.identity_id
                    JOIN Vendors v ON vim.vendor_id = v.vendor_id
                    WHERE i.normalized_value = %s
                    LIMIT 1;
                    """,
                    (norm_val,),
                )
                row = cursor.fetchone()
                if row:
                    matched_vendor_id = row["vendor_id"]
                    target_vendor_name = row["vendor_name"]
                    matched_id_type = itype.upper()
                    matched_id_val = raw_val
                    break

        if matched_vendor_id:
            linking_forecast = {
                "action": "AUTO_MERGE",
                "forecast_type": "deterministic",
                "target_vendor_id": matched_vendor_id,
                "target_vendor_name": target_vendor_name,
                "confidence_percentage": 100.0,
                "matched_identifier": {
                    "type": matched_id_type,
                    "value": matched_id_val,
                },
                "explanation": f"Exact 100% Deterministic Match on {matched_id_type} ({matched_id_val[:16]}...) with Vendor #{matched_vendor_id} ({target_vendor_name}). Ingesting will automatically enrich this existing identity cluster.",
            }
        else:
            # 1. Check Fuzzy Username Matching against existing Vendors in DB
            fuzzy_match_found = False
            with get_db_cursor() as cursor:
                cursor.execute("SELECT vendor_id, user_name FROM Vendors WHERE user_name IS NOT NULL LIMIT 2000;")
                all_vendors = cursor.fetchall()
                best_fuzzy_score = 0.0
                best_fuzzy_vendor = None

                for v_row in all_vendors:
                    cand_name = v_row["user_name"]
                    cand_norm = NormalizationService.normalize_username_for_fuzzy(cand_name)
                    f_res = ProbabilisticResolutionPipeline.calculate_username_similarity(fuzzy_norm_username, cand_norm)
                    score = f_res.get("score", 0.0)
                    if score > best_fuzzy_score:
                        best_fuzzy_score = score
                        best_fuzzy_vendor = v_row

                if best_fuzzy_vendor and best_fuzzy_score >= 0.60:
                    conf = round(best_fuzzy_score * 100, 1)
                    linking_forecast = {
                        "action": "SUGGESTION",
                        "forecast_type": "probabilistic",
                        "target_vendor_id": best_fuzzy_vendor["vendor_id"],
                        "target_vendor_name": best_fuzzy_vendor["user_name"],
                        "confidence_percentage": conf,
                        "matched_identifier": {"type": "FUZZY_USERNAME", "value": best_fuzzy_vendor["user_name"]},
                        "explanation": f"Fuzzy handle similarity detected with Vendor #{best_fuzzy_vendor['vendor_id']} ({best_fuzzy_vendor['user_name']}) at {conf}% confidence. Ingesting will create a review suggestion in the Analyst Review Queue.",
                    }
                    fuzzy_match_found = True

            if not fuzzy_match_found:
                # 2. Check stylometric similarity
                from services.stylometric_service import StylometricEngine
                desc_sample = payload.get("description", "")
                stylo_matches = StylometricEngine.attribute_vendor(desc_sample, top_k=1) if desc_sample else []
                top_cand = stylo_matches[0] if stylo_matches else None

                if top_cand and top_cand.get("confidence_percentage", 0) >= 60.0:
                    conf = float(top_cand.get("confidence_percentage", 0))
                    linking_forecast = {
                        "action": "SUGGESTION",
                        "forecast_type": "probabilistic",
                        "target_vendor_id": None,
                        "target_vendor_name": top_cand.get("vendor"),
                        "confidence_percentage": conf,
                        "matched_identifier": {"type": "STYLOMETRIC_SIGNATURE", "value": top_cand.get("vendor")},
                        "explanation": f"Detected strong stylometric similarity with vendor '{top_cand.get('vendor')}' ({round(conf, 1)}% confidence). Ingesting will create a review suggestion in the Analyst Review Queue.",
                    }

        return {
            "username": raw_username,
            "normalized_entities": normalized_entities,
            "confidentiality": confidentiality,
            "linking_forecast": linking_forecast,
        }

    @classmethod
    def preview_dataset(cls, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Runs pre-ingestion batch preview for a list of records."""
        previews = []
        auto_merges = 0
        suggestions = 0
        new_clusters = 0

        for rec in records:
            prev = cls.preview_submission(rec)
            action = prev["linking_forecast"]["action"]
            if action == "AUTO_MERGE":
                auto_merges += 1
            elif action == "SUGGESTION":
                suggestions += 1
            else:
                new_clusters += 1
            previews.append({
                "username": rec.get("username") or rec.get("alias") or "unknown",
                "normalized_entities": prev["normalized_entities"],
                "linking_forecast": prev["linking_forecast"],
            })

        return {
            "total_records": len(records),
            "predicted_auto_merges": auto_merges,
            "predicted_suggestions": suggestions,
            "predicted_new_clusters": new_clusters,
            "records_preview": previews,
        }

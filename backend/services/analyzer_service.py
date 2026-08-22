"""Identity Analyzer & Intelligence Intake Engine: Entity resolution, PII detection, confidentiality scoring, and stylometric matching."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Set, Tuple

from core.logging import logger
from repositories.identity_repo import IdentityRepository
from repositories.vendor_repo import VendorRepository
from services.stylometric_service import StylometricEngine

# Regex patterns for intelligence extraction
REGEX_BITCOIN = re.compile(r"\b(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{25,39})\b")
REGEX_EMAIL = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
REGEX_PGP_FINGERPRINT = re.compile(r"\b(?:0x)?[0-9A-Fa-f]{40}\b|\b[0-9A-Fa-f]{32}\b|\b(?:[0-9A-Fa-f]{4}\s*){10}\b")
REGEX_ONION = re.compile(r"\b[a-z2-7]{16,56}\.onion\b", re.IGNORECASE)
REGEX_PHONE = re.compile(r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b")
REGEX_USERNAME_HANDLE = re.compile(r"(?:^|\s)@([a-zA-Z0-9_]{3,32})")
REGEX_PGP_BLOCK = re.compile(r"-----BEGIN PGP PUBLIC KEY BLOCK-----[\s\S]+?-----END PGP PUBLIC KEY BLOCK-----")


class AnalyzerService:
    """Intake engine for arbitrary intelligence feeds, documents, and threat snippets."""

    @classmethod
    def extract_entities(cls, raw_text: str) -> Dict[str, List[Dict[str, Any]]]:
        """Extract all candidate threat entities from unstructured text."""
        if not raw_text:
            return {"emails": [], "bitcoin_wallets": [], "pgp_keys": [], "usernames": [], "onion_links": [], "phones": []}

        text = raw_text.strip()

        # 1. Emails
        emails = list(set(REGEX_EMAIL.findall(text)))

        # 2. Bitcoin Addresses
        btc_addresses = list(set(REGEX_BITCOIN.findall(text)))

        # 3. PGP Keys & Fingerprints
        pgp_fingerprints = []
        for m in REGEX_PGP_FINGERPRINT.findall(text):
            clean_fp = re.sub(r"\s+", "", m).upper()
            if len(clean_fp) in (32, 40) and clean_fp not in pgp_fingerprints:
                pgp_fingerprints.append(clean_fp)

        # 4. Onion links
        onion_links = list(set(REGEX_ONION.findall(text)))

        # 5. Phone numbers
        phones = list(set(REGEX_PHONE.findall(text)))

        # 6. Usernames / Handles
        usernames = list(set(REGEX_USERNAME_HANDLE.findall(text)))
        # If no @ handles found, test individual words that look like usernames
        if not usernames and not emails and not btc_addresses:
            for word in text.split():
                clean_w = word.strip(",.;:\"'()[]{}")
                if 3 <= len(clean_w) <= 30 and re.match(r"^[a-zA-Z0-9_]+$", clean_w) and not clean_w.isdigit():
                    if clean_w.lower() not in ("the", "and", "for", "with", "this", "from", "market", "vendor"):
                        usernames.append(clean_w)

        return {
            "emails": [{"value": e, "type": "email", "normalized": e.lower()} for e in emails],
            "bitcoin_wallets": [{"value": b, "type": "bitcoin", "normalized": b} for btc_addresses in [btc_addresses] for b in btc_addresses],
            "pgp_keys": [{"value": p, "type": "pgp", "normalized": p} for p in pgp_fingerprints],
            "usernames": [{"value": u, "type": "username", "normalized": u.lower()} for u in usernames[:10]],
            "onion_links": [{"value": o, "type": "onion", "normalized": o.lower()} for o in onion_links],
            "phones": [{"value": ph, "type": "phone", "normalized": ph} for ph in phones],
        }

    @classmethod
    def calculate_confidentiality_score(
        cls, extracted: Dict[str, List[Dict[str, Any]]], raw_text: str
    ) -> Dict[str, Any]:
        """
        Calculate confidentiality risk percentage (0-100%) and PII severity breakdown.
        """
        email_count = len(extracted.get("emails", []))
        btc_count = len(extracted.get("bitcoin_wallets", []))
        pgp_count = len(extracted.get("pgp_keys", []))
        user_count = len(extracted.get("usernames", []))
        phone_count = len(extracted.get("phones", []))
        onion_count = len(extracted.get("onion_links", []))

        # Check for sensitive keywords (credentials, passwords, private keys)
        has_private_key = "private key" in raw_text.lower() or "begin rsa private key" in raw_text.lower()
        has_credentials = any(k in raw_text.lower() for k in ("password", "passwd", "secret_key", "seed phrase", "mnemonic"))

        # Risk Matrix Weights
        score = 0.0
        score += min(btc_count * 30.0, 45.0)       # Financial exposure
        score += min(email_count * 20.0, 35.0)     # Direct identity
        score += min(phone_count * 25.0, 30.0)     # Personal PII
        score += min(pgp_count * 15.0, 25.0)       # Cryptographic identity
        score += min(user_count * 10.0, 20.0)      # Handle exposure
        score += min(onion_count * 15.0, 20.0)     # Darknet infrastructure

        if has_private_key:
            score += 50.0
        if has_credentials:
            score += 35.0

        final_score = min(100.0, round(score, 1))

        if final_score >= 80.0:
            level = "CRITICAL"
            color = "#EF4444"
            description = "High density of financial identifiers, credentials, or multiple correlated darknet profiles."
        elif final_score >= 50.0:
            level = "HIGH"
            color = "#F97316"
            description = "Substantial identity exposure detected (cryptocurrency addresses, email addresses, or PGP keys)."
        elif final_score >= 25.0:
            level = "MEDIUM"
            color = "#F59E0B"
            description = "Moderate PII presence detected (usernames, partial identifiers, or single communication channel)."
        elif final_score > 0.0:
            level = "LOW"
            color = "#10B981"
            description = "Informational markers with low immediate attribution confidentiality risk."
        else:
            level = "MINIMAL"
            color = "#6B7280"
            description = "No direct high-risk identifiers or financial PII discovered."

        return {
            "score": final_score,
            "level": level,
            "color": color,
            "description": description,
            "breakdown": {
                "bitcoin_wallets": btc_count,
                "emails": email_count,
                "pgp_keys": pgp_count,
                "usernames": user_count,
                "phone_numbers": phone_count,
                "onion_domains": onion_count,
                "has_credentials": has_credentials,
                "has_private_key": has_private_key,
            },
        }

    @classmethod
    def match_against_graph(
        cls, extracted: Dict[str, List[Dict[str, Any]]]
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Search for extracted identifiers in the 3NF MySQL database and
        construct a Cytoscape attribution subgraph.
        """
        matches = []
        matched_identities: Set[int] = set()
        matched_vendors: Set[int] = set()

        # Check all extracted items in DB
        candidate_pairs: List[Tuple[str, str]] = []
        for itype_key, items in extracted.items():
            db_type = (
                "email" if itype_key == "emails"
                else "bitcoin" if itype_key == "bitcoin_wallets"
                else "pgp" if itype_key == "pgp_keys"
                else "username" if itype_key == "usernames"
                else None
            )
            if db_type:
                for item in items:
                    candidate_pairs.append((db_type, item["normalized"]))

        for db_type, nval in candidate_pairs:
            ident = IdentityRepository.get_by_type_and_normalized_val(db_type, nval)
            if ident:
                iid = ident["identity_id"]
                matched_identities.add(iid)
                vendors = IdentityRepository.get_vendors_for_identity(iid)
                for v in vendors:
                    matched_vendors.add(int(v["vendor_id"]))

                matches.append(
                    {
                        "identity_id": iid,
                        "identity_type": db_type,
                        "value": ident["value"],
                        "matched_in_database": True,
                        "confidence": 1.0,
                        "linked_vendors_count": len(vendors),
                        "linked_vendors": [
                            {
                                "vendor_id": v["vendor_id"],
                                "user_name": v["user_name"],
                                "market_id": v.get("market_id"),
                                "detail_url": f"/vendor/{v['vendor_id']}",
                            }
                            for v in vendors
                        ],
                    }
                )

        # Build Subgraph Nodes & Edges
        nodes = []
        edges = []

        for vid in matched_vendors:
            v_info = VendorRepository.get_by_id(vid)
            label = v_info.get("user_name") or f"Vendor {vid}" if v_info else f"Vendor {vid}"
            nodes.append(
                {
                    "data": {
                        "id": f"vendor_{vid}",
                        "label": label,
                        "type": "alias",
                        "color": "#10B981",
                        "shape": "ellipse",
                        "vendor_id": vid,
                        "detail_url": f"/vendor/{vid}",
                    }
                }
            )

        for m in matches:
            iid = m["identity_id"]
            itype = m["identity_type"]
            val = m["value"]
            node_id = (
                f"email_{val.lower()}" if itype == "email"
                else f"btc_{val}" if itype == "bitcoin"
                else f"pgp_{iid}" if itype == "pgp"
                else f"user_{val.lower()}" if itype == "username"
                else f"identity_{iid}"
            )
            color = (
                "#0284C7" if itype == "email"
                else "#F59E0B" if itype == "bitcoin"
                else "#F97316" if itype == "pgp"
                else "#8B5CF6"
            )
            shape = "diamond" if itype == "pgp" else "round-rectangle" if itype == "bitcoin" else "hexagon"

            nodes.append(
                {
                    "data": {
                        "id": node_id,
                        "label": val[:20] + "..." if len(val) > 20 else val,
                        "type": itype,
                        "color": color,
                        "shape": shape,
                        "detail_url": f"/identity/{iid}",
                    }
                }
            )

            for v in m["linked_vendors"]:
                vid = v["vendor_id"]
                edges.append(
                    {
                        "data": {
                            "id": f"vendor_{vid}_{node_id}",
                            "source": f"vendor_{vid}",
                            "target": node_id,
                            "relation": f"has_{itype}",
                            "label": itype.upper(),
                            "weight": 1.0,
                        }
                    }
                )

        subgraph = {"nodes": nodes, "edges": edges}
        return matches, subgraph

    @classmethod
    def analyze_text(cls, raw_text: str) -> Dict[str, Any]:
        """
        Execute full intelligence analysis pipeline:
        1. Extract entities & normalize
        2. Score confidentiality & PII risk
        3. Match against Dark Web graph database
        4. Perform Stylometric authorship matching against Agora marketplace corpus
        5. Generate visualization subgraph
        """
        if not raw_text:
            return {"error": "Input text is required"}

        extracted = cls.extract_entities(raw_text)
        confidentiality = cls.calculate_confidentiality_score(extracted, raw_text)
        matches, subgraph = cls.match_against_graph(extracted)

        # Stylometric analysis on the text corpus
        stylometric_matches = StylometricEngine.match_author(raw_text, top_k=5)

        total_extracted_count = sum(len(v) for v in extracted.values())

        return {
            "summary": {
                "total_entities_extracted": total_extracted_count,
                "database_matches_found": len(matches),
                "confidentiality_score": confidentiality["score"],
                "risk_level": confidentiality["level"],
            },
            "confidentiality": confidentiality,
            "extracted_entities": extracted,
            "database_matches": matches,
            "stylometric_matches": stylometric_matches,
            "subgraph": subgraph,
        }

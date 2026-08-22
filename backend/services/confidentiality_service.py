"""Confidentiality Rating and PII Risk Scoring Engine."""

from __future__ import annotations

from typing import Any, Dict, List
from services.normalization_service import NormalizationService


class ConfidentialityService:
    """
    Computes an additive 0-100 Confidentiality Rating estimating
    personally identifiable information (PII) or operational risk in submitted text.
    """

    FEATURE_WEIGHTS: Dict[str, int] = {
        "credentials": 40,
        "gov_ids": 30,
        "pgp_fingerprints": 25,
        "emails": 20,
        "bitcoin_wallets": 20,
        "phones": 15,
        "onion_domains": 10,
        "crypto_wallets": 10,
        "real_names": 10,
        "locations": 5,
    }

    @classmethod
    def evaluate(cls, text: str) -> Dict[str, Any]:
        """Calculate the confidentiality rating and classification level."""
        entities = NormalizationService.extract_all_entities(text)

        total_score = 0
        breakdown: Dict[str, Dict[str, Any]] = {}

        for feature_key, weight in cls.FEATURE_WEIGHTS.items():
            found_items = entities.get(feature_key, [])
            count = len(found_items)
            if count > 0:
                contrib = min(weight * count, weight * 2)  # Cap per category
                total_score += contrib
                breakdown[feature_key] = {
                    "count": count,
                    "weight_each": weight,
                    "contribution": contrib,
                    "items": found_items[:5],
                }

        # Saturation cap at 100
        final_score = min(100, total_score)

        if final_score <= 20:
            level = "Public"
            badge = "safe"
            description = "Minimal or public threat intelligence footprint."
            actions = ["Safe for general analyst sharing.", "No redacting required."]
        elif final_score <= 40:
            level = "Low"
            badge = "info"
            description = "Low exposure: basic identifiers or public domains detected."
            actions = ["Standard handling protocol applies.", "Review extracted domains."]
        elif final_score <= 60:
            level = "Moderate"
            badge = "warning"
            description = "Moderate operational risk: verified emails or phone numbers exposed."
            actions = ["Store in encrypted database.", "Apply least-privilege investigator access."]
        elif final_score <= 80:
            level = "Sensitive"
            badge = "high"
            description = "High risk: PGP cryptographic keys, Bitcoin financial wallets, or multiple PII elements."
            actions = ["Restricted TLP:AMBER dissemination.", "Anonymize wallets before external reporting."]
        else:
            level = "Highly Confidential"
            badge = "critical"
            description = "Critical risk: Cleartext credentials, API tokens, or Government IDs detected!"
            actions = ["IMMEDIATE TLP:RED lockdown.", "Mask sensitive credentials.", "Initiate threat mitigation."]

        return {
            "score": final_score,
            "level": level,
            "badge": badge,
            "description": description,
            "actions": actions,
            "recommended_actions": actions,
            "breakdown": breakdown,
            "raw_entities": entities,
        }

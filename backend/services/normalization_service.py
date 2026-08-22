"""Input Normalization and Canonicalization Service."""

from __future__ import annotations

import re
import unicodedata
from typing import Any, Dict, List, Optional, Set


class NormalizationService:
    """Canonicalization and entity extraction rules for CTI intelligence intake."""

    EMAIL_REGEX = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
    BITCOIN_REGEX = re.compile(r"\b(?:[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59})\b")
    ETH_REGEX = re.compile(r"\b0x[a-fA-F0-9]{40}\b")
    PGP_REGEX = re.compile(r"\b([A-Fa-f0-9]{40})\b")
    PHONE_REGEX = re.compile(r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b")
    ONION_REGEX = re.compile(r"\b[a-z2-7]{16,56}\.onion\b", re.IGNORECASE)
    CREDENTIAL_REGEX = re.compile(r"(?i)\b(?:password|passwd|pass|secret|api[_-]?key|token)\s*[:=]\s*(\S+)")
    GOV_ID_REGEX = re.compile(r"\b(?:\d{3}-\d{2}-\d{4}|[A-Z]{1,2}\d{6,8})\b")

    STOPWORDS: Set[str] = {
        "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
        "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
        "below", "between", "both", "but", "by", "can't", "cannot", "could", "did",
        "do", "does", "doing", "don't", "down", "during", "each", "few", "for", "from",
        "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself",
        "him", "himself", "his", "how", "i", "if", "in", "into", "is", "isn't", "it",
        "its", "itself", "let's", "me", "more", "most", "my", "myself", "no", "nor",
        "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours",
        "ourselves", "out", "over", "own", "same", "she", "should", "so", "some", "such",
        "than", "that", "the", "their", "theirs", "them", "themselves", "then", "there",
        "these", "they", "this", "those", "through", "to", "too", "under", "until", "up",
        "very", "was", "we", "were", "what", "when", "where", "which", "while", "who",
        "whom", "why", "with", "won't", "would", "you", "your", "yours", "yourself",
    }

    @classmethod
    def clean_text(cls, text: str) -> str:
        """Perform Unicode NFKC normalization and whitespace cleanup."""
        if not text:
            return ""
        text = unicodedata.normalize("NFKC", text)
        text = re.sub(r"[\u200B-\u200D\uFEFF]", "", text)
        text = re.sub(r"[\t\r\n\s]+", " ", text)
        return text.strip()

    @classmethod
    def normalize_email(cls, email: str) -> Optional[str]:
        """Normalize email according to RFC 5322 canonical rules."""
        if not email:
            return None
        email = cls.clean_text(email).lower()
        if cls.EMAIL_REGEX.fullmatch(email):
            user, domain = email.split("@", 1)
            if domain in ("proton.me", "protonmail.ch", "pm.me"):
                domain = "protonmail.com"
            return f"{user}@{domain}"
        return None

    @classmethod
    def normalize_wallet(cls, address: str) -> Optional[str]:
        """Validate and clean Bitcoin/crypto wallet address."""
        if not address:
            return None
        cleaned = cls.clean_text(address)
        if cls.BITCOIN_REGEX.fullmatch(cleaned) or cls.ETH_REGEX.fullmatch(cleaned):
            return cleaned
        return None

    @classmethod
    def normalize_pgp_fingerprint(cls, raw: str) -> Optional[str]:
        """Extract and clean 40-character uppercase hexadecimal PGP fingerprint."""
        if not raw:
            return None
        hex_only = re.sub(r"[^A-Fa-f0-9]", "", raw).upper()
        if len(hex_only) == 40:
            return hex_only
        match = cls.PGP_REGEX.search(raw)
        return match.group(1).upper() if match else None

    @classmethod
    def normalize_alias(cls, alias: str) -> str:
        """Standardize username or vendor alias."""
        cleaned = cls.clean_text(alias).lower()
        cleaned = re.sub(r"[\s_-]+", "_", cleaned)
        return cleaned.strip("_")

    @classmethod
    def tokenize(cls, text: str, remove_stopwords: bool = True) -> List[str]:
        """Split text into normalized alphanumeric word tokens."""
        tokens = re.findall(r"\b[a-zA-Z0-9_-]{2,}\b", text.lower())
        if remove_stopwords:
            tokens = [t for t in tokens if t not in cls.STOPWORDS]
        return tokens

    @classmethod
    def extract_all_entities(cls, text: str) -> Dict[str, List[str]]:
        """Extract and normalize all recognized digital identity entities from text."""
        cleaned = unicodedata.normalize("NFKC", text)
        emails = list({cls.normalize_email(e) for e in cls.EMAIL_REGEX.findall(cleaned) if cls.normalize_email(e)})
        btc_wallets = list({cls.normalize_wallet(w) for w in cls.BITCOIN_REGEX.findall(cleaned) if cls.normalize_wallet(w)})
        eth_wallets = list({w for w in cls.ETH_REGEX.findall(cleaned)})
        pgp_keys = list({cls.normalize_pgp_fingerprint(k) for k in cls.PGP_REGEX.findall(cleaned) if cls.normalize_pgp_fingerprint(k)})
        phones = list(set(cls.PHONE_REGEX.findall(cleaned)))
        onion_domains = list(set(cls.ONION_REGEX.findall(cleaned)))
        credentials = list(set(cls.CREDENTIAL_REGEX.findall(cleaned)))
        gov_ids = list(set(cls.GOV_ID_REGEX.findall(cleaned)))

        return {
            "emails": sorted(emails),
            "bitcoin_wallets": sorted(btc_wallets),
            "crypto_wallets": sorted(eth_wallets),
            "pgp_fingerprints": sorted(pgp_keys),
            "phones": sorted(phones),
            "onion_domains": sorted(onion_domains),
            "credentials": sorted(credentials),
            "gov_ids": sorted(gov_ids),
        }

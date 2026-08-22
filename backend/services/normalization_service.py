"""Input Normalization and Canonicalization Service."""

from __future__ import annotations

import re
import unicodedata
from typing import Any, Dict, List, Optional, Set


class NormalizationService:
    """Canonicalization, fuzzy normalization, and entity extraction rules for CTI intelligence intake."""

    EMAIL_REGEX = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
    BITCOIN_REGEX = re.compile(r"\b(?:[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59})\b")
    ETH_REGEX = re.compile(r"\b0x[a-fA-F0-9]{40}\b")
    PGP_REGEX = re.compile(r"\b([A-Fa-f0-9]{40})\b")
    PHONE_REGEX = re.compile(r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b")
    ONION_REGEX = re.compile(r"\b[a-z2-7]{16,56}\.onion\b", re.IGNORECASE)
    LISTING_URL_REGEX = re.compile(r"(?:https?://)?(?:[a-z2-7]{16,56}\.onion)?/(?:item|listing|product|p)/([a-zA-Z0-9_-]+)", re.IGNORECASE)

    # Common leetspeak translation table for Stage 2 Fuzzy Username Matching
    LEETSPEAK_MAP = {
        "0": "o",
        "1": "i",
        "3": "e",
        "4": "a",
        "5": "s",
        "7": "t",
        "@": "a",
        "$": "s",
    }

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
        """Standardize username or vendor alias for general indexing."""
        if not alias:
            return ""
        cleaned = cls.clean_text(alias).lower()
        cleaned = re.sub(r"[\s_-]+", "_", cleaned)
        return cleaned.strip("_")

    @classmethod
    def normalize_username_for_fuzzy(cls, username: str) -> str:
        """
        Stage 2 Fuzzy Username Normalization:
        1. Lowercase
        2. Remove _, -, ., spaces, and symbols
        3. Replace common leetspeak:
           0 -> o, 1 -> i, 3 -> e, 5 -> s, 7 -> t
        """
        if not username:
            return ""
        # 1. Lowercase & Unicode clean
        cleaned = cls.clean_text(username).lower()

        # 2. Remove symbols (_, -, ., spaces)
        cleaned = re.sub(r"[\s_.\-]+", "", cleaned)

        # 3. Leetspeak substitution
        trans_table = str.maketrans(cls.LEETSPEAK_MAP)
        return cleaned.translate(trans_table)

    MONERO_REGEX = re.compile(r"\b[48][0-9ABa-b][1-9A-HJ-NP-Za-km-z]{93,104}\b")
    TELEGRAM_REGEX = re.compile(r"(?:https?://)?(?:t\.me|telegram\.me)/([a-zA-Z0-9_]{4,32})|@([a-zA-Z0-9_]{4,32})")
    DISCORD_REGEX = re.compile(r"(?:https?://)?(?:discord\.gg|discord\.com/invite)/([a-zA-Z0-9_-]+)|([a-zA-Z0-9_]{2,32}#\d{4})")

    @classmethod
    def normalize_monero(cls, address: str) -> Optional[str]:
        """Validate and clean Monero (XMR) address (starts with 4 or 8)."""
        if not address:
            return None
        cleaned = cls.clean_text(address)
        if cls.MONERO_REGEX.fullmatch(cleaned):
            return cleaned
        return None

    @classmethod
    def normalize_telegram(cls, handle: str) -> Optional[str]:
        """Normalize Telegram handle or invite link into @canonical_handle."""
        if not handle:
            return None
        cleaned = cls.clean_text(handle)
        match = cls.TELEGRAM_REGEX.search(cleaned)
        if match:
            h = match.group(1) or match.group(2)
            return f"@{h.lower()}"
        if cleaned.startswith("@"):
            return f"@{cleaned[1:].lower().strip()}"
        if re.match(r"^[a-zA-Z0-9_]{4,32}$", cleaned):
            return f"@{cleaned.lower()}"
        return None

    @classmethod
    def normalize_discord(cls, tag: str) -> Optional[str]:
        """Normalize Discord user tag or server link."""
        if not tag:
            return None
        cleaned = cls.clean_text(tag)
        match = cls.DISCORD_REGEX.search(cleaned)
        if match:
            return (match.group(1) or match.group(2)).lower()
        return cleaned.lower()

    @classmethod
    def normalize_onion_url(cls, raw_url: str) -> Optional[str]:
        """Extract canonical .onion address."""
        if not raw_url:
            return None
        match = cls.ONION_REGEX.search(raw_url.lower())
        return match.group(0).lower() if match else None

    @classmethod
    def normalize_listing_url(cls, raw_url: str) -> Optional[str]:
        """Extract canonical listing or product path."""
        if not raw_url:
            return None
        cleaned = raw_url.strip().lower()
        match = cls.LISTING_URL_REGEX.search(cleaned)
        if match:
            return f"item/{match.group(1)}"
        return cleaned.rstrip("/")

    @classmethod
    def normalize_forum_handle(cls, handle: str) -> str:
        """Normalize forum handle/account."""
        return cls.normalize_alias(handle)

    @classmethod
    def tokenize(cls, text: str, remove_stopwords: bool = True) -> List[str]:
        """Split text into normalized alphanumeric word tokens."""
        tokens = re.findall(r"\b[a-zA-Z0-9_-]{2,}\b", text.lower())
        if remove_stopwords:
            tokens = [t for t in tokens if t not in cls.STOPWORDS]
        return tokens

    CREDENTIAL_REGEX = re.compile(r"(?i)\b(?:password|passwd|pass|secret|api[_-]?key|token)\s*[:=]\s*(\S+)")
    GOV_ID_REGEX = re.compile(r"\b(?:\d{3}-\d{2}-\d{4}|[A-Z]{1,2}\d{6,8})\b")

    @classmethod
    def extract_all_entities(cls, text: str) -> Dict[str, List[str]]:
        """Extract and normalize all recognized digital identity and PII entities from text."""
        cleaned = unicodedata.normalize("NFKC", text)
        emails = [e for e in cls.EMAIL_REGEX.findall(cleaned) if cls.normalize_email(e)]
        wallets = [w for w in cls.BITCOIN_REGEX.findall(cleaned) if cls.normalize_wallet(w)]
        pgp_keys = [cls.normalize_pgp_fingerprint(k) for k in cls.PGP_REGEX.findall(cleaned) if cls.normalize_pgp_fingerprint(k)]
        onions = [cls.normalize_onion_url(o) for o in cls.ONION_REGEX.findall(cleaned) if cls.normalize_onion_url(o)]
        phones = cls.PHONE_REGEX.findall(cleaned)
        credentials = cls.CREDENTIAL_REGEX.findall(cleaned)
        gov_ids = cls.GOV_ID_REGEX.findall(cleaned)

        return {
            "emails": list(set(emails)),
            "bitcoin_wallets": list(set(wallets)),
            "wallets": list(set(wallets)),
            "pgp_fingerprints": list(set(pgp_keys)),
            "pgp_keys": list(set(pgp_keys)),
            "phones": list(set(phones)),
            "credentials": list(set(credentials)),
            "gov_ids": list(set(gov_ids)),
            "onion_domains": list(set(onions)),
            "onions": list(set(onions)),
        }

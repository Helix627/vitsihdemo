"""Behavioural Similarity Service: Evaluates vendor market operational patterns."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Set, Tuple


class BehavioralEngine:
    """
    Stage 3 Behavioural Similarity Engine:
    Compares vendor operational behavior across:
    - Product Category taxonomies (Drugs, Fraud, Malware, Counterfeit, etc.)
    - Shipping origins & destinations
    - Price range and median pricing
    - Rating and review count distributions
    - Cryptocurrency preferences (BTC, XMR, LTC, etc.)
    - Listing length and structure
    """

    MAJOR_CATEGORIES = {
        "drugs": {"drugs", "cannabis", "weed", "cocaine", "ecstasy", "mdma", "opioids", "stimulants", "lsd", "mushrooms", "psychedelics", "benzos"},
        "fraud": {"fraud", "cc", "cvv", "dumps", "accounts", "bank", "paypal", "cards", "financial"},
        "malware": {"malware", "botnet", "exploit", "trojan", "ransomware", "virus", "software", "hacking"},
        "counterfeit": {"counterfeit", "fake", "replica", "id", "passport", "money", "bills", "documents"},
        "services": {"services", "hacking", "custom", "dropshipping", "escrow"},
    }

    @classmethod
    def compute_category_similarity(cls, cats1: List[str] | str, cats2: List[str] | str) -> float:
        """Taxonomy path and category token Jaccard similarity."""
        if not cats1 or not cats2:
            return 0.0

        def extract_tokens(cats: List[str] | str) -> Set[str]:
            if isinstance(cats, str):
                cats = [cats]
            tokens: Set[str] = set()
            for c in cats:
                for part in re.split(r"[/,\s_-]+", c.lower()):
                    if len(part) > 2:
                        tokens.add(part)
            return tokens

        t1 = extract_tokens(cats1)
        t2 = extract_tokens(cats2)
        if not t1 or not t2:
            return 0.0

        if t1 == t2:
            return 1.0

        union = len(t1.union(t2))
        return len(t1.intersection(t2)) / union if union > 0 else 0.0

    @classmethod
    def compute_shipping_similarity(
        cls,
        origins1: List[str] | str,
        destinations1: List[str] | str,
        origins2: List[str] | str,
        destinations2: List[str] | str,
    ) -> float:
        """Compare shipping corridor overlaps (origins and destinations)."""
        def to_set(val: List[str] | str) -> Set[str]:
            if isinstance(val, str):
                val = [val]
            return {v.lower().strip() for v in val if v and v.strip()}

        o1, o2 = to_set(origins1), to_set(origins2)
        d1, d2 = to_set(destinations1), to_set(destinations2)

        # Origin similarity (higher weight)
        o_sim = 1.0 if o1 and o2 and o1 == o2 else (
            len(o1.intersection(o2)) / len(o1.union(o2)) if (o1 and o2 and o1.union(o2)) else 0.3
        )

        # Destination similarity
        d_sim = 1.0 if d1 and d2 and d1 == d2 else (
            len(d1.intersection(d2)) / len(d1.union(d2)) if (d1 and d2 and d1.union(d2)) else 0.3
        )

        return 0.6 * o_sim + 0.4 * d_sim

    @classmethod
    def compute_price_similarity(cls, avg_price1: float, avg_price2: float) -> float:
        """Compare price point distributions."""
        p1 = max(float(avg_price1 or 0.0), 0.001)
        p2 = max(float(avg_price2 or 0.0), 0.001)

        diff = abs(p1 - p2)
        max_p = max(p1, p2)
        return float(max(0.0, 1.0 - (diff / max_p)))

    @classmethod
    def compute_rating_similarity(cls, rating1: float, rating2: float) -> float:
        """Compare vendor feedback ratings (0.0 to 5.0 scale)."""
        r1 = float(rating1 or 4.8)
        r2 = float(rating2 or 4.8)
        diff = abs(r1 - r2)
        return float(max(0.0, 1.0 - (diff / 5.0)))

    @classmethod
    def compute_crypto_similarity(cls, cryptos1: List[str] | str, cryptos2: List[str] | str) -> float:
        """Compare accepted cryptocurrency sets (BTC, XMR, LTC, etc.)."""
        def to_set(c: List[str] | str) -> Set[str]:
            if isinstance(c, str):
                c = re.split(r"[/,\s]+", c)
            return {x.upper().strip() for x in c if x and x.strip()}

        s1, s2 = to_set(cryptos1), to_set(cryptos2)
        if not s1 or not s2:
            return 0.5  # Default baseline overlap (BTC assumed)

        if s1 == s2:
            return 1.0
        union = len(s1.union(s2))
        return len(s1.intersection(s2)) / union if union > 0 else 0.5

    @classmethod
    def compute_behavioral_score(
        cls,
        profile1: Dict[str, Any],
        profile2: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Stage 3 Behavioural Score:
        Combines:
        - Category overlap (35%)
        - Shipping corridor overlap (25%)
        - Price similarity (15%)
        - Rating & metric similarity (15%)
        - Cryptocurrency preference (10%)
        """
        # 1. Category
        cats1 = profile1.get("categories") or [profile1.get("category", "General")]
        cats2 = profile2.get("categories") or [profile2.get("category", "General")]
        s_cat = cls.compute_category_similarity(cats1, cats2)

        # 2. Shipping
        o1 = profile1.get("shipping_origin") or profile1.get("origins") or "Worldwide"
        d1 = profile1.get("shipping_destination") or profile1.get("destinations") or "Worldwide"
        o2 = profile2.get("shipping_origin") or profile2.get("origins") or "Worldwide"
        d2 = profile2.get("shipping_destination") or profile2.get("destinations") or "Worldwide"
        s_ship = cls.compute_shipping_similarity(o1, d1, o2, d2)

        # 3. Price
        p1 = float(profile1.get("avg_price") or profile1.get("price") or 50.0)
        p2 = float(profile2.get("avg_price") or profile2.get("price") or 50.0)
        s_price = cls.compute_price_similarity(p1, p2)

        # 4. Rating
        r1 = float(profile1.get("rating") or 4.9)
        r2 = float(profile2.get("rating") or 4.9)
        s_rating = cls.compute_rating_similarity(r1, r2)

        # 5. Crypto
        c1 = profile1.get("cryptos") or ["BTC"]
        c2 = profile2.get("cryptos") or ["BTC"]
        s_crypto = cls.compute_crypto_similarity(c1, c2)

        # Weighted composite behavioral score
        score = (
            0.35 * s_cat
            + 0.25 * s_ship
            + 0.15 * s_price
            + 0.15 * s_rating
            + 0.10 * s_crypto
        )
        score = float(max(0.0, min(1.0, score)))

        return {
            "score": round(score, 4),
            "category_similarity": round(s_cat, 4),
            "shipping_similarity": round(s_ship, 4),
            "price_similarity": round(s_price, 4),
            "rating_similarity": round(s_rating, 4),
            "crypto_similarity": round(s_crypto, 4),
        }

"""Stylometric analysis engine: Extracts forensic writing style features and attributes authorship from darknet listings."""

from __future__ import annotations

import csv
import math
import os
import re
from collections import Counter
from typing import Any, Dict, List, Optional, Set, Tuple

from core.logging import logger

PUNCTUATION_CHARS = set("!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~")
FUNCTION_WORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
    "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
    "below", "between", "both", "but", "by", "can", "cannot", "could", "couldn't",
    "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
    "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
    "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here",
    "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i",
    "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's",
    "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself",
    "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought",
    "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she",
    "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such",
    "than", "that", "that's", "the", "their", "theirs", "them", "themselves",
    "then", "there", "there's", "these", "they", "they'd", "they'll", "they're",
    "they've", "this", "those", "through", "to", "too", "under", "until", "up",
    "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
    "weren't", "what", "what's", "when", "when's", "where", "where's", "which",
    "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would",
    "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours",
    "yourself", "yourselves",
}


class StylometricEngine:
    """Forensic stylometric profiling and author attribution engine."""

    _VENDOR_FINGERPRINTS: Dict[str, Dict[str, Any]] = {}
    _IS_INITIALIZED: bool = False

    @staticmethod
    def extract_features(text: str) -> Dict[str, float]:
        """
        Extract comprehensive stylometric feature vector from raw text.
        Includes lexical statistics, character n-grams, punctuation profile, and function word frequencies.
        """
        if not text or not text.strip():
            return {
                "char_count": 0.0,
                "word_count": 0.0,
                "avg_word_len": 0.0,
                "ttr": 0.0,
                "upper_ratio": 0.0,
                "digit_ratio": 0.0,
                "punct_ratio": 0.0,
                "exclamation_freq": 0.0,
                "question_freq": 0.0,
                "dollar_freq": 0.0,
                "btc_mention_freq": 0.0,
            }

        cleaned_text = text.strip()
        total_chars = max(len(cleaned_text), 1)

        # Tokenization
        raw_words = re.findall(r"\b\w+\b", cleaned_text)
        words_lower = [w.lower() for w in raw_words]
        total_words = max(len(raw_words), 1)

        # Lexical features
        avg_word_len = sum(len(w) for w in raw_words) / total_words
        unique_words = len(set(words_lower))
        ttr = unique_words / total_words  # Type-Token Ratio

        # Character type ratios
        upper_chars = sum(1 for c in cleaned_text if c.isupper())
        digit_chars = sum(1 for c in cleaned_text if c.isdigit())
        punct_chars = sum(1 for c in cleaned_text if c in PUNCTUATION_CHARS)

        upper_ratio = upper_chars / total_chars
        digit_ratio = digit_chars / total_chars
        punct_ratio = punct_chars / total_chars

        # Specialized darknet punctuation and keyword cues
        exclamation_freq = cleaned_text.count("!") / total_words
        question_freq = cleaned_text.count("?") / total_words
        dollar_freq = cleaned_text.count("$") / total_words
        btc_mention_freq = (
            cleaned_text.lower().count("btc") + cleaned_text.lower().count("bitcoin")
        ) / total_words

        # Function word distribution
        word_counts = Counter(words_lower)
        fw_freqs: Dict[str, float] = {}
        for fw in sorted(FUNCTION_WORDS):
            fw_freqs[f"fw_{fw}"] = word_counts[fw] / total_words

        # Top character trigrams
        trigrams: Counter[str] = Counter()
        for i in range(len(cleaned_text) - 2):
            tg = cleaned_text[i : i + 3].lower()
            if tg.isalpha():
                trigrams[tg] += 1

        total_trigrams = max(sum(trigrams.values()), 1)
        tg_freqs: Dict[str, float] = {}
        for tg, count in trigrams.most_common(20):
            tg_freqs[f"tg_{tg}"] = count / total_trigrams

        features: Dict[str, float] = {
            "char_count": float(total_chars),
            "word_count": float(total_words),
            "avg_word_len": avg_word_len,
            "ttr": ttr,
            "upper_ratio": upper_ratio,
            "digit_ratio": digit_ratio,
            "punct_ratio": punct_ratio,
            "exclamation_freq": exclamation_freq,
            "question_freq": question_freq,
            "dollar_freq": dollar_freq,
            "btc_mention_freq": btc_mention_freq,
        }
        features.update(fw_freqs)
        features.update(tg_freqs)
        return features

    @classmethod
    def compute_similarity(cls, vec1: Dict[str, float], vec2: Dict[str, float]) -> float:
        """Calculate cosine similarity over normalized feature vectors."""
        all_keys = set(vec1.keys()).union(set(vec2.keys()))
        if not all_keys:
            return 0.0

        # Weights: boost structural and function word features over raw counts
        weights: Dict[str, float] = {
            "avg_word_len": 2.0,
            "ttr": 2.5,
            "upper_ratio": 2.0,
            "digit_ratio": 1.5,
            "punct_ratio": 2.0,
            "exclamation_freq": 1.5,
            "question_freq": 1.5,
            "dollar_freq": 1.0,
            "btc_mention_freq": 1.0,
        }

        dot_product = 0.0
        norm_a = 0.0
        norm_b = 0.0

        for key in all_keys:
            if key in ("char_count", "word_count"):
                continue  # Skip scale counts for pure stylistic comparison

            w = weights.get(key, 1.0)
            val1 = vec1.get(key, 0.0) * w
            val2 = vec2.get(key, 0.0) * w

            dot_product += val1 * val2
            norm_a += val1 * val1
            norm_b += val2 * val2

        if norm_a <= 0.0 or norm_b <= 0.0:
            return 0.0

        cosine_sim = dot_product / (math.sqrt(norm_a) * math.sqrt(norm_b))
        # Bound similarity into [0.0, 1.0]
        return max(0.0, min(1.0, float(cosine_sim)))

    @classmethod
    def cosine_similarity(cls, vec1: Dict[str, float], vec2: Dict[str, float]) -> float:
        """Alias for compute_similarity."""
        return cls.compute_similarity(vec1, vec2)

    @classmethod
    def initialize_from_csv(
        cls, csv_path: str = "data/agora.csv", min_listings_per_vendor: int = 5, max_vendors: int = 1000
    ) -> int:
        """
        Ingest Agora marketplace descriptions, aggregate text per vendor,
        and compute baseline stylometric signatures.
        """
        if not os.path.exists(csv_path):
            alt_path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "agora.csv")
            if os.path.exists(alt_path):
                csv_path = alt_path
            else:
                logger.warning("Agora CSV dataset not found at %s. Stylometric engine will run in uninitialized mode.", csv_path)
                return 0

        logger.info("Initializing stylometric signatures from %s...", csv_path)
        vendor_texts: Dict[str, List[str]] = {}
        vendor_categories: Dict[str, Counter[str]] = {}

        try:
            with open(csv_path, "r", encoding="utf-8", errors="ignore") as f:
                reader = csv.DictReader(f)
                if reader.fieldnames:
                    reader.fieldnames = [k.strip() for k in reader.fieldnames]

                for row in reader:
                    vendor = (row.get("Vendor") or "").strip()
                    if not vendor:
                        continue

                    item = (row.get("Item") or "").strip()
                    desc = (row.get("Item Description") or "").strip()
                    category = (row.get("Category") or "").strip()

                    combined = f"{item}. {desc}"
                    if len(combined.strip()) > 15:
                        if vendor not in vendor_texts:
                            vendor_texts[vendor] = []
                            vendor_categories[vendor] = Counter()
                        vendor_texts[vendor].append(combined)
                        if category:
                            vendor_categories[vendor][category] += 1

            # Filter vendors with sufficient corpus
            qualified_vendors = [
                (v, texts)
                for v, texts in vendor_texts.items()
                if len(texts) >= min_listings_per_vendor
            ]
            qualified_vendors.sort(key=lambda x: len(x[1]), reverse=True)
            target_vendors = qualified_vendors[:max_vendors]

            cls._VENDOR_FINGERPRINTS.clear()
            for vendor, texts in target_vendors:
                corpus = "\n".join(texts[:30])  # Sample up to 30 listings per vendor
                features = cls.extract_features(corpus)
                top_cat = vendor_categories[vendor].most_common(1)[0][0] if vendor_categories[vendor] else "General"

                cls._VENDOR_FINGERPRINTS[vendor] = {
                    "vendor": vendor,
                    "listing_count": len(texts),
                    "primary_category": top_cat,
                    "features": features,
                    "sample_excerpt": texts[0][:180] + "..." if texts else "",
                }

            cls._IS_INITIALIZED = True
            logger.info("Stylometric engine initialized with %d darknet vendor signatures.", len(cls._VENDOR_FINGERPRINTS))
            return len(cls._VENDOR_FINGERPRINTS)
        except Exception as exc:
            logger.error("Failed to initialize stylometric signatures: %s", exc)
            return 0

    @classmethod
    def match_author(cls, input_text: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Compare input text to all darknet vendor stylometric signatures
        and return the top matching authors with attribution confidence scores.
        """
        if not input_text or not input_text.strip():
            return []

        if not cls._IS_INITIALIZED or not cls._VENDOR_FINGERPRINTS:
            cls.initialize_from_csv()

        input_vec = cls.extract_features(input_text)
        matches = []

        for vendor, profile in cls._VENDOR_FINGERPRINTS.items():
            sim = cls.compute_similarity(input_vec, profile["features"])
            if sim > 0.40:  # Base threshold for relevance
                matches.append(
                    {
                        "vendor": vendor,
                        "confidence": round(sim, 3),
                        "confidence_percentage": round(sim * 100, 1),
                        "listing_count": profile["listing_count"],
                        "primary_category": profile["primary_category"],
                        "sample_excerpt": profile["sample_excerpt"],
                        "shared_traits": cls._identify_shared_traits(input_vec, profile["features"]),
                    }
                )

        matches.sort(key=lambda x: x["confidence"], reverse=True)
        return matches[:top_k]

    @staticmethod
    def _identify_shared_traits(vec1: Dict[str, float], vec2: Dict[str, float]) -> List[str]:
        """Identify key linguistic markers that contributed to the match."""
        traits = []
        if abs(vec1.get("avg_word_len", 0) - vec2.get("avg_word_len", 0)) < 0.4:
            traits.append("Similar word length profile")
        if abs(vec1.get("ttr", 0) - vec2.get("ttr", 0)) < 0.08:
            traits.append("Matching vocabulary diversity (TTR)")
        if abs(vec1.get("upper_ratio", 0) - vec2.get("upper_ratio", 0)) < 0.03:
            traits.append("Consistent casing & capitalization habit")
        if abs(vec1.get("punct_ratio", 0) - vec2.get("punct_ratio", 0)) < 0.02:
            traits.append("Identical punctuation density")
        if vec1.get("exclamation_freq", 0) > 0.02 and vec2.get("exclamation_freq", 0) > 0.02:
            traits.append("High exclamation mark usage pattern")
        if vec1.get("dollar_freq", 0) > 0 or vec1.get("btc_mention_freq", 0) > 0:
            traits.append("Financial / cryptocurrency nomenclature alignment")
        return traits[:4]

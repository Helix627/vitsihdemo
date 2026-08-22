"""Forensic Stylometric Analysis Engine: Extracts linguistic, forensic, TF-IDF, and embedding features."""

from __future__ import annotations

import csv
import math
import os
import re
from collections import Counter
from typing import Any, Dict, List, Optional, Set, Tuple

import numpy as np
from core.logging import logger
from services.embedding_service import EmbeddingService

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity as sk_cosine_similarity
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

PUNCTUATION_CHARS = set("!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~")

GREETING_WORDS = {"hello", "hi", "hey", "welcome", "greetings", "dear", "sup", "howdy", "aloha"}
CLOSING_WORDS = {"regards", "cheers", "thanks", "thank you", "peace", "stay safe", "pgp", "best", "sincerely", "respect"}
SLANG_WORDS = {"u", "ur", "plz", "pls", "thx", "thru", "dont", "cant", "wont", "im", "ive", "id", "bro", "mate", "cuz", "dm"}
TECH_TERMS = {"stealth", "vacuum", "escrow", "fe", "finalize", "tracking", "reship", "vendor", "pgp", "tor", "onion", "btc", "xmr", "monero", "bitcoin", "mb", "bulk", "sample", "ddos"}

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
    """Forensic stylometric profiling and multi-feature author attribution engine."""

    _VENDOR_FINGERPRINTS: Dict[str, Dict[str, Any]] = {}
    _IS_INITIALIZED: bool = False

    @staticmethod
    def extract_features(text: str) -> Dict[str, float]:
        """
        Extract comprehensive 11-dimension stylometric feature vector:
        1. Average sentence length
        2. Average word length
        3. Vocabulary richness (Type-Token Ratio & Yule's K index)
        4. Punctuation profile (!, ?, ,, ., :, ;, quotes)
        5. Capitalization style (upper ratio, title-case words, all-caps words)
        6. Repeated phrases (n-gram repetition ratio)
        7. Spelling & darknet slang variations (u, plz, thx, etc.)
        8. Emoji & special symbol usage (*, ~, [], >>>)
        9. Greeting style (hello, hi, welcome, etc.)
        10. Closing signature (regards, thanks, peace, etc.)
        11. Preferred technical terms (stealth, vacuum, escrow, fe, xmr, etc.)
        """
        if not text or not text.strip():
            return {
                "char_count": 0.0,
                "word_count": 0.0,
                "avg_sentence_len": 0.0,
                "avg_word_len": 0.0,
                "vocabulary_richness": 0.0,
                "yules_k": 0.0,
                "upper_ratio": 0.0,
                "digit_ratio": 0.0,
                "punct_ratio": 0.0,
                "exclamation_freq": 0.0,
                "question_freq": 0.0,
                "comma_freq": 0.0,
                "period_freq": 0.0,
                "colon_freq": 0.0,
                "semicolon_freq": 0.0,
                "titlecase_ratio": 0.0,
                "allcaps_word_freq": 0.0,
                "repeated_bigrams_ratio": 0.0,
                "slang_freq": 0.0,
                "emoji_symbol_freq": 0.0,
                "greeting_score": 0.0,
                "closing_score": 0.0,
                "tech_terms_freq": 0.0,
            }

        cleaned_text = text.strip()
        total_chars = max(len(cleaned_text), 1)

        # Sentence parsing
        sentences = [s.strip() for s in re.split(r"[.!?]+", cleaned_text) if s.strip()]
        num_sentences = max(len(sentences), 1)

        # Word Tokenization
        raw_words = re.findall(r"\b\w+\b", cleaned_text)
        words_lower = [w.lower() for w in raw_words]
        total_words = max(len(raw_words), 1)

        # 1. Average sentence length & word length
        avg_sentence_len = total_words / num_sentences
        avg_word_len = sum(len(w) for w in raw_words) / total_words

        # 2. Vocabulary Richness (TTR and Yule's K)
        unique_words = len(set(words_lower))
        vocabulary_richness = unique_words / total_words

        word_freqs = Counter(words_lower)
        freq_spectrum = Counter(word_freqs.values())
        sum_m2 = sum(i * i * vi for i, vi in freq_spectrum.items())
        yules_k = 10000.0 * (sum_m2 - total_words) / (total_words * total_words) if total_words > 1 else 0.0
        yules_k = max(0.0, min(1.0, yules_k / 100.0))  # Scale to [0, 1]

        # 3. Punctuation Profile
        punct_chars = sum(1 for c in cleaned_text if c in PUNCTUATION_CHARS)
        punct_ratio = punct_chars / total_chars
        exclamation_freq = cleaned_text.count("!") / total_words
        question_freq = cleaned_text.count("?") / total_words
        comma_freq = cleaned_text.count(",") / total_words
        period_freq = cleaned_text.count(".") / total_words
        colon_freq = cleaned_text.count(":") / total_words
        semicolon_freq = cleaned_text.count(";") / total_words

        # 4. Capitalization Style
        upper_chars = sum(1 for c in cleaned_text if c.isupper())
        digit_chars = sum(1 for c in cleaned_text if c.isdigit())
        upper_ratio = upper_chars / total_chars
        digit_ratio = digit_chars / total_chars
        titlecase_words = sum(1 for w in raw_words if w.istitle())
        titlecase_ratio = titlecase_words / total_words
        allcaps_words = sum(1 for w in raw_words if len(w) > 1 and w.isupper())
        allcaps_word_freq = allcaps_words / total_words

        # 5. Repeated Phrases (Bigram Repetition)
        bigrams = [f"{words_lower[i]}_{words_lower[i+1]}" for i in range(len(words_lower) - 1)]
        repeated_bigrams = len(bigrams) - len(set(bigrams))
        repeated_bigrams_ratio = (repeated_bigrams / max(len(bigrams), 1)) if bigrams else 0.0

        # 6. Spelling & Darknet Slang
        slang_count = sum(word_freqs.get(s, 0) for s in SLANG_WORDS)
        slang_freq = slang_count / total_words

        # 7. Emoji / Special Symbols
        special_symbols = len(re.findall(r"[\*~#=\[\]\(\)<>_]{2,}|[^\w\s.,!?:;\"'-]", cleaned_text))
        emoji_symbol_freq = special_symbols / total_words

        # 8. Greetings & Closings
        first_50_words = set(words_lower[:min(30, len(words_lower))])
        last_50_words = set(words_lower[max(0, len(words_lower) - 30):])
        greeting_score = 1.0 if bool(first_50_words.intersection(GREETING_WORDS)) else 0.0
        closing_score = 1.0 if bool(last_50_words.intersection(CLOSING_WORDS)) else 0.0

        # 9. Technical Terms
        tech_count = sum(word_freqs.get(t, 0) for t in TECH_TERMS)
        tech_terms_freq = tech_count / total_words

        features: Dict[str, float] = {
            "char_count": float(total_chars),
            "word_count": float(total_words),
            "avg_sentence_len": avg_sentence_len,
            "avg_word_len": avg_word_len,
            "vocabulary_richness": vocabulary_richness,
            "ttr": vocabulary_richness,
            "yules_k": yules_k,
            "upper_ratio": upper_ratio,
            "digit_ratio": digit_ratio,
            "punct_ratio": punct_ratio,
            "exclamation_freq": exclamation_freq,
            "question_freq": question_freq,
            "comma_freq": comma_freq,
            "period_freq": period_freq,
            "colon_freq": colon_freq,
            "semicolon_freq": semicolon_freq,
            "titlecase_ratio": titlecase_ratio,
            "allcaps_word_freq": allcaps_word_freq,
            "repeated_bigrams_ratio": repeated_bigrams_ratio,
            "slang_freq": slang_freq,
            "emoji_symbol_freq": emoji_symbol_freq,
            "greeting_score": greeting_score,
            "closing_score": closing_score,
            "tech_terms_freq": tech_terms_freq,
        }

        # Function word distribution
        for fw in sorted(FUNCTION_WORDS):
            features[f"fw_{fw}"] = word_freqs[fw] / total_words

        return features

    @staticmethod
    def compute_similarity(f1: Dict[str, float], f2: Dict[str, float]) -> float:
        """Compute cosine similarity across two feature dictionaries."""
        all_keys = set(f1.keys()).union(set(f2.keys()))
        if not all_keys:
            return 0.0

        dot_product = 0.0
        norm1_sq = 0.0
        norm2_sq = 0.0

        for k in all_keys:
            v1 = f1.get(k, 0.0)
            v2 = f2.get(k, 0.0)
            dot_product += v1 * v2
            norm1_sq += v1 * v1
            norm2_sq += v2 * v2

        if norm1_sq == 0.0 or norm2_sq == 0.0:
            return 0.0

        sim = dot_product / (math.sqrt(norm1_sq) * math.sqrt(norm2_sq))
        return float(max(0.0, min(1.0, sim)))

    @classmethod
    def compute_tfidf_similarity(cls, text1: str, text2: str) -> float:
        """Compute character & word n-gram TF-IDF cosine similarity."""
        if not text1 or not text2:
            return 0.0
        if not HAS_SKLEARN:
            # Jaccard word set fallback
            s1 = set(text1.lower().split())
            s2 = set(text2.lower().split())
            union = len(s1.union(s2))
            return len(s1.intersection(s2)) / union if union > 0 else 0.0

        try:
            vectorizer = TfidfVectorizer(ngram_range=(1, 3), min_df=1, analyzer="word")
            matrix = vectorizer.fit_transform([text1, text2])
            sim = sk_cosine_similarity(matrix[0:1], matrix[1:2])[0][0]
            return float(max(0.0, min(1.0, sim)))
        except Exception:
            return 0.0

    @classmethod
    def compute_composite_stylometry_score(cls, text1: str, text2: str) -> Dict[str, Any]:
        """
        Stage 4 Stylometric Scoring:
        Combines:
        - Forensic Feature Vectors (40%)
        - TF-IDF N-grams (30%)
        - Dense SentenceTransformer Embeddings (30%)
        """
        if not text1 or not text2:
            return {
                "score": 0.0,
                "feature_similarity": 0.0,
                "tfidf_similarity": 0.0,
                "embedding_similarity": 0.0,
            }

        # 1. Feature Vector Cosine Similarity
        f1 = cls.extract_features(text1)
        f2 = cls.extract_features(text2)
        s_feature = cls.compute_similarity(f1, f2)

        # 2. TF-IDF Cosine Similarity
        s_tfidf = cls.compute_tfidf_similarity(text1, text2)

        # 3. Dense Neural Embedding Similarity
        try:
            e1 = EmbeddingService.encode(text1)[0]
            e2 = EmbeddingService.encode(text2)[0]
            s_embed = EmbeddingService.cosine_similarity(e1, e2)
        except Exception as err:
            logger.warning("Embedding similarity failed: %s", err)
            s_embed = s_tfidf

        # Weighted Composite Stylometric Score (Stage 4)
        composite_score = 0.40 * s_feature + 0.30 * s_tfidf + 0.30 * s_embed
        composite_score = float(max(0.0, min(1.0, composite_score)))

        return {
            "score": round(composite_score, 4),
            "feature_similarity": round(s_feature, 4),
            "tfidf_similarity": round(s_tfidf, 4),
            "embedding_similarity": round(s_embed, 4),
            "features_1": {k: round(v, 4) for k, v in list(f1.items())[:12]},
            "features_2": {k: round(v, 4) for k, v in list(f2.items())[:12]},
        }

    @classmethod
    def cosine_similarity(cls, f1: Dict[str, float], f2: Dict[str, float]) -> float:
        """Alias for compute_similarity for backwards compatibility."""
        return cls.compute_similarity(f1, f2)

    @classmethod
    def initialize_from_agora_csv(cls, agora_csv_path: Optional[str] = None, max_vendors: int = 1000) -> None:
        """Pre-compute stylometric baseline profiles from Agora CSV and MySQL database."""
        if cls._IS_INITIALIZED and len(cls._VENDOR_FINGERPRINTS) > 0:
            return

        csv_path = agora_csv_path or os.path.join(os.path.dirname(__file__), "..", "..", "data", "agora.csv")
        csv_path = os.path.abspath(csv_path)

        vendor_texts: Dict[str, List[str]] = {}

        if os.path.exists(csv_path):
            logger.info("Initializing stylometric signatures from %s...", csv_path)
            try:
                with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        clean_row = {k.strip(): (v or "").strip() for k, v in row.items() if k}
                        vendor = clean_row.get("Vendor") or clean_row.get("vendor") or clean_row.get("user_name")
                        desc = clean_row.get("Item Description") or clean_row.get("Item") or clean_row.get("description")
                        if vendor and desc:
                            if vendor not in vendor_texts:
                                vendor_texts[vendor] = []
                            vendor_texts[vendor].append(desc)

                for vendor, descs in list(vendor_texts.items())[:max_vendors]:
                    corpus = " \n ".join(descs[:20])
                    cls._VENDOR_FINGERPRINTS[vendor] = {
                        "features": cls.extract_features(corpus),
                        "corpus_sample": corpus[:500],
                        "listing_count": len(descs),
                    }

                cls._IS_INITIALIZED = True
                logger.info("Stylometric engine initialized with %d darknet vendor signatures.", len(cls._VENDOR_FINGERPRINTS))
            except Exception as e:
                logger.error("Failed to initialize stylometric signatures from CSV: %s", e)

        # Fallback to database vendor profiles if CSV yielded 0
        if len(cls._VENDOR_FINGERPRINTS) == 0:
            try:
                from database.connection import get_db_cursor
                with get_db_cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT v.user_name, vp.profile_description, vp.alias
                        FROM Vendors v
                        LEFT JOIN vendor_profile vp ON v.vendor_id = vp.vendor_id
                        WHERE vp.profile_description IS NOT NULL AND LENGTH(vp.profile_description) > 10
                        LIMIT %s;
                        """,
                        (max_vendors,),
                    )
                    rows = cursor.fetchall()
                    for r in rows:
                        v_name = r.get("user_name") or r.get("alias")
                        desc = r.get("profile_description")
                        if v_name and desc:
                            cls._VENDOR_FINGERPRINTS[v_name] = {
                                "features": cls.extract_features(desc),
                                "corpus_sample": desc[:500],
                                "listing_count": 1,
                            }
                if cls._VENDOR_FINGERPRINTS:
                    cls._IS_INITIALIZED = True
                    logger.info("Stylometric engine initialized with %d signatures from database.", len(cls._VENDOR_FINGERPRINTS))
            except Exception as dbe:
                logger.warning("Database fallback for stylometry failed: %s", dbe)

    @classmethod
    def initialize_from_csv(cls, agora_csv_path: Optional[str] = None, max_vendors: int = 1000) -> None:
        """Alias for initialize_from_agora_csv for backwards compatibility."""
        cls.initialize_from_agora_csv(agora_csv_path=agora_csv_path, max_vendors=max_vendors)

    @classmethod
    def attribute_vendor(cls, unknown_text: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Score unknown text against known vendor stylometric fingerprints and corpus.
        Combines TF-IDF vocabulary overlap (60%) with scale-invariant function word & style ratios (40%).
        """
        if not cls._IS_INITIALIZED or not cls._VENDOR_FINGERPRINTS:
            cls.initialize_from_agora_csv()

        if not cls._VENDOR_FINGERPRINTS or not unknown_text.strip():
            return []

        target_features = cls.extract_features(unknown_text)
        # Exclude raw scale-dependent counts from similarity vector
        filtered_target = {k: v for k, v in target_features.items() if k not in ("char_count", "word_count")}

        scored: List[Dict[str, Any]] = []

        for vendor, profile in cls._VENDOR_FINGERPRINTS.items():
            prof_filtered = {k: v for k, v in profile["features"].items() if k not in ("char_count", "word_count")}
            s_feature = cls.compute_similarity(filtered_target, prof_filtered)
            
            # TF-IDF Cosine similarity against vendor's listing corpus sample
            s_tfidf = cls.compute_tfidf_similarity(unknown_text, profile.get("corpus_sample", ""))
            
            # Composite Stylometry: 60% TF-IDF + 40% Functional Style
            composite = 0.60 * s_tfidf + 0.40 * s_feature if s_tfidf > 0 else (s_feature * 0.5)
            composite = float(max(0.0, min(1.0, composite)))

            if composite > 0.15 or s_tfidf > 0.05:
                scored.append({
                    "vendor": vendor,
                    "confidence_score": round(composite, 4),
                    "confidence_percentage": round(composite * 100, 1),
                    "listing_count": profile["listing_count"],
                    "tfidf_score": round(s_tfidf, 4),
                })

        scored.sort(key=lambda x: (x["tfidf_score"], x["confidence_score"]), reverse=True)
        return scored[:top_k]

    @classmethod
    def match_author(cls, unknown_text: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Alias for attribute_vendor for backwards compatibility."""
        return cls.attribute_vendor(unknown_text, top_k=top_k)

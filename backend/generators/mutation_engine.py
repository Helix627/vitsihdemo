"""Identity Mutation and Listing Paraphrase Engine."""

from __future__ import annotations

import base64
import hashlib
import random
import re
import string
from typing import Any, Dict, List, Optional, Tuple

from faker import Faker
from .config import GeneratorConfig


class MutationEngine:
    """Provides realistic identity mutations, synthetic cryptographic artifacts, and listing paraphrasing."""

    def __init__(self, config: Optional[GeneratorConfig] = None):
        self.config = config or GeneratorConfig()
        self.faker = Faker()
        Faker.seed(self.config.random_seed)
        random.seed(self.config.random_seed)

        self.COUNTRY_CODES = ["UK", "US", "NL", "DE", "AU", "EU", "CA", "FR", "ES", "CH"]
        self.BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
        self.BECH32_ALPHABET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"

        # Paraphrase replacement dictionaries for darknet listing synthesis
        self.TITLE_PREFIXES = ["100% Pure", "Top Grade", "High Quality", "Premium", "Direct Source", "Verified", "HQ", "Ultra Clean", "Custom", "Exclusive"]
        self.TITLE_SUFFIXES = ["[Fast Shipping]", "[Escrow Ready]", "[24/7 Auto Dispatch]", "[Original Batch]", "[Worldwide Stealth]", "[Tracked]", "[Purity Tested]"]

        self.DESC_TEMPLATES = [
            "We are back on {market} offering our verified {item}. Guaranteed {purity} quality and stealth packaging. Contact via PGP for bulk orders.",
            "Welcome to our official {market} shop! {item} ready for instant dispatch. Double vacuum sealed, professional MBB stealth. 99% delivery rate across {dest}.",
            "Premium {item} sourced directly from verified labs. Fast, reliable service. Please include your PGP encrypted address when ordering.",
            "{item} available now. All orders dispatched within 24 hours of payment confirmation. Domestic and international stealth available.",
            "High purity {item} at competitive market prices. Fully tested batch. Customer satisfaction is our top priority.",
        ]

    # ----------------------------------------------------------------------
    # 1. Alias Mutation
    # ----------------------------------------------------------------------

    def mutate_alias(self, original_alias: str) -> Tuple[str, str]:
        """
        Mutate a vendor alias based on weighted historical migration patterns.
        Returns: (mutated_alias, mutation_type)
        """
        if not original_alias or len(original_alias.strip()) == 0:
            original_alias = self.faker.user_name()

        weights = self.config.ALIAS_MUTATION_WEIGHTS
        mutation_types = list(weights.keys())
        probabilities = list(weights.values())

        chosen_type = random.choices(mutation_types, weights=probabilities, k=1)[0]

        if chosen_type == "identical":
            return original_alias, "identical"

        clean = re.sub(r"[^\w\s-]", "", original_alias).strip()

        if chosen_type == "appended_numbers":
            suffixes = [
                str(random.randint(10, 99)),
                str(random.randint(100, 999)),
                str(random.choice([2015, 2016, 2017, 2018, 77, 88, 99, 420])),
            ]
            sep = random.choice(["", "_", "-"])
            mutated = f"{clean}{sep}{random.choice(suffixes)}"
            return mutated[:32], "appended_numbers"

        elif chosen_type == "country_suffixes":
            code = random.choice(self.COUNTRY_CODES)
            sep = random.choice(["_", "", "-"])
            mutated = f"{clean}{sep}{code}"
            return mutated[:32], "country_suffixes"

        elif chosen_type == "underscores":
            if " " in clean:
                mutated = clean.replace(" ", "_")
            elif "_" in clean:
                mutated = f"_{clean}_"
            else:
                mid = len(clean) // 2
                mutated = f"{clean[:mid]}_{clean[mid:]}"
            return mutated[:32], "underscores"

        elif chosen_type == "abbreviations":
            prefixes = ["vdr_", "drk_", "vendor_", "official_"]
            mutated = f"{random.choice(prefixes)}{clean[:12]}"
            return mutated[:32], "abbreviations"

        elif chosen_type == "camelCase":
            words = re.split(r"[\s_-]+", clean)
            if len(words) > 1:
                mutated = words[0].lower() + "".join(w.capitalize() for w in words[1:])
            else:
                mutated = clean[0].lower() + clean[1:].capitalize() if len(clean) > 1 else clean.lower()
            return mutated[:32], "camelCase"

        elif chosen_type == "keyboard_typos":
            chars = list(clean)
            if len(chars) >= 4:
                idx = random.randint(1, len(chars) - 2)
                # Swap adjacent
                chars[idx], chars[idx + 1] = chars[idx + 1], chars[idx]
                mutated = "".join(chars)
            else:
                mutated = f"{clean}z"
            return mutated[:32], "keyboard_typos"

        elif chosen_type == "shortened_names":
            if len(clean) > 6:
                mutated = clean[:random.randint(4, len(clean) - 2)]
            else:
                mutated = clean
            return mutated[:32], "shortened_names"

        return original_alias, "identical"

    # ----------------------------------------------------------------------
    # 2. Bitcoin Wallet Generation
    # ----------------------------------------------------------------------

    def generate_bitcoin_wallet(self) -> str:
        """Generate a realistic synthetic Bitcoin address (Legacy 1..., P2SH 3..., or Segwit bc1...)."""
        addr_type = random.choices(["legacy", "p2sh", "bech32"], weights=[0.50, 0.35, 0.15], k=1)[0]

        if addr_type == "legacy":
            body = "".join(random.choices(self.BASE58_ALPHABET, k=random.randint(26, 33)))
            return f"1{body}"
        elif addr_type == "p2sh":
            body = "".join(random.choices(self.BASE58_ALPHABET, k=random.randint(26, 33)))
            return f"3{body}"
        else:
            body = "".join(random.choices(self.BECH32_ALPHABET, k=38))
            return f"bc1q{body}"

    # ----------------------------------------------------------------------
    # 3. PGP Key & Armored Block Generation
    # ----------------------------------------------------------------------

    def generate_pgp_key(self, alias: str, email: Optional[str] = None) -> Tuple[str, str, bytes]:
        """
        Generate a synthetic 40-character uppercase hexadecimal PGP fingerprint,
        a 16-character short fingerprint, and an ASCII-armored PGP public key block.
        Returns: (fingerprint_40hex, fingerprint_short16, public_key_bytes)
        """
        raw_seed = f"{alias}_{email or ''}_{random.random()}_{random.randint(100000, 999999)}"
        sha = hashlib.sha1(raw_seed.encode("utf-8")).hexdigest().upper()
        fingerprint = sha.zfill(40)[:40]
        fingerprint_f = f"0x{fingerprint[-16:]}"

        # Generate realistic Base64 armored PGP body
        random_payload = base64.b64encode(hashlib.sha256(raw_seed.encode("utf-8")).digest() * 8).decode("ascii")
        # Format into 64-char lines
        lines = [random_payload[i:i+64] for i in range(0, len(random_payload), 64)]
        payload_body = "\r\n".join(lines)

        user_id_str = f"{alias} <{email}>" if email else alias
        checksum = base64.b64encode(hashlib.sha1(raw_seed.encode()).digest()[:3]).decode("ascii")

        armored_text = (
            "-----BEGIN PGP PUBLIC KEY BLOCK-----\r\n"
            "Version: GnuPG v2.0.22 (GNU/Linux)\r\n\r\n"
            f"mQENBF{fingerprint[:6]}ABCAC{payload_body}\r\n"
            f"={checksum}\r\n"
            "-----END PGP PUBLIC KEY BLOCK-----"
        )

        return fingerprint, fingerprint_f, armored_text.encode("utf-8")

    # ----------------------------------------------------------------------
    # 4. Email Generation
    # ----------------------------------------------------------------------

    def generate_privacy_email(self, alias: str) -> str:
        """Generate a realistic privacy-oriented darknet vendor email address."""
        clean_alias = re.sub(r"[^\w]", "", alias).lower()
        if not clean_alias:
            clean_alias = self.faker.user_name().lower()

        domain = random.choice(self.config.PRIVACY_EMAIL_DOMAINS)
        variants = [
            f"{clean_alias}@{domain}",
            f"{clean_alias}_{random.randint(10, 99)}@{domain}",
            f"{clean_alias}.official@{domain}",
            f"{clean_alias}_orders@{domain}",
            f"vendor.{clean_alias}@{domain}",
        ]
        return random.choice(variants)

    # ----------------------------------------------------------------------
    # 5. Listing Paraphrasing & Synthesis
    # ----------------------------------------------------------------------

    def synthesize_listing(
        self,
        base_item: str,
        base_desc: str,
        category: str,
        base_price_btc: float,
        base_rating: float,
        origin: str,
        destination: str,
        target_market: str,
        vendor_alias: str,
    ) -> Dict[str, Any]:
        """
        Paraphrase title and description, vary price within ±20%, vary rating within ±0.2.
        """
        # 1. Title variation
        clean_item = base_item.strip() if base_item else "Specialty Vendor Product"
        prefix = random.choice(self.TITLE_PREFIXES) if random.random() < 0.40 else ""
        suffix = random.choice(self.TITLE_SUFFIXES) if random.random() < 0.40 else ""
        
        synth_title = f"{prefix} {clean_item} {suffix}".strip()
        synth_title = re.sub(r"\s+", " ", synth_title)

        # 2. Description variation
        desc_template = random.choice(self.DESC_TEMPLATES)
        purity_term = random.choice(["99%", "high grade", "lab tested", "premium", "top tier"])
        dest_term = destination if destination else "worldwide"
        synth_desc = desc_template.format(
            market=target_market,
            item=clean_item,
            purity=purity_term,
            dest=dest_term,
        )

        # 3. Price variation (±20%)
        price_factor = random.uniform(0.80, 1.20)
        synth_price = max(0.0001, base_price_btc * price_factor)

        # 4. Rating variation (±0.2, bounded in [1.0, 5.0])
        rating_delta = random.uniform(-0.20, 0.20)
        synth_rating = max(1.0, min(5.0, base_rating + rating_delta))

        return {
            "Vendor": vendor_alias,
            "Category": category,
            "Item": synth_title,
            "Item Description": synth_desc,
            "Price": f"{synth_price:.6f} BTC",
            "Price_Num": synth_price,
            "Origin": origin if origin else "USA",
            "Destination": destination if destination else "Worldwide",
            "Rating": f"{synth_rating:.2f}/5",
            "Rating_Num": synth_rating,
            "Remarks": "",
        }

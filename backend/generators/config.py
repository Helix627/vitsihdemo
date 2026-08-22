"""Configuration for Synthetic Marketplace Data Generation."""

from dataclasses import dataclass, field
from typing import Dict, List


@dataclass
class GeneratorConfig:
    """Configurable parameters for historical marketplace vendor migration simulation."""

    # Reproducibility
    random_seed: int = 42

    # Marketplaces
    MARKETPLACES: Dict[str, Dict] = field(default_factory=lambda: {
        "Agora": {
            "market_id": 1,
            "domain": "agorahooawayyfoe.onion",
            "active_span": (1399775743, 1441549200),  # ~2014 - late 2015
        },
        "ShadowBay": {
            "market_id": 101,
            "domain": "shadowbay7nxqp2a.onion",
            "active_span": (1441550000, 1490000000),  # ~late 2015 - early 2017
        },
        "NightMarket": {
            "market_id": 102,
            "domain": "nightmkt3yvwz89.onion",
            "active_span": (1470000000, 1530000000),  # ~2016 - 2018
        },
    })

    # Migration Probabilities
    PROB_SHADOWBAY_TOTAL: float = 0.60    # 60% of Agora vendors migrate to ShadowBay
    PROB_NIGHTMARKET_TOTAL: float = 0.35  # 35% migrate to NightMarket
    PROB_BOTH_MARKETS: float = 0.20       # 20% appear in both ShadowBay & NightMarket
    PROB_DISAPPEAR: float = 0.15          # 15% disappear completely

    # New Vendors Count per market
    NEW_VENDORS_PER_MARKET: int = 25

    # PGP Reuse Probabilities
    PGP_PROBS: Dict[str, float] = field(default_factory=lambda: {
        "reuse": 0.50,
        "rotate": 0.25,
        "none": 0.25,
    })

    # Bitcoin Wallet Reuse Probabilities
    WALLET_PROBS: Dict[str, float] = field(default_factory=lambda: {
        "reuse": 0.40,
        "new": 0.30,
        "none": 0.30,
    })

    # Email Reuse Probabilities
    EMAIL_PROBS: Dict[str, float] = field(default_factory=lambda: {
        "reuse": 0.30,
        "new": 0.30,
        "none": 0.40,
    })

    # Alias Mutation Types & Weights
    ALIAS_MUTATION_WEIGHTS: Dict[str, float] = field(default_factory=lambda: {
        "identical": 0.30,          # Keeps exact same alias
        "appended_numbers": 0.15,   # trader -> trader99, trader_2026
        "country_suffixes": 0.15,   # trader -> trader_UK, traderNL
        "underscores": 0.10,        # trader -> tra_der, _trader_
        "abbreviations": 0.08,      # vendor_mike -> vdr_mike
        "camelCase": 0.08,          # dark_trader -> darkTrader
        "keyboard_typos": 0.08,     # trader -> trder, traderz
        "shortened_names": 0.06,    # Dr_Mephistopheles -> dr_meph
    })

    # Privacy Email Domains
    PRIVACY_EMAIL_DOMAINS: List[str] = field(default_factory=lambda: [
        "protonmail.com",
        "proton.me",
        "cock.li",
        "tutanota.com",
        "torbox364.onion",
        "onionmail.org",
        "safe-mail.net",
        "mail2tor.com",
        "elude.in",
        "secmail.pro",
    ])

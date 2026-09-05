"""Autonomous Intelligence Collection & Background Ingestion Daemon."""

from __future__ import annotations

import random
import threading
import time
from typing import Any, Dict, List, Optional
from core.logging import logger
from services.evolution_engine import EvolutionEngine

# Simulated High-Reliability Darknet Feed Sources (NTRO autonomous ingestion)
SIMULATED_DARKNET_FEEDS = [
    {
        "source": "Dread Forum Darknet Leak #884",
        "feed_type": "FORUM_THREAD",
        "text": "Vendor MagicHat here. For bulk orders or encrypted inquiries, my primary bitcoin address remains 1LPiyimWVLtWHJkvgGcvY8mKjZwpVgyaz. Guaranteed 24-hour dispatch worldwide with vacuum stealth.",
        "author": "MagicHat_Official",
    },
    {
        "source": "Telegram Russian Darknet Market Channel @dark_leak_ru",
        "feed_type": "TELEGRAM_MONITOR",
        "text": "ATTENTION: New inventory drop! PGP fingerprint verified: 9F8E 7D6C 5B4A 3210. Official contact at vendor_mike@protonmail.com or Monero payment address 44AFFq5kSiGBoZ4NMDwYtN18obc8AemS33DBLWs3H7otXft3XjrpDtQGeiSTHzFcubDZmCo96hUoWDL14PBBCHnoFXcDpTX.",
        "author": "VdrMike_Auto",
    },
    {
        "source": "DeepWeb Pastebin Monitor #419",
        "feed_type": "PASTEBIN_SCRAPER",
        "text": "Dossier update on syndicate operations. Threat actor operating across Agora and ShadowBay using altered handle ShadowTrader99. Linguistic style and Yule's K index confirm high probability author match.",
        "author": "AnonScraper",
    },
    {
        "source": "Exploit.in Underground Exchange Alert",
        "feed_type": "MARKET_LISTING",
        "text": "Offering authenticated credentials and access keys. Escrow accepted in Bitcoin (1b2cToQTkrmsDUUDeP6YDAK34wXuQ). Verified reviews on Agora and NightMarket.",
        "author": "CryptoBroker_X",
    },
    {
        "source": "Tor Hidden Service Crawler Node #12",
        "feed_type": "ONION_CRAWLER",
        "text": "Automated crawl discovered new vendor storefront on .onion network. Public key matches known seller. Inquiries routed to cryptovendor@torbox364.onion.",
        "author": "OnionCrawler_Bot",
    },
]


class AutonomousCollector:
    """
    Continuous Autonomous Intelligence Ingestion Engine.
    Periodically scans high-quality dark web feeds and submits intelligence
    payloads into the 5-stage Evolution Pipeline.
    """

    _INSTANCE: Optional[AutonomousCollector] = None
    _LOCK = threading.Lock()

    def __init__(self, interval_seconds: int = 45):
        self.interval = interval_seconds
        self.is_running = False
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()

        self.last_scan_ts: Optional[int] = None
        self.total_feeds_scanned: int = 0
        self.auto_merged_count: int = 0
        self.review_queued_count: int = 0
        self.new_clusters_count: int = 0

        self.event_log: List[Dict[str, Any]] = []
        self._max_log_size = 20

    @classmethod
    def get_instance(cls) -> AutonomousCollector:
        with cls._LOCK:
            if cls._INSTANCE is None:
                cls._INSTANCE = AutonomousCollector()
            return cls._INSTANCE

    def start(self):
        """Start the background autonomous daemon thread."""
        with self._LOCK:
            if self.is_running:
                return
            self.is_running = True
            self._stop_event.clear()
            self._thread = threading.Thread(target=self._run_loop, daemon=True, name="AutonomousCTIDaemon")
            self._thread.start()
            logger.info("Autonomous Intelligence Collector started (interval=%ds).", self.interval)

    def stop(self):
        """Stop the background autonomous daemon thread."""
        with self._LOCK:
            if not self.is_running:
                return
            self.is_running = False
            self._stop_event.set()
            logger.info("Autonomous Intelligence Collector paused.")

    def _run_loop(self):
        # Initial short delay on app startup before first background pulse
        time.sleep(10)
        while not self._stop_event.is_set():
            try:
                self.trigger_pulse()
            except Exception as err:
                logger.error("Error during autonomous ingestion pulse: %s", err)

            self._stop_event.wait(self.interval)

    def trigger_pulse(self) -> Dict[str, Any]:
        """Execute a single autonomous threat intelligence scan cycle."""
        feed_item = random.choice(SIMULATED_DARKNET_FEEDS)
        now_ts = int(time.time())
        self.last_scan_ts = now_ts
        self.total_feeds_scanned += 1

        payload = {
            "source": feed_item["source"],
            "raw_text": feed_item["text"],
            "analyst_id": "AUTONOMOUS_DAEMON_BOT",
        }

        try:
            result = EvolutionEngine.ingest_submission(payload)
            action = result.get("action", "PROCESSED")
            confidence = float(result.get("confidence", 0.0))

            if action == "ENRICHED_EXISTING":
                self.auto_merged_count += 1
                status = "AUTO_MERGED"
            elif action == "SUGGESTION_CREATED":
                self.review_queued_count += 1
                status = "QUEUED_FOR_REVIEW"
            else:
                self.new_clusters_count += 1
                status = "NEW_CLUSTER_CREATED"

            event = {
                "id": f"scan-{now_ts}-{self.total_feeds_scanned}",
                "timestamp": now_ts,
                "source": feed_item["source"],
                "feed_type": feed_item["feed_type"],
                "status": status,
                "action": action,
                "confidence": confidence,
                "reason": result.get("reason", "Autonomous intelligence resolution pulse completed."),
                "affected_vendor_id": result.get("affected_vendor_id"),
            }

            self.event_log.insert(0, event)
            if len(self.event_log) > self._max_log_size:
                self.event_log = self.event_log[:self._max_log_size]

            logger.info(
                "Autonomous Collector processed feed '%s' -> %s (conf=%.2f)",
                feed_item["source"], status, confidence
            )
            return event
        except Exception as err:
            logger.error("Failed to process autonomous feed: %s", err)
            return {"error": str(err), "source": feed_item["source"]}

    def get_status(self) -> Dict[str, Any]:
        """Return real-time state of the autonomous engine."""
        return {
            "is_running": self.is_running,
            "interval_seconds": self.interval,
            "last_scan_ts": self.last_scan_ts,
            "total_feeds_scanned": self.total_feeds_scanned,
            "auto_merged_count": self.auto_merged_count,
            "review_queued_count": self.review_queued_count,
            "new_clusters_count": self.new_clusters_count,
            "recent_events": self.event_log[:8],
        }

"""Tor Hidden Service Misconfiguration & Clearnet Origin Attribution Engine."""

from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, List, Optional, Set, Tuple

from core.database import get_db_cursor
from core.logging import logger

REGEX_CLEAN_IPV4 = re.compile(
    r"\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b"
)
REGEX_ONION_ADDR = re.compile(r"\b[a-z2-7]{16,56}\.onion\b", re.IGNORECASE)
REGEX_CLEARNET_DOMAIN = re.compile(
    r"\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+(?!onion\b)[a-zA-Z]{2,}\b"
)
REGEX_SHA256_FINGERPRINT = re.compile(r"\b[0-9A-Fa-f]{64}\b|\b(?:[0-9A-Fa-f]{2}:){31}[0-9A-Fa-f]{2}\b")


class InfrastructureService:
    """
    Forensic analysis and attribution engine for Tor hidden service misconfigurations:
    - Exposed Apache / Nginx / Lighttpd / server-status & server-info pages.
    - SSL/TLS certificate transparency, SAN leaks, and fingerprint correlation.
    - Favicon MurmurHash3 indexing against Shodan/Censys.
    - Unique HTTP ETags and banner headers.
    - Multi-indicator clearnet origin server attribution scoring.
    """

    INDICATOR_WEIGHTS: Dict[str, float] = {
        "SERVER_STATUS": 0.85,
        "SSL_SAN": 0.80,
        "FAVICON_MMH3": 0.45,
        "ETAG": 0.40,
        "HEADER_BANNER": 0.35,
        "CLOCK_SKEW": 0.30,
    }

    _IS_INITIALIZED: bool = False

    @classmethod
    def parse_server_status_page(cls, raw_content: str) -> Dict[str, Any]:
        """
        Parses raw HTML or plain-text Apache mod_status / server-status page.
        Extracts:
        - Leaked VirtualHosts / ServerNames
        - Leaked Clearnet IPv4 addresses
        - Server Version & Uptime
        - Active worker requests
        """
        if not raw_content or not raw_content.strip():
            return {"is_exposed": False, "leaked_ips": [], "leaked_domains": []}

        content = raw_content.strip()
        is_mod_status = any(
            k in content.lower()
            for k in (
                "apache server status",
                "total accesses:",
                "uptime:",
                "server uptime:",
                "server version:",
                "cpuload:",
                "busyworkers:",
                "idleworkers:",
                "scoreboard:",
            )
        )

        if not is_mod_status:
            return {"is_exposed": False, "leaked_ips": [], "leaked_domains": []}

        # 1. Extract IPv4 addresses (excluding 127.0.0.1, 0.0.0.0, and standard loopback)
        raw_ips = REGEX_CLEAN_IPV4.findall(content)
        filtered_ips = [
            ip for ip in set(raw_ips)
            if not ip.startswith("127.") and ip != "0.0.0.0" and not ip.startswith("10.") and not ip.startswith("192.168.")
        ]

        # 2. Extract Clearnet domains (excluding standard vendor / internal names)
        raw_domains = REGEX_CLEARNET_DOMAIN.findall(content)
        filtered_domains = [
            d.lower() for d in set(raw_domains)
            if d.lower() not in ("apache.org", "w3.org", "schema.org", "ubuntu.com", "debian.org")
            and not d.endswith(".onion")
        ]

        # 3. Extract Server banner
        server_banner = None
        m_banner = re.search(r"Server Version:\s*([^\r\n<]+)", content, re.IGNORECASE)
        if m_banner:
            server_banner = m_banner.group(1).strip()

        # 4. Extract Uptime
        uptime = None
        m_uptime = re.search(r"Server Uptime:\s*([^\r\n<]+)", content, re.IGNORECASE)
        if m_uptime:
            uptime = m_uptime.group(1).strip()

        # 5. Extract VirtualHost
        vhost = None
        m_vhost = re.search(r"VirtualHost:\s*([^\r\n<]+)", content, re.IGNORECASE)
        if m_vhost:
            vhost = m_vhost.group(1).strip()
            if vhost and vhost not in filtered_domains and not vhost.endswith(".onion"):
                filtered_domains.append(vhost)

        return {
            "is_exposed": True,
            "server_banner": server_banner,
            "server_uptime": uptime,
            "virtual_host": vhost,
            "leaked_ips": sorted(filtered_ips),
            "leaked_domains": sorted(filtered_domains),
            "raw_snippet": content[:400],
        }

    @classmethod
    def match_ssl_certificate(cls, cert_info: Dict[str, Any] | str) -> Dict[str, Any]:
        """
        Evaluates TLS/SSL certificate metadata.
        Detects clearweb domain leaks in Subject CN or SAN (Subject Alternative Name) fields.
        """
        if isinstance(cert_info, str):
            # Parse text representation
            sans = REGEX_CLEARNET_DOMAIN.findall(cert_info)
            fp_match = REGEX_SHA256_FINGERPRINT.search(cert_info)
            fp = fp_match.group(0) if fp_match else None
            return {
                "has_clearnet_san": len(sans) > 0,
                "san_domains": sorted(list(set(sans))),
                "fingerprint_sha256": fp,
                "confidence_score": 0.95 if sans else 0.0,
            }

        san_entries = cert_info.get("san_entries") or cert_info.get("sans") or []
        if isinstance(san_entries, str):
            san_entries = [san_entries]

        clearnet_sans = [
            s.replace("DNS:", "").strip() for s in san_entries
            if not s.lower().endswith(".onion") and "." in s
        ]

        cn = cert_info.get("cn") or cert_info.get("common_name") or ""
        if cn and not cn.lower().endswith(".onion") and "." in cn and cn not in clearnet_sans:
            clearnet_sans.append(cn)

        fingerprint = cert_info.get("sha256_fingerprint") or cert_info.get("fingerprint")

        return {
            "has_clearnet_san": len(clearnet_sans) > 0,
            "san_domains": sorted(clearnet_sans),
            "common_name": cn,
            "fingerprint_sha256": fingerprint,
            "issuer": cert_info.get("issuer"),
            "confidence_score": 0.97 if clearnet_sans else 0.40,
        }

    @classmethod
    def compute_attribution_score(
        cls, indicators: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculates multi-attribute composite origin attribution confidence score (0.0 to 1.0)
        using saturating multi-attribute risk accumulation:
        C = 1 - PROD(1 - w(i))
        """
        if not indicators:
            return {
                "score": 0.0,
                "confidence_percentage": 0.0,
                "threat_level": "UNKNOWN",
                "dominant_indicator": None,
                "indicators_count": 0,
            }

        compounding_term = 1.0
        applied_weights = []

        for ind in indicators:
            itype = (ind.get("type") or ind.get("indicator_type") or "").upper()
            w = cls.INDICATOR_WEIGHTS.get(itype, 0.15)
            custom_score = float(ind.get("confidence_score") or ind.get("confidence") or 1.0)
            effective_weight = w * custom_score
            compounding_term *= (1.0 - min(0.99, effective_weight))
            applied_weights.append((itype, effective_weight))

        composite_score = float(max(0.0, min(1.0, 1.0 - compounding_term)))
        conf_pct = round(composite_score * 100.0, 2)

        if composite_score >= 0.90:
            threat_level = "CONFIRMED"
        elif composite_score >= 0.75:
            threat_level = "HIGH_PROBABILITY"
        elif composite_score >= 0.50:
            threat_level = "SUSPECTED"
        else:
            threat_level = "LOW"

        # Dominant indicator
        dom = max(applied_weights, key=lambda x: x[1])[0] if applied_weights else None

        return {
            "score": round(composite_score, 4),
            "confidence_percentage": conf_pct,
            "threat_level": threat_level,
            "dominant_indicator": dom,
            "indicators_count": len(indicators),
        }

    @classmethod
    def initialize_from_json(cls, json_path: Optional[str] = None) -> int:
        """
        Seeds OnionServices, InfrastructureIndicators, and VendorInfrastructureMap
        from data/tor_infrastructure.json into the active MySQL database.
        """
        if cls._IS_INITIALIZED:
            return 0

        target_path = json_path or os.path.join(os.path.dirname(__file__), "..", "..", "data", "tor_infrastructure.json")
        target_path = os.path.abspath(target_path)

        if not os.path.exists(target_path):
            logger.warning("Tor infrastructure dataset not found at %s.", target_path)
            return 0

        logger.info("Seeding Tor Infrastructure Intelligence from %s...", target_path)

        try:
            with open(target_path, "r", encoding="utf-8") as f:
                records = json.load(f)

            if not records or not isinstance(records, list):
                return 0

            count_seeded = 0

            with get_db_cursor() as cursor:
                for rec in records:
                    onion = rec.get("onion_address", "").strip()
                    if not onion:
                        continue

                    title = rec.get("title")
                    banner = rec.get("server_banner")
                    fav = rec.get("favicon_hash")
                    status_exp = 1 if rec.get("status_page_exposed") else 0
                    ssl_en = 1 if rec.get("ssl_enabled") else 0
                    origin_ip = rec.get("discovered_origin_ip")
                    conf = float(rec.get("attribution_confidence", 0.0))
                    threat = rec.get("threat_level", "SUSPECTED")

                    # 1. Upsert OnionServices
                    cursor.execute(
                        """
                        INSERT INTO OnionServices (
                            onion_address, title, server_banner, favicon_hash,
                            status_page_exposed, ssl_enabled, discovered_origin_ip,
                            attribution_confidence, threat_level
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON DUPLICATE KEY UPDATE
                            title = VALUES(title),
                            server_banner = VALUES(server_banner),
                            favicon_hash = VALUES(favicon_hash),
                            status_page_exposed = VALUES(status_page_exposed),
                            ssl_enabled = VALUES(ssl_enabled),
                            discovered_origin_ip = VALUES(discovered_origin_ip),
                            attribution_confidence = VALUES(attribution_confidence),
                            threat_level = VALUES(threat_level),
                            service_id = LAST_INSERT_ID(service_id);
                        """,
                        (onion, title, banner, fav, status_exp, ssl_en, origin_ip, conf, threat),
                    )
                    service_id = cursor.lastrowid
                    if not service_id:
                        cursor.execute("SELECT service_id FROM OnionServices WHERE onion_address = %s LIMIT 1;", (onion,))
                        row = cursor.fetchone()
                        service_id = row["service_id"] if row else 0

                    # 2. Insert Indicators
                    indicators = rec.get("indicators", [])
                    for ind in indicators:
                        itype = ind.get("type", "MISCONFIGURATION")
                        ival = ind.get("value", "")
                        cip = ind.get("clearnet_ip")
                        cdom = ind.get("clearnet_domain")
                        c_score = float(ind.get("confidence_score", 1.0))
                        asn = ind.get("asn")
                        isp = ind.get("isp")
                        country = ind.get("country")
                        ev = ind.get("evidence", {})

                        cursor.execute(
                            """
                            INSERT INTO InfrastructureIndicators (
                                service_id, indicator_type, indicator_value,
                                clearnet_ip, clearnet_domain, confidence_score,
                                asn, isp, country, evidence
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                            """,
                            (
                                service_id,
                                itype,
                                ival,
                                cip,
                                cdom,
                                c_score,
                                asn,
                                isp,
                                country,
                                json.dumps(ev),
                            ),
                        )

                    # 3. Link to Vendor if present
                    linked_vid = rec.get("linked_vendor_id")
                    if linked_vid:
                        cursor.execute(
                            """
                            INSERT IGNORE INTO VendorInfrastructureMap (
                                vendor_id, service_id, source_table, confidence_score
                            ) VALUES (%s, %s, 'tor_infrastructure_feed', %s);
                            """,
                            (linked_vid, service_id, conf),
                        )

                    count_seeded += 1

            cls._IS_INITIALIZED = True
            logger.info("Successfully seeded %d Tor hidden service infrastructure records.", count_seeded)
            return count_seeded

        except Exception as err:
            logger.error("Failed seeding Tor infrastructure dataset: %s", err)
            return 0

    @classmethod
    def get_all_services(cls, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """Fetch all analyzed hidden services with indicator summaries and vendor linkages."""
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT 
                    os.service_id, os.onion_address, os.title, os.server_banner,
                    os.favicon_hash, os.status_page_exposed, os.ssl_enabled,
                    os.discovered_origin_ip, os.attribution_confidence, os.threat_level,
                    os.first_discovered, os.last_scanned,
                    v.vendor_id, v.user_name AS linked_vendor_name,
                    COUNT(ii.indicator_id) AS indicators_count
                FROM OnionServices os
                LEFT JOIN VendorInfrastructureMap vim ON os.service_id = vim.service_id
                LEFT JOIN Vendors v ON vim.vendor_id = v.vendor_id
                LEFT JOIN InfrastructureIndicators ii ON os.service_id = ii.service_id
                GROUP BY os.service_id, v.vendor_id
                ORDER BY os.attribution_confidence DESC, os.service_id ASC
                LIMIT %s OFFSET %s;
                """,
                (limit, offset),
            )
            rows = cursor.fetchall()
            for r in rows:
                r["attribution_percentage"] = round(float(r["attribution_confidence"]) * 100, 1)
                r["status_page_exposed"] = bool(r["status_page_exposed"])
                r["ssl_enabled"] = bool(r["ssl_enabled"])
            return rows

    @classmethod
    def get_service_detail(cls, service_id: int) -> Optional[Dict[str, Any]]:
        """Fetch full service dossier including all discovered clearnet indicators and evidence."""
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT 
                    os.*, 
                    v.vendor_id, v.user_name AS linked_vendor_name
                FROM OnionServices os
                LEFT JOIN VendorInfrastructureMap vim ON os.service_id = vim.service_id
                LEFT JOIN Vendors v ON vim.vendor_id = v.vendor_id
                WHERE os.service_id = %s
                LIMIT 1;
                """,
                (service_id,),
            )
            service = cursor.fetchone()
            if not service:
                return None

            cursor.execute(
                """
                SELECT * FROM InfrastructureIndicators
                WHERE service_id = %s
                ORDER BY confidence_score DESC;
                """,
                (service_id,),
            )
            indicators = cursor.fetchall()
            for ind in indicators:
                if isinstance(ind.get("evidence"), str):
                    try:
                        ind["evidence"] = json.loads(ind["evidence"])
                    except Exception:
                        pass

            service["indicators"] = indicators
            service["attribution_percentage"] = round(float(service["attribution_confidence"]) * 100, 1)
            service["status_page_exposed"] = bool(service["status_page_exposed"])
            service["ssl_enabled"] = bool(service["ssl_enabled"])

            return service

    @classmethod
    def correlate_query(cls, query: str) -> Dict[str, Any]:
        """
        Searches across onion addresses, clearnet origin IPs, domains, and ASN/ISPs.
        Returns matched hidden services and associated threat actors.
        """
        if not query or not query.strip():
            return {"matches": [], "query": query}

        q = f"%{query.strip().lower()}%"

        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT DISTINCT
                    os.service_id, os.onion_address, os.title, os.discovered_origin_ip,
                    os.attribution_confidence, os.threat_level,
                    ii.indicator_type, ii.clearnet_ip, ii.clearnet_domain, ii.isp, ii.country,
                    v.vendor_id, v.user_name AS linked_vendor_name
                FROM OnionServices os
                LEFT JOIN InfrastructureIndicators ii ON os.service_id = ii.service_id
                LEFT JOIN VendorInfrastructureMap vim ON os.service_id = vim.service_id
                LEFT JOIN Vendors v ON vim.vendor_id = v.vendor_id
                WHERE LOWER(os.onion_address) LIKE %s
                   OR LOWER(COALESCE(os.discovered_origin_ip, '')) LIKE %s
                   OR LOWER(COALESCE(ii.clearnet_ip, '')) LIKE %s
                   OR LOWER(COALESCE(ii.clearnet_domain, '')) LIKE %s
                   OR LOWER(COALESCE(ii.isp, '')) LIKE %s
                   OR LOWER(COALESCE(v.user_name, '')) LIKE %s
                LIMIT 25;
                """,
                (q, q, q, q, q, q),
            )
            rows = cursor.fetchall()
            for r in rows:
                r["attribution_percentage"] = round(float(r["attribution_confidence"]) * 100, 1)

            return {
                "query": query.strip(),
                "matches_count": len(rows),
                "matches": rows,
            }

    @classmethod
    def ingest_live_scan(cls, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Ingests a raw scan result payload for a `.onion` service,
        parses all misconfigurations, computes origin attribution score, and saves to database.
        """
        onion = payload.get("onion_address") or payload.get("onion") or payload.get("url") or ""
        onion_match = REGEX_ONION_ADDR.search(onion)
        clean_onion = onion_match.group(0).lower() if onion_match else onion.strip().lower()

        if not clean_onion:
            return {"error": "Invalid or missing .onion address."}

        title = payload.get("title", f"Scanned Onion Service ({clean_onion[:16]}...)")
        raw_status = payload.get("server_status_content") or payload.get("server_status") or ""
        raw_cert = payload.get("ssl_certificate") or payload.get("cert") or {}
        raw_favicon = payload.get("favicon_hash") or payload.get("favicon") or ""
        raw_etag = payload.get("etag") or ""
        raw_headers = payload.get("headers") or {}

        indicators: List[Dict[str, Any]] = []

        # 1. Parse server-status
        status_info = cls.parse_server_status_page(raw_status)
        status_exposed = status_info["is_exposed"]
        discovered_ip = None
        banner = status_info.get("server_banner") or payload.get("server_banner")

        if status_exposed:
            for ip in status_info["leaked_ips"]:
                discovered_ip = ip
                indicators.append({
                    "type": "SERVER_STATUS",
                    "value": f"Apache /server-status exposed leaking Origin IP {ip}",
                    "clearnet_ip": ip,
                    "clearnet_domain": (status_info["leaked_domains"] or [None])[0],
                    "confidence_score": 0.99,
                    "evidence": status_info,
                })

        # 2. Parse SSL cert
        ssl_enabled = bool(raw_cert)
        if raw_cert:
            ssl_info = cls.match_ssl_certificate(raw_cert)
            if ssl_info.get("has_clearnet_san"):
                for domain in ssl_info.get("san_domains", []):
                    indicators.append({
                        "type": "SSL_SAN",
                        "value": f"TLS Certificate SAN Domain Leak: {domain}",
                        "clearnet_ip": discovered_ip,
                        "clearnet_domain": domain,
                        "confidence_score": 0.96,
                        "evidence": ssl_info,
                    })

        # 3. Parse Favicon MMH3
        if raw_favicon:
            fav_str = str(raw_favicon).strip()
            indicators.append({
                "type": "FAVICON_MMH3",
                "value": f"Favicon MurmurHash3: {fav_str}",
                "clearnet_ip": discovered_ip,
                "confidence_score": 0.90,
                "evidence": {"favicon_hash": fav_str},
            })

        # 4. Parse ETag
        if raw_etag:
            indicators.append({
                "type": "ETAG",
                "value": f"HTTP ETag Header: {raw_etag}",
                "clearnet_ip": discovered_ip,
                "confidence_score": 0.85,
                "evidence": {"etag": raw_etag},
            })

        # Compute composite score
        attr_result = cls.compute_attribution_score(indicators)

        # Upsert into MySQL
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO OnionServices (
                    onion_address, title, server_banner, favicon_hash,
                    status_page_exposed, ssl_enabled, discovered_origin_ip,
                    attribution_confidence, threat_level
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    title = VALUES(title),
                    server_banner = VALUES(server_banner),
                    favicon_hash = VALUES(favicon_hash),
                    status_page_exposed = VALUES(status_page_exposed),
                    ssl_enabled = VALUES(ssl_enabled),
                    discovered_origin_ip = VALUES(discovered_origin_ip),
                    attribution_confidence = VALUES(attribution_confidence),
                    threat_level = VALUES(threat_level),
                    service_id = LAST_INSERT_ID(service_id);
                """,
                (
                    clean_onion,
                    title,
                    banner,
                    str(raw_favicon) if raw_favicon else None,
                    1 if status_exposed else 0,
                    1 if ssl_enabled else 0,
                    discovered_ip,
                    attr_result["score"],
                    attr_result["threat_level"],
                ),
            )
            service_id = cursor.lastrowid
            if not service_id:
                cursor.execute("SELECT service_id FROM OnionServices WHERE onion_address = %s LIMIT 1;", (clean_onion,))
                row = cursor.fetchone()
                service_id = row["service_id"] if row else 0

            # Insert indicators
            for ind in indicators:
                cursor.execute(
                    """
                    INSERT INTO InfrastructureIndicators (
                        service_id, indicator_type, indicator_value,
                        clearnet_ip, clearnet_domain, confidence_score, evidence
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s);
                    """,
                    (
                        service_id,
                        ind["type"],
                        ind["value"],
                        ind.get("clearnet_ip"),
                        ind.get("clearnet_domain"),
                        ind.get("confidence_score", 1.0),
                        json.dumps(ind.get("evidence", {})),
                    ),
                )

            # Link vendor if specified
            vendor_id = payload.get("vendor_id")
            if vendor_id:
                cursor.execute(
                    """
                    INSERT IGNORE INTO VendorInfrastructureMap (
                        vendor_id, service_id, source_table, confidence_score
                    ) VALUES (%s, %s, 'live_scan', %s);
                    """,
                    (vendor_id, service_id, attr_result["score"]),
                )

        return {
            "service_id": service_id,
            "onion_address": clean_onion,
            "title": title,
            "discovered_origin_ip": discovered_ip,
            "attribution_score": attr_result["score"],
            "confidence_percentage": attr_result["confidence_percentage"],
            "threat_level": attr_result["threat_level"],
            "indicators_found": len(indicators),
            "indicators": indicators,
        }

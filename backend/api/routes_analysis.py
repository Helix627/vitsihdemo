"""Analysis and Intelligence Intake REST API Blueprints."""

from flask import Blueprint, jsonify, request
from pipelines.probabilistic_pipeline import ProbabilisticResolutionPipeline
from services.confidentiality_service import ConfidentialityService
from services.normalization_service import NormalizationService
from services.stylometric_service import StylometricEngine

analysis_bp = Blueprint("analysis_bp", __name__)


@analysis_bp.route("/analyze", methods=["POST"])
@analysis_bp.route("/api/v1/analyze", methods=["POST"])
def analyze_intelligence():
    """
    Complete intelligence intake endpoint:
    Normalizes input, extracts PII entities, calculates 0-100 confidentiality score,
    computes Agora stylometry matches, and retrieves probabilistic candidates for human review.
    """
    payload = request.get_json(silent=True) or {}
    text = payload.get("text") or payload.get("raw_text") or ""

    if not text.strip():
        return jsonify({"error": "No input text provided."}), 400

    # 1. Normalization & Entity Extraction
    clean_text = NormalizationService.clean_text(text)
    extracted_entities = NormalizationService.extract_all_entities(clean_text)

    # 2. Confidentiality & PII Risk Evaluation
    confidentiality_report = ConfidentialityService.evaluate(clean_text)

    # 3. Agora Stylometric Authorship Attribution
    stylometry_matches = StylometricEngine.match_author(clean_text, top_k=3)

    # 4. Probabilistic Resolution Candidates (Human-in-the-Loop)
    probable_matches = ProbabilisticResolutionPipeline.find_probabilistic_matches(
        text=clean_text,
        top_k=4,
        threshold=0.55,
    )

    # 5. Calculate Pre-Ingestion Linking Forecast
    linking_forecast = {
        "action": "NEW_CLUSTER",
        "forecast_type": "new_entity",
        "target_vendor_id": None,
        "target_vendor_name": None,
        "confidence_percentage": 100.0,
        "matched_identifier": None,
        "explanation": "No matching credentials or high-confidence signatures found in database. Submitting will establish a new, standalone Threat Actor cluster in the Knowledge Graph.",
    }

    # Check deterministic match against database
    from database.connection import get_db_cursor
    exact_match_found = False

    candidate_checks = []
    for em in extracted_entities.get("emails", []):
        norm_em = NormalizationService.normalize_email(em)
        if norm_em:
            candidate_checks.append(("email", norm_em, em))
    for btc in extracted_entities.get("bitcoin_wallets", []):
        norm_btc = NormalizationService.normalize_wallet(btc)
        if norm_btc:
            candidate_checks.append(("bitcoin", norm_btc, btc))
    for pgp in extracted_entities.get("pgp_fingerprints", []):
        norm_pgp = NormalizationService.normalize_pgp_fingerprint(pgp)
        if norm_pgp:
            candidate_checks.append(("pgp", norm_pgp, pgp))
    for xmr in extracted_entities.get("monero_wallets", []):
        norm_xmr = NormalizationService.normalize_monero(xmr)
        if norm_xmr:
            candidate_checks.append(("monero", norm_xmr, xmr))

    if candidate_checks:
        try:
            with get_db_cursor() as cursor:
                for itype, nval, raw_val in candidate_checks:
                    cursor.execute(
                        """
                        SELECT i.identity_id, i.identity_type, i.normalized_value, v.vendor_id, v.user_name AS vendor_name
                        FROM identities i
                        JOIN vendoridentitymap vim ON i.identity_id = vim.identity_id
                        JOIN Vendors v ON vim.vendor_id = v.vendor_id
                        WHERE i.normalized_value = %s
                        LIMIT 1;
                        """,
                        (nval,),
                    )
                    row = cursor.fetchone()
                    if row:
                        linking_forecast = {
                            "action": "AUTO_MERGE",
                            "forecast_type": "deterministic",
                            "target_vendor_id": row["vendor_id"],
                            "target_vendor_name": row["vendor_name"],
                            "confidence_percentage": 100.0,
                            "matched_identifier": {
                                "type": itype.upper(),
                                "value": raw_val,
                            },
                            "explanation": f"Exact 100% Deterministic Match found on {itype.upper()} ({raw_val[:18]}...) with Vendor #{row['vendor_id']} ({row['vendor_name']}). Ingesting will automatically merge and enrich this identity cluster.",
                        }
                        exact_match_found = True
                        break
        except Exception:
            pass

    if not exact_match_found:
        # Check if handle/alias is explicitly declared in text
        extracted_handle = None
        for line in text.split("\n"):
            low = line.lower()
            if any(k in low for k in ("handle:", "operator handle:", "vendor:", "alias:", "operator:")):
                parts = line.split(":")
                if len(parts) > 1 and parts[1].strip():
                    extracted_handle = parts[1].strip()
                    break

        fuzzy_vendor_match = None
        if extracted_handle:
            norm_fh = NormalizationService.normalize_username_for_fuzzy(extracted_handle)
            try:
                with get_db_cursor() as cursor:
                    cursor.execute("SELECT vendor_id, user_name FROM Vendors WHERE user_name IS NOT NULL LIMIT 2000;")
                    vendors = cursor.fetchall()
                    best_f_score = 0.0
                    for v in vendors:
                        cand_norm = NormalizationService.normalize_username_for_fuzzy(v["user_name"])
                        f_res = ProbabilisticResolutionPipeline.calculate_username_similarity(norm_fh, cand_norm)
                        sc = f_res.get("score", 0.0)
                        if sc > best_f_score:
                            best_f_score = sc
                            fuzzy_vendor_match = (v, sc)
            except Exception:
                pass

        if fuzzy_vendor_match and fuzzy_vendor_match[1] >= 0.60:
            f_v, f_score = fuzzy_vendor_match
            conf = round(f_score * 100, 1)
            linking_forecast = {
                "action": "SUGGESTION",
                "forecast_type": "probabilistic",
                "target_vendor_id": f_v["vendor_id"],
                "target_vendor_name": f_v["user_name"],
                "confidence_percentage": conf,
                "matched_identifier": {"type": "FUZZY_HANDLE", "value": f_v["user_name"]},
                "explanation": f"Fuzzy handle similarity detected for '{extracted_handle}' matching Vendor #{f_v['vendor_id']} ({f_v['user_name']}) at {conf}% confidence. Ingesting will create a candidate suggestion in the Analyst Review Queue.",
            }
        else:
            top_cand = (stylometry_matches or [None])[0] or (probable_matches or [None])[0]
            if top_cand and top_cand.get("confidence_percentage", 0) >= 60.0:
                v_name = top_cand.get("vendor") or top_cand.get("vendor_name") or "Unknown"
                conf = float(top_cand.get("confidence_percentage", 0))
                linking_forecast = {
                    "action": "SUGGESTION",
                    "forecast_type": "probabilistic",
                    "target_vendor_id": top_cand.get("vendor_id"),
                    "target_vendor_name": v_name,
                    "confidence_percentage": conf,
                    "matched_identifier": {"type": "STYLOMETRIC_SIGNATURE", "value": v_name},
                    "explanation": f"Fuzzy & Stylometric similarity detected with vendor '{v_name}' ({round(conf, 1)}% confidence). Ingesting will create a candidate suggestion in the Analyst Review Queue.",
                }

    return jsonify(
        {
            "summary": {
                "character_count": len(clean_text),
                "token_count": len(NormalizationService.tokenize(clean_text)),
                "confidentiality_score": confidentiality_report["score"],
                "confidentiality_level": confidentiality_report["level"],
            },
            "confidentiality": confidentiality_report,
            "extracted_entities": extracted_entities,
            "stylometric_features": StylometricEngine.extract_features(clean_text),
            "stylometric_matches": stylometry_matches,
            "probable_matches": probable_matches,
            "linking_forecast": linking_forecast,
        }
    )


@analysis_bp.route("/normalize", methods=["POST"])
def normalize_input():
    """Dedicated normalization utility endpoint."""
    payload = request.get_json(silent=True) or {}
    text = payload.get("text", "")
    return jsonify(
        {
            "cleaned_text": NormalizationService.clean_text(text),
            "tokens": NormalizationService.tokenize(text),
            "entities": NormalizationService.extract_all_entities(text),
        }
    )


@analysis_bp.route("/stylometry", methods=["POST"])
def calculate_stylometry():
    """Extract stylometric linguistic features and compare against Agora dataset."""
    payload = request.get_json(silent=True) or {}
    text = payload.get("text", "")
    if not text:
        return jsonify({"error": "No text provided"}), 400

    features = StylometricEngine.extract_features(text)
    matches = StylometricEngine.match_author(text, top_k=5)

    return jsonify({"features": features, "top_matches": matches})

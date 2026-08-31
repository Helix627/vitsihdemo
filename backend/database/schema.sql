-- ==============================================================================
-- Extended 3NF Graph-Oriented Database Schema for Dark Web Identity Resolution
-- ==============================================================================

-- 1. Legacy source tables used by the import and migration workflow
CREATE TABLE IF NOT EXISTS Vendors (
    vendor_id INT PRIMARY KEY AUTO_INCREMENT,
    user_name VARCHAR(255) NOT NULL,
    market_id INT DEFAULT NULL,
    link TEXT,
    user_id INT DEFAULT NULL,
    profile TEXT,
    vendor_link TEXT,
    added BIGINT DEFAULT NULL,
    updated BIGINT DEFAULT NULL,
    scraped BIGINT DEFAULT NULL,
    imposter INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_vendor_username (user_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Vendor_Profile (
    vendor_id INT PRIMARY KEY,
    alias VARCHAR(255),
    username VARCHAR(255),
    email VARCHAR(255) NULL,
    bitcoin_wallet VARCHAR(64) NULL,
    CONSTRAINT fk_vendor_profile_vendor
        FOREIGN KEY (vendor_id) REFERENCES Vendors(vendor_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Vendor_pgp_keys (
    id INT PRIMARY KEY AUTO_INCREMENT,
    alias VARCHAR(255) NOT NULL,
    fingerprint_f VARCHAR(32) NOT NULL,
    fingerprint VARCHAR(64) NOT NULL,
    public_key LONGBLOB NOT NULL,
    vendor_ids TEXT,
    user_hash VARCHAR(255) DEFAULT NULL,
    review_count INT DEFAULT 0,
    star_rate DECIMAL(5,2) DEFAULT 0.00,
    UNIQUE KEY uk_fingerprint (fingerprint),
    KEY idx_alias (alias),
    KEY idx_fingerprint_f (fingerprint_f)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Generic Normalized Digital Identities (First-Class Entities)
CREATE TABLE IF NOT EXISTS Identities (
    identity_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    identity_type VARCHAR(64) NOT NULL,
    value TEXT NOT NULL,
    normalized_value VARCHAR(512) NOT NULL,
    metadata JSON DEFAULT NULL,
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_identity_type_value (identity_type, normalized_value(191)),
    KEY idx_identities_type (identity_type),
    KEY idx_identities_norm (normalized_value(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Many-to-Many Association Bridge with Source Provenance
CREATE TABLE IF NOT EXISTS VendorIdentityMap (
    map_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    vendor_id INT NOT NULL,
    identity_id BIGINT NOT NULL,
    source_table VARCHAR(64) NOT NULL DEFAULT 'vendor_profile',
    confidence_score DECIMAL(5,4) NOT NULL DEFAULT 1.0000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_vendor_identity_source (vendor_id, identity_id, source_table),
    KEY idx_vim_vendor_id (vendor_id),
    KEY idx_vim_identity_id (identity_id),
    CONSTRAINT fk_vim_vendor FOREIGN KEY (vendor_id) REFERENCES Vendors(vendor_id) ON DELETE CASCADE,
    CONSTRAINT fk_vim_identity FOREIGN KEY (identity_id) REFERENCES Identities(identity_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Persistent Graph Relationships (Deterministic & Probabilistic Edges)
CREATE TABLE IF NOT EXISTS IdentityRelationships (
    relationship_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    identity1_id BIGINT NOT NULL,
    identity2_id BIGINT NOT NULL,
    relationship_type VARCHAR(64) NOT NULL DEFAULT 'SAME_AS',
    weight DECIMAL(5,4) NOT NULL DEFAULT 1.0000,
    evidence JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_rel_pair (identity1_id, identity2_id, relationship_type),
    KEY idx_rel_id1 (identity1_id),
    KEY idx_rel_id2 (identity2_id),
    KEY idx_rel_type (relationship_type),
    CONSTRAINT fk_rel_id1 FOREIGN KEY (identity1_id) REFERENCES Identities(identity_id) ON DELETE CASCADE,
    CONSTRAINT fk_rel_id2 FOREIGN KEY (identity2_id) REFERENCES Identities(identity_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Human-in-the-Loop Merge Audit Log
CREATE TABLE IF NOT EXISTS IdentityMerges (
    merge_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    primary_identity_id BIGINT NOT NULL,
    merged_identity_id BIGINT NOT NULL,
    resolution_method ENUM('deterministic', 'probabilistic_manual', 'user_override') NOT NULL,
    confidence_score DECIMAL(5,4) NOT NULL,
    reviewer_notes TEXT,
    status ENUM('merged', 'rejected', 'pending_review') NOT NULL DEFAULT 'merged',
    merged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_merge_primary (primary_identity_id),
    KEY idx_merge_merged (merged_identity_id),
    CONSTRAINT fk_merge_primary FOREIGN KEY (primary_identity_id) REFERENCES Identities(identity_id) ON DELETE CASCADE,
    CONSTRAINT fk_merge_merged FOREIGN KEY (merged_identity_id) REFERENCES Identities(identity_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Probabilistic identity suggestions awaiting analyst review
CREATE TABLE IF NOT EXISTS identity_suggestions (
    suggestion_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    source_vendor_id INT NULL,
    target_vendor_id INT NULL,
    source_username VARCHAR(255) NOT NULL,
    target_username VARCHAR(255) NULL,
    confidence DECIMAL(5,4) NOT NULL,
    decision_label VARCHAR(32) NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    similarity_breakdown JSON NULL,
    suggested_reason TEXT NULL,
    reviewed_at DATETIME NULL,
    reviewed_by VARCHAR(255) NULL,
    review_notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_suggestions_status (status),
    KEY idx_suggestions_confidence (confidence),
    KEY idx_suggestions_source_vendor (source_vendor_id),
    KEY idx_suggestions_target_vendor (target_vendor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Analyst decisions used for review history and future supervised learning
CREATE TABLE IF NOT EXISTS analyst_decisions_log (
    decision_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    suggestion_id BIGINT NOT NULL,
    source_vendor VARCHAR(255) NULL,
    target_vendor VARCHAR(255) NULL,
    decision ENUM('APPROVED', 'REJECTED') NOT NULL,
    confidence DECIMAL(5,4) NULL,
    features_json JSON NULL,
    analyst_id VARCHAR(255) NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_decision_suggestion (suggestion_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Chronological evidence and confidence history
CREATE TABLE IF NOT EXISTS evidence_provenance (
    provenance_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    target_type VARCHAR(64) NOT NULL,
    target_id BIGINT NOT NULL,
    source_dataset VARCHAR(255) NULL,
    evidence_type VARCHAR(255) NOT NULL,
    evidence_payload JSON NULL,
    confidence_before DECIMAL(5,4) NULL,
    confidence_after DECIMAL(5,4) NULL,
    analyst_id VARCHAR(255) NULL,
    reason TEXT NULL,
    verification_status VARCHAR(64) NOT NULL DEFAULT 'verified',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_provenance_target (target_type, target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Ground-truth mappings produced by the optional synthetic marketplace generator
CREATE TABLE IF NOT EXISTS ground_truth_vendor_migrations (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    agora_vendor_id INT NULL,
    agora_username VARCHAR(255) NULL,
    target_marketplace VARCHAR(64) NOT NULL,
    synthetic_vendor_id INT NOT NULL,
    synthetic_username VARCHAR(255) NOT NULL,
    synthetic_alias VARCHAR(255) NOT NULL,
    alias_mutation_type VARCHAR(64) NOT NULL,
    pgp_status VARCHAR(32) NOT NULL,
    wallet_status VARCHAR(32) NOT NULL,
    email_status VARCHAR(32) NOT NULL,
    listing_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_gt_agora (agora_vendor_id),
    KEY idx_gt_synth (synthetic_vendor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Tor Hidden Services (Infrastructure Layer)
CREATE TABLE IF NOT EXISTS OnionServices (
    service_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    onion_address VARCHAR(128) NOT NULL,
    title VARCHAR(255) NULL,
    server_banner VARCHAR(255) NULL,
    favicon_hash VARCHAR(64) NULL,
    status_page_exposed TINYINT(1) NOT NULL DEFAULT 0,
    ssl_enabled TINYINT(1) NOT NULL DEFAULT 0,
    discovered_origin_ip VARCHAR(64) NULL,
    attribution_confidence DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
    threat_level VARCHAR(32) NOT NULL DEFAULT 'SUSPECTED',
    first_discovered TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_scanned TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_onion_address (onion_address),
    KEY idx_origin_ip (discovered_origin_ip),
    KEY idx_threat_level (threat_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Infrastructure Attribution Indicators
CREATE TABLE IF NOT EXISTS InfrastructureIndicators (
    indicator_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    service_id BIGINT NOT NULL,
    indicator_type VARCHAR(64) NOT NULL,
    indicator_value TEXT NOT NULL,
    clearnet_ip VARCHAR(64) NULL,
    clearnet_domain VARCHAR(255) NULL,
    confidence_score DECIMAL(5,4) NOT NULL DEFAULT 1.0000,
    asn VARCHAR(64) NULL,
    isp VARCHAR(255) NULL,
    country VARCHAR(64) NULL,
    evidence JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_ind_service (service_id),
    KEY idx_ind_type (indicator_type),
    KEY idx_ind_clearnet_ip (clearnet_ip),
    CONSTRAINT fk_ind_service FOREIGN KEY (service_id) REFERENCES OnionServices(service_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Vendor to Infrastructure Mapping
CREATE TABLE IF NOT EXISTS VendorInfrastructureMap (
    map_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    vendor_id INT NOT NULL,
    service_id BIGINT NOT NULL,
    source_table VARCHAR(64) NOT NULL DEFAULT 'infrastructure_scan',
    confidence_score DECIMAL(5,4) NOT NULL DEFAULT 1.0000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_vendor_infra (vendor_id, service_id),
    KEY idx_vim_infra_vendor (vendor_id),
    KEY idx_vim_infra_service (service_id),
    CONSTRAINT fk_vim_infra_vendor FOREIGN KEY (vendor_id) REFERENCES Vendors(vendor_id) ON DELETE CASCADE,
    CONSTRAINT fk_vim_infra_service FOREIGN KEY (service_id) REFERENCES OnionServices(service_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- Extended 3NF Graph-Oriented Database Schema for Dark Web Identity Resolution
-- ==============================================================================

-- 1. Canonical Marketplace Vendors
CREATE TABLE IF NOT EXISTS Vendors (
    vendor_id INT PRIMARY KEY AUTO_INCREMENT,
    user_name VARCHAR(255) NOT NULL,
    market_id INT DEFAULT NULL,
    link TEXT,
    profile_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_vendor_username (user_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Generic Normalized Digital Identities (First-Class Entities)
CREATE TABLE IF NOT EXISTS Identities (
    identity_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    identity_type ENUM('alias', 'username', 'email', 'bitcoin', 'pgp', 'phone', 'marketplace', 'product', 'category', 'shipping_origin', 'shipping_destination') NOT NULL,
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

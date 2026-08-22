"""SQLAlchemy ORM Models for Existing MySQL main_db Schema."""

from sqlalchemy import (
    Column,
    Integer,
    BigInteger,
    String,
    Text,
    Enum,
    DECIMAL,
    TIMESTAMP,
    JSON,
    LargeBinary,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func

Base = declarative_base()


class VendorModel(Base):
    __tablename__ = "vendors"

    vendor_id = Column(Integer, primary_key=True, autoincrement=True)
    user_name = Column(String(255), nullable=True, index=True)
    market_id = Column(Integer, nullable=True, index=True)
    user_id = Column(Integer, nullable=True, default=0)
    link = Column(Integer, nullable=True, default=0)
    profile = Column(Text, nullable=True)
    vendor_link = Column(Text, nullable=True)
    added = Column(BigInteger, nullable=True)
    updated = Column(BigInteger, nullable=True)
    scraped = Column(BigInteger, nullable=True)
    imposter = Column(Integer, nullable=True, default=0)

    # Relationships
    profile_record = relationship("VendorProfileModel", back_populates="vendor", uselist=False, cascade="all, delete-orphan")
    identity_maps = relationship("VendorIdentityMapModel", back_populates="vendor", cascade="all, delete-orphan")


class VendorProfileModel(Base):
    __tablename__ = "vendor_profile"

    vendor_id = Column(Integer, ForeignKey("vendors.vendor_id", ondelete="CASCADE"), primary_key=True)
    alias = Column(String(255), nullable=True)
    username = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    bitcoin_wallet = Column(String(64), nullable=True)

    vendor = relationship("VendorModel", back_populates="profile_record")


class VendorPGPKeyModel(Base):
    __tablename__ = "vendor_pgp_keys"

    id = Column(Integer, primary_key=True, autoincrement=True)
    alias = Column(String(255), nullable=False, index=True)
    fingerprint_f = Column(String(32), nullable=False, index=True)
    fingerprint = Column(String(64), nullable=False, unique=True)
    public_key = Column(LargeBinary, nullable=False)
    vendor_ids = Column(Text, nullable=True)
    user_hash = Column(String(255), nullable=True, default="")
    review_count = Column(Integer, nullable=True, default=0)
    star_rate = Column(DECIMAL(5, 2), nullable=True, default=0.00)


class IdentityModel(Base):
    __tablename__ = "identities"

    identity_id = Column(Integer, primary_key=True, autoincrement=True)
    identity_type = Column(Enum("alias", "username", "email", "bitcoin", "pgp", name="identity_types"), nullable=False, index=True)
    value = Column(String(512), nullable=False, index=True)
    normalized_value = Column(String(512), nullable=False, index=True)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    vendor_maps = relationship("VendorIdentityMapModel", back_populates="identity", cascade="all, delete-orphan")


class VendorIdentityMapModel(Base):
    __tablename__ = "vendoridentitymap"

    id = Column(Integer, primary_key=True, autoincrement=True)
    vendor_id = Column(Integer, ForeignKey("vendors.vendor_id", ondelete="CASCADE"), nullable=False, index=True)
    identity_id = Column(Integer, ForeignKey("identities.identity_id", ondelete="CASCADE"), nullable=False, index=True)
    source_table = Column(String(64), nullable=False, default="vendor_profile")
    confidence_score = Column(DECIMAL(5, 4), nullable=True, default=1.0000)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    vendor = relationship("VendorModel", back_populates="identity_maps")
    identity = relationship("IdentityModel", back_populates="vendor_maps")


class IdentityRelationshipModel(Base):
    __tablename__ = "identityrelationships"

    relationship_id = Column(Integer, primary_key=True, autoincrement=True)
    identity1_id = Column(Integer, ForeignKey("identities.identity_id", ondelete="CASCADE"), nullable=False, index=True)
    identity2_id = Column(Integer, ForeignKey("identities.identity_id", ondelete="CASCADE"), nullable=False, index=True)
    relationship_type = Column(String(64), nullable=False, default="same_vendor", index=True)
    weight = Column(DECIMAL(5, 4), nullable=True, default=1.0000)
    evidence = Column(JSON, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())


class GroundTruthMigrationModel(Base):
    """Hidden evaluation mapping table for migrated synthetic vendors."""
    __tablename__ = "ground_truth_vendor_migrations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    agora_vendor_id = Column(Integer, nullable=True, index=True)
    agora_username = Column(String(255), nullable=True)
    target_marketplace = Column(String(64), nullable=False, index=True)
    synthetic_vendor_id = Column(Integer, nullable=False, index=True)
    synthetic_username = Column(String(255), nullable=False)
    synthetic_alias = Column(String(255), nullable=False)
    alias_mutation_type = Column(String(64), nullable=False)
    pgp_status = Column(Enum("reused", "rotated", "none", name="gt_pgp_status"), nullable=False)
    wallet_status = Column(Enum("reused", "new", "none", name="gt_wallet_status"), nullable=False)
    email_status = Column(Enum("reused", "new", "none", name="gt_email_status"), nullable=False)
    listing_count = Column(Integer, nullable=False, default=0)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

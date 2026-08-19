import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Table, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base


class AssetCriticality(str, enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class AssetStatus(str, enum.Enum):
    ONLINE = "Online"
    OFFLINE = "Offline"
    MAINTENANCE = "Maintenance"


class AgentStatus(str, enum.Enum):
    ONLINE = "Online"
    OFFLINE = "Offline"
    UNREGISTERED = "Unregistered"
    REVOKED = "Revoked"


# Many-to-Many Association Tables
asset_group_members = Table(
    "asset_group_members",
    Base.metadata,
    Column("asset_id", UUID(as_uuid=True), ForeignKey("assets.id", ondelete="CASCADE"), primary_key=True),
    Column("group_id", UUID(as_uuid=True), ForeignKey("asset_groups.id", ondelete="CASCADE"), primary_key=True),
)

asset_tag_members = Table(
    "asset_tag_members",
    Base.metadata,
    Column("asset_id", UUID(as_uuid=True), ForeignKey("assets.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", UUID(as_uuid=True), ForeignKey("asset_tags.id", ondelete="CASCADE"), primary_key=True),
)


class AssetGroup(Base):
    __tablename__ = "asset_groups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    assets = relationship("Asset", secondary=asset_group_members, back_populates="groups")


class AssetTag(Base):
    __tablename__ = "asset_tags"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(50), nullable=False, unique=True, index=True)
    color_hex = Column(String(7), default="#3b82f6", nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    assets = relationship("Asset", secondary=asset_tag_members, back_populates="tags")


class OperatingSystem(Base):
    __tablename__ = "operating_systems"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(100), nullable=False, index=True) # e.g. Windows Server 2022, Ubuntu Linux
    version = Column(String(50), nullable=False)
    architecture = Column(String(20), nullable=True) # e.g. x86_64, arm64

    assets = relationship("Asset", back_populates="operating_system")


class Asset(Base):
    __tablename__ = "assets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    os_id = Column(UUID(as_uuid=True), ForeignKey("operating_systems.id", ondelete="SET NULL"), nullable=True, index=True)
    
    hostname = Column(String(255), nullable=False, index=True)
    asset_name = Column(String(255), nullable=False, index=True)
    asset_type = Column(String(100), nullable=False) # e.g., Server, Workstation, EHR_Terminal, Medical_Device
    ip_address = Column(String(45), nullable=False, index=True)
    mac_address = Column(String(17), nullable=True)
    domain = Column(String(255), nullable=True)
    department = Column(String(100), nullable=True)
    owner = Column(String(100), nullable=True)
    criticality = Column(SQLEnum(AssetCriticality), default=AssetCriticality.MEDIUM, nullable=False)
    status = Column(SQLEnum(AssetStatus), default=AssetStatus.OFFLINE, nullable=False)
    last_seen = Column(DateTime(timezone=True), nullable=True)
    agent_version = Column(String(50), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    operating_system = relationship("OperatingSystem", back_populates="assets")
    groups = relationship("AssetGroup", secondary=asset_group_members, back_populates="assets")
    tags = relationship("AssetTag", secondary=asset_tag_members, back_populates="assets")
    agent = relationship("Agent", back_populates="asset", uselist=False, cascade="all, delete-orphan")


class Agent(Base):
    __tablename__ = "agents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    api_key_hash = Column(String(255), nullable=False)
    agent_version = Column(String(50), nullable=False)
    os_name = Column(String(100), nullable=False)
    os_version = Column(String(50), nullable=False)
    status = Column(SQLEnum(AgentStatus), default=AgentStatus.OFFLINE, nullable=False)
    last_heartbeat = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    asset = relationship("Asset", back_populates="agent")

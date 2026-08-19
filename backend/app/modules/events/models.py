import uuid
from datetime import datetime, timezone
from typing import Optional, Dict
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class EventSource(Base):
    __tablename__ = "event_sources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(100), nullable=False, unique=True, index=True) # e.g., Sysmon, WinEvent, Syslog, Apache
    source_type = Column(String(50), nullable=False)                    # e.g., JSON, KeyValue, Syslog, XML
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class RawLog(Base):
    __tablename__ = "raw_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id", ondelete="SET NULL"), nullable=True, index=True)
    source_name = Column(String(100), nullable=False, index=True)
    raw_content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    event = relationship("NormalizedEvent", back_populates="raw_log", uselist=False)


class NormalizedEvent(Base):
    __tablename__ = "normalized_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    raw_log_id = Column(UUID(as_uuid=True), ForeignKey("raw_logs.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id", ondelete="SET NULL"), nullable=True, index=True)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id", ondelete="SET NULL"), nullable=True, index=True)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    hostname = Column(String(255), nullable=False, index=True)
    username = Column(String(255), nullable=True, index=True)
    event_type = Column(String(100), nullable=False, index=True)
    event_category = Column(String(100), nullable=False, index=True) # e.g. Authentication, Process, Network, File
    severity = Column(String(20), nullable=False, default="INFO", index=True) # e.g. INFO, LOW, MEDIUM, HIGH, CRITICAL
    source = Column(String(100), nullable=False)
    
    source_ip = Column(String(45), nullable=True, index=True)
    destination_ip = Column(String(45), nullable=True, index=True)
    process_name = Column(String(255), nullable=True)
    parent_process = Column(String(255), nullable=True)
    command_line = Column(Text, nullable=True)
    file_path = Column(Text, nullable=True)
    registry_path = Column(Text, nullable=True)
    hash_value = Column(String(128), nullable=True)
    protocol = Column(String(20), nullable=True)
    port = Column(String(10), nullable=True)
    
    action = Column(String(100), nullable=True)
    result = Column(String(50), nullable=True)
    message = Column(Text, nullable=True)
    
    normalized_json = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    raw_log = relationship("RawLog", back_populates="event")

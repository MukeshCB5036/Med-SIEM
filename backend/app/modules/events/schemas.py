from uuid import UUID
from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field


class SingleLogIngestRequest(BaseModel):
    source_name: str # e.g. WinEvent, Sysmon, Syslog, Apache
    raw_content: str
    hostname: str
    org_id: UUID
    agent_id: Optional[UUID] = None
    api_key: Optional[str] = None


class BatchLogIngestRequest(BaseModel):
    agent_id: UUID
    api_key: str
    org_id: UUID
    logs: List[SingleLogIngestRequest]


class NormalizedEventResponse(BaseModel):
    id: UUID
    raw_log_id: UUID
    asset_id: Optional[UUID] = None
    agent_id: Optional[UUID] = None
    org_id: UUID
    timestamp: datetime
    hostname: str
    username: Optional[str] = None
    event_type: str
    event_category: str
    severity: str
    source: str
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    process_name: Optional[str] = None
    parent_process: Optional[str] = None
    command_line: Optional[str] = None
    file_path: Optional[str] = None
    action: Optional[str] = None
    result: Optional[str] = None
    message: Optional[str] = None
    normalized_json: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True


class EventSearchQuery(BaseModel):
    query: Optional[str] = None
    hostname: Optional[str] = None
    username: Optional[str] = None
    event_type: Optional[str] = None
    severity: Optional[str] = None
    skip: int = 0
    limit: int = 50

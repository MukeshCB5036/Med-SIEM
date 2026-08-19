from uuid import UUID
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.modules.assets.models import AssetCriticality, AssetStatus, AgentStatus


# Asset Group Schemas
class AssetGroupBase(BaseModel):
    name: str
    description: Optional[str] = None


class AssetGroupCreate(AssetGroupBase):
    pass


class AssetGroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class AssetGroupResponse(AssetGroupBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# Asset Schemas
class AssetBase(BaseModel):
    hostname: str
    asset_name: str
    asset_type: str
    ip_address: str
    mac_address: Optional[str] = None
    domain: Optional[str] = None
    department: Optional[str] = None
    owner: Optional[str] = None
    criticality: AssetCriticality = AssetCriticality.MEDIUM


class AssetCreate(AssetBase):
    org_id: UUID
    group_ids: List[UUID] = []


class AssetUpdate(BaseModel):
    asset_name: Optional[str] = None
    asset_type: Optional[str] = None
    ip_address: Optional[str] = None
    department: Optional[str] = None
    owner: Optional[str] = None
    criticality: Optional[AssetCriticality] = None
    status: Optional[AssetStatus] = None
    group_ids: Optional[List[UUID]] = None


class AgentResponse(BaseModel):
    id: UUID
    asset_id: UUID
    agent_version: str
    os_name: str
    os_version: str
    status: AgentStatus
    last_heartbeat: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class AssetResponse(AssetBase):
    id: UUID
    org_id: UUID
    status: AssetStatus
    last_seen: Optional[datetime] = None
    agent_version: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    groups: List[AssetGroupResponse] = []
    agent: Optional[AgentResponse] = None

    class Config:
        from_attributes = True


# Agent Registration & Heartbeat Schemas
class AgentRegisterRequest(BaseModel):
    hostname: str
    asset_name: str
    asset_type: str = "Workstation"
    ip_address: str
    mac_address: Optional[str] = None
    domain: Optional[str] = None
    agent_version: str
    os_name: str
    os_version: str
    org_id: UUID


class AgentRegisterResponse(BaseModel):
    agent_id: UUID
    asset_id: UUID
    api_key: str
    message: str = "Agent registered successfully"


class AgentHeartbeatRequest(BaseModel):
    agent_id: UUID
    api_key: str
    agent_version: Optional[str] = None


class AgentHeartbeatResponse(BaseModel):
    success: bool = True
    status: AgentStatus
    timestamp: datetime

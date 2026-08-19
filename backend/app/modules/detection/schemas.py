from uuid import UUID
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.modules.detection.models import AlertSeverity, AlertStatus, IncidentStatus


# Detection Rule Schemas
class DetectionRuleBase(BaseModel):
    name: str
    description: Optional[str] = None
    severity: AlertSeverity = AlertSeverity.MEDIUM
    rule_type: str = "Field Match"
    event_category: str
    conditions: str
    time_window_seconds: int = 60
    threshold_count: int = 1
    mitre_technique: Optional[str] = None
    enabled: bool = True


class DetectionRuleCreate(DetectionRuleBase):
    pass


class DetectionRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[AlertSeverity] = None
    rule_type: Optional[str] = None
    event_category: Optional[str] = None
    conditions: Optional[str] = None
    enabled: Optional[bool] = None


class DetectionRuleResponse(DetectionRuleBase):
    id: UUID
    created_by: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Alert Schemas
class AlertBase(BaseModel):
    title: str
    description: Optional[str] = None
    severity: AlertSeverity = AlertSeverity.MEDIUM
    status: AlertStatus = AlertStatus.OPEN
    mitre_technique: Optional[str] = None
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    username: Optional[str] = None


class AlertCreate(AlertBase):
    rule_id: Optional[UUID] = None
    asset_id: Optional[UUID] = None
    event_id: Optional[UUID] = None
    org_id: UUID


class AlertUpdate(BaseModel):
    title: Optional[str] = None
    severity: Optional[AlertSeverity] = None
    status: Optional[AlertStatus] = None
    assigned_to_id: Optional[UUID] = None
    resolution_notes: Optional[str] = None
    is_false_positive: Optional[bool] = None


class AlertResponse(AlertBase):
    id: UUID
    rule_id: Optional[UUID] = None
    asset_id: Optional[UUID] = None
    event_id: Optional[UUID] = None
    assigned_to_id: Optional[UUID] = None
    org_id: UUID
    resolution_notes: Optional[str] = None
    is_false_positive: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Incident Schemas
class IncidentBase(BaseModel):
    title: str
    description: Optional[str] = None
    severity: AlertSeverity = AlertSeverity.HIGH
    status: IncidentStatus = IncidentStatus.OPEN


class IncidentCreate(IncidentBase):
    org_id: UUID
    alert_ids: List[UUID] = []


class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[AlertSeverity] = None
    status: Optional[IncidentStatus] = None
    assigned_to_id: Optional[UUID] = None


class IncidentCommentCreate(BaseModel):
    comment: str


class IncidentCommentResponse(BaseModel):
    id: UUID
    incident_id: UUID
    user_id: Optional[UUID] = None
    comment: str
    created_at: datetime

    class Config:
        from_attributes = True


class IncidentResponse(IncidentBase):
    id: UUID
    assigned_to_id: Optional[UUID] = None
    org_id: UUID
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    alerts: List[AlertResponse] = []
    comments: List[IncidentCommentResponse] = []

    class Config:
        from_attributes = True

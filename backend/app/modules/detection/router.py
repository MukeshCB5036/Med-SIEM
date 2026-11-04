from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user, PermissionChecker
from app.modules.auth.models import User
from app.modules.detection.schemas import (
    DetectionRuleCreate, DetectionRuleUpdate, DetectionRuleResponse,
    AlertCreate, AlertUpdate, AlertResponse,
    IncidentCreate, IncidentUpdate, IncidentResponse, IncidentCommentCreate, IncidentCommentResponse
)
from app.modules.detection.services import DetectionEngineService

router = APIRouter(prefix="", tags=["Detection, Alerts & Incidents"])


# ==============================================================================
# DETECTION RULES API
# ==============================================================================

@router.get("/rules", response_model=dict, dependencies=[Depends(PermissionChecker("alerts.read"))])
def list_rules(db: Session = Depends(get_db)):
    """List all configured detection rules."""
    service = DetectionEngineService(db)
    rules = service.get_rules()
    return {"success": True, "data": [DetectionRuleResponse.model_validate(r) for r in rules]}


@router.post("/rules", response_model=dict, status_code=status.HTTP_201_CREATED, dependencies=[Depends(PermissionChecker("settings.manage"))])
def create_rule(rule_data: DetectionRuleCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a new detection rule."""
    service = DetectionEngineService(db)
    rule = service.create_rule(rule_data, creator=current_user.full_name)
    return {"success": True, "data": DetectionRuleResponse.model_validate(rule)}


@router.patch("/rules/{id}", response_model=dict, dependencies=[Depends(PermissionChecker("settings.manage"))])
def update_rule(id: UUID, rule_update: DetectionRuleUpdate, db: Session = Depends(get_db)):
    """Update detection rule parameters."""
    service = DetectionEngineService(db)
    rule = service.update_rule(id, rule_update)
    return {"success": True, "data": DetectionRuleResponse.model_validate(rule)}


@router.delete("/rules/{id}", response_model=dict, dependencies=[Depends(PermissionChecker("settings.manage"))])
def delete_rule(id: UUID, db: Session = Depends(get_db)):
    """Delete a detection rule."""
    service = DetectionEngineService(db)
    service.delete_rule(id)
    return {"success": True, "data": {"message": f"Rule {id} deleted successfully"}}


# ==============================================================================
# ALERTS API
# ==============================================================================

@router.get("/alerts", response_model=dict, dependencies=[Depends(PermissionChecker("alerts.read"))])
def list_alerts(
    skip: int = 0, 
    limit: int = 50, 
    severity: Optional[str] = None, 
    status_val: Optional[str] = None,
    active_only: bool = False,
    deduplicate: bool = False,
    db: Session = Depends(get_db)
):
    """List security alerts with filters and optional deduplication for threat feeds."""
    service = DetectionEngineService(db)
    alerts = service.get_alerts(skip, limit, severity, status_val, active_only, deduplicate)
    return {"success": True, "data": [AlertResponse.model_validate(a) for a in alerts], "meta": {"count": len(alerts)}}


@router.get("/alerts/stats", response_model=dict, dependencies=[Depends(PermissionChecker("alerts.read"))])
def get_alert_stats(db: Session = Depends(get_db)):
    """Get accurate, unified security alert, active incident, and asset statistics."""
    service = DetectionEngineService(db)
    stats_data = service.get_alert_stats()
    return {
        "success": True,
        "data": stats_data
    }


@router.get("/alerts/{id}", response_model=dict, dependencies=[Depends(PermissionChecker("alerts.read"))])
def get_alert_by_id(id: UUID, db: Session = Depends(get_db)):
    """Get alert details by ID."""
    service = DetectionEngineService(db)
    alert = service.get_alert_by_id(id)
    return {"success": True, "data": AlertResponse.model_validate(alert)}


@router.patch("/alerts/{id}", response_model=dict, dependencies=[Depends(PermissionChecker("alerts.update"))])
def update_alert(id: UUID, alert_update: AlertUpdate, db: Session = Depends(get_db)):
    """Update alert status or severity."""
    service = DetectionEngineService(db)
    alert = service.update_alert(id, alert_update)
    return {"success": True, "data": AlertResponse.model_validate(alert)}


@router.post("/alerts/{id}/assign", response_model=dict, dependencies=[Depends(PermissionChecker("alerts.update"))])
def assign_alert(id: UUID, user_id: UUID, db: Session = Depends(get_db)):
    """Assign alert to a SOC analyst."""
    service = DetectionEngineService(db)
    alert = service.assign_alert(id, user_id)
    return {"success": True, "data": AlertResponse.model_validate(alert)}


@router.post("/alerts/{id}/resolve", response_model=dict, dependencies=[Depends(PermissionChecker("alerts.update"))])
def resolve_alert(id: UUID, resolution_notes: str = "Resolved by SOC Analyst", db: Session = Depends(get_db)):
    """Resolve an active alert."""
    service = DetectionEngineService(db)
    alert = service.resolve_alert(id, resolution_notes)
    return {"success": True, "data": AlertResponse.model_validate(alert)}


# ==============================================================================
# INCIDENTS API
# ==============================================================================

@router.get("/incidents", response_model=dict, dependencies=[Depends(PermissionChecker("incidents.manage"))])
def list_incidents(skip: int = 0, limit: int = 50, status_val: Optional[str] = None, db: Session = Depends(get_db)):
    """List security incidents."""
    service = DetectionEngineService(db)
    incidents = service.get_incidents(skip, limit, status_val)
    return {"success": True, "data": [IncidentResponse.model_validate(i) for i in incidents], "meta": {"count": len(incidents)}}


@router.post("/incidents", response_model=dict, status_code=status.HTTP_201_CREATED, dependencies=[Depends(PermissionChecker("incidents.manage"))])
def create_incident(inc_data: IncidentCreate, db: Session = Depends(get_db)):
    """Escalate alerts to a formal Security Incident."""
    service = DetectionEngineService(db)
    incident = service.create_incident(inc_data)
    return {"success": True, "data": IncidentResponse.model_validate(incident)}


@router.get("/incidents/{id}", response_model=dict, dependencies=[Depends(PermissionChecker("incidents.manage"))])
def get_incident_by_id(id: UUID, db: Session = Depends(get_db)):
    """Get incident details by ID."""
    service = DetectionEngineService(db)
    incident = service.get_incident_by_id(id)
    return {"success": True, "data": IncidentResponse.model_validate(incident)}


@router.patch("/incidents/{id}", response_model=dict, dependencies=[Depends(PermissionChecker("incidents.manage"))])
def update_incident(id: UUID, inc_update: IncidentUpdate, db: Session = Depends(get_db)):
    """Update incident status, severity, or assigned analyst."""
    service = DetectionEngineService(db)
    incident = service.update_incident(id, inc_update)
    return {"success": True, "data": IncidentResponse.model_validate(incident)}


@router.post("/incidents/{id}/comments", response_model=dict, dependencies=[Depends(PermissionChecker("incidents.manage"))])
def add_incident_comment(id: UUID, comment_data: IncidentCommentCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Add analyst notes/comments to an incident investigation."""
    service = DetectionEngineService(db)
    comment = service.add_comment(id, comment_data, user_id=current_user.id)
    return {"success": True, "data": IncidentCommentResponse.model_validate(comment)}


@router.post("/incidents/{id}/resolve", response_model=dict, dependencies=[Depends(PermissionChecker("incidents.manage"))])
def resolve_incident(id: UUID, db: Session = Depends(get_db)):
    """Mark an incident as RESOLVED."""
    service = DetectionEngineService(db)
    incident = service.resolve_incident(id)
    return {"success": True, "data": IncidentResponse.model_validate(incident)}

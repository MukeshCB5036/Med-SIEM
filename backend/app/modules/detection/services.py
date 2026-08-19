import json
from uuid import UUID
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.modules.detection.repositories import DetectionRepository
from app.modules.detection.models import DetectionRule, Alert, Incident, IncidentComment, AlertStatus, IncidentStatus, AlertSeverity
from app.modules.detection.schemas import (
    DetectionRuleCreate, DetectionRuleUpdate,
    AlertCreate, AlertUpdate,
    IncidentCreate, IncidentUpdate, IncidentCommentCreate
)
from app.modules.events.models import NormalizedEvent
from app.core.exceptions import EntityNotFoundException, ValidationException


class DetectionEngineService:
    def __init__(self, db: Session):
        self.repo = DetectionRepository(db)

    # --------------------------------------------------------------------------
    # Detection Engine Evaluator Logic
    # --------------------------------------------------------------------------
    def evaluate_event(self, event: NormalizedEvent) -> List[Alert]:
        """Evaluates an incoming normalized event against enabled detection rules."""
        generated_alerts = []
        rules = self.repo.get_enabled_rules()

        for rule in rules:
            try:
                conds = json.loads(rule.conditions)
                # Field Match evaluation logic
                field_name = conds.get("field")
                op = conds.get("op")
                val = conds.get("val")

                event_val = getattr(event, field_name, None)
                if event_val is None and isinstance(event.normalized_json, dict):
                    event_val = event.normalized_json.get(field_name)

                is_match = False
                if op == "==" and str(event_val) == str(val):
                    is_match = True
                elif op == "contains" and event_val and str(val).lower() in str(event_val).lower():
                    is_match = True
                elif op == "regex_contains" and event_val and str(val).lower() in str(event_val).lower():
                    is_match = True

                if is_match:
                    alert = Alert(
                        rule_id=rule.id,
                        asset_id=event.asset_id,
                        event_id=event.id,
                        org_id=event.org_id,
                        title=f"Detection Triggered: {rule.name}",
                        description=f"Rule '{rule.name}' matched event on host {event.hostname}. {rule.description or ''}",
                        severity=rule.severity,
                        status=AlertStatus.OPEN,
                        mitre_technique=rule.mitre_technique,
                        source_ip=event.source_ip,
                        destination_ip=event.destination_ip,
                        username=event.username
                    )
                    saved_alert = self.repo.create_alert(alert)
                    generated_alerts.append(saved_alert)
            except Exception as e:
                continue

        return generated_alerts

    # --------------------------------------------------------------------------
    # Rules CRUD
    # --------------------------------------------------------------------------
    def get_rules(self) -> List[DetectionRule]:
        return self.repo.get_all_rules()

    def create_rule(self, rule_data: DetectionRuleCreate, creator: str = "System") -> DetectionRule:
        rule = DetectionRule(
            name=rule_data.name,
            description=rule_data.description,
            severity=rule_data.severity,
            rule_type=rule_data.rule_type,
            event_category=rule_data.event_category,
            conditions=rule_data.conditions,
            time_window_seconds=rule_data.time_window_seconds,
            threshold_count=rule_data.threshold_count,
            mitre_technique=rule_data.mitre_technique,
            enabled=rule_data.enabled,
            created_by=creator
        )
        return self.repo.create_rule(rule)

    def update_rule(self, rule_id: UUID, rule_update: DetectionRuleUpdate) -> DetectionRule:
        rule = self.repo.get_rule_by_id(rule_id)
        if not rule:
            raise EntityNotFoundException("DetectionRule", rule_id)
        
        if rule_update.name is not None:
            rule.name = rule_update.name
        if rule_update.description is not None:
            rule.description = rule_update.description
        if rule_update.severity is not None:
            rule.severity = rule_update.severity
        if rule_update.enabled is not None:
            rule.enabled = rule_update.enabled
        if rule_update.conditions is not None:
            rule.conditions = rule_update.conditions
            
        return self.repo.update_rule(rule)

    def delete_rule(self, rule_id: UUID) -> None:
        rule = self.repo.get_rule_by_id(rule_id)
        if not rule:
            raise EntityNotFoundException("DetectionRule", rule_id)
        self.repo.delete_rule(rule)

    # --------------------------------------------------------------------------
    # Alerts Management
    # --------------------------------------------------------------------------
    def get_alerts(self, skip: int = 0, limit: int = 50, severity: Optional[str] = None, status_val: Optional[str] = None) -> List[Alert]:
        return self.repo.get_alerts(skip, limit, severity, status_val)

    def get_alert_by_id(self, alert_id: UUID) -> Alert:
        alert = self.repo.get_alert_by_id(alert_id)
        if not alert:
            raise EntityNotFoundException("Alert", alert_id)
        return alert

    def update_alert(self, alert_id: UUID, alert_update: AlertUpdate) -> Alert:
        alert = self.get_alert_by_id(alert_id)
        if alert_update.title is not None:
            alert.title = alert_update.title
        if alert_update.severity is not None:
            alert.severity = alert_update.severity
        if alert_update.status is not None:
            alert.status = alert_update.status
        if alert_update.assigned_to_id is not None:
            alert.assigned_to_id = alert_update.assigned_to_id
        if alert_update.resolution_notes is not None:
            alert.resolution_notes = alert_update.resolution_notes
        if alert_update.is_false_positive is not None:
            alert.is_false_positive = alert_update.is_false_positive
            if alert_update.is_false_positive:
                alert.status = AlertStatus.FALSE_POSITIVE

        return self.repo.update_alert(alert)

    def assign_alert(self, alert_id: UUID, user_id: UUID) -> Alert:
        alert = self.get_alert_by_id(alert_id)
        alert.assigned_to_id = user_id
        alert.status = AlertStatus.INVESTIGATING
        return self.repo.update_alert(alert)

    def resolve_alert(self, alert_id: UUID, resolution_notes: str) -> Alert:
        alert = self.get_alert_by_id(alert_id)
        alert.status = AlertStatus.RESOLVED
        alert.resolution_notes = resolution_notes
        return self.repo.update_alert(alert)

    def delete_alert(self, alert_id: UUID) -> None:
        alert = self.get_alert_by_id(alert_id)
        self.repo.delete_alert(alert)

    # --------------------------------------------------------------------------
    # Incidents Management
    # --------------------------------------------------------------------------
    def get_incidents(self, skip: int = 0, limit: int = 50, status_val: Optional[str] = None) -> List[Incident]:
        return self.repo.get_incidents(skip, limit, status_val)

    def get_incident_by_id(self, incident_id: UUID) -> Incident:
        inc = self.repo.get_incident_by_id(incident_id)
        if not inc:
            raise EntityNotFoundException("Incident", incident_id)
        return inc

    def create_incident(self, inc_create: IncidentCreate) -> Incident:
        alerts = self.repo.get_alerts_by_ids(inc_create.alert_ids) if inc_create.alert_ids else []
        incident = Incident(
            org_id=inc_create.org_id,
            title=inc_create.title,
            description=inc_create.description,
            severity=inc_create.severity,
            status=inc_create.status,
            alerts=alerts
        )
        return self.repo.create_incident(incident)

    def update_incident(self, incident_id: UUID, inc_update: IncidentUpdate) -> Incident:
        inc = self.get_incident_by_id(incident_id)
        if inc_update.title is not None:
            inc.title = inc_update.title
        if inc_update.description is not None:
            inc.description = inc_update.description
        if inc_update.severity is not None:
            inc.severity = inc_update.severity
        if inc_update.status is not None:
            inc.status = inc_update.status
            if inc_update.status in [IncidentStatus.RESOLVED, IncidentStatus.CLOSED]:
                inc.resolved_at = datetime.now(timezone.utc)
        if inc_update.assigned_to_id is not None:
            inc.assigned_to_id = inc_update.assigned_to_id
        return self.repo.update_incident(inc)

    def add_comment(self, incident_id: UUID, comment_data: IncidentCommentCreate, user_id: Optional[UUID]) -> IncidentComment:
        inc = self.get_incident_by_id(incident_id)
        comment = IncidentComment(
            incident_id=inc.id,
            user_id=user_id,
            comment=comment_data.comment
        )
        return self.repo.add_comment(comment)

    def resolve_incident(self, incident_id: UUID) -> Incident:
        inc = self.get_incident_by_id(incident_id)
        inc.status = IncidentStatus.RESOLVED
        inc.resolved_at = datetime.now(timezone.utc)
        return self.repo.update_incident(inc)

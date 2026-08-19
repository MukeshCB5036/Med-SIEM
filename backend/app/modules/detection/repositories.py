from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.modules.detection.models import DetectionRule, Alert, Incident, IncidentComment, AlertSeverity, AlertStatus, IncidentStatus


class DetectionRepository:
    def __init__(self, db: Session):
        self.db = db

    # Rules
    def get_enabled_rules(self) -> List[DetectionRule]:
        return self.db.query(DetectionRule).filter(DetectionRule.enabled == True).all()

    def get_rule_by_id(self, rule_id: UUID) -> Optional[DetectionRule]:
        return self.db.query(DetectionRule).filter(DetectionRule.id == rule_id).first()

    def get_all_rules(self) -> List[DetectionRule]:
        return self.db.query(DetectionRule).all()

    def create_rule(self, rule: DetectionRule) -> DetectionRule:
        self.db.add(rule)
        self.db.commit()
        self.db.refresh(rule)
        return rule

    def update_rule(self, rule: DetectionRule) -> DetectionRule:
        rule.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(rule)
        return rule

    def delete_rule(self, rule: DetectionRule) -> None:
        self.db.delete(rule)
        self.db.commit()

    # Alerts
    def create_alert(self, alert: Alert) -> Alert:
        self.db.add(alert)
        self.db.commit()
        self.db.refresh(alert)
        return alert

    def get_alerts(self, skip: int = 0, limit: int = 50, severity: Optional[str] = None, status_val: Optional[str] = None) -> List[Alert]:
        query = self.db.query(Alert)
        if severity:
            query = query.filter(Alert.severity == severity)
        if status_val:
            query = query.filter(Alert.status == status_val)
        return query.order_by(Alert.created_at.desc()).offset(skip).limit(limit).all()

    def get_alert_by_id(self, alert_id: UUID) -> Optional[Alert]:
        return self.db.query(Alert).filter(Alert.id == alert_id).first()

    def get_alerts_by_ids(self, alert_ids: List[UUID]) -> List[Alert]:
        return self.db.query(Alert).filter(Alert.id.in_(alert_ids)).all()

    def update_alert(self, alert: Alert) -> Alert:
        alert.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(alert)
        return alert

    def delete_alert(self, alert: Alert) -> None:
        self.db.delete(alert)
        self.db.commit()

    # Incidents
    def create_incident(self, incident: Incident) -> Incident:
        self.db.add(incident)
        self.db.commit()
        self.db.refresh(incident)
        return incident

    def get_incidents(self, skip: int = 0, limit: int = 50, status_val: Optional[str] = None) -> List[Incident]:
        query = self.db.query(Incident)
        if status_val:
            query = query.filter(Incident.status == status_val)
        return query.order_by(Incident.created_at.desc()).offset(skip).limit(limit).all()

    def get_incident_by_id(self, incident_id: UUID) -> Optional[Incident]:
        return self.db.query(Incident).filter(Incident.id == incident_id).first()

    def update_incident(self, incident: Incident) -> Incident:
        incident.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(incident)
        return incident

    def add_comment(self, comment: IncidentComment) -> IncidentComment:
        self.db.add(comment)
        self.db.commit()
        self.db.refresh(comment)
        return comment

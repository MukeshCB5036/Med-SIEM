from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct, desc
from app.modules.detection.models import DetectionRule, Alert, Incident, IncidentComment, AlertSeverity, AlertStatus, IncidentStatus
from app.modules.assets.models import Asset, AssetStatus, Agent, AgentStatus


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

    # Alerts & Correlation
    def find_open_correlated_alert(self, correlation_key: str, window_start: datetime) -> Optional[Alert]:
        """Finds an existing open alert for the same correlation key within the active time window with row locking."""
        return (
            self.db.query(Alert)
            .filter(
                Alert.correlation_key == correlation_key,
                Alert.status.in_([AlertStatus.OPEN, AlertStatus.INVESTIGATING]),
                Alert.last_seen >= window_start
            )
            .with_for_update()
            .first()
        )

    def create_alert(self, alert: Alert) -> Alert:
        self.db.add(alert)
        self.db.commit()
        self.db.refresh(alert)
        return alert

    def get_alerts(
        self, 
        skip: int = 0, 
        limit: int = 50, 
        severity: Optional[str] = None, 
        status_val: Optional[str] = None,
        active_only: bool = False,
        deduplicate: bool = False
    ) -> List[Alert]:
        query = self.db.query(Alert)
        if severity:
            query = query.filter(Alert.severity == severity)
        if status_val:
            query = query.filter(Alert.status == status_val)
        elif active_only:
            query = query.filter(Alert.status.in_([AlertStatus.OPEN, AlertStatus.INVESTIGATING]))
        
        # When deduplicate is requested (e.g. Threat Feed), return distinct by correlation_key
        # taking the latest alert per correlation group
        if deduplicate:
            # Query the latest active alert per correlation_key
            subq = (
                self.db.query(
                    Alert.correlation_key,
                    func.max(Alert.last_seen).label("max_last_seen")
                )
                .group_by(Alert.correlation_key)
                .subquery()
            )
            query = query.join(
                subq,
                (Alert.correlation_key == subq.c.correlation_key) &
                (Alert.last_seen == subq.c.max_last_seen)
            )

        # Order latest seen first, fallback to created_at
        return query.order_by(desc(func.coalesce(Alert.last_seen, Alert.created_at))).offset(skip).limit(limit).all()

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

    def get_alert_stats(self) -> Dict[str, Any]:
        """Calculates accurate, unified statistics across alerts, incidents, and monitored assets."""
        # 1. Deduplicated Active Alert counts (OPEN or INVESTIGATING)
        active_alerts_count = (
            self.db.query(func.count(distinct(Alert.correlation_key)))
            .filter(Alert.status.in_([AlertStatus.OPEN, AlertStatus.INVESTIGATING]))
            .scalar() or 0
        )

        # 2. Deduplicated Critical alerts count (Active + CRITICAL)
        critical_alerts_count = (
            self.db.query(func.count(distinct(Alert.correlation_key)))
            .filter(
                Alert.status.in_([AlertStatus.OPEN, AlertStatus.INVESTIGATING]),
                Alert.severity == AlertSeverity.CRITICAL
            )
            .scalar() or 0
        )

        # 3. Active incidents count (OPEN, INVESTIGATING, or CONTAINED)
        active_incidents_count = (
            self.db.query(func.count(Incident.id))
            .filter(Incident.status.in_([IncidentStatus.OPEN, IncidentStatus.INVESTIGATING, IncidentStatus.CONTAINED]))
            .scalar() or 0
        )

        # 4. Monitored assets count
        monitored_assets_count = self.db.query(func.count(Asset.id)).scalar() or 0

        # 5. Total alerts count (including historical)
        total_alerts_count = self.db.query(func.count(Alert.id)).scalar() or 0

        # 6. Severity breakdown across active deduplicated alerts
        sev_rows = (
            self.db.query(Alert.severity, func.count(distinct(Alert.correlation_key)))
            .filter(Alert.status.in_([AlertStatus.OPEN, AlertStatus.INVESTIGATING]))
            .group_by(Alert.severity)
            .all()
        )
        sev_counts = {sev.value if hasattr(sev, "value") else str(sev): count for sev, count in sev_rows}
        for s in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]:
            sev_counts.setdefault(s, 0)

        # 7. Status breakdown across unique correlation groups
        stat_rows = (
            self.db.query(Alert.status, func.count(distinct(Alert.correlation_key)))
            .group_by(Alert.status)
            .all()
        )
        status_counts = {st.value if hasattr(st, "value") else str(st): count for st, count in stat_rows}
        for st in ["OPEN", "INVESTIGATING", "RESOLVED", "CLOSED", "FALSE_POSITIVE"]:
            status_counts.setdefault(st, 0)

        return {
            "total_active_alerts": active_alerts_count,
            "critical_alerts": critical_alerts_count,
            "active_incidents": active_incidents_count,
            "monitored_assets": monitored_assets_count,
            "total_alerts": total_alerts_count,
            "severity_breakdown": sev_counts,
            "status_breakdown": status_counts
        }

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

import logging
import json
import hashlib
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.core.security import get_password_hash
from app.modules.auth.models import Organization, User, Role, Permission, Notification
from app.modules.assets.models import Asset, AssetCriticality, AssetStatus, Agent, AgentStatus, EnrollmentToken, AgentCredential
from app.modules.detection.models import DetectionRule, AlertSeverity, AlertStatus, Alert, Incident, IncidentStatus
from app.modules.events.models import RawLog, NormalizedEvent

logger = logging.getLogger("medsiem.seed")

BUILTIN_DETECTION_RULES = [
    {
        "name": "EHR Unauthorized PHI Bulk Export Attempt",
        "description": "Detects unauthorized attempts to perform bulk PHI/EHR data extraction.",
        "severity": AlertSeverity.CRITICAL,
        "rule_type": "Field Match",
        "event_category": "Application",
        "conditions": json.dumps({"field": "event_type", "op": "==", "val": "EHR_BULK_EXPORT"}),
        "mitre_technique": "T1048.003",
        "enabled": True
    },
    {
        "name": "Repeated RDP Authentication Failures",
        "description": "Detects multiple failed RDP login attempts indicating brute-force attacks.",
        "severity": AlertSeverity.HIGH,
        "rule_type": "Field Match",
        "event_category": "Authentication",
        "conditions": json.dumps({"field": "event_type", "op": "==", "val": "RDP_AUTH_FAILED"}),
        "mitre_technique": "T1110.001",
        "enabled": True
    },
    {
        "name": "Suspicious Encoded PowerShell Execution",
        "description": "Detects obfuscated or encoded PowerShell command executions.",
        "severity": AlertSeverity.HIGH,
        "rule_type": "Field Match",
        "event_category": "Process",
        "conditions": json.dumps({"field": "event_type", "op": "==", "val": "POWERSHELL_ENCODED"}),
        "mitre_technique": "T1059.001",
        "enabled": True
    },
    {
        "name": "New Administrative Account Creation",
        "description": "Detects creation of new local or domain administrator accounts.",
        "severity": AlertSeverity.HIGH,
        "rule_type": "Field Match",
        "event_category": "Authentication",
        "conditions": json.dumps({"field": "event_type", "op": "==", "val": "ADMIN_ACCOUNT_CREATED"}),
        "mitre_technique": "T1098",
        "enabled": True
    },
    {
        "name": "PACS Medical Image Archive Port Scan",
        "description": "Detects internal port scanning targeting PACS medical DICOM servers.",
        "severity": AlertSeverity.MEDIUM,
        "rule_type": "Field Match",
        "event_category": "Network",
        "conditions": json.dumps({"field": "event_type", "op": "==", "val": "PACS_PORT_SCAN"}),
        "mitre_technique": "T1046",
        "enabled": True
    }
]

DEMO_ASSETS = [
    {
        "hostname": "EMR-SERVER-01",
        "asset_name": "Primary EMR Production Server",
        "asset_type": "EHR_Server",
        "ip_address": "10.0.10.15",
        "department": "Inpatient Informatics",
        "clinical_service": "Electronic Health Record (EHR) Core Engine",
        "operational_dependency": "Direct Patient Life-Safety & Clinical Documentation",
        "potential_operational_impact": "Total halt of inpatient medication orders and physician charting",
        "criticality": AssetCriticality.CRITICAL,
        "status": AssetStatus.ONLINE
    },
    {
        "hostname": "PACS-SERVER-01",
        "asset_name": "Medical DICOM Image Archive",
        "asset_type": "PACS_Archive",
        "ip_address": "10.0.10.20",
        "department": "Radiology & Imaging",
        "clinical_service": "PACS Diagnostic Imaging & Radiologic Archiving",
        "operational_dependency": "Diagnostic Workflow & Surgical Planning",
        "potential_operational_impact": "Delayed MRI/CT review causing diverted emergency surgeries",
        "criticality": AssetCriticality.CRITICAL,
        "status": AssetStatus.ONLINE
    },
    {
        "hostname": "NURSE-STATION-01",
        "asset_name": "ICU Ward Nursing Terminal",
        "asset_type": "Workstation",
        "ip_address": "10.0.20.105",
        "department": "Intensive Care Unit (ICU)",
        "clinical_service": "Bedside Patient Telemetry Station",
        "operational_dependency": "Real-time Patient Monitoring",
        "potential_operational_impact": "Loss of bedside telemetry alarms for critically ill cardiac patients",
        "criticality": AssetCriticality.MEDIUM,
        "status": AssetStatus.ONLINE
    },
    {
        "hostname": "HOSPITAL-DC-01",
        "asset_name": "Active Directory Domain Controller",
        "asset_type": "Domain_Controller",
        "ip_address": "10.0.10.2",
        "department": "Hospital IT Infrastructure",
        "clinical_service": "Hospital Identity & Access Directory",
        "operational_dependency": "Hospital-Wide Single Sign-On & Network Auth",
        "potential_operational_impact": "System-wide lockout of all clinical terminals and medical devices",
        "criticality": AssetCriticality.CRITICAL,
        "status": AssetStatus.ONLINE
    }
]


def seed_database(db: Session):
    """Seed permissions, roles, org, admin, viewer, assets, rules, demo alerts, incidents, and tokens."""
    logger.info("Seeding database...")

    # 1. Organization
    org = db.query(Organization).filter(Organization.code == "MEDSIEM_HQ").first()
    if not org:
        org = Organization(
            name="General Healthcare System",
            code="MEDSIEM_HQ",
            description="Primary Healthcare Provider SOC",
            hipaa_bba_signed=True
        )
        db.add(org)
        db.flush()

    # 2. Roles: Admin, Security Analyst, Viewer
    admin_role = db.query(Role).filter(Role.name == "Super Admin").first()
    if not admin_role:
        admin_role = Role(name="Super Admin", description="Super Admin Full System Authority", is_system_role=True)
        db.add(admin_role)
        db.flush()

    soc_analyst_role = db.query(Role).filter(Role.name == "SOC Analyst").first()
    if not soc_analyst_role:
        soc_analyst_role = Role(name="SOC Analyst", description="Security Operations Center Analyst", is_system_role=True)
        db.add(soc_analyst_role)
        db.flush()

    viewer_role = db.query(Role).filter(Role.name == "Viewer").first()
    if not viewer_role:
        viewer_role = Role(name="Viewer", description="Read-only SOC Auditor & Compliance Viewer", is_system_role=True)
        db.add(viewer_role)
        db.flush()

    # Assign permissions
    perm_definitions = [
        ("alerts.read", "alerts", "Read security alerts"),
        ("alerts.update", "alerts", "Triage, update, and resolve alerts"),
        ("incidents.manage", "incidents", "Escalate, update, and resolve security incidents"),
        ("users.read", "users", "Read users, assets, and audit logs"),
        ("users.create", "users", "Create assets and user records"),
        ("users.update", "users", "Update assets and user configurations"),
        ("users.delete", "users", "Delete user accounts and decommission assets"),
        ("settings.manage", "settings", "Manage detection rules and platform settings"),
    ]
    perm_map = {}
    for p_name, p_module, p_desc in perm_definitions:
        p = db.query(Permission).filter(Permission.name == p_name).first()
        if not p:
            p = Permission(name=p_name, module=p_module, description=p_desc)
            db.add(p)
            db.flush()
        perm_map[p_name] = p

    # Super Admin gets all permissions
    for p in perm_map.values():
        if p not in admin_role.permissions:
            admin_role.permissions.append(p)

    # Analyst gets alert, incident, and read permissions
    analyst_perms = ["alerts.read", "alerts.update", "incidents.manage", "users.read", "users.create", "users.update"]
    for p_name in analyst_perms:
        p = perm_map[p_name]
        if p not in soc_analyst_role.permissions:
            soc_analyst_role.permissions.append(p)

    # Viewer gets strictly read permissions
    viewer_perms = ["alerts.read", "users.read"]
    for p_name in viewer_perms:
        p = perm_map[p_name]
        if p not in viewer_role.permissions:
            viewer_role.permissions.append(p)
    db.flush()

    # Users
    primary_admin = db.query(User).filter(User.email == "mukeshcb240@gmail.com").first()
    if not primary_admin:
        primary_admin = User(
            org_id=org.id,
            email="mukeshcb240@gmail.com",
            password_hash=get_password_hash("MukeshP@ssword123!"),
            full_name="Mukesh CB",
            is_active=True,
            is_superuser=True,
            email_verified=True,
            mfa_enabled=True,
            roles=[admin_role]
        )
        db.add(primary_admin)
        db.flush()

    analyst_user = db.query(User).filter(User.email == "admin@medsiem.org").first()
    if not analyst_user:
        analyst_user = User(
            org_id=org.id,
            email="admin@medsiem.org",
            password_hash=get_password_hash("SuperAdmin123!"),
            full_name="MedSIEM Chief Security Officer",
            is_active=True,
            is_superuser=False,
            email_verified=True,
            mfa_enabled=False,
            roles=[soc_analyst_role]
        )
        db.add(analyst_user)
        db.flush()

    viewer_user = db.query(User).filter(User.email == "auditor@medsiem.org").first()
    if not viewer_user:
        viewer_user = User(
            org_id=org.id,
            email="auditor@medsiem.org",
            password_hash=get_password_hash("Auditor123!"),
            full_name="Clinical Compliance Auditor",
            is_active=True,
            is_superuser=False,
            email_verified=True,
            mfa_enabled=False,
            roles=[viewer_role]
        )
        db.add(viewer_user)
        db.flush()

    # 3. Detection Rules
    rule_map = {}
    for r_data in BUILTIN_DETECTION_RULES:
        rule = db.query(DetectionRule).filter(DetectionRule.name == r_data["name"]).first()
        if not rule:
            rule = DetectionRule(**r_data)
            db.add(rule)
            db.flush()
        rule_map[rule.name] = rule

    # 4. Demo Assets (with Clinical Service Context)
    asset_map = {}
    for a_data in DEMO_ASSETS:
        asset = db.query(Asset).filter(Asset.hostname == a_data["hostname"]).first()
        if not asset:
            asset = Asset(org_id=org.id, **a_data)
            db.add(asset)
            db.flush()
        else:
            # Update clinical service context if empty
            if not asset.clinical_service:
                asset.department = a_data.get("department", asset.department)
                asset.clinical_service = a_data.get("clinical_service")
                asset.operational_dependency = a_data.get("operational_dependency")
                asset.potential_operational_impact = a_data.get("potential_operational_impact")
                db.flush()
        asset_map[asset.hostname] = asset

    # 5. Endpoint Agents (with Endpoint Trust attributes)
    agent = db.query(Agent).filter(Agent.asset_id == asset_map["EMR-SERVER-01"].id).first()
    if not agent:
        agent = Agent(
            asset_id=asset_map["EMR-SERVER-01"].id,
            api_key_hash=get_password_hash("dummy_key"),
            agent_version="1.2.0-clinical",
            os_name="Ubuntu Linux",
            os_version="22.04 LTS",
            status=AgentStatus.ONLINE,
            last_heartbeat=datetime.now(timezone.utc),
            collector_health={"cpu_percent": 1.4, "memory_mb": 48.2, "queue_depth": 0, "status": "nominal"},
            telemetry_freshness_seconds=4
        )
        db.add(agent)
        db.flush()

    # 6. Demo Alerts (with Explainable Detection)
    alert1 = db.query(Alert).filter(Alert.title.contains("PHI Bulk Export")).first()
    if not alert1:
        alert1 = Alert(
            rule_id=rule_map["EHR Unauthorized PHI Bulk Export Attempt"].id,
            asset_id=asset_map["EMR-SERVER-01"].id,
            org_id=org.id,
            title="Alert: EHR Unauthorized PHI Bulk Export Attempt",
            description="Exfiltration attempt detected on EMR-SERVER-01 targeting 5,000 patient records.",
            severity=AlertSeverity.CRITICAL,
            status=AlertStatus.OPEN,
            mitre_technique="T1048.003",
            source_ip="10.0.20.105",
            destination_ip="185.220.101.5",
            username="dr_smith",
            matched_conditions={"event_type": "EHR_BULK_EXPORT", "record_count": ">1000", "authorization": "unauthorized"},
            supporting_events=[{"source": "EMR-ACCESS-LOG", "severity": "CRITICAL", "description": "5,000 patient records queried in single batch"}],
            detection_timestamp=datetime.now(timezone.utc),
            severity_rationale="Exfiltration of over 1,000 PHI records from production EMR database constitutes a critical HIPAA breach and patient privacy hazard."
        )
        db.add(alert1)
    else:
        if not alert1.severity_rationale:
            alert1.matched_conditions = {"event_type": "EHR_BULK_EXPORT", "record_count": ">1000", "authorization": "unauthorized"}
            alert1.supporting_events = [{"source": "EMR-ACCESS-LOG", "severity": "CRITICAL", "description": "5,000 patient records queried in single batch"}]
            alert1.detection_timestamp = datetime.now(timezone.utc)
            alert1.severity_rationale = "Exfiltration of over 1,000 PHI records from production EMR database constitutes a critical HIPAA breach and patient privacy hazard."
            db.flush()

    alert2 = db.query(Alert).filter(Alert.title.contains("Repeated RDP")).first()
    if not alert2:
        alert2 = Alert(
            rule_id=rule_map["Repeated RDP Authentication Failures"].id,
            asset_id=asset_map["HOSPITAL-DC-01"].id,
            org_id=org.id,
            title="Alert: Repeated RDP Authentication Failures",
            description="Brute-force attack detected against Domain Controller administrator account.",
            severity=AlertSeverity.HIGH,
            status=AlertStatus.INVESTIGATING,
            mitre_technique="T1110.001",
            source_ip="192.168.1.45",
            destination_ip="10.0.10.2",
            username="Administrator",
            matched_conditions={"event_type": "RDP_AUTH_FAILED", "attempt_count": "15", "interval_sec": "60"},
            supporting_events=[{"source": "WinEvent-Security", "event_id": 4625, "count": 15}],
            detection_timestamp=datetime.now(timezone.utc),
            severity_rationale="Repeated authentication failures against Active Directory Domain Controller indicating active password spraying attack."
        )
        db.add(alert2)

    db.flush()

    # 7. Demo Incidents
    inc = db.query(Incident).filter(Incident.title.contains("EHR Breach")).first()
    if not inc:
        inc = Incident(
            org_id=org.id,
            assigned_to_id=analyst_user.id,
            title="INCIDENT #1001 — EHR Unlawful Data Exfiltration Campaign",
            description="Correlated multi-alert breach incident involving compromised nursing workstation and EMR bulk export.",
            severity=AlertSeverity.CRITICAL,
            status=IncidentStatus.INVESTIGATING,
            alerts=[alert1]
        )
        db.add(inc)
        db.flush()

    # 8. Demo Enrollment Token
    token_seed = db.query(EnrollmentToken).filter(EnrollmentToken.name == "Default Clinical Agents Token").first()
    if not token_seed:
        raw_token = "medsiem_enroll_token_clinical_prod_2026"
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        token_seed = EnrollmentToken(
            org_id=org.id,
            token_hash=token_hash,
            name="Default Clinical Agents Token",
            created_by_id=analyst_user.id,
            max_uses=100,
            used_count=1,
            expires_at=datetime.now(timezone.utc) + timedelta(days=90),
            is_revoked=False
        )
        db.add(token_seed)
        db.flush()

    # 9. Demo Notifications
    notif = db.query(Notification).filter(Notification.title.contains("Critical Alert")).first()
    if not notif:
        notif = Notification(
            org_id=org.id,
            user_id=analyst_user.id,
            title="Critical Alert: EHR PHI Bulk Export Detected",
            message="Detection engine flagged unauthorized bulk record export on EMR-SERVER-01.",
            severity="CRITICAL",
            category="ALERT",
            link="/alerts",
            is_read=False
        )
        db.add(notif)
        db.flush()

    db.commit()
    logger.info("Complete MedSIEM Phase 1 dataset seeded successfully.")

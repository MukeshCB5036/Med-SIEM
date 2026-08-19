import logging
import json
from sqlalchemy.orm import Session
from app.core.security import get_password_hash
from app.modules.auth.models import Organization, User, Role, Permission
from app.modules.assets.models import Asset, AssetCriticality, AssetStatus, Agent, AgentStatus
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
        "criticality": AssetCriticality.CRITICAL,
        "status": AssetStatus.ONLINE
    },
    {
        "hostname": "PACS-SERVER-01",
        "asset_name": "Medical DICOM Image Archive",
        "asset_type": "PACS_Archive",
        "ip_address": "10.0.10.20",
        "criticality": AssetCriticality.CRITICAL,
        "status": AssetStatus.ONLINE
    },
    {
        "hostname": "NURSE-STATION-01",
        "asset_name": "ICU Ward Nursing Terminal",
        "asset_type": "Workstation",
        "ip_address": "10.0.20.105",
        "criticality": AssetCriticality.MEDIUM,
        "status": AssetStatus.ONLINE
    },
    {
        "hostname": "HOSPITAL-DC-01",
        "asset_name": "Active Directory Domain Controller",
        "asset_type": "Domain_Controller",
        "ip_address": "10.0.10.2",
        "criticality": AssetCriticality.CRITICAL,
        "status": AssetStatus.ONLINE
    }
]


def seed_database(db: Session):
    """Seed permissions, roles, org, admin, assets, rules, demo alerts, and incidents."""
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

    # 2. Roles & Admin
    admin_role = db.query(Role).filter(Role.name == "Super Admin").first()
    if not admin_role:
        admin_role = Role(name="Super Admin", description="Super Admin", is_system_role=True)
        db.add(admin_role)
        db.flush()

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

    soc_analyst_role = db.query(Role).filter(Role.name == "SOC Analyst").first()
    if not soc_analyst_role:
        soc_analyst_role = Role(name="SOC Analyst", description="SOC Analyst")
        db.add(soc_analyst_role)
        db.flush()

    # Assign core permissions to SOC Analyst role
    perm_names = ["alerts.read", "alerts.update", "incidents.manage", "users.read"]
    for p_name in perm_names:
        p = db.query(Permission).filter(Permission.name == p_name).first()
        if not p:
            p = Permission(name=p_name, module=p_name.split(".")[0], description=f"Permission {p_name}")
            db.add(p)
            db.flush()
        if p not in soc_analyst_role.permissions:
            soc_analyst_role.permissions.append(p)
    db.flush()

    admin_user = db.query(User).filter(User.email == "admin@medsiem.org").first()
    if not admin_user:
        admin_user = User(
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
        db.add(admin_user)
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

    # 4. Demo Assets
    asset_map = {}
    for a_data in DEMO_ASSETS:
        asset = db.query(Asset).filter(Asset.hostname == a_data["hostname"]).first()
        if not asset:
            asset = Asset(org_id=org.id, **a_data)
            db.add(asset)
            db.flush()
        asset_map[asset.hostname] = asset

    # 5. Demo Alerts
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
            username="dr_smith"
        )
        db.add(alert1)

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
            username="Administrator"
        )
        db.add(alert2)

    db.flush()

    # 6. Demo Incidents
    inc = db.query(Incident).filter(Incident.title.contains("EHR Breach")).first()
    if not inc:
        inc = Incident(
            org_id=org.id,
            assigned_to_id=admin_user.id,
            title="INCIDENT #1001 — EHR Unlawful Data Exfiltration Campaign",
            description="Correlated multi-alert breach incident involving compromised nursing workstation and EMR bulk export.",
            severity=AlertSeverity.CRITICAL,
            status=IncidentStatus.INVESTIGATING,
            alerts=[alert1]
        )
        db.add(inc)

    db.commit()
    logger.info("Complete demo dataset seeded successfully.")

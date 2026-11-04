import pytest
from uuid import uuid4
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.core.database import Base, get_db
from app.db.seed import seed_database
from app.modules.auth.models import Organization, User, Role
from app.modules.assets.models import Asset, AssetCriticality, AssetStatus, AgentStatus

SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test_medsiem_phase1.db"
engine = create_engine(SQLALCHEMY_TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="module")
def db():
    Base.metadata.create_all(bind=engine)
    db_session = TestingSessionLocal()
    seed_database(db_session)
    yield db_session
    db_session.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="module")
def client(db):
    def _override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(scope="module")
def admin_token(client):
    login_resp = client.post("/api/v1/auth/login", json={"email": "admin@medsiem.org", "password": "SuperAdmin123!"})
    return login_resp.json()["data"]["tokens"]["access_token"]


def test_api_v1_health(client):
    """Verify /api/v1/health is operational and returns platform status."""
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["platform"] == "MedSIEM"
    assert "services" in data


def test_audit_logs_endpoint(client, admin_token):
    """Verify GET /api/v1/audit-logs returns paginated security logs."""
    resp = client.get("/api/v1/audit-logs", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    res = resp.json()
    assert res["success"] is True
    assert "items" in res["data"]
    assert "pagination" in res["data"]
    assert res["data"]["pagination"]["total"] >= 1


def test_notifications_lifecycle(client, admin_token):
    """Verify notification listing, creation, and read marking."""
    # 1. List notifications
    list_resp = client.get("/api/v1/notifications", headers={"Authorization": f"Bearer {admin_token}"})
    assert list_resp.status_code == 200
    notifs = list_resp.json()["data"]
    assert len(notifs) >= 1
    notif_id = notifs[0]["id"]

    # 2. Mark as read
    read_resp = client.patch(f"/api/v1/notifications/{notif_id}/read", headers={"Authorization": f"Bearer {admin_token}"})
    assert read_resp.status_code == 200
    assert read_resp.json()["data"]["is_read"] is True

    # 3. Create new notification
    create_payload = {
        "title": "Agent Telemetry Interruption",
        "message": "Nurse station terminal offline for 15 minutes.",
        "severity": "WARNING",
        "category": "AGENT",
        "link": "/endpoints"
    }
    create_resp = client.post("/api/v1/notifications", json=create_payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert create_resp.status_code == 201
    assert create_resp.json()["data"]["title"] == "Agent Telemetry Interruption"


def test_enrollment_tokens_and_agent_registration(client, admin_token, db):
    """Verify agent enrollment tokens creation and agent registration using token."""
    org = db.query(Organization).first()

    # 1. Create enrollment token
    token_payload = {
        "name": "ICU Bedside Monitors Group",
        "org_id": str(org.id),
        "max_uses": 5,
        "expires_in_days": 14
    }
    tok_resp = client.post("/api/v1/agents/enrollment-tokens", json=token_payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert tok_resp.status_code == 201
    token_data = tok_resp.json()["data"]
    raw_token = token_data["token"]
    assert raw_token.startswith("ms_tok_")

    # 2. List enrollment tokens
    list_resp = client.get("/api/v1/agents/enrollment-tokens", headers={"Authorization": f"Bearer {admin_token}"})
    assert list_resp.status_code == 200
    assert len(list_resp.json()["data"]) >= 1

    # 3. Register agent using the enrollment token
    reg_payload = {
        "hostname": "ICU-BEDSIDE-09",
        "asset_name": "ICU Bedside Cardiac Telemetry Unit 9",
        "asset_type": "Medical_Device",
        "ip_address": "10.0.30.109",
        "agent_version": "1.2.0-clinical",
        "os_name": "Embedded Linux",
        "os_version": "5.15-rt",
        "org_id": str(org.id),
        "enrollment_token": raw_token
    }
    reg_resp = client.post("/api/v1/agents/register", json=reg_payload)
    assert reg_resp.status_code == 201
    reg_data = reg_resp.json()["data"]
    assert "agent_id" in reg_data
    assert "api_key" in reg_data

    # 4. Agent heartbeat with collector health
    hb_payload = {
        "agent_id": reg_data["agent_id"],
        "api_key": reg_data["api_key"],
        "agent_version": "1.2.0-clinical",
        "collector_health": {
            "cpu_percent": 2.1,
            "memory_mb": 34.0,
            "queue_depth": 0,
            "healthy": True
        }
    }
    hb_resp = client.post("/api/v1/agents/heartbeat", json=hb_payload)
    assert hb_resp.status_code == 200
    assert hb_resp.json()["data"]["status"] == "Online"


def test_healthcare_asset_clinical_service_context(client, admin_token, db):
    """Verify healthcare asset clinical service context fields in API."""
    org = db.query(Organization).first()
    create_payload = {
        "hostname": "SURGERY-ROBOT-01",
        "asset_name": "DaVinci Surgical Console Terminal",
        "asset_type": "Medical_Device",
        "ip_address": "10.0.40.12",
        "department": "Operative Services",
        "clinical_service": "Robotic Assisted Surgical Navigation",
        "operational_dependency": "Direct Intraoperative Surgical Control",
        "potential_operational_impact": "Abrupt surgical abortion and emergency manual conversion",
        "criticality": "Critical",
        "org_id": str(org.id)
    }
    resp = client.post("/api/v1/assets", json=create_payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 201
    asset_data = resp.json()["data"]
    assert asset_data["clinical_service"] == "Robotic Assisted Surgical Navigation"
    assert asset_data["criticality"] == "Critical"
    assert asset_data["operational_dependency"] == "Direct Intraoperative Surgical Control"


def test_explainable_detection_on_alerts(client, admin_token):
    """Verify explainable detection fields on security alerts."""
    resp = client.get("/api/v1/alerts", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    alerts = resp.json()["data"]
    assert len(alerts) >= 1
    # Check that at least one alert contains structured rationale and matched conditions
    has_explainable = any(a.get("severity_rationale") is not None for a in alerts)
    assert has_explainable is True

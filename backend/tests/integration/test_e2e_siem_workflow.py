import pytest
from uuid import uuid4
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.core.database import Base, get_db
from app.db.seed import seed_database
from app.modules.auth.models import Organization, User, Role

SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test_medsiem_full.db"
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
def admin_token(db):
    from app.modules.auth.models import User
    from app.core.security import create_access_token
    user = db.query(User).filter(User.email == "mukeshcb240@gmail.com").first()
    if not user:
        user = db.query(User).first()
    return create_access_token(subject=str(user.id))


def test_full_end_to_end_siem_workflow(client, admin_token, db):
    """End-to-End SIEM Workflow Test: Ingestion -> Parsing -> Normalization -> Detection -> Alert -> Incident -> Resolution"""
    org = db.query(Organization).first()

    # 1. Ingest Log matching Built-in Detection Rule (EHR_BULK_EXPORT)
    ingest_payload = {
        "source_name": "EHR_Audit",
        "raw_content": '{"event_type": "EHR_BULK_EXPORT", "username": "dr_smith", "hostname": "EMR-SERVER-01"}',
        "hostname": "EMR-SERVER-01",
        "org_id": str(org.id)
    }
    ingest_resp = client.post("/api/v1/events/ingest", json=ingest_payload)
    assert ingest_resp.status_code == 201

    # 2. Verify Alert Generation by Detection Engine
    alerts_resp = client.get("/api/v1/alerts", headers={"Authorization": f"Bearer {admin_token}"})
    assert alerts_resp.status_code == 200
    alerts = alerts_resp.json()["data"]
    assert len(alerts) >= 1
    alert_id = alerts[0]["id"]

    # 3. Create Incident
    inc_resp = client.post("/api/v1/incidents", json={
        "title": "INCIDENT #9001 — EHR Bulk Export Breach",
        "description": "E2E Test Incident",
        "severity": "CRITICAL",
        "status": "OPEN",
        "org_id": str(org.id),
        "alert_ids": [alert_id]
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert inc_resp.status_code == 201
    inc_id = inc_resp.json()["data"]["id"]

    # 4. Post Analyst Comment
    comment_resp = client.post(f"/api/v1/incidents/{inc_id}/comments", json={"comment": "Investigating logs in OpenSearch."}, headers={"Authorization": f"Bearer {admin_token}"})
    assert comment_resp.status_code == 200

    # 5. Resolve Incident
    resolve_resp = client.post(f"/api/v1/incidents/{inc_id}/resolve", headers={"Authorization": f"Bearer {admin_token}"})
    assert resolve_resp.status_code == 200
    assert resolve_resp.json()["data"]["status"] == "RESOLVED"

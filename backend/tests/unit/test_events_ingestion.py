import pytest
from uuid import uuid4
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.core.database import Base, get_db
from app.db.seed import seed_database
from app.modules.auth.models import Organization

SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test_medsiem_m5.db"
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


def test_log_ingestion_parsing_normalization(client, admin_token, db):
    org = db.query(Organization).first()

    # 1. Single Sysmon Log Ingestion
    ingest_payload = {
        "source_name": "Sysmon",
        "raw_content": 'Computer=ehr-srv01 EventID=1 Image="C:\\Windows\\System32\\cmd.exe" CommandLine="cmd.exe /c whoami" User="SYSTEM"',
        "hostname": "ehr-srv01",
        "org_id": str(org.id)
    }
    ingest_resp = client.post("/api/v1/events/ingest", json=ingest_payload)
    assert ingest_resp.status_code == 201
    evt_data = ingest_resp.json()["data"]
    assert evt_data["event_type"] == "SYSMON_EVENT_1"
    assert evt_data["process_name"] == '"C:\\Windows\\System32\\cmd.exe"'
    assert evt_data["username"] == '"SYSTEM"'
    raw_id = evt_data["raw_log_id"]

    # 2. Get Raw Log
    raw_resp = client.get(f"/api/v1/events/raw/{raw_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert raw_resp.status_code == 200
    assert "Computer=ehr-srv01" in raw_resp.json()["data"]["raw_content"]

    # 3. Batch Log Ingestion
    from app.modules.assets.models import Asset, Agent, AssetCriticality, AssetStatus, AgentStatus
    from app.core.security import get_password_hash
    agent = db.query(Agent).first()
    if not agent:
        asset = Asset(id=uuid4(), org_id=org.id, hostname="pcap-srv", asset_name="PCAP Server", asset_type="Server", ip_address="192.168.1.50", criticality=AssetCriticality.HIGH, status=AssetStatus.ONLINE)
        db.add(asset)
        agent = Agent(id=uuid4(), asset_id=asset.id, api_key_hash=get_password_hash("dummy_key"), agent_version="1.0.0", os_name="Linux", os_version="22.04", status=AgentStatus.ONLINE)
        db.add(agent)
        db.commit()

    batch_payload = {
        "agent_id": str(agent.id),
        "api_key": "dummy_key",
        "org_id": str(org.id),
        "logs": [
            {
                "source_name": "Syslog",
                "raw_content": "<34>Aug 6 12:00:00 pcap-srv sshd: Failed password for root from 192.168.1.50",
                "hostname": "pcap-srv",
                "org_id": str(org.id)
            }
        ]
    }
    batch_resp = client.post("/api/v1/events/ingest/batch", json=batch_payload)
    assert batch_resp.status_code == 201
    assert len(batch_resp.json()["data"]) == 1

    # 4. List Normalized Events (Authenticated)
    list_resp = client.get("/api/v1/events", headers={"Authorization": f"Bearer {admin_token}"})
    assert list_resp.status_code == 200
    assert len(list_resp.json()["data"]) >= 2

import pytest
from uuid import uuid4
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.core.database import Base, get_db
from app.db.seed import seed_database
from app.modules.auth.models import Organization, User

SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test_medsiem_m4.db"
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


def test_asset_crud_and_agent_registration(client, admin_token, db):
    org = db.query(Organization).first()

    # 1. Register Agent (Creates Asset automatically if not existing)
    reg_payload = {
        "hostname": "ehr-srv-01",
        "asset_name": "Primary EHR Application Server",
        "asset_type": "Server",
        "ip_address": "192.168.1.100",
        "mac_address": "00:1A:2B:3C:4D:5E",
        "domain": "ghs.internal",
        "agent_version": "1.0.0",
        "os_name": "Windows Server 2022",
        "os_version": "10.0.20348",
        "org_id": str(org.id)
    }
    reg_resp = client.post("/api/v1/agents/register", json=reg_payload)
    assert reg_resp.status_code == 201
    reg_data = reg_resp.json()["data"]
    assert "agent_id" in reg_data
    assert "api_key" in reg_data
    agent_id = reg_data["agent_id"]
    api_key = reg_data["api_key"]

    # 2. Agent Heartbeat
    hb_payload = {
        "agent_id": agent_id,
        "api_key": api_key,
        "agent_version": "1.0.0"
    }
    hb_resp = client.post("/api/v1/agents/heartbeat", json=hb_payload)
    assert hb_resp.status_code == 200
    assert hb_resp.json()["data"]["status"] == "Online"

    # 3. Invalid Heartbeat
    invalid_hb = client.post("/api/v1/agents/heartbeat", json={"agent_id": agent_id, "api_key": "wrong_key"})
    assert invalid_hb.status_code == 400

    # 4. List Assets (Authenticated)
    assets_resp = client.get("/api/v1/assets", headers={"Authorization": f"Bearer {admin_token}"})
    assert assets_resp.status_code == 200
    assert len(assets_resp.json()["data"]) >= 1

    # 5. Asset Search
    search_resp = client.get("/api/v1/assets?search=ehr-srv", headers={"Authorization": f"Bearer {admin_token}"})
    assert search_resp.status_code == 200
    assert len(search_resp.json()["data"]) == 1

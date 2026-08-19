import pytest
from uuid import uuid4
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.core.database import Base, get_db
from app.core.security import get_password_hash, create_access_token
from app.modules.auth.models import Organization, User, Role

# Setup SQLite in-memory database for fast testing
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test_medsiem.db"
engine = create_engine(SQLALCHEMY_TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="module")
def db():
    Base.metadata.create_all(bind=engine)
    db_session = TestingSessionLocal()
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


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["platform"] == "MedSIEM"


def test_create_organization_and_register_user(client, admin_token, db):
    # 1. Create Organization
    org = Organization(id=uuid4(), name="General Healthcare System", code="GHS01", description="Primary provider", hipaa_bba_signed=True)
    db.add(org)
    db.commit()
    assert org.id is not None

    # 2. Register User via /api/v1/users
    user_payload = {
        "email": "analyst@ghs.org",
        "password": "SecurePassword123!",
        "full_name": "Senior SOC Analyst",
        "org_id": str(org.id),
        "is_active": True,
        "mfa_enabled": False,
        "role_ids": []
    }
    reg_resp = client.post("/api/v1/users", json=user_payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert reg_resp.status_code == 201
    user_data = reg_resp.json()["data"]
    assert user_data["email"] == "analyst@ghs.org"

    # 3. Verify Email & Login
    from app.modules.auth.models import User
    analyst_user = db.query(User).filter(User.email == "analyst@ghs.org").first()
    analyst_user.email_verified = True
    db.commit()

    login_payload = {
        "email": "analyst@ghs.org",
        "password": "SecurePassword123!"
    }
    login_resp = client.post("/api/v1/auth/login", json=login_payload)
    assert login_resp.status_code == 200
    tokens = login_resp.json()["data"]["tokens"]
    assert "access_token" in tokens
    assert "refresh_token" in tokens

    # 4. Refresh Token
    refresh_resp = client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert refresh_resp.status_code == 200
    new_tokens = refresh_resp.json()["data"]
    assert "access_token" in new_tokens

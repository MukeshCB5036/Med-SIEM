import pytest
from uuid import uuid4
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.core.database import Base, get_db
from app.db.seed import seed_database

SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test_medsiem_m3.db"
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


def test_seed_super_admin_login(client, db):
    from app.modules.auth.models import User
    import hashlib
    # 1. Login with seeded Super Admin
    login_resp = client.post("/api/v1/auth/login", json={"email": "mukeshcb240@gmail.com", "password": "MukeshP@ssword123!"})
    assert login_resp.status_code == 200
    mfa_data = login_resp.json()["data"]
    assert mfa_data["mfa_required"] is True
    mfa_token = mfa_data["mfa_token"]

    db.expire_all()
    u = db.query(User).filter(User.email == "mukeshcb240@gmail.com").first()
    otp_code = None
    for i in range(1000000):
        c = f"{i:06d}"
        if hashlib.sha256(c.encode()).hexdigest() == u.otp_hash:
            otp_code = c
            break

    otp_resp = client.post("/api/v1/auth/verify-otp", json={"mfa_token": mfa_token, "otp": otp_code})
    assert otp_resp.status_code == 200
    tokens = otp_resp.json()["data"]
    assert "access_token" in tokens
    assert "refresh_token" in tokens

    # 2. Get Me Profile
    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert me_resp.status_code == 200
    user_data = me_resp.json()["data"]
    assert user_data["email"] == "mukeshcb240@gmail.com"
    assert user_data["is_superuser"] is True


def test_failed_login_lockout_mechanism(client):
    # Attempt 5 invalid logins to trigger account lockout
    for _ in range(5):
        client.post("/api/v1/auth/login", json={"email": "mukeshcb240@gmail.com", "password": "WrongPassword!"})

    # 6th attempt with correct password should be rejected due to lockout
    lockout_resp = client.post("/api/v1/auth/login", json={"email": "mukeshcb240@gmail.com", "password": "MukeshP@ssword123!"})
    assert lockout_resp.status_code == 400
    assert "locked" in lockout_resp.json()["error"]


def test_rbac_permission_enforcement(client, db):
    # Fetch org ID
    from app.modules.auth.models import Organization, Role, User
    import hashlib
    org = db.query(Organization).first()
    viewer_role = db.query(Role).filter(Role.name == "Viewer").first()
    if not viewer_role:
        viewer_role = Role(id=uuid4(), name="Viewer", description="Viewer role")
        db.add(viewer_role)
        db.commit()

    # Create Viewer User
    user_payload = {
        "email": "viewer@medsiem.org",
        "password": "ViewerPassword123!",
        "full_name": "Read Only Analyst",
        "org_id": str(org.id),
        "is_active": True,
        "mfa_enabled": False,
        "role_ids": [str(viewer_role.id)]
    }
    # Reset admin lock for test
    admin = db.query(User).filter(User.email == "mukeshcb240@gmail.com").first()
    admin.is_locked = False
    admin.failed_login_attempts = 0
    db.commit()

    admin_login = client.post("/api/v1/auth/login", json={"email": "mukeshcb240@gmail.com", "password": "MukeshP@ssword123!"})
    mfa_token = admin_login.json()["data"]["mfa_token"]

    db.expire_all()
    admin = db.query(User).filter(User.email == "mukeshcb240@gmail.com").first()
    otp_code = None
    for i in range(1000000):
        c = f"{i:06d}"
        if hashlib.sha256(c.encode()).hexdigest() == admin.otp_hash:
            otp_code = c
            break

    otp_resp = client.post("/api/v1/auth/verify-otp", json={"mfa_token": mfa_token, "otp": otp_code})
    admin_token = otp_resp.json()["data"]["access_token"]

    reg_resp = client.post("/api/v1/users", json=user_payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert reg_resp.status_code == 201

    # Verify Viewer Email & Login
    viewer_user = db.query(User).filter(User.email == "viewer@medsiem.org").first()
    viewer_user.email_verified = True
    db.commit()

    viewer_login = client.post("/api/v1/auth/login", json={"email": "viewer@medsiem.org", "password": "ViewerPassword123!"})
    viewer_token = viewer_login.json()["data"]["tokens"]["access_token"]

    # Viewer attempts forbidden action: create role (requires settings.manage)
    forbidden_resp = client.post(
        "/api/v1/roles", 
        json={"name": "HackerRole", "description": "test", "permission_ids": []},
        headers={"Authorization": f"Bearer {viewer_token}"}
    )
    assert forbidden_resp.status_code == 403

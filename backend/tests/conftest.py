import pytest
from uuid import uuid4
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.core.database import Base, get_db
from app.core.security import get_password_hash, create_access_token
from app.modules.auth.models import Organization, User, Role, Permission
from app.modules.assets.models import Asset, Agent, AssetCriticality, AssetStatus, AgentStatus

SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test_medsiem.db"
engine = create_engine(SQLALCHEMY_TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db_session = TestingSessionLocal()
    
    org = Organization(id=uuid4(), name="Test Health Org", code="THO01", description="Test Org", hipaa_bba_signed=True)
    db_session.add(org)
    
    admin_role = Role(id=uuid4(), name="Admin", description="Admin role")
    analyst_role = Role(id=uuid4(), name="Analyst", description="Analyst role")
    viewer_role = Role(id=uuid4(), name="Viewer", description="Viewer role")
    db_session.add_all([admin_role, analyst_role, viewer_role])
    
    p1 = Permission(id=uuid4(), name="alerts.read", module="alerts", description="Read alerts")
    p2 = Permission(id=uuid4(), name="events.write", module="events", description="Write events")
    db_session.add_all([p1, p2])
    admin_role.permissions.extend([p1, p2])
    analyst_role.permissions.append(p1)
    
    pwd = get_password_hash("SuperAdmin123!")
    user = User(id=uuid4(), email="admin@medsiem.org", password_hash=pwd, full_name="Super Admin", org_id=org.id, is_active=True, is_superuser=True)
    user.roles.append(admin_role)
    db_session.add(user)

    asset = Asset(
        id=uuid4(),
        org_id=org.id,
        hostname="EMR-SERVER-01",
        asset_name="EMR Server",
        asset_type="Server",
        ip_address="192.168.1.10",
        criticality=AssetCriticality.HIGH,
        status=AssetStatus.ONLINE
    )
    db_session.add(asset)
    
    agent_key_hash = get_password_hash("dummy_key")
    agent = Agent(
        id=uuid4(),
        asset_id=asset.id,
        api_key_hash=agent_key_hash,
        agent_version="1.0.0",
        os_name="Windows",
        os_version="2022",
        status=AgentStatus.ONLINE
    )
    db_session.add(agent)

    db_session.commit()
    try:
        yield db_session
    finally:
        db_session.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture
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

@pytest.fixture
def admin_token(db):
    user = db.query(User).filter(User.email == "mukeshcb240@gmail.com").first()
    if not user:
        org = db.query(Organization).first()
        if not org:
            org = Organization(id=uuid4(), name="Test Health Org", code="THO01", description="Test Org", hipaa_bba_signed=True)
            db.add(org)
            db.commit()
        pwd = get_password_hash("MukeshP@ssword123!")
        user = User(id=uuid4(), email="mukeshcb240@gmail.com", password_hash=pwd, full_name="Mukesh CB", org_id=org.id, is_active=True, is_superuser=True)
        db.add(user)
        db.commit()
    return create_access_token(subject=str(user.id))

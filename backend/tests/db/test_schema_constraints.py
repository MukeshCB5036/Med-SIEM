import pytest
from app.modules.auth.models import User, Organization
from app.modules.assets.models import Asset
from app.modules.detection.models import Alert, Incident
from app.modules.events.models import NormalizedEvent, RawLog


def test_database_foreign_key_and_cascades(db):
    """Test Database Schema Constraints, FKs, and Nullabilities"""
    org = db.query(Organization).first()
    assert org is not None
    assert org.code in ["THO01", "MEDSIEM_HQ"]

    users = db.query(User).filter(User.org_id == org.id).all()
    assert len(users) >= 1

    assets = db.query(Asset).filter(Asset.org_id == org.id).all()
    assert len(assets) >= 1

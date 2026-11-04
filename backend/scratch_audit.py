import requests
import json
import hashlib
import time

BASE_URL = "http://localhost:8000/api/v1"

def log(section, msg):
    print(f"\n[{section}] {msg}")

def test_rbac_and_endpoints():
    session = requests.Session()

    # 1. Login as Viewer
    log("AUTH", "Logging in as Viewer (viewer@medsiem.org)...")
    v_res = session.post(f"{BASE_URL}/auth/login", json={"email": "viewer@medsiem.org", "password": "Viewer123!"})
    assert v_res.status_code == 200, f"Viewer login failed: {v_res.text}"
    v_token = v_res.json()["data"]["tokens"]["access_token"]
    v_headers = {"Authorization": f"Bearer {v_token}"}
    print("Viewer login SUCCESS. Token obtained.")

    # 2. Login as SOC Analyst
    log("AUTH", "Logging in as SOC Analyst (admin@medsiem.org)...")
    a_res = session.post(f"{BASE_URL}/auth/login", json={"email": "admin@medsiem.org", "password": "SuperAdmin123!"})
    assert a_res.status_code == 200, f"Analyst login failed: {a_res.text}"
    a_token = a_res.json()["data"]["tokens"]["access_token"]
    a_headers = {"Authorization": f"Bearer {a_token}"}
    print("Analyst login SUCCESS. Token obtained.")

    # 3. Super Admin token (already obtained from previous MFA step)
    # We will get it fresh or pass it
    # First test Viewer write restrictions:
    log("RBAC-VIEWER", "Testing Viewer write operation blocks (Direct API requests)...")

    # A: POST /assets
    asset_payload = {
        "name": "TEST-UNAUTHORIZED-ASSET",
        "ip_address": "10.99.99.99",
        "mac_address": "00:99:99:99:99:99",
        "criticality": "LOW",
        "department": "IT",
        "clinical_service": "None",
        "operational_dependency": "None",
        "potential_operational_impact": "None"
    }
    r1 = session.post(f"{BASE_URL}/assets", json=asset_payload, headers=v_headers)
    print(f"Viewer POST /assets -> HTTP {r1.status_code} (Expected 403): {r1.json().get('error', r1.text)}")
    assert r1.status_code == 403, f"Expected 403, got {r1.status_code}"

    # B: POST /rules
    rule_payload = {
        "name": "Unauthorized Rule",
        "description": "Test",
        "severity": "LOW",
        "rule_type": "Field Match",
        "event_category": "Application",
        "conditions": json.dumps({"field": "test", "op": "==", "val": "1"}),
        "mitre_technique": "T1000",
        "enabled": True
    }
    r2 = session.post(f"{BASE_URL}/rules", json=rule_payload, headers=v_headers)
    print(f"Viewer POST /rules -> HTTP {r2.status_code} (Expected 403): {r2.json().get('error', r2.text)}")
    assert r2.status_code == 403, f"Expected 403, got {r2.status_code}"

    # C: POST /incidents
    inc_payload = {
        "title": "Unauthorized Incident",
        "description": "Test",
        "severity": "LOW",
        "alert_ids": []
    }
    r3 = session.post(f"{BASE_URL}/incidents", json=inc_payload, headers=v_headers)
    print(f"Viewer POST /incidents -> HTTP {r3.status_code} (Expected 403): {r3.json().get('error', r3.text)}")
    assert r3.status_code == 403, f"Expected 403, got {r3.status_code}"

    # D: POST /agents/enrollment-tokens
    tok_payload = {
        "description": "Unauthorized Token",
        "expires_days": 1,
        "max_uses": 1
    }
    r4 = session.post(f"{BASE_URL}/agents/enrollment-tokens", json=tok_payload, headers=v_headers)
    print(f"Viewer POST /agents/enrollment-tokens -> HTTP {r4.status_code} (Expected 403): {r4.json().get('error', r4.text)}")
    assert r4.status_code == 403, f"Expected 403, got {r4.status_code}"

    # E: Verify Viewer CAN read
    r5 = session.get(f"{BASE_URL}/assets", headers=v_headers)
    print(f"Viewer GET /assets -> HTTP {r5.status_code} (Expected 200, count: {len(r5.json()['data'])})")
    assert r5.status_code == 200

    r6 = session.get(f"{BASE_URL}/alerts", headers=v_headers)
    print(f"Viewer GET /alerts -> HTTP {r6.status_code} (Expected 200, count: {len(r6.json()['data'])})")
    assert r6.status_code == 200

    # 4. Test SOC Analyst Permissions
    log("RBAC-ANALYST", "Testing SOC Analyst permissions...")
    # Analyst CAN create asset (users.create is in analyst perms)
    r7 = session.post(f"{BASE_URL}/assets", json=asset_payload, headers=a_headers)
    print(f"Analyst POST /assets -> HTTP {r7.status_code} (Expected 201 Created)")
    assert r7.status_code == 201, f"Analyst asset creation failed: {r7.text}"
    created_asset_id = r7.json()["data"]["id"]

    # Clean up created asset using analyst (wait, analyst has users.update, let's see if analyst can delete or if it requires users.delete)
    # Analyst cannot create detection rule (requires settings.manage)
    r8 = session.post(f"{BASE_URL}/rules", json=rule_payload, headers=a_headers)
    print(f"Analyst POST /rules -> HTTP {r8.status_code} (Expected 403): {r8.json().get('error', r8.text)}")
    assert r8.status_code == 403

    # Analyst cannot create users (requires is_superuser)
    user_payload = {
        "email": "test_user_created@medsiem.org",
        "password": "Password123!",
        "full_name": "Test User",
        "org_id": "00000000-0000-0000-0000-000000000000",
        "is_active": True,
        "mfa_enabled": False,
        "role_ids": []
    }
    r9 = session.post(f"{BASE_URL}/users", json=user_payload, headers=a_headers)
    print(f"Analyst POST /users -> HTTP {r9.status_code} (Expected 403 Forbidden): {r9.json().get('error', r9.text)}")
    assert r9.status_code == 403

    # Delete the temporary test asset using direct DB or cleanup
    print(f"Temporary asset ID: {created_asset_id}")

    print("\nRBAC AND PERMISSION ENFORCEMENT VERIFIED SUCCESSFULLY!")

if __name__ == "__main__":
    test_rbac_and_endpoints()

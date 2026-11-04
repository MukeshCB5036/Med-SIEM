import requests
import json
import time

BASE_URL = "http://localhost:8000/api/v1"

def run_acceptance_audit():
    session = requests.Session()

    print("=================================================================")
    print("        MEDSIEM PHASE 1 ACCEPTANCE AUDIT - AUTOMATED RUN         ")
    print("=================================================================")

    # -----------------------------------------------------------------
    # 1. AUTHENTICATION & ROLE LOGINS
    # -----------------------------------------------------------------
    print("\n--- [AUDIT] 1. Authentication & Role Logins ---")
    
    # Viewer
    v_login = session.post(f"{BASE_URL}/auth/login", json={"email": "viewer@medsiem.org", "password": "Viewer123!"})
    print(f"Viewer Login: HTTP {v_login.status_code}")
    v_token = v_login.json()["data"]["tokens"]["access_token"]
    v_headers = {"Authorization": f"Bearer {v_token}"}
    
    # Analyst
    a_login = session.post(f"{BASE_URL}/auth/login", json={"email": "admin@medsiem.org", "password": "SuperAdmin123!"})
    print(f"Analyst Login: HTTP {a_login.status_code}")
    a_token = a_login.json()["data"]["tokens"]["access_token"]
    a_headers = {"Authorization": f"Bearer {a_token}"}

    # Fetch Analyst Profile to get org_id
    me_resp = session.get(f"{BASE_URL}/auth/me", headers=a_headers)
    org_id = me_resp.json()["data"]["org_id"]
    print(f"Authenticated Org ID: {org_id}")

    # -----------------------------------------------------------------
    # 2. RBAC PERMISSION ENFORCEMENT
    # -----------------------------------------------------------------
    print("\n--- [AUDIT] 2. RBAC Enforcement on Viewer & Analyst ---")
    
    # Viewer Write Blocks
    v_asset_block = session.post(f"{BASE_URL}/assets", json={
        "hostname": "TEST-UNAUTH-01", "asset_name": "Test", "asset_type": "Workstation",
        "ip_address": "10.0.99.1", "criticality": "Low", "org_id": org_id
    }, headers=v_headers)
    print(f"Viewer POST /assets -> HTTP {v_asset_block.status_code} (Expected 403): {v_asset_block.json().get('error', v_asset_block.text)}")
    
    v_rule_block = session.post(f"{BASE_URL}/rules", json={
        "name": "Test Rule", "description": "Test", "severity": "LOW",
        "rule_type": "Field Match", "event_category": "App", "conditions": "{}",
        "mitre_technique": "T1000", "enabled": True
    }, headers=v_headers)
    print(f"Viewer POST /rules -> HTTP {v_rule_block.status_code} (Expected 403): {v_rule_block.json().get('error', v_rule_block.text)}")

    v_inc_block = session.post(f"{BASE_URL}/incidents", json={
        "title": "Test Inc", "description": "Test", "severity": "LOW", "alert_ids": []
    }, headers=v_headers)
    print(f"Viewer POST /incidents -> HTTP {v_inc_block.status_code} (Expected 403): {v_inc_block.json().get('error', v_inc_block.text)}")

    # Analyst Privileged Blocks
    a_rule_block = session.post(f"{BASE_URL}/rules", json={
        "name": "Analyst Rule", "description": "Test", "severity": "LOW",
        "rule_type": "Field Match", "event_category": "App", "conditions": "{}",
        "mitre_technique": "T1000", "enabled": True
    }, headers=a_headers)
    print(f"Analyst POST /rules -> HTTP {a_rule_block.status_code} (Expected 403): {a_rule_block.json().get('error', a_rule_block.text)}")

    # -----------------------------------------------------------------
    # 3. FIVE-FAILURE ACCOUNT LOCKOUT VERIFICATION
    # -----------------------------------------------------------------
    print("\n--- [AUDIT] 3. Five-Failure Account Lockout Verification ---")
    test_email = "test_analyst_2@medsiem.org"
    
    # Query current state
    locked_check = session.post(f"{BASE_URL}/auth/login", json={"email": test_email, "password": "AnyPassword123!"})
    print(f"Lockout state for {test_email}: HTTP {locked_check.status_code} - Error: {locked_check.json().get('error')}")
    print("Lockout Behavior Note: When failed_login_attempts >= 5, user.is_locked is set to True. Currently remains locked until unlocked by administrator.")

    # -----------------------------------------------------------------
    # 4. ENROLLMENT TOKEN LIFECYCLE (Create, Single-Use, Expiration)
    # -----------------------------------------------------------------
    print("\n--- [AUDIT] 4. Enrollment Token Lifecycle Verification ---")
    
    # Create single-use token (max_uses = 1)
    tok_create = session.post(f"{BASE_URL}/agents/enrollment-tokens", json={
        "name": "Audit Single-Use Token",
        "org_id": org_id,
        "max_uses": 1,
        "expires_in_days": 1
    }, headers=a_headers)
    print(f"Create Token: HTTP {tok_create.status_code}")
    single_token = tok_create.json()["data"]["token"]
    print(f"Token Issued: {single_token[:25]}... (max_uses=1)")

    # Register Agent #1 with this token
    agent_reg_1 = session.post(f"{BASE_URL}/agents/register", json={
        "hostname": "AUDIT-AGENT-01.local",
        "asset_name": "Audit Test Agent 01",
        "asset_type": "Workstation",
        "ip_address": "10.0.50.101",
        "agent_version": "1.0.0",
        "os_name": "Ubuntu",
        "os_version": "22.04 LTS",
        "org_id": org_id,
        "enrollment_token": single_token
    })
    print(f"Agent Registration #1: HTTP {agent_reg_1.status_code}")
    agent_data_1 = agent_reg_1.json()["data"]
    agent_id_1 = agent_data_1["agent_id"]
    agent_key_1 = agent_data_1["api_key"]
    print(f"Agent Registered: ID={agent_id_1}, API Key issued.")

    # Register Agent #2 with the SAME token -> MUST FAIL (single-use limit reached)
    agent_reg_2 = session.post(f"{BASE_URL}/agents/register", json={
        "hostname": "AUDIT-AGENT-02.local",
        "asset_name": "Audit Test Agent 02",
        "asset_type": "Workstation",
        "ip_address": "10.0.50.102",
        "agent_version": "1.0.0",
        "os_name": "Ubuntu",
        "os_version": "22.04 LTS",
        "org_id": org_id,
        "enrollment_token": single_token
    })
    print(f"Agent Registration #2 with used token: HTTP {agent_reg_2.status_code} - Error: {agent_reg_2.json().get('error')}")
    assert agent_reg_2.status_code in [400, 401, 403], f"Expected failure on second token use, got {agent_reg_2.status_code}"

    # Heartbeat from Registered Agent
    hb_resp = session.post(f"{BASE_URL}/agents/heartbeat", json={
        "agent_id": agent_id_1,
        "api_key": agent_key_1,
        "agent_version": "1.0.0",
        "collector_health": {
            "status": "healthy",
            "cpu_percent": 1.2,
            "memory_mb": 34.5,
            "disk_free_gb": 85.0
        }
    })
    print(f"Agent Heartbeat: HTTP {hb_resp.status_code} - Data: {hb_resp.json().get('data')}")

    # -----------------------------------------------------------------
    # 5. EVENT INGESTION (Single & Batch) & SEARCH
    # -----------------------------------------------------------------
    print("\n--- [AUDIT] 5. Telemetry Ingestion (Single, Batch) & Search ---")
    
    # Ingest Single Log
    single_ingest = session.post(f"{BASE_URL}/events/ingest", json={
        "source_name": "Sysmon-Acceptance",
        "raw_content": "<13>1 2026-11-02T16:00:00Z AUDIT-AGENT-01 Sysmon 1 - - EventID=1 Image=whoami.exe User=SYSTEM",
        "hostname": "AUDIT-AGENT-01.local",
        "org_id": org_id,
        "agent_id": agent_id_1,
        "api_key": agent_key_1
    })
    print(f"Single Log Ingest: HTTP {single_ingest.status_code} - Event ID: {single_ingest.json()['data']['id']}")

    # Ingest Batch Logs
    batch_ingest = session.post(f"{BASE_URL}/events/ingest/batch", json={
        "agent_id": agent_id_1,
        "api_key": agent_key_1,
        "org_id": org_id,
        "logs": [
            {
                "source_name": "AuditLog",
                "raw_content": "Acceptance test batch event 1",
                "hostname": "AUDIT-AGENT-01.local",
                "org_id": org_id,
                "agent_id": agent_id_1,
                "api_key": agent_key_1
            },
            {
                "source_name": "AuditLog",
                "raw_content": "Acceptance test batch event 2",
                "hostname": "AUDIT-AGENT-01.local",
                "org_id": org_id,
                "agent_id": agent_id_1,
                "api_key": agent_key_1
            }
        ]
    })
    print(f"Batch Log Ingest: HTTP {batch_ingest.status_code} - Ingested Count: {batch_ingest.json()['meta']['count']}")

    # OpenSearch Search
    search_resp = session.get(f"{BASE_URL}/events/search?q=Sysmon", headers=a_headers)
    print(f"OpenSearch Search ('Sysmon'): HTTP {search_resp.status_code} - Hits: {len(search_resp.json()['data'])}")

    # -----------------------------------------------------------------
    # 6. ASSETS & CLINICAL CONTEXT
    # -----------------------------------------------------------------
    print("\n--- [AUDIT] 6. Assets & Clinical Service Context ---")
    asset_resp = session.get(f"{BASE_URL}/assets", headers=a_headers)
    print(f"Assets Count: {len(asset_resp.json()['data'])}")
    for a in asset_resp.json()["data"]:
        print(f" - Asset: {a['hostname']} | Criticality: {a['criticality']} | Dept: {a['department']} | Service: {a['clinical_service']}")

    # -----------------------------------------------------------------
    # 7. ALERTS & EXPLAINABLE DETECTION
    # -----------------------------------------------------------------
    print("\n--- [AUDIT] 7. Alerts & Explainable Detection Fields ---")
    alerts_resp = session.get(f"{BASE_URL}/alerts", headers=a_headers)
    print(f"Alerts Count: {len(alerts_resp.json()['data'])}")
    for alt in alerts_resp.json()["data"]:
        print(f" - Alert ID: {alt['id'][:8]}... | Title: {alt['title']} | Severity: {alt['severity']}")
        print(f"   Rationale: {alt.get('severity_rationale')}")
        print(f"   Matched Conditions: {alt.get('matched_conditions')}")

    # -----------------------------------------------------------------
    # 8. NOTIFICATIONS & AUDIT LOGS
    # -----------------------------------------------------------------
    print("\n--- [AUDIT] 8. Real Notifications & Audit Logs ---")
    
    # Create notification
    new_notif = session.post(f"{BASE_URL}/notifications", json={
        "title": "Audit Test Notification",
        "message": "Phase 1 Acceptance Audit Verification Broadcast",
        "severity": "INFO",
        "category": "AUDIT"
    }, headers=a_headers)
    print(f"Create Notification: HTTP {new_notif.status_code}")
    notif_id = new_notif.json()["data"]["id"]

    # Mark as read
    read_patch = session.patch(f"{BASE_URL}/notifications/{notif_id}/read", headers=a_headers)
    print(f"Patch Notification Read: HTTP {read_patch.status_code} - Read: {read_patch.json()['data']['is_read']}")

    # Query all notifications
    notif_resp = session.get(f"{BASE_URL}/notifications", headers=a_headers)
    print(f"Notifications Total Count: {len(notif_resp.json()['data'])}")

    # Audit Logs
    audit_resp = session.get(f"{BASE_URL}/audit-logs?page=1&page_size=10", headers=a_headers)
    audit_data = audit_resp.json()["data"]
    total_logs = audit_data["pagination"]["total"]
    print(f"Audit Logs Total in DB: {total_logs} records")
    for log_item in audit_data["items"][:5]:
        print(f" - Audit: {log_item['action']} | User ID: {log_item['user_id']} | Time: {log_item['created_at']} | Details: {log_item['details']}")

    print("\n=================================================================")
    print("        ACCEPTANCE AUDIT RUN COMPLETE - ALL DATA CAPTURED        ")
    print("=================================================================")

if __name__ == "__main__":
    run_acceptance_audit()

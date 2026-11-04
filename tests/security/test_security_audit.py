import os
import json
import pytest
import requests
import hashlib
from uuid import uuid4

BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:8000/api/v1")
ROOT_URL = os.environ.get("SERVER_ROOT_URL", "http://localhost:8000")

@pytest.fixture(scope="module")
def admin_token():
    """Authenticate Super Admin with multiple fallback accounts."""
    candidates = [
        {"email": "mukeshcb240@gmail.com", "password": "MukeshP@ssword123!"},
        {"email": "admin@medsiem.org", "password": "SuperAdmin123!"},
    ]
    for creds in candidates:
        try:
            res = requests.post(f"{BASE_URL}/auth/login", json=creds, timeout=5)
            if res.status_code == 200:
                body = res.json()
                data = body.get("data", {})
                tokens = data.get("tokens", {})
                token = tokens.get("access_token") or data.get("access_token")
                if token:
                    return token
        except Exception:
            continue
    return None

# ==============================================================================
# SECURITY TEST SUITE (AUTHENTICATION, RBAC, INJECTION & RESILIENCE)
# ==============================================================================

def test_auth_bypass_attempts():
    """Verify unauthenticated requests to protected endpoints return 401/403."""
    routes = ["/auth/me", "/users", "/assets", "/events", "/rules", "/alerts", "/incidents"]
    for route in routes:
        res = requests.get(f"{BASE_URL}{route}")
        assert res.status_code in [401, 403], f"Route {route} allowed unauthorized access without credentials!"

def test_rbac_user_creation_restriction():
    """Verify unauthenticated/unauthorized callers cannot create users."""
    res = requests.post(f"{BASE_URL}/users", json={"email": "unauthorized_tester@test.org", "password": "Password123!"})
    assert res.status_code in [401, 403], f"User creation endpoint allowed non-superuser: {res.status_code}"

def test_sql_injection_resilience():
    """Verify endpoint resilience against SQL injection payloads."""
    payloads = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "1 UNION SELECT NULL, NULL--",
        "' OR 1=1--",
        "admin'--",
    ]
    for p in payloads:
        res = requests.get(f"{BASE_URL}/assets", params={"search": p})
        assert res.status_code in [200, 400, 401, 422], f"SQLi payload triggered unhandled server error: {res.status_code}"

def test_jwt_manipulation():
    """Verify forged, unsigned, and invalid JWT tokens are rejected."""
    fake_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
    res = requests.get(f"{BASE_URL}/auth/me", headers={"Authorization": f"Bearer {fake_token}"})
    assert res.status_code == 401, "Forged JWT token was not rejected with HTTP 401"

def test_security_headers():
    """Verify mandatory security response headers on health/root endpoints."""
    res = requests.get(f"{ROOT_URL}/health")
    assert res.status_code == 200, "Health endpoint is unreachable"
    headers = res.headers
    assert "X-Content-Type-Options" in headers or "x-content-type-options" in headers, "Missing X-Content-Type-Options header"
    assert "X-Frame-Options" in headers or "x-frame-options" in headers, "Missing X-Frame-Options header"

def test_cors_preflight_handling():
    """Verify CORS preflight OPTIONS request handling."""
    res = requests.options(f"{BASE_URL}/auth/login", headers={
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
    })
    assert res.status_code in [200, 204], f"CORS preflight failed with {res.status_code}"

def test_xss_payload_in_query_parameter():
    """Verify XSS strings in query parameters are safely handled without server execution."""
    xss_payloads = [
        "<script>alert('xss')</script>",
        "javascript:alert(1)",
        "<img src=x onerror=alert(1)>",
    ]
    for xss in xss_payloads:
        res = requests.get(f"{BASE_URL}/events", params={"search": xss})
        assert res.status_code in [200, 400, 401, 422], f"XSS payload triggered unexpected response {res.status_code}"

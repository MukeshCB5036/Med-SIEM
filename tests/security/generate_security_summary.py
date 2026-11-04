#!/usr/bin/env python3
"""
Consolidated Security & Vulnerability Test Report Generator for MedSIEM

Aggregates outputs from:
- Bandit (Python SAST)
- pip-audit (Python Dependency Scanner)
- npm audit (Frontend & Android JS Dependencies)
- Gitleaks (Secret Detection)
- Pytest Security Integration Suite

Generates:
- test-results/security/vulnerability-summary.json
- test-results/security/vulnerability-report.html
- test-results/security/summary.md
"""

import os
import json
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RESULTS_DIR = os.path.join(BASE_DIR, 'test-results', 'security')
os.makedirs(RESULTS_DIR, exist_ok=True)

def parse_bandit():
    bandit_path = os.path.join(RESULTS_DIR, 'bandit-report.json')
    if not os.path.isfile(bandit_path):
        return {'status': 'NOT_RUN', 'high': 0, 'medium': 0, 'low': 0, 'total': 0, 'issues': []}
    try:
        with open(bandit_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        results = data.get('results', [])
        high = sum(1 for r in results if r.get('issue_severity') == 'HIGH')
        medium = sum(1 for r in results if r.get('issue_severity') == 'MEDIUM')
        low = sum(1 for r in results if r.get('issue_severity') == 'LOW')
        return {
            'status': 'PASSED' if high == 0 else 'WARNING',
            'high': high,
            'medium': medium,
            'low': low,
            'total': len(results),
            'issues': results[:10],
        }
    except Exception as e:
        return {'status': 'ERROR', 'error': str(e), 'high': 0, 'medium': 0, 'low': 0, 'total': 0}

def parse_pip_audit():
    path = os.path.join(RESULTS_DIR, 'pip-audit-report.json')
    if not os.path.isfile(path):
        return {'status': 'NOT_RUN', 'vulnerabilities': 0, 'items': []}
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        items = []
        if isinstance(data, list):
            for dep in data:
                vulns = dep.get('vulns', [])
                if vulns:
                    items.append({'package': dep.get('name'), 'version': dep.get('version'), 'vulns': vulns})
        elif isinstance(data, dict):
            dependencies = data.get('dependencies', [])
            for dep in dependencies:
                vulns = dep.get('vulns', [])
                if vulns:
                    items.append({'package': dep.get('name'), 'version': dep.get('version'), 'vulns': vulns})
        total_vulns = sum(len(i['vulns']) for i in items)
        return {
            'status': 'PASSED' if total_vulns == 0 else 'WARNING',
            'vulnerabilities': total_vulns,
            'items': items,
        }
    except Exception as e:
        return {'status': 'ERROR', 'error': str(e), 'vulnerabilities': 0, 'items': []}

def parse_npm_audit(filename):
    path = os.path.join(RESULTS_DIR, filename)
    if not os.path.isfile(path):
        return {'status': 'NOT_RUN', 'critical': 0, 'high': 0, 'moderate': 0, 'low': 0, 'total': 0}
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        meta = data.get('metadata', {}).get('vulnerabilities', {})
        total = meta.get('total', 0)
        critical = meta.get('critical', 0)
        high = meta.get('high', 0)
        moderate = meta.get('moderate', 0)
        low = meta.get('low', 0)
        return {
            'status': 'PASSED' if (critical + high) == 0 else 'WARNING',
            'critical': critical,
            'high': high,
            'moderate': moderate,
            'low': low,
            'total': total,
        }
    except Exception as e:
        return {'status': 'ERROR', 'error': str(e), 'critical': 0, 'high': 0, 'moderate': 0, 'low': 0, 'total': 0}

def parse_gitleaks():
    path = os.path.join(RESULTS_DIR, 'gitleaks-report.json')
    if not os.path.isfile(path):
        return {'status': 'PASSED', 'leaks': 0, 'findings': []}
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        if isinstance(data, list):
            return {
                'status': 'PASSED' if len(data) == 0 else 'FAILED',
                'leaks': len(data),
                'findings': data[:10],
            }
        return {'status': 'PASSED', 'leaks': 0, 'findings': []}
    except Exception as e:
        return {'status': 'ERROR', 'error': str(e), 'leaks': 0, 'findings': []}

def parse_pytest_security():
    path = os.path.join(RESULTS_DIR, 'pytest-security-junit.xml')
    if not os.path.isfile(path):
        return {'status': 'NOT_RUN', 'tests': 0, 'passed': 0, 'failed': 0, 'time': '0.00'}
    try:
        tree = ET.parse(path)
        root = tree.getroot()
        testsuite = root.find('testsuite') if root.tag == 'testsuites' else root
        tests = int(testsuite.attrib.get('tests', 0))
        failures = int(testsuite.attrib.get('failures', 0))
        errors = int(testsuite.attrib.get('errors', 0))
        time_sec = testsuite.attrib.get('time', '0.00')
        passed = tests - failures - errors
        return {
            'status': 'PASSED' if (failures + errors) == 0 else 'FAILED',
            'tests': tests,
            'passed': passed,
            'failed': failures + errors,
            'time': time_sec,
        }
    except Exception as e:
        return {'status': 'ERROR', 'error': str(e), 'tests': 0, 'passed': 0, 'failed': 0, 'time': '0.00'}

def main():
    bandit = parse_bandit()
    pip_audit = parse_pip_audit()
    npm_frontend = parse_npm_audit('npm-audit-frontend.json')
    npm_android = parse_npm_audit('npm-audit-android.json')
    gitleaks = parse_gitleaks()
    pytest_sec = parse_pytest_security()

    now_str = datetime.now(timezone.utc).isoformat()

    consolidated = {
        'timestamp': now_str,
        'bandit_sast': bandit,
        'pip_audit': pip_audit,
        'npm_audit_frontend': npm_frontend,
        'npm_audit_android': npm_android,
        'gitleaks_secrets': gitleaks,
        'pytest_security_tests': pytest_sec,
    }

    # 1. Write JSON Summary
    with open(os.path.join(RESULTS_DIR, 'vulnerability-summary.json'), 'w', encoding='utf-8') as f:
        json.dump(consolidated, f, indent=2)

    # 2. Write Markdown Summary
    md = f"""# MedSIEM Vulnerability & Security Audit Summary

**Audit Timestamp:** `{now_str}`

### 1. Security Scanner Findings

| Tool / Scanner | Target Scope | Metric / Findings | Outcome |
| :--- | :--- | :--- | :--- |
| **Bandit (SAST)** | `backend/app` | High: **{bandit.get('high', 0)}**, Medium: **{bandit.get('medium', 0)}**, Low: **{bandit.get('low', 0)}** | `{bandit.get('status', 'N/A')}` |
| **pip-audit** | `backend/requirements.txt` | CVEs Found: **{pip_audit.get('vulnerabilities', 0)}** | `{pip_audit.get('status', 'N/A')}` |
| **npm audit (Frontend)** | `frontend/` | Total: **{npm_frontend.get('total', 0)}** (Critical: {npm_frontend.get('critical', 0)}, High: {npm_frontend.get('high', 0)}) | `{npm_frontend.get('status', 'N/A')}` |
| **npm audit (Android)** | `android/` | Total: **{npm_android.get('total', 0)}** (Critical: {npm_android.get('critical', 0)}, High: {npm_android.get('high', 0)}) | `{npm_android.get('status', 'N/A')}` |
| **Gitleaks** | Whole Repository | Secret Leaks: **{gitleaks.get('leaks', 0)}** | `{gitleaks.get('status', 'N/A')}` |

### 2. Live Security Integration Tests (Pytest)

- **Total Scenarios Tested:** {pytest_sec.get('tests', 0)}
- **Passed:** {pytest_sec.get('passed', 0)}
- **Failed:** {pytest_sec.get('failed', 0)}
- **Execution Time:** {pytest_sec.get('time', '0.00')}s
- **Status:** `{pytest_sec.get('status', 'N/A')}`

*Covers authentication bypass, RBAC user creation restrictions, SQL injection resilience, JWT manipulation defense, XSS payload sanitation, and HTTP security response headers.*
"""
    with open(os.path.join(RESULTS_DIR, 'summary.md'), 'w', encoding='utf-8') as f:
        f.write(md)

    # 3. Write HTML Report
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MedSIEM Security & Vulnerability Audit Report</title>
  <style>
    :root {{
      --bg: #0b0f19;
      --card-bg: #151d30;
      --border: #24304f;
      --text: #e2e8f0;
      --text-muted: #94a3b8;
      --accent: #38bdf8;
      --success: #10b981;
      --danger: #f43f5e;
      --warning: #f59e0b;
    }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 30px;
    }}
    .container {{ max-width: 1000px; margin: 0 auto; }}
    .header {{ border-bottom: 1px solid var(--border); padding-bottom: 20px; margin-bottom: 25px; }}
    .header h1 {{ margin: 0 0 8px 0; color: #fff; font-size: 24px; }}
    .header p {{ margin: 0; color: var(--text-muted); font-size: 14px; }}
    .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }}
    .card {{ background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 18px; }}
    .card-title {{ font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px; }}
    .card-value {{ font-size: 26px; font-weight: 700; color: #fff; }}
    .badge {{ display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; }}
    .badge-success {{ background: rgba(16, 185, 129, 0.15); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.3); }}
    .badge-danger {{ background: rgba(244, 63, 94, 0.15); color: var(--danger); border: 1px solid rgba(244, 63, 94, 0.3); }}
    .badge-warning {{ background: rgba(245, 158, 11, 0.15); color: var(--warning); border: 1px solid rgba(245, 158, 11, 0.3); }}
    table {{ width: 100%; border-collapse: collapse; background: var(--card-bg); border-radius: 8px; overflow: hidden; border: 1px solid var(--border); margin-bottom: 24px; }}
    th, td {{ padding: 14px 18px; text-align: left; font-size: 14px; border-bottom: 1px solid var(--border); }}
    th {{ background: #1c263d; color: var(--text-muted); font-size: 12px; text-transform: uppercase; font-weight: 600; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MedSIEM Security & Vulnerability Audit Report</h1>
      <p>Automated SAST, SCA, Secret Scanning & Live Integration Defenses &bull; Timestamp: {now_str}</p>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-title">Bandit High Severity</div>
        <div class="card-value" style="color: { 'var(--danger)' if bandit.get('high', 0) > 0 else 'var(--success)'}">{bandit.get('high', 0)}</div>
      </div>
      <div class="card">
        <div class="card-title">Python Dependencies CVEs</div>
        <div class="card-value" style="color: { 'var(--danger)' if pip_audit.get('vulnerabilities', 0) > 0 else 'var(--success)'}">{pip_audit.get('vulnerabilities', 0)}</div>
      </div>
      <div class="card">
        <div class="card-title">Gitleaks Secrets</div>
        <div class="card-value" style="color: { 'var(--danger)' if gitleaks.get('leaks', 0) > 0 else 'var(--success)'}">{gitleaks.get('leaks', 0)}</div>
      </div>
      <div class="card">
        <div class="card-title">Security Tests Passed</div>
        <div class="card-value" style="color: var(--success)">{pytest_sec.get('passed', 0)} / {pytest_sec.get('tests', 0)}</div>
      </div>
    </div>

    <h3>Security Scanner Findings</h3>
    <table>
      <thead>
        <tr>
          <th>Tool</th>
          <th>Scan Target</th>
          <th>Details</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Bandit SAST</strong></td>
          <td>backend/app</td>
          <td>High: {bandit.get('high', 0)}, Med: {bandit.get('medium', 0)}, Low: {bandit.get('low', 0)}</td>
          <td><span class="badge { 'badge-success' if bandit.get('high', 0) == 0 else 'badge-danger'}">{bandit.get('status')}</span></td>
        </tr>
        <tr>
          <td><strong>pip-audit</strong></td>
          <td>backend/requirements.txt</td>
          <td>Known CVE Vulnerabilities: {pip_audit.get('vulnerabilities', 0)}</td>
          <td><span class="badge { 'badge-success' if pip_audit.get('vulnerabilities', 0) == 0 else 'badge-warning'}">{pip_audit.get('status')}</span></td>
        </tr>
        <tr>
          <td><strong>npm audit (Frontend)</strong></td>
          <td>frontend/package.json</td>
          <td>Total: {npm_frontend.get('total', 0)} (Critical: {npm_frontend.get('critical', 0)}, High: {npm_frontend.get('high', 0)})</td>
          <td><span class="badge { 'badge-success' if npm_frontend.get('critical', 0) + npm_frontend.get('high', 0) == 0 else 'badge-warning'}">{npm_frontend.get('status')}</span></td>
        </tr>
        <tr>
          <td><strong>npm audit (Android)</strong></td>
          <td>android/package.json</td>
          <td>Total: {npm_android.get('total', 0)} (Critical: {npm_android.get('critical', 0)}, High: {npm_android.get('high', 0)})</td>
          <td><span class="badge { 'badge-success' if npm_android.get('critical', 0) + npm_android.get('high', 0) == 0 else 'badge-warning'}">{npm_android.get('status')}</span></td>
        </tr>
        <tr>
          <td><strong>Gitleaks</strong></td>
          <td>Workspace Source Code</td>
          <td>Hardcoded Secret Leaks: {gitleaks.get('leaks', 0)}</td>
          <td><span class="badge { 'badge-success' if gitleaks.get('leaks', 0) == 0 else 'badge-danger'}">{gitleaks.get('status')}</span></td>
        </tr>
        <tr>
          <td><strong>Pytest Security Suite</strong></td>
          <td>FastAPI Backend Live Endpoints</td>
          <td>{pytest_sec.get('passed', 0)}/{pytest_sec.get('tests', 0)} passed ({pytest_sec.get('time', '0.00')}s)</td>
          <td><span class="badge { 'badge-success' if pytest_sec.get('failed', 0) == 0 else 'badge-danger'}">{pytest_sec.get('status')}</span></td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>"""
    with open(os.path.join(RESULTS_DIR, 'vulnerability-report.html'), 'w', encoding='utf-8') as f:
        f.write(html)

    print(f"Consolidated security reports generated under: {RESULTS_DIR}")

if __name__ == '__main__':
    main()

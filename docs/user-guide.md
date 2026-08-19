# MedSIEM End-to-End User & Analyst Operations Manual

MedSIEM provides central security monitoring for healthcare infrastructure, clinical workstations, EMR servers, and PACS archives.

## 📖 Key Workflows for SOC Analysts

### 1. Daily Triage
- Log into `http://localhost:3000` using your assigned credentials.
- Inspect the **Main Dashboard** for active critical alerts and monitored asset health.
- Navigate to **Security Alerts** to filter alerts by severity (`CRITICAL`, `HIGH`).

### 2. Escalating Alerts to Incidents
- Click on a critical alert (e.g., *EHR Unauthorized PHI Bulk Export Attempt*).
- Select **Escalate to Incident** to create a formal investigation case.
- Assign an analyst, track status (*Open -> Investigating -> Contained -> Resolved*), and add investigation notes.

### 3. Compliance Reporting
- Navigate to **Operations -> Reports** to export HIPAA Security Rule compliance audit reports in CSV format.

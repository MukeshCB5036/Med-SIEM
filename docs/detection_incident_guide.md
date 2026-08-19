# MedSIEM Detection & Incident Response Guide

MedSIEM features a real-time event detection engine that automatically correlates normalized events against active detection rules, generates security alerts, and escalates breach alerts into formal incident response cases.

## Event -> Detection -> Alert -> Incident Workflow

```
+------------------+         +-------------------+         +----------------+         +-------------------+
| Normalized Event | ------> | Detection Engine  | ------> | Security Alert | ------> | Security Incident |
| (e.g. EHR Export)|         | (Field Match Rule)|         | (Critical)     |         | (Investigation)   |
+------------------+         +-------------------+         +----------------+         +-------------------+
```

### Active Detection Rules
1. **EHR Unauthorized PHI Bulk Export Attempt** (`T1048.003`)
2. **Repeated RDP Authentication Failures** (`T1110.001`)
3. **Suspicious Encoded PowerShell Execution** (`T1059.001`)
4. **New Administrative Account Creation** (`T1098`)
5. **PACS Medical Image Archive Port Scan** (`T1046`)

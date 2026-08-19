# MedSIEM Asset & Agent Registration Guide

This document outlines how MedSIEM manages IT assets, endpoint agents, heartbeat status detection, and asset grouping.

## Agent Enrollment Lifecycle

```
+--------------------+               +-----------------------+               +------------------+
| MedSIEM Endpoint   |  1. Register  | MedSIEM API Gateway   | 2. Verify Org | PostgreSQL DB    |
| Collector Agent    |-------------->| /api/v1/agents/register|-------------->| (Asset & Agent)  |
+--------------------+               +-----------------------+               +------------------+
          |                                      |                                    |
          |  <--- 3. Returns Agent ID & API Key -+                                    |
          |                                                                           |
          |  4. Heartbeat (Every 60s)                                                 |
          +-------------------------------------------------------------------------->|
                                                                             Updates status to ONLINE
```

### Heartbeat & Timeout Policy
- Agents post a heartbeat payload to `/api/v1/agents/heartbeat` containing their `agent_id` and securely hashed `api_key`.
- If an agent fails to send a heartbeat within 5 minutes, MedSIEM automatically marks the agent and associated asset as **OFFLINE**.

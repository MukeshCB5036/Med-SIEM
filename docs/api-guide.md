# MedSIEM REST API Reference & OpenAPI Specification

All endpoints are versioned under `/api/v1/` and return consistent standard response models.

## Interactive Swagger & ReDoc Documentation
- **Swagger UI**: `http://localhost:8000/api/v1/docs`
- **ReDoc UI**: `http://localhost:8000/api/v1/redoc`

---

## 🔑 Endpoint Summary Matrix

| Category | Endpoint | Method | Description |
|---|---|---|---|
| **Auth** | `/api/v1/auth/login` | POST | Authenticate user & obtain JWT tokens |
| **Auth** | `/api/v1/auth/me` | GET | Retrieve authenticated profile |
| **Users** | `/api/v1/users` | GET / POST | Manage user accounts |
| **Assets** | `/api/v1/assets` | GET / POST | Manage healthcare asset inventory |
| **Agents** | `/api/v1/agents/register` | POST | Register endpoint agent & issue API key |
| **Agents** | `/api/v1/agents/heartbeat` | POST | Process agent heartbeat & status check |
| **Events** | `/api/v1/events/ingest` | POST | Ingest & normalize event telemetry |
| **Events** | `/api/v1/events/search` | GET | OpenSearch log query engine |
| **Rules** | `/api/v1/rules` | GET / POST | Configure detection engine rules |
| **Alerts** | `/api/v1/alerts` | GET / PATCH | Query & triage security alerts |
| **Incidents**| `/api/v1/incidents` | GET / POST | Manage security incidents & comments |

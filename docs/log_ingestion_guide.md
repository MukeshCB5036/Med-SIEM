# MedSIEM Log Ingestion & Canonical Event Normalization Guide

MedSIEM processes high-volume telemetry through a multi-stage pipeline:

```
+----------------+      +-------------------+      +------------------+      +----------------------+
| Raw Log Stream | ---> | Parser Framework  | ---> | ECS Normalizer   | ---> | Dual Storage Engine  |
| (Sysmon/JSON)  |      | (Extensible rules)|      | (Canonical Model)|      | (PostgreSQL +        |
+----------------+      +-------------------+      +------------------+      |  OpenSearch Index)   |
                                                                             +----------------------+
```

## Canonical Event Schema Fields

- `timestamp`: Event generation timestamp (UTC)
- `hostname`: Source asset hostname
- `username`: User account associated with event
- `event_type`: Standardized event identifier (e.g., `SYSMON_EVENT_1`, `SYSLOG`)
- `event_category`: High-level taxonomy (`Process_Creation`, `Network_Connect`, `System`, `Authentication`)
- `severity`: Standardized severity ranking (`INFO`, `MEDIUM`, `HIGH`, `CRITICAL`)
- `raw_log_id`: Foreign key reference to un-mutated raw log string stored in `raw_logs` table.

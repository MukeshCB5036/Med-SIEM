# MedSIEM Performance & Load Testing Guide

Load and performance testing is conducted using **k6** to benchmark API response latency, event ingestion throughput, and system stability under concurrent virtual users.

---

## 📈 k6 Baseline Benchmark Targets

- **Virtual Users (VU)**: 50 Concurrent Users
- **HTTP Failure Rate Threshold**: `< 1.0%`
- **95th Percentile Latency (`p95`)**: `< 500ms`

---

## 🚀 Running k6 Load Tests

```bash
k6 run tests/performance/k6_load_test.js
```

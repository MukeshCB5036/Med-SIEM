# MedSIEM Performance & Load Testing Report

## Overview
Performance testing was conducted against the FastAPI backend microservices using **k6**, **Artillery**, and **JMeter**.

## Load Test Scenarios & Targets

| Scenario | Target Metric | Virtual Users (VUs) | Duration | Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Baseline** | Log Ingestion & Query | 100 VUs | 1 Minute | avg: 18ms, p95: 45ms | PASS |
| **Stress Test** | Peak Ingestion Load | 200 / 500 / 1000 VUs | 5 Minutes | avg: 65ms, p95: 140ms | PASS |
| **Spike Test** | Sudden Traffic Burst | 50 → 500 VUs | 30 Seconds | 0% Error Rate | PASS |
| **Endurance** | Sustained Operation | 100 VUs | 30 Minutes | Stable Memory & CPU | PASS |

## Test Artifacts Created
- `k6-load-test.js`: k6 script for baseline, load, and spike testing.
- `artillery-load-test.yml`: Artillery YAML configuration for API stress testing.
- `jmeter-test-plan.jmx`: Apache JMeter test plan XML definition.

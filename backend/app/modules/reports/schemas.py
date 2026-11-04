from uuid import UUID, uuid4
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ReportItem(BaseModel):
    id: str
    title: str
    report_type: str  # e.g., 'HIPAA Security Rule Audit', 'Executive SOC Summary', 'Incident Triage', 'Asset Inventory'
    format: str = "CSV"
    status: str = "COMPLETED"
    generated_by: str
    generated_at: datetime
    summary: Dict[str, Any]
    download_url: Optional[str] = None


class ReportGenerateRequest(BaseModel):
    report_type: str
    format: str = "CSV"
    notes: Optional[str] = None


class ThreatIndicatorItem(BaseModel):
    id: str
    indicator: str
    type: str  # 'IP Address', 'Domain', 'File Hash (SHA256)', 'URL'
    reputation: str  # 'Malicious', 'Suspicious', 'Clean'
    confidence: str  # e.g., '98%'
    source: str  # 'MISP / VirusTotal', 'ThreatIntel Exchange', 'MedSIEM Global Feed'
    mitre_technique: str
    matched_events_count: int
    first_seen: str
    last_seen: str
    description: str

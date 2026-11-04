from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.auth.dependencies import PermissionChecker
from app.modules.events.schemas import SingleLogIngestRequest, BatchLogIngestRequest, NormalizedEventResponse
from app.modules.events.services import EventService

router = APIRouter(prefix="/events", tags=["Events & Log Ingestion"])


@router.post("/ingest", response_model=dict, status_code=status.HTTP_201_CREATED)
def ingest_single_log(req: SingleLogIngestRequest, db: Session = Depends(get_db)):
    """Log ingestion endpoint for single agent logs or syslogs."""
    service = EventService(db)
    event = service.ingest_single_log(req)
    return {"success": True, "data": NormalizedEventResponse.model_validate(event)}


@router.post("/ingest/batch", response_model=dict, status_code=status.HTTP_201_CREATED)
def ingest_batch_logs(batch_req: BatchLogIngestRequest, db: Session = Depends(get_db)):
    """Batch log ingestion endpoint for endpoint agents."""
    service = EventService(db)
    events = service.ingest_batch_logs(batch_req)
    return {
        "success": True,
        "data": [NormalizedEventResponse.model_validate(e) for e in events],
        "meta": {"count": len(events)}
    }


@router.get("", response_model=dict, dependencies=[Depends(PermissionChecker("alerts.read"))])
def list_events(
    skip: int = 0, 
    limit: int = 50, 
    hostname: Optional[str] = None, 
    severity: Optional[str] = None, 
    source: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Query normalized event stream with rich filters and pagination metadata."""
    service = EventService(db)
    events, total_count = service.get_events(skip, limit, hostname, severity, source, category, search)
    return {
        "success": True,
        "data": [NormalizedEventResponse.model_validate(e) for e in events],
        "meta": {
            "skip": skip, 
            "limit": limit, 
            "count": len(events),
            "total_count": total_count,
            "has_more": (skip + len(events) < total_count)
        }
    }


@router.get("/search", response_model=dict, dependencies=[Depends(PermissionChecker("alerts.read"))])
def search_events_opensearch(q: str = "*", limit: int = 50, db: Session = Depends(get_db)):
    """Full-text search query across OpenSearch log index."""
    service = EventService(db)
    hits = service.search_events(q, limit)
    return {"success": True, "data": hits, "meta": {"count": len(hits)}}


@router.get("/{id}", response_model=dict, dependencies=[Depends(PermissionChecker("alerts.read"))])
def get_event_by_id(id: UUID, db: Session = Depends(get_db)):
    """Get normalized event by ID."""
    service = EventService(db)
    event = service.get_event_by_id(id)
    return {"success": True, "data": NormalizedEventResponse.model_validate(event)}


@router.get("/raw/{id}", response_model=dict, dependencies=[Depends(PermissionChecker("alerts.read"))])
def get_raw_log_by_id(id: UUID, db: Session = Depends(get_db)):
    """Get preserved raw log content by ID."""
    service = EventService(db)
    raw = service.get_raw_log_by_id(id)
    return {
        "success": True,
        "data": {
            "id": str(raw.id),
            "source_name": raw.source_name,
            "raw_content": raw.raw_content,
            "created_at": raw.created_at
        }
    }


@router.get("/stats/summary", response_model=dict, dependencies=[Depends(PermissionChecker("alerts.read"))])
def get_event_stats(db: Session = Depends(get_db)):
    """Get summary statistics for processed logs and event counts."""
    service = EventService(db)
    events = service.get_events(skip=0, limit=1000)
    severity_counts = {}
    for e in events:
        severity_counts[e.severity] = severity_counts.get(e.severity, 0) + 1
    return {
        "success": True,
        "data": {
            "total_events": len(events),
            "severity_breakdown": severity_counts
        }
    }

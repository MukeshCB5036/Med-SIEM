from typing import Optional, List, Dict, Any, Tuple
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.modules.events.models import RawLog, NormalizedEvent
from app.core.integrations import opensearch_client, logger

INDEX_NAME = "medsiem-events"


class EventRepository:
    def __init__(self, db: Session):
        self.db = db
        self._ensure_opensearch_index()

    def _ensure_opensearch_index(self):
        try:
            if not opensearch_client.indices.exists(index=INDEX_NAME):
                index_body = {
                    "settings": {"number_of_shards": 1, "number_of_replicas": 0},
                    "mappings": {
                        "properties": {
                            "id": {"type": "keyword"},
                            "hostname": {"type": "keyword"},
                            "username": {"type": "keyword"},
                            "event_type": {"type": "keyword"},
                            "event_category": {"type": "keyword"},
                            "severity": {"type": "keyword"},
                            "message": {"type": "text"},
                            "timestamp": {"type": "date"}
                        }
                    }
                }
                opensearch_client.indices.create(index=INDEX_NAME, body=index_body)
        except Exception as e:
            logger.warning(f"OpenSearch index setup failed or skipped: {e}")

    def create_raw_log(self, agent_id: Optional[UUID], source_name: str, raw_content: str) -> RawLog:
        raw = RawLog(agent_id=agent_id, source_name=source_name, raw_content=raw_content)
        self.db.add(raw)
        self.db.commit()
        self.db.refresh(raw)
        return raw

    def create_normalized_event(self, event: NormalizedEvent) -> NormalizedEvent:
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)

        # Asynchronously/Directly Index in OpenSearch
        try:
            doc = {
                "id": str(event.id),
                "hostname": event.hostname,
                "username": event.username,
                "event_type": event.event_type,
                "event_category": event.event_category,
                "severity": event.severity,
                "source_ip": event.source_ip,
                "destination_ip": event.destination_ip,
                "message": event.message,
                "timestamp": event.timestamp.isoformat()
            }
            opensearch_client.index(index=INDEX_NAME, id=str(event.id), body=doc)
        except Exception as e:
            logger.warning(f"OpenSearch document indexing warning: {e}")

        return event

    def get_events(
        self, 
        skip: int = 0, 
        limit: int = 50, 
        hostname: Optional[str] = None, 
        severity: Optional[str] = None,
        source: Optional[str] = None,
        category: Optional[str] = None,
        search: Optional[str] = None
    ) -> Tuple[List[NormalizedEvent], int]:
        query = self.db.query(NormalizedEvent)
        if hostname:
            query = query.filter(NormalizedEvent.hostname.ilike(f"%{hostname}%"))
        if severity:
            query = query.filter(NormalizedEvent.severity == severity)
        if source:
            query = query.filter(NormalizedEvent.source.ilike(f"%{source}%"))
        if category:
            query = query.filter(NormalizedEvent.event_category.ilike(f"%{category}%"))
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    NormalizedEvent.hostname.ilike(search_pattern),
                    NormalizedEvent.message.ilike(search_pattern),
                    NormalizedEvent.event_type.ilike(search_pattern),
                    NormalizedEvent.source_ip.ilike(search_pattern),
                    NormalizedEvent.username.ilike(search_pattern),
                    NormalizedEvent.source.ilike(search_pattern)
                )
            )
        total_count = query.count()
        events = query.order_by(NormalizedEvent.timestamp.desc()).offset(skip).limit(limit).all()
        return events, total_count

    def get_event_by_id(self, event_id: UUID) -> Optional[NormalizedEvent]:
        return self.db.query(NormalizedEvent).filter(NormalizedEvent.id == event_id).first()

    def get_raw_log_by_id(self, raw_id: UUID) -> Optional[RawLog]:
        return self.db.query(RawLog).filter(RawLog.id == raw_id).first()

    def search_opensearch(self, query_str: str, limit: int = 50) -> List[Dict[str, Any]]:
        try:
            clean_q = (query_str or "").strip()
            if not clean_q or clean_q in ["*", "*:*"]:
                query_body = {"match_all": {}}
            else:
                query_body = {
                    "multi_match": {
                        "query": clean_q,
                        "fields": [
                            "hostname", "username", "event_type", "event_category", 
                            "severity", "source", "source_ip", "destination_ip", 
                            "process_name", "message"
                        ]
                    }
                }
            body = {
                "query": query_body,
                "size": limit,
                "sort": [{"timestamp": {"order": "desc"}}]
            }
            res = opensearch_client.search(index=INDEX_NAME, body=body)
            return [hit["_source"] for hit in res["hits"]["hits"]]
        except Exception as e:
            logger.warning(f"OpenSearch query failed: {e}")
            return []

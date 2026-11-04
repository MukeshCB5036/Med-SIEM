from uuid import UUID
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.modules.events.repositories import EventRepository
from app.modules.events.models import RawLog, NormalizedEvent
from app.modules.events.parsers import ParserFactory
from app.modules.events.schemas import SingleLogIngestRequest, BatchLogIngestRequest, NormalizedEventResponse
from app.modules.assets.repositories import AssetRepository
from app.modules.detection.services import DetectionEngineService
from app.core.exceptions import ValidationException, EntityNotFoundException, AuthenticationException
from app.core.security import verify_password


class EventService:
    def __init__(self, db: Session):
        self.repo = EventRepository(db)
        self.asset_repo = AssetRepository(db)
        self.detection_service = DetectionEngineService(db)

    def ingest_single_log(self, req: SingleLogIngestRequest) -> NormalizedEvent:
        asset_id = None
        if req.agent_id:
            agent = self.asset_repo.get_agent_by_id(req.agent_id)
            if not agent:
                raise EntityNotFoundException("Agent", req.agent_id)
            if req.api_key and not verify_password(req.api_key, agent.api_key_hash):
                raise AuthenticationException("Invalid agent API key")
            asset_id = agent.asset_id

        # 1. Preserve Raw Log
        raw = self.repo.create_raw_log(req.agent_id, req.source_name, req.raw_content)

        # 2. Parse Log via Framework
        parser = ParserFactory.get_parser(req.source_name)
        parsed = parser.parse(req.raw_content, req.hostname)

        # 3. Canonical Event Normalization
        norm_event = NormalizedEvent(
            raw_log_id=raw.id,
            asset_id=asset_id,
            agent_id=req.agent_id,
            org_id=req.org_id,
            timestamp=datetime.now(timezone.utc),
            hostname=parsed["hostname"],
            username=parsed.get("username"),
            event_type=parsed["event_type"],
            event_category=parsed["event_category"],
            severity=parsed["severity"],
            source=req.source_name,
            source_ip=parsed.get("source_ip"),
            destination_ip=parsed.get("destination_ip"),
            process_name=parsed.get("process_name"),
            parent_process=parsed.get("parent_process"),
            command_line=parsed.get("command_line"),
            file_path=parsed.get("file_path"),
            action=parsed.get("action"),
            result=parsed.get("result"),
            message=parsed.get("message"),
            normalized_json=parsed
        )

        saved_event = self.repo.create_normalized_event(norm_event)

        # 4. Trigger Automatic Detection Engine Evaluation
        self.detection_service.evaluate_event(saved_event)

        return saved_event

    def ingest_batch_logs(self, batch_req: BatchLogIngestRequest) -> List[NormalizedEvent]:
        results = []
        for log_req in batch_req.logs:
            log_req.agent_id = batch_req.agent_id
            log_req.api_key = batch_req.api_key
            log_req.org_id = batch_req.org_id
            results.append(self.ingest_single_log(log_req))
        return results

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
        return self.repo.get_events(skip, limit, hostname, severity, source, category, search)

    def get_event_by_id(self, event_id: UUID) -> NormalizedEvent:
        evt = self.repo.get_event_by_id(event_id)
        if not evt:
            raise EntityNotFoundException("NormalizedEvent", event_id)
        return evt

    def get_raw_log_by_id(self, raw_id: UUID) -> RawLog:
        raw = self.repo.get_raw_log_by_id(raw_id)
        if not raw:
            raise EntityNotFoundException("RawLog", raw_id)
        return raw

    def search_events(self, query: str, limit: int = 50) -> List[Dict[str, Any]]:
        return self.repo.search_opensearch(query, limit)

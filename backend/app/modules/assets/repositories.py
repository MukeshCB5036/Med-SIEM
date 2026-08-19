from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.modules.assets.models import Asset, AssetGroup, Agent, AssetStatus, AgentStatus


class AssetRepository:
    def __init__(self, db: Session):
        self.db = db

    # Asset Queries
    def get_asset_by_id(self, asset_id: UUID) -> Optional[Asset]:
        return self.db.query(Asset).filter(Asset.id == asset_id).first()

    def get_asset_by_hostname(self, hostname: str) -> Optional[Asset]:
        return self.db.query(Asset).filter(Asset.hostname == hostname).first()

    def get_assets(self, skip: int = 0, limit: int = 50, search: Optional[str] = None) -> List[Asset]:
        query = self.db.query(Asset)
        if search:
            query = query.filter(
                or_(
                    Asset.hostname.ilike(f"%{search}%"),
                    Asset.asset_name.ilike(f"%{search}%"),
                    Asset.ip_address.ilike(f"%{search}%")
                )
            )
        return query.offset(skip).limit(limit).all()

    def create_asset(self, asset: Asset) -> Asset:
        self.db.add(asset)
        self.db.commit()
        self.db.refresh(asset)
        return asset

    def update_asset(self, asset: Asset) -> Asset:
        asset.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(asset)
        return asset

    def delete_asset(self, asset: Asset) -> None:
        self.db.delete(asset)
        self.db.commit()

    # Asset Group Queries
    def get_group_by_id(self, group_id: UUID) -> Optional[AssetGroup]:
        return self.db.query(AssetGroup).filter(AssetGroup.id == group_id).first()

    def get_groups_by_ids(self, group_ids: List[UUID]) -> List[AssetGroup]:
        return self.db.query(AssetGroup).filter(AssetGroup.id.in_(group_ids)).all()

    def get_all_groups(self) -> List[AssetGroup]:
        return self.db.query(AssetGroup).all()

    def create_group(self, group: AssetGroup) -> AssetGroup:
        self.db.add(group)
        self.db.commit()
        self.db.refresh(group)
        return group

    def delete_group(self, group: AssetGroup) -> None:
        self.db.delete(group)
        self.db.commit()

    # Agent Queries
    def get_agent_by_id(self, agent_id: UUID) -> Optional[Agent]:
        return self.db.query(Agent).filter(Agent.id == agent_id).first()

    def get_all_agents(self) -> List[Agent]:
        return self.db.query(Agent).all()

    def create_agent(self, agent: Agent) -> Agent:
        self.db.add(agent)
        self.db.commit()
        self.db.refresh(agent)
        return agent

    def update_agent_heartbeat(self, agent: Agent) -> Agent:
        now = datetime.now(timezone.utc)
        agent.last_heartbeat = now
        agent.status = AgentStatus.ONLINE
        if agent.asset:
            agent.asset.last_seen = now
            agent.asset.status = AssetStatus.ONLINE
        self.db.commit()
        self.db.refresh(agent)
        return agent

    def audit_online_offline_agents(self, timeout_minutes: int = 5) -> None:
        """Mark agents and assets offline if heartbeat wasn't received within threshold."""
        threshold = datetime.now(timezone.utc) - timedelta(minutes=timeout_minutes)
        stale_agents = self.db.query(Agent).filter(Agent.last_heartbeat < threshold, Agent.status == AgentStatus.ONLINE).all()
        for agent in stale_agents:
            agent.status = AgentStatus.OFFLINE
            if agent.asset:
                agent.asset.status = AssetStatus.OFFLINE
        if stale_agents:
            self.db.commit()

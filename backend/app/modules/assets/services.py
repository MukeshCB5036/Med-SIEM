import secrets
from uuid import UUID
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.modules.assets.repositories import AssetRepository
from app.modules.assets.models import Asset, AssetGroup, Agent, AssetStatus, AgentStatus
from app.modules.assets.schemas import (
    AssetCreate, AssetUpdate, AssetGroupCreate, AssetGroupUpdate,
    AgentRegisterRequest, AgentRegisterResponse, AgentHeartbeatRequest, AgentHeartbeatResponse
)
from app.core.security import get_password_hash, verify_password
from app.core.exceptions import ValidationException, EntityNotFoundException, AuthenticationException


class AssetService:
    def __init__(self, db: Session):
        self.repo = AssetRepository(db)

    def get_assets(self, skip: int = 0, limit: int = 50, search: Optional[str] = None) -> List[Asset]:
        self.repo.audit_online_offline_agents()
        return self.repo.get_assets(skip, limit, search)

    def get_asset_by_id(self, asset_id: UUID) -> Asset:
        asset = self.repo.get_asset_by_id(asset_id)
        if not asset:
            raise EntityNotFoundException("Asset", asset_id)
        return asset

    def create_asset(self, asset_create: AssetCreate) -> Asset:
        if self.repo.get_asset_by_hostname(asset_create.hostname):
            raise ValidationException("Asset with this hostname already exists")

        groups = self.repo.get_groups_by_ids(asset_create.group_ids) if asset_create.group_ids else []
        new_asset = Asset(
            org_id=asset_create.org_id,
            hostname=asset_create.hostname,
            asset_name=asset_create.asset_name,
            asset_type=asset_create.asset_type,
            ip_address=asset_create.ip_address,
            mac_address=asset_create.mac_address,
            domain=asset_create.domain,
            department=asset_create.department,
            owner=asset_create.owner,
            criticality=asset_create.criticality,
            status=AssetStatus.OFFLINE,
            groups=groups
        )
        return self.repo.create_asset(new_asset)

    def update_asset(self, asset_id: UUID, asset_update: AssetUpdate) -> Asset:
        asset = self.get_asset_by_id(asset_id)
        if asset_update.asset_name is not None:
            asset.asset_name = asset_update.asset_name
        if asset_update.asset_type is not None:
            asset.asset_type = asset_update.asset_type
        if asset_update.ip_address is not None:
            asset.ip_address = asset_update.ip_address
        if asset_update.department is not None:
            asset.department = asset_update.department
        if asset_update.owner is not None:
            asset.owner = asset_update.owner
        if asset_update.criticality is not None:
            asset.criticality = asset_update.criticality
        if asset_update.status is not None:
            asset.status = asset_update.status
        if asset_update.group_ids is not None:
            asset.groups = self.repo.get_groups_by_ids(asset_update.group_ids)
        return self.repo.update_asset(asset)

    def delete_asset(self, asset_id: UUID) -> None:
        asset = self.get_asset_by_id(asset_id)
        self.repo.delete_asset(asset)

    # Asset Groups
    def get_groups(self) -> List[AssetGroup]:
        return self.repo.get_all_groups()

    def create_group(self, group_create: AssetGroupCreate) -> AssetGroup:
        new_group = AssetGroup(name=group_create.name, description=group_create.description)
        return self.repo.create_group(new_group)

    def delete_group(self, group_id: UUID) -> None:
        group = self.repo.get_group_by_id(group_id)
        if not group:
            raise EntityNotFoundException("AssetGroup", group_id)
        self.repo.delete_group(group)

    # Agent Registration & Heartbeat
    def register_agent(self, reg_data: AgentRegisterRequest) -> AgentRegisterResponse:
        asset = self.repo.get_asset_by_hostname(reg_data.hostname)
        if not asset:
            asset = Asset(
                org_id=reg_data.org_id,
                hostname=reg_data.hostname,
                asset_name=reg_data.asset_name,
                asset_type=reg_data.asset_type,
                ip_address=reg_data.ip_address,
                mac_address=reg_data.mac_address,
                domain=reg_data.domain,
                agent_version=reg_data.agent_version,
                status=AssetStatus.ONLINE,
                last_seen=datetime.now(timezone.utc)
            )
            asset = self.repo.create_asset(asset)

        raw_api_key = f"ms_agent_{secrets.token_urlsafe(32)}"
        api_key_hash = get_password_hash(raw_api_key)

        if asset.agent:
            agent = asset.agent
            agent.api_key_hash = api_key_hash
            agent.agent_version = reg_data.agent_version
            agent.os_name = reg_data.os_name
            agent.os_version = reg_data.os_version
            agent.status = AgentStatus.ONLINE
            agent.last_heartbeat = datetime.now(timezone.utc)
            self.repo.db.commit()
        else:
            agent = Agent(
                asset_id=asset.id,
                api_key_hash=api_key_hash,
                agent_version=reg_data.agent_version,
                os_name=reg_data.os_name,
                os_version=reg_data.os_version,
                status=AgentStatus.ONLINE,
                last_heartbeat=datetime.now(timezone.utc)
            )
            agent = self.repo.create_agent(agent)

        return AgentRegisterResponse(
            agent_id=agent.id,
            asset_id=asset.id,
            api_key=raw_api_key
        )

    def process_heartbeat(self, hb_data: AgentHeartbeatRequest) -> AgentHeartbeatResponse:
        agent = self.repo.get_agent_by_id(hb_data.agent_id)
        if not agent or not verify_password(hb_data.api_key, agent.api_key_hash):
            raise AuthenticationException("Invalid agent_id or agent API key")

        if agent.status == AgentStatus.REVOKED:
            raise AuthenticationException("Agent credential has been revoked by SOC Administrator")

        updated_agent = self.repo.update_agent_heartbeat(agent)
        return AgentHeartbeatResponse(
            success=True,
            status=updated_agent.status,
            timestamp=updated_agent.last_heartbeat
        )

    def revoke_agent(self, agent_id: UUID) -> Agent:
        agent = self.get_agent_by_id(agent_id)
        agent.status = AgentStatus.REVOKED
        agent.revoked_at = datetime.now(timezone.utc)
        self.repo.db.commit()
        self.repo.db.refresh(agent)
        return agent

    def get_agents(self) -> List[Agent]:
        self.repo.audit_online_offline_agents()
        return self.repo.get_all_agents()

    def get_agent_by_id(self, agent_id: UUID) -> Agent:
        agent = self.repo.get_agent_by_id(agent_id)
        if not agent:
            raise EntityNotFoundException("Agent", agent_id)
        return agent

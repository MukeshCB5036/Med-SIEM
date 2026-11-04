from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user, PermissionChecker
from app.modules.auth.models import User
from app.modules.assets.schemas import (
    AssetCreate, AssetUpdate, AssetResponse,
    AssetGroupCreate, AssetGroupResponse,
    AgentRegisterRequest, AgentRegisterResponse,
    AgentHeartbeatRequest, AgentHeartbeatResponse, AgentResponse,
    EnrollmentTokenCreate, EnrollmentTokenResponse
)
from app.modules.assets.services import AssetService

router = APIRouter(prefix="", tags=["Assets & Agents"])


# ==============================================================================
# ASSET ENDPOINTS
# ==============================================================================

@router.get("/assets", response_model=dict, dependencies=[Depends(PermissionChecker("users.read"))])
def list_assets(skip: int = 0, limit: int = 50, search: Optional[str] = None, db: Session = Depends(get_db)):
    """List healthcare assets with search, filtering, and pagination."""
    service = AssetService(db)
    assets = service.get_assets(skip, limit, search)
    return {
        "success": True,
        "data": [AssetResponse.model_validate(a) for a in assets],
        "meta": {"skip": skip, "limit": limit, "count": len(assets)}
    }


@router.post("/assets", response_model=dict, status_code=status.HTTP_201_CREATED, dependencies=[Depends(PermissionChecker("users.create"))])
def create_asset(asset_data: AssetCreate, db: Session = Depends(get_db)):
    """Create a new healthcare IT asset."""
    service = AssetService(db)
    asset = service.create_asset(asset_data)
    return {"success": True, "data": AssetResponse.model_validate(asset)}


@router.get("/assets/groups", response_model=dict, dependencies=[Depends(PermissionChecker("users.read"))])
def list_asset_groups(db: Session = Depends(get_db)):
    """List asset groups."""
    service = AssetService(db)
    groups = service.get_groups()
    return {"success": True, "data": [AssetGroupResponse.model_validate(g) for g in groups]}


@router.post("/assets/groups", response_model=dict, status_code=status.HTTP_201_CREATED, dependencies=[Depends(PermissionChecker("settings.manage"))])
def create_asset_group(group_data: AssetGroupCreate, db: Session = Depends(get_db)):
    """Create an asset group."""
    service = AssetService(db)
    group = service.create_group(group_data)
    return {"success": True, "data": AssetGroupResponse.model_validate(group)}


@router.get("/assets/{id}", response_model=dict, dependencies=[Depends(PermissionChecker("users.read"))])
def get_asset_by_id(id: UUID, db: Session = Depends(get_db)):
    """Get healthcare asset details by ID."""
    service = AssetService(db)
    asset = service.get_asset_by_id(id)
    return {"success": True, "data": AssetResponse.model_validate(asset)}


@router.patch("/assets/{id}", response_model=dict, dependencies=[Depends(PermissionChecker("users.update"))])
def update_asset(id: UUID, asset_update: AssetUpdate, db: Session = Depends(get_db)):
    """Update asset attributes."""
    service = AssetService(db)
    asset = service.update_asset(id, asset_update)
    return {"success": True, "data": AssetResponse.model_validate(asset)}


@router.delete("/assets/{id}", response_model=dict, dependencies=[Depends(PermissionChecker("users.delete"))])
def delete_asset(id: UUID, db: Session = Depends(get_db)):
    """Delete an asset."""
    service = AssetService(db)
    service.delete_asset(id)
    return {"success": True, "data": {"message": f"Asset {id} deleted successfully"}}


# ==============================================================================
# AGENT REGISTRATION & HEARTBEAT ENDPOINTS
# ==============================================================================

@router.post("/agents/register", response_model=dict, status_code=status.HTTP_201_CREATED)
def register_agent(reg_data: AgentRegisterRequest, db: Session = Depends(get_db)):
    """Endpoint agent registration API. Agent receives unique Agent ID and API Key."""
    service = AssetService(db)
    res = service.register_agent(reg_data)
    return {"success": True, "data": res.model_dump()}


@router.post("/agents/heartbeat", response_model=dict, status_code=status.HTTP_200_OK)
def agent_heartbeat(hb_data: AgentHeartbeatRequest, db: Session = Depends(get_db)):
    """Endpoint agent heartbeat API. Updates last seen timestamp and online status."""
    service = AssetService(db)
    res = service.process_heartbeat(hb_data)
    return {"success": True, "data": res.model_dump()}


@router.get("/agents", response_model=dict, dependencies=[Depends(PermissionChecker("users.read"))])
def list_agents(db: Session = Depends(get_db)):
    """List registered endpoint agents."""
    service = AssetService(db)
    agents = service.get_agents()
    return {"success": True, "data": [AgentResponse.model_validate(a) for a in agents]}


# ==============================================================================
# ENROLLMENT TOKEN ENDPOINTS (Defined before /agents/{id} to avoid path collision)
# ==============================================================================

@router.post(
    "/agents/enrollment-tokens", 
    response_model=dict, 
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(PermissionChecker("users.create"))]
)
def create_enrollment_token(
    token_data: EnrollmentTokenCreate, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a secure pre-shared enrollment token for new endpoint agents."""
    service = AssetService(db)
    if not token_data.org_id or str(token_data.org_id) == "00000000-0000-0000-0000-000000000000":
        token_data.org_id = current_user.org_id
    res = service.create_enrollment_token(token_data, user_id=current_user.id)
    return {"success": True, "data": res.model_dump()}


@router.get(
    "/agents/enrollment-tokens", 
    response_model=dict,
    dependencies=[Depends(PermissionChecker("users.read"))]
)
def list_enrollment_tokens(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List configured endpoint agent enrollment tokens."""
    service = AssetService(db)
    tokens = service.get_enrollment_tokens(org_id=current_user.org_id)
    return {
        "success": True, 
        "data": [EnrollmentTokenResponse.model_validate(t).model_dump() for t in tokens]
    }


@router.get("/agents/{id}", response_model=dict, dependencies=[Depends(PermissionChecker("users.read"))])
def get_agent_by_id(id: UUID, db: Session = Depends(get_db)):
    """Get agent details by ID."""
    service = AssetService(db)
    agent = service.get_agent_by_id(id)
    return {"success": True, "data": AgentResponse.model_validate(agent)}


@router.post("/agents/{id}/revoke", response_model=dict, dependencies=[Depends(PermissionChecker("users.update"))])
def revoke_agent(id: UUID, db: Session = Depends(get_db)):
    """Revoke an agent's credentials and prevent further log ingestion / heartbeat."""
    service = AssetService(db)
    agent = service.revoke_agent(id)
    return {"success": True, "data": AgentResponse.model_validate(agent)}



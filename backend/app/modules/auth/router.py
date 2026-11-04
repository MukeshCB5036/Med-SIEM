from uuid import UUID
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.auth.models import User
from app.modules.auth.schemas import (
    LoginRequest, LoginResponse, Token, RefreshTokenRequest, ChangePasswordRequest,
    VerifyEmailRequest, ResendVerificationRequest, VerifyOtpRequest,
    UserCreate, UserUpdate, UserResponse,
    RoleCreate, RoleUpdate, RoleResponse, ApiResponse,
    AuditLogListResponse, NotificationResponse, NotificationCreate
)
from app.modules.auth.services import AuthService
from app.modules.auth.dependencies import get_current_user, PermissionChecker, require_superuser

router = APIRouter(prefix="", tags=["Auth & RBAC"])


# ==============================================================================
# AUTHENTICATION ENDPOINTS
# ==============================================================================

@router.post("/auth/login", response_model=ApiResponse[LoginResponse], status_code=status.HTTP_200_OK)
def login(login_data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Authenticate user with email and password."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("User-Agent", "Unknown")
    service = AuthService(db)
    res = service.authenticate_user(login_data, ip=client_ip, agent=user_agent)
    return ApiResponse(success=True, data=res)


@router.post("/auth/verify-otp", response_model=ApiResponse[Token], status_code=status.HTTP_200_OK)
def verify_otp(otp_data: VerifyOtpRequest, request: Request, db: Session = Depends(get_db)):
    """Verify Email OTP for MFA privileged access."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("User-Agent", "Unknown")
    service = AuthService(db)
    tokens = service.verify_otp(otp_data.mfa_token, otp_data.otp, ip=client_ip, agent=user_agent)
    return ApiResponse(success=True, data=tokens)


@router.post("/auth/verify-email", response_model=ApiResponse[dict], status_code=status.HTTP_200_OK)
def verify_email(verify_data: VerifyEmailRequest, db: Session = Depends(get_db)):
    """Verify user email address using single-use verification token."""
    service = AuthService(db)
    service.verify_email(verify_data.token)
    return ApiResponse(success=True, data={"message": "Email address verified successfully"})


@router.post("/auth/resend-verification", response_model=ApiResponse[dict], status_code=status.HTTP_200_OK)
def resend_verification(resend_data: ResendVerificationRequest, db: Session = Depends(get_db)):
    """Resend email verification link with rate-limiting safety."""
    service = AuthService(db)
    service.resend_verification(resend_data.email)
    return ApiResponse(success=True, data={"message": "If the email is registered, a verification link has been sent."})


@router.post("/auth/refresh", response_model=ApiResponse[Token], status_code=status.HTTP_200_OK)
def refresh_token(request_data: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Exchange refresh token for a new access & refresh token pair."""
    service = AuthService(db)
    tokens = service.refresh_access_token(request_data.refresh_token)
    return ApiResponse(success=True, data=tokens)


@router.post("/auth/logout", response_model=ApiResponse[dict], status_code=status.HTTP_200_OK)
def logout(current_user: User = Depends(get_current_user)):
    """Logout current user session."""
    return ApiResponse(success=True, data={"message": "Logged out successfully"})


@router.post("/auth/change-password", response_model=ApiResponse[dict], status_code=status.HTTP_200_OK)
def change_password(
    pwd_data: ChangePasswordRequest, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Change current authenticated user's password."""
    service = AuthService(db)
    service.change_password(current_user.id, pwd_data)
    return ApiResponse(success=True, data={"message": "Password changed successfully"})


@router.get("/auth/me", response_model=ApiResponse[UserResponse], status_code=status.HTTP_200_OK)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get current authenticated user profile."""
    return ApiResponse(success=True, data=UserResponse.model_validate(current_user))


# ==============================================================================
# USER MANAGEMENT ENDPOINTS
# ==============================================================================

@router.get(
    "/users", 
    response_model=ApiResponse[List[UserResponse]], 
    dependencies=[Depends(PermissionChecker("users.read"))]
)
def list_users(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    """List all registered users."""
    service = AuthService(db)
    users = service.get_users(skip, limit)
    return ApiResponse(success=True, data=[UserResponse.model_validate(u) for u in users])


@router.post(
    "/users", 
    response_model=ApiResponse[UserResponse], 
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_superuser)]
)
def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Create a new user account."""
    service = AuthService(db)
    user = service.create_user(user_data)
    return ApiResponse(success=True, data=UserResponse.model_validate(user))


@router.get(
    "/users/{id}", 
    response_model=ApiResponse[UserResponse],
    dependencies=[Depends(PermissionChecker("users.read"))]
)
def get_user_by_id(id: UUID, db: Session = Depends(get_db)):
    """Get user details by ID."""
    service = AuthService(db)
    user = service.get_user_by_id(id)
    return ApiResponse(success=True, data=UserResponse.model_validate(user))


@router.patch(
    "/users/{id}", 
    response_model=ApiResponse[UserResponse],
    dependencies=[Depends(PermissionChecker("users.update"))]
)
def update_user(id: UUID, user_update: UserUpdate, db: Session = Depends(get_db)):
    """Update user account attributes."""
    service = AuthService(db)
    user = service.update_user(id, user_update)
    return ApiResponse(success=True, data=UserResponse.model_validate(user))


@router.delete(
    "/users/{id}", 
    response_model=ApiResponse[dict],
    dependencies=[Depends(PermissionChecker("users.delete"))]
)
def delete_user(id: UUID, db: Session = Depends(get_db)):
    """Delete user account."""
    service = AuthService(db)
    service.delete_user(id)
    return ApiResponse(success=True, data={"message": f"User {id} deleted successfully"})


# ==============================================================================
# ROLE MANAGEMENT ENDPOINTS
# ==============================================================================

@router.get(
    "/roles", 
    response_model=ApiResponse[List[RoleResponse]],
    dependencies=[Depends(PermissionChecker("users.read"))]
)
def list_roles(db: Session = Depends(get_db)):
    """List all available security roles."""
    service = AuthService(db)
    roles = service.get_roles()
    return ApiResponse(success=True, data=[RoleResponse.model_validate(r) for r in roles])


@router.post(
    "/roles", 
    response_model=ApiResponse[RoleResponse], 
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(PermissionChecker("settings.manage"))]
)
def create_role(role_data: RoleCreate, db: Session = Depends(get_db)):
    """Create a custom security role."""
    service = AuthService(db)
    role = service.create_role(role_data)
    return ApiResponse(success=True, data=RoleResponse.model_validate(role))


@router.patch(
    "/roles/{id}", 
    response_model=ApiResponse[RoleResponse],
    dependencies=[Depends(PermissionChecker("settings.manage"))]
)
def update_role(id: UUID, role_update: RoleUpdate, db: Session = Depends(get_db)):
    """Update custom security role permissions."""
    service = AuthService(db)
    role = service.update_role(id, role_update)
    return ApiResponse(success=True, data=RoleResponse.model_validate(role))


@router.delete(
    "/roles/{id}", 
    response_model=ApiResponse[dict],
    dependencies=[Depends(PermissionChecker("settings.manage"))]
)
def delete_role(id: UUID, db: Session = Depends(get_db)):
    """Delete a custom security role."""
    service = AuthService(db)
    service.delete_role(id)
    return ApiResponse(success=True, data={"message": f"Role {id} deleted successfully"})


# ==============================================================================
# AUDIT LOG ENDPOINTS
# ==============================================================================

@router.get(
    "/audit-logs", 
    response_model=ApiResponse[AuditLogListResponse],
    dependencies=[Depends(PermissionChecker("users.read"))]
)
def list_audit_logs(
    page: int = 1,
    page_size: int = 50,
    action: Optional[str] = None,
    user_id: Optional[UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Query audit logs with filtering and pagination."""
    service = AuthService(db)
    res = service.get_audit_logs(
        page=page,
        page_size=page_size,
        action=action,
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
        search=search
    )
    return ApiResponse(success=True, data=res)


# ==============================================================================
# NOTIFICATIONS ENDPOINTS
# ==============================================================================

@router.get(
    "/notifications", 
    response_model=ApiResponse[List[NotificationResponse]],
    status_code=status.HTTP_200_OK
)
def list_notifications(
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List system notifications for current authenticated user."""
    service = AuthService(db)
    notifs = service.get_notifications(user_id=current_user.id, org_id=current_user.org_id, unread_only=unread_only)
    return ApiResponse(success=True, data=[NotificationResponse.model_validate(n) for n in notifs])


@router.patch(
    "/notifications/{id}/read", 
    response_model=ApiResponse[NotificationResponse],
    status_code=status.HTTP_200_OK
)
def mark_notification_read(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark notification as read."""
    service = AuthService(db)
    notif = service.mark_notification_read(id)
    return ApiResponse(success=True, data=NotificationResponse.model_validate(notif))


@router.post(
    "/notifications", 
    response_model=ApiResponse[NotificationResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(PermissionChecker("alerts.update"))]
)
def create_notification(
    notif_data: NotificationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a security broadcast or user notification."""
    service = AuthService(db)
    notif = service.create_notification(org_id=current_user.org_id, notif_data=notif_data)
    return ApiResponse(success=True, data=NotificationResponse.model_validate(notif))


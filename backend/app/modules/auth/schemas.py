import re
from uuid import UUID
from datetime import datetime
from typing import Optional, List, Generic, TypeVar
from pydantic import BaseModel, EmailStr, Field, field_validator

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    data: Optional[T] = None
    error: Optional[str] = None
    meta: Optional[dict] = None


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)


class LoginResponse(BaseModel):
    mfa_required: bool = False
    mfa_token: Optional[str] = None  # Temporary short-lived token to submit with OTP
    email_verification_required: bool = False
    tokens: Optional[Token] = None


class VerifyEmailRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class VerifyOtpRequest(BaseModel):
    mfa_token: str
    otp: str = Field(..., min_length=6, max_length=6)


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8)

    @field_validator("new_password")
    def validate_password_complexity(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter.")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit.")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain at least one special character.")
        return v


# Permission Schemas
class PermissionBase(BaseModel):
    name: str
    module: str
    description: Optional[str] = None


class PermissionResponse(PermissionBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# Role Schemas
class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_system_role: bool = False


class RoleCreate(RoleBase):
    permission_ids: List[UUID] = []


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permission_ids: Optional[List[UUID]] = None


class RoleResponse(RoleBase):
    id: UUID
    created_at: datetime
    permissions: List[PermissionResponse] = []

    class Config:
        from_attributes = True


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    is_active: bool = True
    mfa_enabled: bool = False


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    org_id: UUID
    role_ids: List[UUID] = []

    @field_validator("password")
    def validate_password_complexity(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter.")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit.")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain at least one special character.")
        return v


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    is_locked: Optional[bool] = None
    role_ids: Optional[List[UUID]] = None


class UserResponse(UserBase):
    id: UUID
    org_id: UUID
    is_superuser: bool
    is_locked: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime
    roles: List[RoleResponse] = []

    class Config:
        from_attributes = True


# Audit Log Schemas
class AuditLogResponse(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    user_email: Optional[str] = None
    user_full_name: Optional[str] = None
    action: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogPaginationMeta(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int


class AuditLogListResponse(BaseModel):
    items: List[AuditLogResponse]
    pagination: AuditLogPaginationMeta


# Notification Schemas
class NotificationResponse(BaseModel):
    id: UUID
    org_id: UUID
    user_id: Optional[UUID] = None
    title: str
    message: str
    severity: str
    category: str
    link: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationCreate(BaseModel):
    title: str
    message: str
    severity: str = "INFO"
    category: str = "SYSTEM"
    link: Optional[str] = None
    user_id: Optional[UUID] = None


import secrets
import hashlib
from datetime import datetime, timezone, timedelta
from uuid import UUID
from typing import List, Optional
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.email import email_service
from app.modules.auth.repositories import AuthRepository
from app.modules.auth.models import User, Role, Permission
from app.modules.auth.schemas import (
    LoginRequest, LoginResponse, Token, UserCreate, UserUpdate, 
    RoleCreate, RoleUpdate, ChangePasswordRequest,
    VerifyEmailRequest, ResendVerificationRequest, VerifyOtpRequest
)
from app.core.security import (
    verify_password, get_password_hash, 
    create_access_token, create_refresh_token, decode_token
)
from app.core.exceptions import (
    AuthenticationException, ValidationException, 
    EntityNotFoundException, PermissionDeniedException
)


class AuthService:
    def __init__(self, db: Session):
        self.repo = AuthRepository(db)

    def authenticate_user(self, login_data: LoginRequest, ip: str = None, agent: str = None) -> LoginResponse:
        user = self.repo.get_user_by_email(login_data.email)
        if not user:
            self.repo.record_failed_login(None, login_data.email, ip, agent)
            raise AuthenticationException("Invalid email or password")

        if user.is_locked:
            self.repo.record_failed_login(user.id, login_data.email, ip, agent)
            raise AuthenticationException("Account is locked due to repeated failed login attempts. Contact SOC Manager.")

        if not user.is_active:
            raise AuthenticationException("User account is disabled")

        if not verify_password(login_data.password, user.password_hash):
            self.repo.record_failed_login(user.id, login_data.email, ip, agent)
            raise AuthenticationException("Invalid email or password")

        # 1. Check Email Verification Policy
        if not user.email_verified:
            return LoginResponse(
                email_verification_required=True,
                tokens=None
            )

        # 2. Check MFA Policy (Super Admin or MFA Enabled)
        is_privileged = user.is_superuser or any(r.name in ["Super Admin", "SOC Manager"] for r in user.roles)
        if user.mfa_enabled or is_privileged:
            # Generate 6-digit OTP
            raw_otp = f"{secrets.randbelow(1000000):06d}"
            user.otp_hash = hashlib.sha256(raw_otp.encode()).hexdigest()
            user.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.MFA_OTP_EXPIRE_MINUTES)
            user.otp_attempts = 0
            user.otp_created_at = datetime.now(timezone.utc)
            self.repo.update_user(user)

            # Send OTP email
            email_service.send_mfa_otp_email(user.email, user.full_name, raw_otp)

            # Issue temporary short-lived MFA token
            mfa_token = create_access_token(user.id, expires_delta=timedelta(minutes=settings.MFA_OTP_EXPIRE_MINUTES))
            return LoginResponse(
                mfa_required=True,
                mfa_token=mfa_token,
                tokens=None
            )

        # 3. Direct Successful Login
        self.repo.record_successful_login(user.id, ip, agent)
        access_token = create_access_token(user.id)
        refresh_token = create_refresh_token(user.id)
        return LoginResponse(
            tokens=Token(access_token=access_token, refresh_token=refresh_token)
        )

    def verify_otp(self, mfa_token: str, otp: str, ip: str = None, agent: str = None) -> Token:
        payload = decode_token(mfa_token)
        if not payload or not payload.get("sub"):
            raise AuthenticationException("Invalid or expired MFA session")

        user_id = UUID(payload.get("sub"))
        user = self.repo.get_user_by_id(user_id)
        if not user or not user.is_active or user.is_locked:
            raise AuthenticationException("User account is inactive or locked")

        otp_expires_at = user.otp_expires_at
        if otp_expires_at and otp_expires_at.tzinfo is None:
            otp_expires_at = otp_expires_at.replace(tzinfo=timezone.utc)

        if datetime.now(timezone.utc) > otp_expires_at:
            user.otp_hash = None
            self.repo.update_user(user)
            raise AuthenticationException("MFA OTP has expired. Please log in again.")

        if user.otp_attempts >= settings.MFA_MAX_OTP_ATTEMPTS:
            user.is_locked = True
            user.otp_hash = None
            self.repo.update_user(user)
            raise AuthenticationException("Maximum MFA attempts exceeded. Account locked.")

        submitted_hash = hashlib.sha256(otp.encode()).hexdigest()
        if not secrets.compare_digest(user.otp_hash, submitted_hash):
            user.otp_attempts += 1
            self.repo.update_user(user)
            raise AuthenticationException("Invalid authentication passcode")

        # OTP Verified - Invalidate OTP and issue final JWT tokens
        user.otp_hash = None
        user.otp_expires_at = None
        user.otp_attempts = 0
        self.repo.update_user(user)

        self.repo.record_successful_login(user.id, ip, agent)
        access_token = create_access_token(user.id)
        refresh_token = create_refresh_token(user.id)
        return Token(access_token=access_token, refresh_token=refresh_token)

    def verify_email(self, token: str) -> bool:
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        user = self.repo.db.query(User).filter(User.verification_token_hash == token_hash).first()
        if not user:
            raise ValidationException("Invalid or already used verification token")

        if user.verification_token_expires_at and datetime.now(timezone.utc) > user.verification_token_expires_at:
            raise ValidationException("Verification link has expired. Please request a new verification email.")

        user.email_verified = True
        user.email_verified_at = datetime.now(timezone.utc)
        user.verification_token_hash = None
        user.verification_token_expires_at = None
        self.repo.update_user(user)
        self.repo.log_audit_event(user.id, "EMAIL_VERIFIED", None, None, "User email successfully verified")
        return True

    def resend_verification(self, email: str) -> bool:
        user = self.repo.get_user_by_email(email)
        # Always return True to prevent email enumeration attacks
        if not user or user.email_verified:
            return True

        raw_token = secrets.token_urlsafe(32)
        user.verification_token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        user.verification_token_expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS)
        self.repo.update_user(user)

        email_service.send_verification_email(user.email, user.full_name, raw_token)
        return True

    def refresh_access_token(self, refresh_token: str) -> Token:
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise AuthenticationException("Invalid or expired refresh token")

        user_id_str = payload.get("sub")
        if not user_id_str:
            raise AuthenticationException("Invalid token payload")

        user = self.repo.get_user_by_id(UUID(user_id_str))
        if not user or not user.is_active or user.is_locked:
            raise AuthenticationException("User account is inactive or locked")

        new_access_token = create_access_token(user.id)
        new_refresh_token = create_refresh_token(user.id)
        return Token(access_token=new_access_token, refresh_token=new_refresh_token)

    def change_password(self, user_id: UUID, pwd_data: ChangePasswordRequest) -> None:
        user = self.repo.get_user_by_id(user_id)
        if not user:
            raise EntityNotFoundException("User", user_id)

        if not verify_password(pwd_data.old_password, user.password_hash):
            raise ValidationException("Current password is incorrect")

        user.password_hash = get_password_hash(pwd_data.new_password)
        self.repo.update_user(user)
        self.repo.log_audit_event(user_id, "CHANGE_PASSWORD", None, None, "User changed password successfully")

    # User Management
    def get_users(self, skip: int = 0, limit: int = 50) -> List[User]:
        return self.repo.get_all_users(skip, limit)

    def get_user_by_id(self, user_id: UUID) -> User:
        user = self.repo.get_user_by_id(user_id)
        if not user:
            raise EntityNotFoundException("User", user_id)
        return user

    def create_user(self, user_create: UserCreate) -> User:
        if self.repo.get_user_by_email(user_create.email):
            raise ValidationException("Email address is already registered")

        roles = self.repo.get_roles_by_ids(user_create.role_ids) if user_create.role_ids else []
        
        # Always issue a single-use verification token for new user creation
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS)

        new_user = User(
            org_id=user_create.org_id,
            email=user_create.email,
            password_hash=get_password_hash(user_create.password),
            full_name=user_create.full_name,
            is_active=user_create.is_active,
            mfa_enabled=user_create.mfa_enabled,
            email_verified=False,
            verification_token_hash=token_hash,
            verification_token_expires_at=expires_at,
            roles=roles
        )
        created_user = self.repo.create_user(new_user)

        # Send verification email via SMTP service
        email_service.send_verification_email(created_user.email, created_user.full_name, raw_token)

        return created_user

    def update_user(self, user_id: UUID, user_update: UserUpdate) -> User:
        user = self.get_user_by_id(user_id)
        if user_update.full_name is not None:
            user.full_name = user_update.full_name
        if user_update.email is not None and user_update.email != user.email:
            if self.repo.get_user_by_email(user_update.email):
                raise ValidationException("Email address is already in use")
            user.email = user_update.email
        if user_update.is_active is not None:
            user.is_active = user_update.is_active
        if user_update.is_locked is not None:
            user.is_locked = user_update.is_locked
            if not user_update.is_locked:
                user.failed_login_attempts = 0
        if user_update.role_ids is not None:
            user.roles = self.repo.get_roles_by_ids(user_update.role_ids)
        return self.repo.update_user(user)

    def delete_user(self, user_id: UUID) -> None:
        user = self.get_user_by_id(user_id)
        self.repo.delete_user(user)

    # Role Management
    def get_roles(self) -> List[Role]:
        return self.repo.get_all_roles()

    def create_role(self, role_create: RoleCreate) -> Role:
        if self.repo.get_role_by_name(role_create.name):
            raise ValidationException("Role with this name already exists")

        permissions = self.repo.get_permissions_by_ids(role_create.permission_ids) if role_create.permission_ids else []
        new_role = Role(
            name=role_create.name,
            description=role_create.description,
            is_system_role=role_create.is_system_role,
            permissions=permissions
        )
        return self.repo.create_role(new_role)

    def update_role(self, role_id: UUID, role_update: RoleUpdate) -> Role:
        role = self.repo.get_role_by_id(role_id)
        if not role:
            raise EntityNotFoundException("Role", role_id)

        if role_update.name is not None:
            role.name = role_update.name
        if role_update.description is not None:
            role.description = role_update.description
        if role_update.permission_ids is not None:
            role.permissions = self.repo.get_permissions_by_ids(role_update.permission_ids)
        return self.repo.update_role(role)

    def delete_role(self, role_id: UUID) -> None:
        role = self.repo.get_role_by_id(role_id)
        if not role:
            raise EntityNotFoundException("Role", role_id)
        if role.is_system_role:
            raise ValidationException("System roles cannot be deleted")
        self.repo.delete_role(role)

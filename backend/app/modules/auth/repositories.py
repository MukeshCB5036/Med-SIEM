from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.modules.auth.models import User, Organization, Role, Permission, AuditLog


class AuthRepository:
    def __init__(self, db: Session):
        self.db = db

    # User Queries
    def get_user_by_id(self, user_id: UUID) -> Optional[User]:
        return self.db.query(User).filter(User.id == user_id).first()

    def get_user_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email == email).first()

    def get_all_users(self, skip: int = 0, limit: int = 50) -> List[User]:
        return self.db.query(User).offset(skip).limit(limit).all()

    def create_user(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update_user(self, user: User) -> User:
        user.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(user)
        return user

    def delete_user(self, user: User) -> None:
        self.db.delete(user)
        self.db.commit()

    def record_successful_login(self, user_id: UUID, ip: str = None, agent: str = None) -> None:
        user = self.get_user_by_id(user_id)
        if user:
            user.last_login_at = datetime.now(timezone.utc)
            user.failed_login_attempts = 0
            self.db.commit()
        self.log_audit_event(user_id, "LOGIN_SUCCESS", ip, agent, "User logged in successfully")

    def record_failed_login(self, user_id: Optional[UUID], email: str, ip: str = None, agent: str = None) -> None:
        if user_id:
            user = self.get_user_by_id(user_id)
            if user:
                user.failed_login_attempts += 1
                if user.failed_login_attempts >= 5:
                    user.is_locked = True
                self.db.commit()
        self.log_audit_event(user_id, "LOGIN_FAILED", ip, agent, f"Failed login attempt for email: {email}")

    # Role & Permission Queries
    def get_role_by_id(self, role_id: UUID) -> Optional[Role]:
        return self.db.query(Role).filter(Role.id == role_id).first()

    def get_role_by_name(self, name: str) -> Optional[Role]:
        return self.db.query(Role).filter(Role.name == name).first()

    def get_all_roles(self) -> List[Role]:
        return self.db.query(Role).all()

    def get_roles_by_ids(self, role_ids: List[UUID]) -> List[Role]:
        return self.db.query(Role).filter(Role.id.in_(role_ids)).all()

    def get_permissions_by_ids(self, perm_ids: List[UUID]) -> List[Permission]:
        return self.db.query(Permission).filter(Permission.id.in_(perm_ids)).all()

    def create_role(self, role: Role) -> Role:
        self.db.add(role)
        self.db.commit()
        self.db.refresh(role)
        return role

    def update_role(self, role: Role) -> Role:
        self.db.commit()
        self.db.refresh(role)
        return role

    def delete_role(self, role: Role) -> None:
        self.db.delete(role)
        self.db.commit()

    # Audit Logging
    def log_audit_event(self, user_id: Optional[UUID], action: str, ip: str = None, agent: str = None, details: str = None):
        log = AuditLog(
            user_id=user_id,
            action=action,
            ip_address=ip,
            user_agent=agent,
            details=details
        )
        self.db.add(log)
        self.db.commit()

from typing import Optional, Any


class MedSIEMException(Exception):
    """Base exception class for MedSIEM application."""
    def __init__(self, message: str, code: str = "INTERNAL_ERROR", details: Optional[Any] = None):
        self.message = message
        self.code = code
        self.details = details
        super().__init__(self.message)


class EntityNotFoundException(MedSIEMException):
    def __init__(self, entity_name: str, identifier: Any):
        super().__init__(
            message=f"{entity_name} with identifier '{identifier}' was not found.",
            code="ENTITY_NOT_FOUND"
        )


class AuthenticationException(MedSIEMException):
    def __init__(self, message: str = "Invalid credentials or expired token"):
        super().__init__(message=message, code="AUTHENTICATION_FAILED")


class PermissionDeniedException(MedSIEMException):
    def __init__(self, message: str = "You do not have permission to perform this action"):
        super().__init__(message=message, code="PERMISSION_DENIED")


class ValidationException(MedSIEMException):
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(message=message, code="VALIDATION_FAILED", details=details)

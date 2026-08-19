# Contributing to MedSIEM

Thank you for your interest in contributing to MedSIEM!

## Enterprise Engineering Code Standards

All contributions must strictly follow our enterprise engineering guidelines:

1. **Modular Monolith Integrity**: Keep domain code strictly inside `backend/app/modules/<module_name>/`.
2. **Clean Architecture Layering**:
   - `models.py` - SQLAlchemy ORM entities.
   - `schemas.py` - Pydantic DTO validation schemas.
   - `repositories.py` - Database persistence interactions.
   - `services.py` - Core business logic rules.
   - `router.py` - FastAPI controller endpoints.
3. **No Placeholders or TODOs**: All submitted code must be production-ready and fully functional.
4. **Mandatory Test Coverage**:
   - Backend pytest coverage target: **≥95%**
   - Frontend React Jest/RTL coverage target: **≥90%**
5. **Security First**: Parameterize all DB queries, validate input via Pydantic/Zod, and sanitize outputs.

## Git Commit Workflow

We follow Semantic Commit Messages:
- `feat(auth): add MFA TOTP login flow`
- `fix(agent): handle missing Sysmon event ID 1`
- `docs(api): update OpenAPI schemas for asset listing`

Pull Requests must pass all GitHub Actions automated workflows (linting, tests, security scanners) before merging.

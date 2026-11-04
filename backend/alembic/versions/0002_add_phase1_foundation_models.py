"""Add Phase 1 Foundation Models and Healthcare SIEM Fields

Revision ID: 0002_phase1_foundation
Revises: ed9d8f956b2b
Create Date: 2026-11-02 15:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0002_phase1_foundation'
down_revision: Union[str, None] = 'ed9d8f956b2b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create enrollment_tokens table
    op.create_table(
        'enrollment_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token_hash', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('max_uses', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('used_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_revoked', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now())
    )
    op.create_index(op.f('ix_enrollment_tokens_id'), 'enrollment_tokens', ['id'], unique=False)
    op.create_index(op.f('ix_enrollment_tokens_token_hash'), 'enrollment_tokens', ['token_hash'], unique=True)
    op.create_index(op.f('ix_enrollment_tokens_org_id'), 'enrollment_tokens', ['org_id'], unique=False)

    # 2. Create agent_credentials table
    op.create_table(
        'agent_credentials',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('agent_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('agents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('credential_type', sa.String(length=50), nullable=False, server_default='API_KEY'),
        sa.Column('key_prefix', sa.String(length=20), nullable=True),
        sa.Column('key_hash', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now())
    )
    op.create_index(op.f('ix_agent_credentials_id'), 'agent_credentials', ['id'], unique=False)
    op.create_index(op.f('ix_agent_credentials_agent_id'), 'agent_credentials', ['agent_id'], unique=False)

    # 3. Create notifications table
    op.create_table(
        'notifications',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('severity', sa.String(length=50), nullable=False, server_default='INFO'),
        sa.Column('category', sa.String(length=50), nullable=False, server_default='SYSTEM'),
        sa.Column('link', sa.String(length=255), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now())
    )
    op.create_index(op.f('ix_notifications_id'), 'notifications', ['id'], unique=False)
    op.create_index(op.f('ix_notifications_org_id'), 'notifications', ['org_id'], unique=False)
    op.create_index(op.f('ix_notifications_user_id'), 'notifications', ['user_id'], unique=False)

    # 4. Add Clinical Service Context columns to assets
    op.add_column('assets', sa.Column('clinical_service', sa.String(length=255), nullable=True))
    op.add_column('assets', sa.Column('operational_dependency', sa.String(length=255), nullable=True))
    op.add_column('assets', sa.Column('potential_operational_impact', sa.Text(), nullable=True))

    # 5. Add Endpoint Trust columns to agents
    op.add_column('agents', sa.Column('collector_health', sa.JSON(), nullable=True))
    op.add_column('agents', sa.Column('telemetry_freshness_seconds', sa.Integer(), nullable=True, server_default='0'))

    # 6. Add Explainable Detection columns to alerts
    op.add_column('alerts', sa.Column('matched_conditions', sa.JSON(), nullable=True))
    op.add_column('alerts', sa.Column('supporting_events', sa.JSON(), nullable=True))
    op.add_column('alerts', sa.Column('detection_timestamp', sa.DateTime(timezone=True), nullable=True))
    op.add_column('alerts', sa.Column('severity_rationale', sa.Text(), nullable=True))


def downgrade() -> None:
    # 6. Drop Explainable Detection columns from alerts
    op.drop_column('alerts', 'severity_rationale')
    op.drop_column('alerts', 'detection_timestamp')
    op.drop_column('alerts', 'supporting_events')
    op.drop_column('alerts', 'matched_conditions')

    # 5. Drop Endpoint Trust columns from agents
    op.drop_column('agents', 'telemetry_freshness_seconds')
    op.drop_column('agents', 'collector_health')

    # 4. Drop Clinical Service Context columns from assets
    op.drop_column('assets', 'potential_operational_impact')
    op.drop_column('assets', 'operational_dependency')
    op.drop_column('assets', 'clinical_service')

    # 3. Drop notifications table
    op.drop_index(op.f('ix_notifications_user_id'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_org_id'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_id'), table_name='notifications')
    op.drop_table('notifications')

    # 2. Drop agent_credentials table
    op.drop_index(op.f('ix_agent_credentials_agent_id'), table_name='agent_credentials')
    op.drop_index(op.f('ix_agent_credentials_id'), table_name='agent_credentials')
    op.drop_table('agent_credentials')

    # 1. Drop enrollment_tokens table
    op.drop_index(op.f('ix_enrollment_tokens_org_id'), table_name='enrollment_tokens')
    op.drop_index(op.f('ix_enrollment_tokens_token_hash'), table_name='enrollment_tokens')
    op.drop_index(op.f('ix_enrollment_tokens_id'), table_name='enrollment_tokens')
    op.drop_table('enrollment_tokens')

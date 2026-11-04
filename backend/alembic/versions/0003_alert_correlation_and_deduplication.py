"""Add Alert Correlation Key, Occurrence Count, and First/Last Seen Timestamps

Revision ID: 0003_alert_correlation
Revises: 0002_phase1_foundation
Create Date: 2026-11-03 14:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0003_alert_correlation'
down_revision: Union[str, None] = '0002_phase1_foundation'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add correlation and deduplication columns to alerts table
    op.add_column('alerts', sa.Column('correlation_key', sa.String(128), nullable=True))
    op.add_column('alerts', sa.Column('occurrence_count', sa.Integer(), server_default='1', nullable=False))
    op.add_column('alerts', sa.Column('first_seen', sa.DateTime(timezone=True), nullable=True))
    op.add_column('alerts', sa.Column('last_seen', sa.DateTime(timezone=True), nullable=True))

    # 2. Create index on correlation_key
    op.create_index('ix_alerts_correlation_key', 'alerts', ['correlation_key'])

    # 3. Safe, reversible data backfill for existing historical records
    op.execute("UPDATE alerts SET first_seen = created_at WHERE first_seen IS NULL")
    op.execute("UPDATE alerts SET last_seen = updated_at WHERE last_seen IS NULL")
    op.execute("UPDATE alerts SET occurrence_count = 1 WHERE occurrence_count IS NULL")
    op.execute("""
        UPDATE alerts 
        SET correlation_key = md5(COALESCE(rule_id::text, 'norule') || ':' || org_id::text || ':' || COALESCE(asset_id::text, 'noasset') || ':' || COALESCE(source_ip, 'nosrc'))
        WHERE correlation_key IS NULL
    """)


def downgrade() -> None:
    op.drop_index('ix_alerts_correlation_key', table_name='alerts')
    op.drop_column('alerts', 'last_seen')
    op.drop_column('alerts', 'first_seen')
    op.drop_column('alerts', 'occurrence_count')
    op.drop_column('alerts', 'correlation_key')

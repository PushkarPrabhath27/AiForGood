"""add_mood_logs_and_adherence_risk

Revision ID: a1b2c3d4e5f6
Revises: 930e034a9750
Create Date: 2026-06-07 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '930e034a9750'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('mood_logs',
        sa.Column('patient_id', sa.String(length=36), nullable=False),
        sa.Column('guardian_id', sa.String(length=36), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('mood_score', sa.Integer(), nullable=False),
        sa.Column('mood_label', sa.String(length=50), nullable=False),
        sa.Column('source', sa.String(length=20), nullable=False),
        sa.Column('telegram_chat_id', sa.String(length=20), nullable=True),
        sa.Column('calculated_risk_multiplier', sa.Float(), nullable=False),
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['guardian_id'], ['guardians.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('id')
    )
    op.create_index(op.f('ix_mood_logs_patient_id'), 'mood_logs', ['patient_id'], unique=False)
    op.add_column('patients', sa.Column('adherence_risk', sa.String(length=10), nullable=False, server_default='low'))


def downgrade() -> None:
    op.drop_column('patients', 'adherence_risk')
    op.drop_index(op.f('ix_mood_logs_patient_id'), table_name='mood_logs')
    op.drop_table('mood_logs')

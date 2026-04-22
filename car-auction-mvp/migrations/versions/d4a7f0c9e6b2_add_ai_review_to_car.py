"""Add ai_review to car

Revision ID: d4a7f0c9e6b2
Revises: 1e8aba091d14
Create Date: 2026-04-21 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "d4a7f0c9e6b2"
down_revision = "1e8aba091d14"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("car", schema=None) as batch_op:
        batch_op.add_column(sa.Column("ai_review", sa.Text(), nullable=True))


def downgrade():
    with op.batch_alter_table("car", schema=None) as batch_op:
        batch_op.drop_column("ai_review")

"""Add electric range to car

Revision ID: 9f4d2c1b7a6e
Revises: 8c2d6b2e4f21
Create Date: 2026-05-19 23:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "9f4d2c1b7a6e"
down_revision = "8c2d6b2e4f21"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("car", schema=None) as batch_op:
        batch_op.add_column(sa.Column("electric_range_km", sa.Integer(), nullable=True))


def downgrade():
    with op.batch_alter_table("car", schema=None) as batch_op:
        batch_op.drop_column("electric_range_km")

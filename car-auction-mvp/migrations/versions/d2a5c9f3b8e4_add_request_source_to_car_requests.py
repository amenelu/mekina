"""Add request source to car requests

Revision ID: d2a5c9f3b8e4
Revises: c7e4d8f9a2b1
Create Date: 2026-05-20 03:35:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "d2a5c9f3b8e4"
down_revision = "c7e4d8f9a2b1"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("car_requests", schema=None) as batch_op:
        batch_op.add_column(sa.Column("request_source", sa.String(length=20), nullable=True))


def downgrade():
    with op.batch_alter_table("car_requests", schema=None) as batch_op:
        batch_op.drop_column("request_source")

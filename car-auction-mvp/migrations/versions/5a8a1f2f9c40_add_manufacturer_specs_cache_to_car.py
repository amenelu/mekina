"""Add manufacturer specs cache fields to car

Revision ID: 5a8a1f2f9c40
Revises: d4a7f0c9e6b2
Create Date: 2026-04-30 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "5a8a1f2f9c40"
down_revision = "d4a7f0c9e6b2"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("car", schema=None) as batch_op:
        batch_op.add_column(sa.Column("manufacturer_specs_json", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("manufacturer_specs_summary", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("manufacturer_specs_source", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("manufacturer_specs_fetched_at", sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column("manufacturer_specs_last_attempt_at", sa.DateTime(), nullable=True))


def downgrade():
    with op.batch_alter_table("car", schema=None) as batch_op:
        batch_op.drop_column("manufacturer_specs_last_attempt_at")
        batch_op.drop_column("manufacturer_specs_fetched_at")
        batch_op.drop_column("manufacturer_specs_source")
        batch_op.drop_column("manufacturer_specs_summary")
        batch_op.drop_column("manufacturer_specs_json")

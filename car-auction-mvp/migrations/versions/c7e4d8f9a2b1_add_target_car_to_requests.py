"""Add target car to requests

Revision ID: c7e4d8f9a2b1
Revises: a6b8e3d0f2c9
Create Date: 2026-05-20 03:10:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "c7e4d8f9a2b1"
down_revision = "a6b8e3d0f2c9"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("car_requests", schema=None) as batch_op:
        batch_op.add_column(sa.Column("target_car_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            "fk_car_requests_target_car_id", "car", ["target_car_id"], ["id"]
        )


def downgrade():
    with op.batch_alter_table("car_requests", schema=None) as batch_op:
        batch_op.drop_constraint("fk_car_requests_target_car_id", type_="foreignkey")
        batch_op.drop_column("target_car_id")

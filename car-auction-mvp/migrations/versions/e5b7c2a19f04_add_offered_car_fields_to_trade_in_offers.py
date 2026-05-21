"""Add offered car fields to trade-in offers

Revision ID: e5b7c2a19f04
Revises: d2a5c9f3b8e4
Create Date: 2026-05-21 17:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "e5b7c2a19f04"
down_revision = "d2a5c9f3b8e4"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("trade_in_offers", schema=None) as batch_op:
        batch_op.add_column(sa.Column("offered_car_make", sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column("offered_car_model", sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column("offered_car_year", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("offered_car_condition", sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column("offered_car_mileage", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("offered_car_specs", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("offered_car_image_url", sa.String(length=255), nullable=True))


def downgrade():
    with op.batch_alter_table("trade_in_offers", schema=None) as batch_op:
        batch_op.drop_column("offered_car_image_url")
        batch_op.drop_column("offered_car_specs")
        batch_op.drop_column("offered_car_mileage")
        batch_op.drop_column("offered_car_condition")
        batch_op.drop_column("offered_car_year")
        batch_op.drop_column("offered_car_model")
        batch_op.drop_column("offered_car_make")

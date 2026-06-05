"""Add featured car impressions

Revision ID: a1b2c3d4e5f6
Revises: f9b8a7c6d5e4
Create Date: 2026-06-05 18:58:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "a1b2c3d4e5f6"
down_revision = "f9b8a7c6d5e4"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "featured_car_impressions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("car_id", sa.Integer(), nullable=False),
        sa.Column(
            "impression_count",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column("last_shown_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["car_id"], ["car.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("car_id", name="uq_featured_car_impressions_car_id"),
    )
    op.create_index(
        op.f("ix_featured_car_impressions_car_id"),
        "featured_car_impressions",
        ["car_id"],
        unique=False,
    )
    op.create_index(
        "ix_featured_car_impressions_count",
        "featured_car_impressions",
        ["impression_count"],
        unique=False,
    )


def downgrade():
    op.drop_index("ix_featured_car_impressions_count", table_name="featured_car_impressions")
    op.drop_index(
        op.f("ix_featured_car_impressions_car_id"),
        table_name="featured_car_impressions",
    )
    op.drop_table("featured_car_impressions")

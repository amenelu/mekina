"""Add chat contact risk fields

Revision ID: c9d1e2f3a4b5
Revises: b8d7c1a2f4e9
Create Date: 2026-05-30 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "c9d1e2f3a4b5"
down_revision = "b8d7c1a2f4e9"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("chat_messages", schema=None) as batch_op:
        batch_op.add_column(sa.Column("has_contact_risk", sa.Boolean(), nullable=True))
        batch_op.add_column(sa.Column("contact_risk_score", sa.Integer(), nullable=True))
        batch_op.add_column(
            sa.Column("contact_risk_categories", sa.String(length=255), nullable=True)
        )

    op.execute(
        "UPDATE chat_messages SET has_contact_risk = CASE "
        "WHEN original_body IS NOT NULL AND original_body != body THEN 1 ELSE 0 END "
        "WHERE has_contact_risk IS NULL"
    )
    op.execute(
        "UPDATE chat_messages SET contact_risk_score = CASE "
        "WHEN has_contact_risk = 1 THEN 35 ELSE 0 END "
        "WHERE contact_risk_score IS NULL"
    )

    with op.batch_alter_table("chat_messages", schema=None) as batch_op:
        batch_op.alter_column(
            "has_contact_risk",
            existing_type=sa.Boolean(),
            nullable=False,
        )
        batch_op.alter_column(
            "contact_risk_score",
            existing_type=sa.Integer(),
            nullable=False,
        )


def downgrade():
    with op.batch_alter_table("chat_messages", schema=None) as batch_op:
        batch_op.drop_column("contact_risk_categories")
        batch_op.drop_column("contact_risk_score")
        batch_op.drop_column("has_contact_risk")

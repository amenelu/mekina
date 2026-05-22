"""Add trade-in ratings

Revision ID: f1a2b3c4d5e6
Revises: e5b7c2a19f04
Create Date: 2026-05-21 18:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "f1a2b3c4d5e6"
down_revision = "e5b7c2a19f04"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("dealer_ratings", schema=None) as batch_op:
        batch_op.alter_column("deal_id", existing_type=sa.Integer(), nullable=True)
        batch_op.add_column(sa.Column("trade_in_offer_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            "fk_dealer_ratings_trade_in_offer_id",
            "trade_in_offers",
            ["trade_in_offer_id"],
            ["id"],
        )
        batch_op.create_unique_constraint(
            "uq_dealer_ratings_trade_in_offer_id", ["trade_in_offer_id"]
        )

    with op.batch_alter_table("trade_in_offers", schema=None) as batch_op:
        batch_op.add_column(sa.Column("accepted_at", sa.DateTime(), nullable=True))
        batch_op.add_column(
            sa.Column("rating_reminder_sent_at", sa.DateTime(), nullable=True)
        )


def downgrade():
    with op.batch_alter_table("trade_in_offers", schema=None) as batch_op:
        batch_op.drop_column("rating_reminder_sent_at")
        batch_op.drop_column("accepted_at")

    with op.batch_alter_table("dealer_ratings", schema=None) as batch_op:
        batch_op.drop_constraint("uq_dealer_ratings_trade_in_offer_id", type_="unique")
        batch_op.drop_constraint(
            "fk_dealer_ratings_trade_in_offer_id", type_="foreignkey"
        )
        batch_op.drop_column("trade_in_offer_id")
        batch_op.alter_column("deal_id", existing_type=sa.Integer(), nullable=False)

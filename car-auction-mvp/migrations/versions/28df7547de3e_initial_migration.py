"""No-op migration marker.

Revision ID: 28df7547de3e
Revises: 3b999e5a443f
Create Date: 2025-11-23 21:38:35.338621

This revision previously duplicated the initial schema creation after the
schema already existed in earlier revisions. It is intentionally kept as a
marker so existing revision history remains linear while fresh databases can
upgrade through the full chain.
"""


# revision identifiers, used by Alembic.
revision = "28df7547de3e"
down_revision = "3b999e5a443f"
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass

"""add employee HR onboarding fields

Revision ID: 0002
Revises: 0001
Create Date: 2026-08-18

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("employees", sa.Column("department_id", sa.String(length=50), nullable=True))
    op.add_column("employees", sa.Column("position", sa.String(length=120), nullable=True))
    op.add_column("employees", sa.Column("joining_date", sa.Date(), nullable=True))
    op.add_column("employees", sa.Column("hr_name", sa.String(length=120), nullable=True))
    op.add_column("employees", sa.Column("office_location", sa.String(length=120), nullable=True))
    op.add_column("employees", sa.Column("contact", sa.String(length=50), nullable=True))
    op.add_column("employees", sa.Column("address", sa.String(length=255), nullable=True))
    op.add_column("employees", sa.Column("shift_type", sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column("employees", "shift_type")
    op.drop_column("employees", "address")
    op.drop_column("employees", "contact")
    op.drop_column("employees", "office_location")
    op.drop_column("employees", "hr_name")
    op.drop_column("employees", "joining_date")
    op.drop_column("employees", "position")
    op.drop_column("employees", "department_id")

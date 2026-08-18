"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-08-15

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "employees",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("employee_code", sa.String(length=100), nullable=False),
        sa.Column("department", sa.String(length=120), nullable=False, server_default="General"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("employee_code"),
    )
    op.create_table(
        "admin_users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(length=100), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.UniqueConstraint("username"),
    )
    op.create_index("ix_admin_users_username", "admin_users", ["username"])
    op.create_table(
        "face_embeddings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "employee_id",
            sa.Integer(),
            sa.ForeignKey("employees.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("embedding", postgresql.ARRAY(sa.Float()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        "attendance_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("employees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("type", sa.Enum("check_in", "check_out", name="attendancetype"), nullable=False),
        sa.Column("confidence_score", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("attendance_records")
    op.drop_table("face_embeddings")
    op.drop_table("admin_users")
    op.drop_table("employees")
    sa.Enum(name="attendancetype").drop(op.get_bind(), checkfirst=True)

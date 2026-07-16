"""add composite indexes for common list/order queries

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-09 00:00:00
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Each of these replaces a filter-then-sort (project_id/conversation_id
    # match + created_at/updated_at order) that previously only had the
    # single-column FK index to work with, forcing a sort of every matching
    # row on every list/detail request.
    op.create_index(
        "ix_documents_project_id_created_at", "documents", ["project_id", "created_at"]
    )
    op.create_index(
        "ix_conversations_project_id_updated_at", "conversations", ["project_id", "updated_at"]
    )
    op.create_index(
        "ix_messages_conversation_id_created_at", "messages", ["conversation_id", "created_at"]
    )


def downgrade() -> None:
    op.drop_index("ix_messages_conversation_id_created_at", table_name="messages")
    op.drop_index("ix_conversations_project_id_updated_at", table_name="conversations")
    op.drop_index("ix_documents_project_id_created_at", table_name="documents")

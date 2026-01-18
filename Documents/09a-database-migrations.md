# Database Migrations with Alembic

This guide covers database schema migrations using Alembic, the migration tool designed for SQLAlchemy.

## Why Migrations?

| Without Migrations | With Migrations |
|--------------------|-----------------|
| Manual SQL changes | Version-controlled schema |
| Risk of data loss | Safe, reversible changes |
| Hard to reproduce | Reproducible across environments |
| No history | Complete change history |

Think of Alembic as **"Git for your database schema"** - it tracks every change and allows rollbacks.

## Installation

```bash
pip install alembic
```

## Project Setup

### Initialize Alembic

```bash
# In your project root
alembic init alembic
```

This creates:

```
project/
├── alembic/
│   ├── versions/          # Migration files go here
│   ├── env.py             # Alembic configuration
│   ├── README
│   └── script.py.mako     # Migration template
├── alembic.ini            # Main config file
└── app/
    └── ...
```

### Configure alembic.ini

```ini
# alembic.ini
[alembic]
script_location = alembic
prepend_sys_path = .

# Database URL (use env variable in production)
sqlalchemy.url = postgresql://user:password@localhost:5432/dbname
```

### Configure env.py

```python
# alembic/env.py
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from alembic import context

# Import your models
from app.core.database import Base
from app.models import user, item  # Import all models

# This is the Alembic Config object
config = context.config

# Setup logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Add your model's MetaData object for autogenerate
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

### Using Environment Variables

```python
# alembic/env.py - Updated for env variables
import os
from dotenv import load_dotenv

load_dotenv()

def get_url():
    return os.getenv("DATABASE_URL", "sqlite:///./dev.db")

def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = get_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    # ... rest of function
```

## Creating Migrations

### Auto-generate from Models

```bash
# Create migration from model changes
alembic revision --autogenerate -m "create users table"
```

This generates a file in `alembic/versions/`:

```python
# alembic/versions/abc123_create_users_table.py
"""create users table

Revision ID: abc123def456
Revises:
Create Date: 2026-01-15 10:30:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision: str = 'abc123def456'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    op.create_index('ix_users_email', 'users', ['email'])


def downgrade() -> None:
    op.drop_index('ix_users_email', table_name='users')
    op.drop_table('users')
```

### Manual Migration

```bash
# Create empty migration
alembic revision -m "add profile picture column"
```

```python
# Manual migration example
def upgrade() -> None:
    op.add_column('users', sa.Column('profile_picture', sa.String(500)))

def downgrade() -> None:
    op.drop_column('users', 'profile_picture')
```

## Running Migrations

### Apply Migrations

```bash
# Apply all pending migrations
alembic upgrade head

# Apply specific migration
alembic upgrade abc123def456

# Apply next migration only
alembic upgrade +1
```

### Rollback Migrations

```bash
# Rollback last migration
alembic downgrade -1

# Rollback to specific revision
alembic downgrade abc123def456

# Rollback all migrations
alembic downgrade base
```

### Check Status

```bash
# Show current revision
alembic current

# Show migration history
alembic history

# Show pending migrations
alembic history --verbose
```

## Common Operations

### Add Column

```python
def upgrade() -> None:
    op.add_column('users', sa.Column('phone', sa.String(20), nullable=True))

def downgrade() -> None:
    op.drop_column('users', 'phone')
```

### Add Column with Default (Existing Data)

```python
def upgrade() -> None:
    # Add column as nullable first
    op.add_column('users', sa.Column('role', sa.String(50), nullable=True))

    # Set default value for existing rows
    op.execute("UPDATE users SET role = 'user' WHERE role IS NULL")

    # Make column non-nullable
    op.alter_column('users', 'role', nullable=False)

def downgrade() -> None:
    op.drop_column('users', 'role')
```

### Rename Column

```python
def upgrade() -> None:
    op.alter_column('users', 'name', new_column_name='full_name')

def downgrade() -> None:
    op.alter_column('users', 'full_name', new_column_name='name')
```

### Create Index

```python
def upgrade() -> None:
    op.create_index('ix_users_created_at', 'users', ['created_at'])

def downgrade() -> None:
    op.drop_index('ix_users_created_at', table_name='users')
```

### Add Foreign Key

```python
def upgrade() -> None:
    op.add_column('posts', sa.Column('author_id', sa.Integer(), nullable=False))
    op.create_foreign_key(
        'fk_posts_author_id',
        'posts', 'users',
        ['author_id'], ['id'],
        ondelete='CASCADE'
    )

def downgrade() -> None:
    op.drop_constraint('fk_posts_author_id', 'posts', type_='foreignkey')
    op.drop_column('posts', 'author_id')
```

### Create New Table

```python
def upgrade() -> None:
    op.create_table(
        'categories',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False, unique=True),
        sa.Column('description', sa.Text()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

def downgrade() -> None:
    op.drop_table('categories')
```

### Drop Table

```python
def upgrade() -> None:
    op.drop_table('old_table')

def downgrade() -> None:
    op.create_table(
        'old_table',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', sa.String(255)),
    )
```

## Async Support

For async SQLAlchemy, update `env.py`:

```python
# alembic/env.py for async
import asyncio
from sqlalchemy.ext.asyncio import async_engine_from_config

def run_async_migrations() -> None:
    """Run migrations in async mode."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async def do_run_migrations(connection: Connection) -> None:
        await connection.run_sync(do_run_migrations_sync)

    async def do_run_migrations_sync(connection: Connection) -> None:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )
        with context.begin_transaction():
            context.run_migrations()

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations_sync)

    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())
```

## Data Migrations

Sometimes you need to migrate data, not just schema:

```python
from sqlalchemy.sql import table, column
from sqlalchemy import String, Integer

def upgrade() -> None:
    # Define table for data operations
    users = table('users',
        column('id', Integer),
        column('full_name', String),
        column('first_name', String),
        column('last_name', String),
    )

    # Add new columns
    op.add_column('users', sa.Column('first_name', sa.String(100)))
    op.add_column('users', sa.Column('last_name', sa.String(100)))

    # Migrate data: split full_name into first_name and last_name
    connection = op.get_bind()
    connection.execute(
        users.update().values(
            first_name=sa.func.split_part(users.c.full_name, ' ', 1),
            last_name=sa.func.split_part(users.c.full_name, ' ', 2)
        )
    )

    # Remove old column
    op.drop_column('users', 'full_name')


def downgrade() -> None:
    users = table('users',
        column('full_name', String),
        column('first_name', String),
        column('last_name', String),
    )

    op.add_column('users', sa.Column('full_name', sa.String(200)))

    connection = op.get_bind()
    connection.execute(
        users.update().values(
            full_name=users.c.first_name + ' ' + users.c.last_name
        )
    )

    op.drop_column('users', 'first_name')
    op.drop_column('users', 'last_name')
```

## Best Practices

### 1. Always Review Auto-generated Migrations

```bash
# Generate migration
alembic revision --autogenerate -m "add feature"

# ALWAYS review the generated file before applying!
# Auto-generate may miss some changes or generate incorrect operations
```

### 2. Test Migrations

```bash
# Test upgrade
alembic upgrade head

# Test downgrade
alembic downgrade -1

# Test upgrade again
alembic upgrade head
```

### 3. One Change Per Migration

```bash
# Good: Separate migrations
alembic revision --autogenerate -m "add users table"
alembic revision --autogenerate -m "add posts table"
alembic revision --autogenerate -m "add user_posts relationship"

# Bad: All in one migration
alembic revision --autogenerate -m "add users posts and relationships"
```

### 4. Meaningful Migration Names

```bash
# Good
alembic revision -m "add email verification fields to users"
alembic revision -m "create orders table with foreign keys"

# Bad
alembic revision -m "update"
alembic revision -m "changes"
```

### 5. Never Edit Applied Migrations

Once a migration is applied to any environment, never modify it. Create a new migration instead.

## Production Workflow

### CI/CD Integration

```yaml
# .github/workflows/deploy.yml
- name: Run migrations
  run: |
    alembic upgrade head
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### Docker Entrypoint

```bash
#!/bin/bash
# entrypoint.sh

# Run migrations
alembic upgrade head

# Start application
exec gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

```dockerfile
# Dockerfile
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
```

### Backup Before Migration

```bash
# PostgreSQL backup
pg_dump -h localhost -U user dbname > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migration
alembic upgrade head
```

## Troubleshooting

### Target Database Not Up to Date

```bash
# Check current state
alembic current

# Stamp database with current revision (if manually synced)
alembic stamp head
```

### Migration Conflicts (Multiple Heads)

```bash
# View heads
alembic heads

# Merge heads
alembic merge -m "merge heads" rev1 rev2
```

### Autogenerate Not Detecting Changes

Ensure all models are imported in `env.py`:

```python
# alembic/env.py
from app.models.user import User
from app.models.post import Post
from app.models.comment import Comment
# Import ALL models

target_metadata = Base.metadata
```

## Summary

| Command | Purpose |
|---------|---------|
| `alembic init alembic` | Initialize Alembic |
| `alembic revision --autogenerate -m "msg"` | Create auto migration |
| `alembic revision -m "msg"` | Create empty migration |
| `alembic upgrade head` | Apply all migrations |
| `alembic downgrade -1` | Rollback last migration |
| `alembic current` | Show current revision |
| `alembic history` | Show migration history |

## References

- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- [SQLAlchemy Migrations Tutorial](https://docs.sqlalchemy.org/en/20/core/metadata.html#altering-database-objects-through-migrations)
- [FastAPI + Alembic Guide](https://fastapi.tiangolo.com/tutorial/sql-databases/#migrations)

---

[Previous: CRUD Operations](./08-crud-operations.md) | [Back to Index](./README.md) | [Next: Database Relationships](./09-database-relationships.md)

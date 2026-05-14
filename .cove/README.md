# .cove Directory

This directory contains the Cove backend's persistent data using a hybrid architecture:

## Architecture

- **Database** (`database/cove.db`): Stores indexes, metadata, and relationships
- **Storage** (`storage/`): Stores actual content (messages, attachments, etc.)

## Directory Structure

```
.cove/
├── config/          # Configuration files
├── database/        # SQLite database
├── storage/         # File storage
│   ├── messages/    # Message content
│   ├── channels/    # Channel metadata
│   ├── users/       # User profiles
│   ├── projects/    # Project details
│   ├── tasks/       # Task details
│   ├── agents/      # Agent configurations
│   ├── workflows/   # Workflow definitions
│   └── attachments/ # File attachments
├── cache/           # Cache data
├── logs/            # Application logs
├── temp/            # Temporary files
└── metadata/        # Metadata and version info
```

## Data Flow

1. **Write**: Entity → Database (index) + Storage (content)
2. **Read**: Database (query) → Storage (load content) → Entity

## Backup

To backup all data:
```bash
tar -czf cove-backup-$(date +%Y%m%d).tar.gz .cove/
```

## Migration

Database migrations are managed by Prisma:
```bash
npx prisma migrate dev
```

## Version

Schema version: See `metadata/schema-version.txt`

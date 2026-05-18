# Database Auto-Initialization

## Overview

The Cove backend now automatically initializes the database on first startup. This eliminates the need for manual migration steps when setting up a new development environment or deploying to a new server.

## How It Works

When the backend server starts, it performs the following checks:

1. **Check if database exists**: Looks for the database file at `.cove/database/cove.db`
2. **Check if database is empty**: Verifies the file size is greater than 0 bytes
3. **Run migrations if needed**: If the database is missing or empty, automatically runs `prisma migrate deploy`
4. **Verify initialization**: Confirms the database was created successfully

## Configuration

### Environment Variables

- **`AUTO_MIGRATE`**: Controls automatic database initialization
  - Default: `true` (enabled)
  - Set to `false` to disable: `AUTO_MIGRATE=false`

### Database Path

The database location is determined by:
1. `COVE_PROJECT_ROOT` environment variable (if set)
2. Otherwise: `../../../` relative to `backend/src/` (project root)

Database file: `{PROJECT_ROOT}/.cove/database/cove.db`

## Usage

### First-Time Setup

Simply start the backend server:

```bash
cd code/backend
npm start
```

The database will be automatically initialized on first run.

### Development Workflow

No changes needed! The auto-initialization only runs when the database is missing or empty. Existing databases are left untouched.

### Disabling Auto-Initialization

If you need to disable automatic initialization (e.g., for testing or manual control):

```bash
AUTO_MIGRATE=false npm start
```

## Migration Strategy

The system uses **`prisma migrate deploy`** instead of `prisma migrate dev`:

- ✅ **Production-safe**: No prompts, no schema drift detection
- ✅ **Idempotent**: Safe to run multiple times
- ✅ **CI/CD friendly**: Works in automated environments
- ✅ **Applies pending migrations**: Runs all migrations that haven't been applied yet

## Logging

The initialization process logs detailed information:

```
[INFO] Checking database initialization status...
[INFO] Database file does not exist
[INFO] Database needs initialization, starting setup...
[INFO] Creating database directory
[INFO] Running Prisma migrations...
[INFO] Prisma migrations completed successfully
[INFO] Database initialized successfully
```

## Error Handling

If initialization fails:

1. **Error is logged** with full details
2. **Server startup is aborted** (fails fast)
3. **Error message includes** the root cause

Common errors:
- Missing migrations directory
- Invalid Prisma schema
- File system permissions
- Disk space issues

## Testing

### Unit Tests

Run the DatabaseInitializer unit tests:

```bash
npm test -- database-initializer.test.ts
```

### Integration Test

A test script is provided to simulate a fresh installation:

```bash
./test-db-init.sh
```

This script:
1. Backs up the existing database
2. Removes the database file
3. Starts the server
4. Verifies the database was created
5. Checks that tables exist
6. Restores the original database

## Implementation Details

### DatabaseInitializer Class

Located at: `src/infrastructure/database/database-initializer.ts`

**Key Methods:**
- `initialize()`: Main entry point, checks and initializes if needed
- `needsInitialization()`: Determines if initialization is required
- `ensureDatabaseDirectory()`: Creates database directory if missing
- `runMigrations()`: Executes Prisma migrations
- `getStatus()`: Returns current database status

**Constructor Options:**
```typescript
interface DatabaseInitializerOptions {
  databasePath: string;      // Path to database file
  migrationsPath: string;    // Path to migrations directory
  logger: ILogger;           // Logger instance
  autoMigrate?: boolean;     // Enable/disable auto-migration (default: true)
}
```

### Integration in main.ts

The initializer runs before any other dependencies are initialized:

```typescript
async function startServer() {
  // 1. Initialize database first
  const dbInitializer = new DatabaseInitializer({...});
  await dbInitializer.initialize();

  // 2. Then initialize application dependencies
  const deps = initializeDependencies();

  // 3. Start the server
  const { httpServer } = createStandaloneServer(deps);
  httpServer.listen(PORT);
}
```

## Benefits

### For Developers
- ✅ No manual migration steps
- ✅ Faster onboarding for new team members
- ✅ Consistent setup across environments
- ✅ Fewer "forgot to run migrations" errors

### For Deployment
- ✅ Simplified deployment process
- ✅ Works in containerized environments
- ✅ No separate migration step needed
- ✅ Automatic recovery from empty database files

### For Testing
- ✅ Clean slate for integration tests
- ✅ Easy to reset database state
- ✅ Predictable test environment setup

## Troubleshooting

### Database file exists but is empty (0 bytes)

This can happen if:
- Server crashed during initialization
- Disk full during database creation
- File system corruption

**Solution**: The auto-initializer detects this and re-runs migrations automatically.

### Migrations fail to run

Check:
1. Prisma schema is valid: `npx prisma validate`
2. Migrations directory exists: `backend/prisma/migrations/`
3. File permissions allow database creation
4. Sufficient disk space available

### Want to force re-initialization

```bash
# Remove the database file
rm .cove/database/cove.db

# Start the server (will auto-initialize)
npm start
```

## Future Enhancements

Potential improvements:
- [ ] Add seed data support (optional initial data)
- [ ] Health check endpoint includes database status
- [ ] Metrics for initialization time
- [ ] Automatic backup before migrations
- [ ] Migration rollback support
- [ ] Database version tracking in logs

## Related Files

- `src/infrastructure/database/database-initializer.ts` - Main implementation
- `src/infrastructure/database/__tests__/database-initializer.test.ts` - Unit tests
- `src/main.ts` - Integration point
- `test-db-init.sh` - Integration test script
- `prisma/schema.prisma` - Database schema
- `prisma/migrations/` - Migration files

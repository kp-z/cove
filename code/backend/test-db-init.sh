#!/bin/bash

# Test script for database auto-initialization
# This script simulates a fresh installation scenario

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DB_PATH="$PROJECT_ROOT/.cove/database/cove.db"
BACKUP_PATH="$PROJECT_ROOT/.cove/database/cove.db.backup"

echo "=========================================="
echo "Database Auto-Initialization Test"
echo "=========================================="
echo ""
echo "Project Root: $PROJECT_ROOT"
echo "Database Path: $DB_PATH"
echo ""

# Step 1: Backup existing database if it exists
if [ -f "$DB_PATH" ]; then
    echo "✓ Backing up existing database..."
    cp "$DB_PATH" "$BACKUP_PATH"
    echo "  Backup saved to: $BACKUP_PATH"
else
    echo "✓ No existing database found (fresh install scenario)"
fi

# Step 2: Remove database to simulate fresh install
if [ -f "$DB_PATH" ]; then
    echo "✓ Removing database to simulate fresh install..."
    rm "$DB_PATH"
fi

# Step 3: Verify database is gone
if [ -f "$DB_PATH" ]; then
    echo "✗ Failed to remove database"
    exit 1
else
    echo "✓ Database removed successfully"
fi

echo ""
echo "=========================================="
echo "Starting backend server..."
echo "=========================================="
echo ""

# Step 4: Start the server (it should auto-initialize the database)
cd "$SCRIPT_DIR"
timeout 10s npm start &
SERVER_PID=$!

# Wait a bit for initialization
sleep 5

# Step 5: Check if database was created
echo ""
echo "=========================================="
echo "Checking database status..."
echo "=========================================="
echo ""

if [ -f "$DB_PATH" ]; then
    DB_SIZE=$(stat -f%z "$DB_PATH" 2>/dev/null || stat -c%s "$DB_PATH" 2>/dev/null)
    echo "✓ Database file created: $DB_PATH"
    echo "  Size: $DB_SIZE bytes"

    if [ "$DB_SIZE" -gt 0 ]; then
        echo "✓ Database is not empty (initialization successful)"
    else
        echo "✗ Database file is empty (initialization failed)"
        kill $SERVER_PID 2>/dev/null || true
        exit 1
    fi
else
    echo "✗ Database file was not created"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

# Step 6: Test a simple query
echo ""
echo "=========================================="
echo "Testing database query..."
echo "=========================================="
echo ""

# Use sqlite3 to check if tables exist
TABLES=$(sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "")

if [ -n "$TABLES" ]; then
    echo "✓ Database tables found:"
    echo "$TABLES" | sed 's/^/  - /'
else
    echo "✗ No tables found in database"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

# Stop the server
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true

echo ""
echo "=========================================="
echo "Test completed successfully!"
echo "=========================================="
echo ""

# Step 7: Restore backup if it exists
if [ -f "$BACKUP_PATH" ]; then
    echo "Restoring original database..."
    mv "$BACKUP_PATH" "$DB_PATH"
    echo "✓ Database restored"
fi

echo ""
echo "Summary:"
echo "  ✓ Database auto-initialization works correctly"
echo "  ✓ Server starts successfully with empty/missing database"
echo "  ✓ All tables are created automatically"
echo ""

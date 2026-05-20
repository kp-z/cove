import * as fs from 'fs/promises';
import * as path from 'path';
import { IAuditLogStore } from './audit-log-store.interface';
import { AuditLogEntry, AuditLogFilters } from './audit-logger.interface';

/**
 * File System Audit Log Store
 *
 * Stores audit logs as JSON files in the file system
 * Format: .cove/audit-logs/YYYY-MM-DD.jsonl (one JSON object per line)
 */
export class FileSystemAuditLogStore implements IAuditLogStore {
  constructor(private baseDir: string = '.cove/audit-logs') {}

  async save(entry: AuditLogEntry): Promise<void> {
    // Ensure directory exists
    await fs.mkdir(this.baseDir, { recursive: true });

    // Get log file path for today
    const date = entry.timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
    const logFile = path.join(this.baseDir, `${date}.jsonl`);

    // Append entry as JSON line
    const line = JSON.stringify(entry) + '\n';
    await fs.appendFile(logFile, line, 'utf-8');
  }

  async query(filters: AuditLogFilters): Promise<AuditLogEntry[]> {
    const entries: AuditLogEntry[] = [];

    // Determine which log files to read
    const files = await this.getLogFiles(filters.from, filters.to);

    // Read and parse each file
    for (const file of files) {
      const filePath = path.join(this.baseDir, file);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.trim().split('\n').filter(line => line.length > 0);

        for (const line of lines) {
          try {
            const entry = JSON.parse(line) as AuditLogEntry;
            // Convert timestamp string back to Date
            entry.timestamp = new Date(entry.timestamp);

            if (this.matchesFilters(entry, filters)) {
              entries.push(entry);
            }
          } catch (parseError) {
            // Skip malformed lines
            console.error(`Failed to parse audit log line: ${line}`, parseError);
          }
        }
      } catch (readError) {
        // Skip files that can't be read
        console.error(`Failed to read audit log file: ${filePath}`, readError);
      }
    }

    // Sort by timestamp descending (newest first)
    entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 100;
    return entries.slice(offset, offset + limit);
  }

  /**
   * Get list of log files to read based on date range
   */
  private async getLogFiles(from?: Date, to?: Date): Promise<string[]> {
    try {
      const allFiles = await fs.readdir(this.baseDir);
      const logFiles = allFiles.filter(f => f.endsWith('.jsonl'));

      if (!from && !to) {
        return logFiles;
      }

      // Filter by date range
      return logFiles.filter(file => {
        const dateStr = file.replace('.jsonl', '');
        const fileDate = new Date(dateStr);

        if (from && fileDate < from) return false;
        if (to && fileDate > to) return false;
        return true;
      });
    } catch (error) {
      // Directory doesn't exist yet
      return [];
    }
  }

  /**
   * Check if an entry matches the given filters
   */
  private matchesFilters(entry: AuditLogEntry, filters: AuditLogFilters): boolean {
    if (filters.actor_id && entry.actor_id !== filters.actor_id) return false;
    if (filters.resource_type && entry.resource_type !== filters.resource_type) return false;
    if (filters.resource_id && entry.resource_id !== filters.resource_id) return false;
    if (filters.action && entry.action !== filters.action) return false;
    if (filters.from && entry.timestamp < filters.from) return false;
    if (filters.to && entry.timestamp > filters.to) return false;
    return true;
  }
}

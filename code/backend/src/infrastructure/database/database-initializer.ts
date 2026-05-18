import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { ILogger } from '../../application/interfaces/index';
import { BuiltInAgentsInitializer } from './built-in-agents-initializer';

export interface DatabaseInitializerOptions {
  databasePath: string;
  migrationsPath: string;
  logger: ILogger;
  autoMigrate?: boolean;
  prisma?: PrismaClient;
  storageRoot?: string; // Path to .cove directory for agent storage
}

export class DatabaseInitializer {
  private readonly databasePath: string;
  private readonly migrationsPath: string;
  private readonly logger: ILogger;
  private readonly autoMigrate: boolean;
  private readonly prisma?: PrismaClient;
  private readonly storageRoot?: string;

  constructor(options: DatabaseInitializerOptions) {
    this.databasePath = options.databasePath;
    this.migrationsPath = options.migrationsPath;
    this.logger = options.logger;
    this.autoMigrate = options.autoMigrate ?? true;
    this.prisma = options.prisma;
    this.storageRoot = options.storageRoot;
  }

  /**
   * Check if database needs initialization
   */
  private needsInitialization(): boolean {
    // Database file doesn't exist
    if (!fs.existsSync(this.databasePath)) {
      this.logger.info('Database file does not exist', { path: this.databasePath });
      return true;
    }

    // Database file is empty (0 bytes)
    const stats = fs.statSync(this.databasePath);
    if (stats.size === 0) {
      this.logger.warn('Database file exists but is empty (0 bytes)', { path: this.databasePath });
      return true;
    }

    this.logger.debug('Database file exists and has content', {
      path: this.databasePath,
      size: stats.size
    });
    return false;
  }

  /**
   * Ensure database directory exists
   */
  private ensureDatabaseDirectory(): void {
    const dbDir = path.dirname(this.databasePath);
    if (!fs.existsSync(dbDir)) {
      this.logger.info('Creating database directory', { path: dbDir });
      fs.mkdirSync(dbDir, { recursive: true });
    }
  }

  /**
   * Run Prisma migrations
   */
  private runMigrations(): void {
    try {
      this.logger.info('Running Prisma migrations...');

      // Get the backend directory (where package.json and prisma/ are located)
      const backendDir = path.resolve(this.migrationsPath, '../..');

      this.logger.debug('Executing prisma migrate deploy', { cwd: backendDir });

      // Use 'prisma migrate deploy' for production-safe migrations
      // This applies all pending migrations without prompting
      const output = execSync('npx prisma migrate deploy', {
        cwd: backendDir,
        encoding: 'utf-8',
        stdio: 'pipe',
      });

      this.logger.info('Prisma migrations completed successfully');
      this.logger.debug('Migration output', { output });
    } catch (error) {
      this.logger.error('Failed to run Prisma migrations', error as Error);
      throw new Error(`Database migration failed: ${(error as Error).message}`);
    }
  }

  /**
   * Initialize database if needed
   * @returns true if initialization was performed, false if not needed
   */
  async initialize(): Promise<boolean> {
    if (!this.autoMigrate) {
      this.logger.info('Auto-migration is disabled, skipping database initialization check');
      return false;
    }

    this.logger.info('Checking database initialization status...');

    if (!this.needsInitialization()) {
      this.logger.info('Database is already initialized, skipping migration');
      return false;
    }

    this.logger.info('Database needs initialization, starting setup...');

    try {
      // Step 1: Ensure database directory exists
      this.ensureDatabaseDirectory();

      // Step 2: Run migrations
      this.runMigrations();

      // Step 3: Verify database was created successfully
      if (!fs.existsSync(this.databasePath)) {
        throw new Error('Database file was not created after migration');
      }

      const stats = fs.statSync(this.databasePath);
      if (stats.size === 0) {
        throw new Error('Database file is still empty after migration');
      }

      this.logger.info('Database initialized successfully', {
        path: this.databasePath,
        size: stats.size
      });

      // Step 4: Initialize built-in agents (if prisma and storageRoot are provided)
      if (this.prisma && this.storageRoot) {
        await this.initializeBuiltInAgents();
      } else {
        this.logger.debug('Skipping built-in agents initialization (prisma or storageRoot not provided)');
      }

      return true;
    } catch (error) {
      this.logger.error('Database initialization failed', error as Error);
      throw error;
    }
  }

  /**
   * Initialize built-in agents
   */
  private async initializeBuiltInAgents(): Promise<void> {
    if (!this.prisma || !this.storageRoot) {
      return;
    }

    try {
      this.logger.info('Initializing built-in agents...');

      const agentsInitializer = new BuiltInAgentsInitializer({
        prisma: this.prisma,
        logger: this.logger,
        storageRoot: this.storageRoot,
      });

      await agentsInitializer.initialize();

      this.logger.info('Built-in agents initialization complete');
    } catch (error) {
      this.logger.error('Failed to initialize built-in agents', error as Error);
      // Don't throw - built-in agents initialization failure shouldn't block database initialization
    }
  }

  /**
   * Get database status information
   */
  getStatus(): {
    exists: boolean;
    size: number;
    path: string;
  } {
    const exists = fs.existsSync(this.databasePath);
    const size = exists ? fs.statSync(this.databasePath).size : 0;

    return {
      exists,
      size,
      path: this.databasePath,
    };
  }
}

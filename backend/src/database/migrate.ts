#!/usr/bin/env ts-node

import { readFileSync } from 'fs';
import { join } from 'path';
import { db, initializeDatabase, closeDatabase } from './connection';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.simple()
  ),
  transports: [new winston.transports.Console()]
});

interface Migration {
  id: string;
  name: string;
  filename: string;
  executed_at?: Date;
}

async function createMigrationsTable(): Promise<void> {
  const query = `
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      filename VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP DEFAULT NOW()
    );
  `;
  
  await db.query(query);
  logger.info('Migrations table created or already exists');
}

async function getExecutedMigrations(): Promise<Migration[]> {
  const result = await db.query(
    'SELECT id, name, filename, executed_at FROM migrations ORDER BY id'
  );
  return result.rows;
}

async function markMigrationAsExecuted(name: string, filename: string): Promise<void> {
  await db.query(
    'INSERT INTO migrations (name, filename) VALUES ($1, $2)',
    [name, filename]
  );
}

async function executeMigration(filename: string): Promise<void> {
  const filePath = join(__dirname, 'init', filename);
  const sql = readFileSync(filePath, 'utf-8');
  
  // Split by ; and execute each statement
  const statements = sql
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);
  
  for (const statement of statements) {
    if (statement.trim()) {
      await db.query(statement);
    }
  }
}

async function runMigrations(): Promise<void> {
  try {
    await initializeDatabase();
    await createMigrationsTable();
    
    const executedMigrations = await getExecutedMigrations();
    const executedNames = new Set(executedMigrations.map(m => m.name));
    
    // Define migration files in order
    const migrationFiles = [
      { name: 'create_schema', filename: '01-schema.sql' },
      { name: 'seed_data', filename: '02-seed.sql' }
    ];
    
    for (const migration of migrationFiles) {
      if (!executedNames.has(migration.name)) {
        logger.info(`Executing migration: ${migration.name}`);
        
        try {
          await executeMigration(migration.filename);
          await markMigrationAsExecuted(migration.name, migration.filename);
          logger.info(`✓ Migration ${migration.name} completed successfully`);
        } catch (error) {
          logger.error(`✗ Migration ${migration.name} failed:`, error);
          throw error;
        }
      } else {
        logger.info(`⚠ Migration ${migration.name} already executed, skipping`);
      }
    }
    
    logger.info('All migrations completed successfully');
    
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    await closeDatabase();
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration process failed:', error);
      process.exit(1);
    });
}

export { runMigrations };
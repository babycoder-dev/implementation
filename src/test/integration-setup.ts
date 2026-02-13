/**
 * Integration Test Setup
 *
 * This file sets up testcontainers for PostgreSQL integration testing.
 */

import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { sql as sqlTemplate } from 'postgres';
import path from 'path';
import fs from 'fs';

// Singleton container instance
let container: PostgreSqlContainer | null = null;
let databaseUrl: string | null = null;

/**
 * Get the schema SQL content
 */
function getSchemaSQL(): string {
  const schemaPath = path.join(process.cwd(), 'src/db/schema.sql');
  if (fs.existsSync(schemaPath)) {
    return fs.readFileSync(schemaPath, 'utf-8');
  }
  return '';
}

/**
 * Start PostgreSQL container
 */
export async function startPostgres(): Promise<string> {
  if (databaseUrl) {
    return databaseUrl;
  }

  console.log('Starting PostgreSQL container...');

  container = await new PostgreSqlContainer()
    .withDatabase('learning_system_test')
    .withUsername('test')
    .withPassword('test')
    .withExposedPorts(5432)
    .start();

  databaseUrl = container.getConnectionUri();

  // Initialize schema
  const sql = sqlTemplate(databaseUrl);
  const schemaSQL = getSchemaSQL();

  if (schemaSQL) {
    // Split and execute schema statements
    const statements = schemaSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        await sql.unsafe(statement);
      } catch (error) {
        // Ignore errors for CREATE EXTENSION if already exists
        if (!statement.includes('CREATE EXTENSION')) {
          console.warn('Schema statement warning:', error);
        }
      }
    }
  }

  console.log('PostgreSQL container started');
  return databaseUrl;
}

/**
 * Stop PostgreSQL container
 */
export async function stopPostgres(): Promise<void> {
  if (container) {
    await container.stop();
    container = null;
    databaseUrl = null;
    console.log('PostgreSQL container stopped');
  }
}

/**
 * Get database connection URL
 */
export function getDatabaseUrl(): string | null {
  return databaseUrl;
}

/**
 * Global setup for Vitest
 */
export async function setupGlobal(): Promise<void> {
  await startPostgres();
}

/**
 * Global teardown for Vitest
 */
export async function teardownGlobal(): Promise<void> {
  await stopPostgres();
}

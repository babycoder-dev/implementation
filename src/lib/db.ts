import postgres from 'postgres';

// Database connection using postgres library (local PostgreSQL)
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/learning_system';

const sql = postgres(databaseUrl, {
  connect_timeout: 10,
  max: 20,
  idle_timeout: 20,
});

// Export sql as database for backward compatibility
const database = sql;

export { sql, database };

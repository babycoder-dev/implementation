import postgres from 'postgres';

// Database connection using postgres library (local PostgreSQL)
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL environment variable is required in production');
  }
  console.warn('WARNING: Using default DATABASE_URL. Set DATABASE_URL in production!');
}

const sql = postgres(databaseUrl || 'postgresql://postgres:postgres@localhost:5432/learning_system', {
  connect_timeout: 10,
  max: 20,
  idle_timeout: 20,
});

// Export sql as database for backward compatibility
const database = sql;

export { sql, database };

import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';

// Load environment variables from `.env` into `process.env`.
dotenv.config();

// ---------------------------------------------------------------------------
// Database configuration (loaded from environment variables)
// ---------------------------------------------------------------------------

/**
 * Reads a required environment variable and fails fast with a clear message if
 * it is missing or empty. This keeps credentials out of the source code while
 * validating the configuration at startup (see `agent.md` — "Sin Exposición
 * de Secretos").
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name} environment variable. Add it to your \`.env\` file before starting the server.`,
    );
  }
  return value;
}

const DB_NAME = requireEnv('DB_NAME');
const DB_USER = requireEnv('DB_USER');
const DB_PASSWORD = requireEnv('DB_PASSWORD');
const DB_HOST = requireEnv('DB_HOST');
const DB_PORT = Number(requireEnv('DB_PORT'));

// ---------------------------------------------------------------------------
// Sequelize instance (PostgreSQL)
// ---------------------------------------------------------------------------

export const sequelize: Sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
});

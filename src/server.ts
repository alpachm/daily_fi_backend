import app from './app';
import { sequelize } from './database';

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// ---------------------------------------------------------------------------
// Bootstrapping: verify the database connection BEFORE listening for HTTP.
// ---------------------------------------------------------------------------

const start = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('[Database] Connected successfully to PostgreSQL via Sequelize (daily_fi_db)');
  } catch (err) {
    console.error('[Database] Unable to connect to PostgreSQL:', err);
    process.exit(1);
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`Server is running at http://${HOST}:${PORT}`);
  });

  // ---------------------------------------------------------------------------
  // Graceful shutdown
  // ---------------------------------------------------------------------------

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`${signal} received. Shutting down gracefully...`);

    server.close(async (err) => {
      if (err) {
        console.error('Error while closing the HTTP server:', err);
        process.exit(1);
      }

      try {
        await sequelize.close();
        console.log('Database connection closed.');
      } catch (dbErr) {
        console.error('Error while closing the database connection:', dbErr);
        process.exit(1);
      }

      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

void start();

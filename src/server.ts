import app from './app';
import { sequelize } from './database';
import { initModels } from './models';

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// ---------------------------------------------------------------------------
// Bootstrapping: connect to the database, register model associations and
// synchronize the schema BEFORE listening for HTTP.
// ---------------------------------------------------------------------------

const start = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('[Database] Connected successfully to PostgreSQL via Sequelize (daily_fi_db)');

    // Register the model associations and create/verify the tables.
    initModels();
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('[Database] Models synchronized successfully (users, daily_balances, receipts)');
  } catch (err) {
    console.error('[Database] Unable to initialize the database:', err);
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

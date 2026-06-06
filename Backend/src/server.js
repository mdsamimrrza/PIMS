const dotenv = require('dotenv');
const path = require('node:path');
const { validateEnv } = require('./config/env');
const { connectDatabase } = require('./config/db');
const { startBackgroundJobs } = require('./jobs/index');
const { bootstrapDefaultUsersIfEmpty } = require('./services/auth.service');

const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const start = async () => {
  validateEnv();
  await connectDatabase();
  
  const app = require('./app');

  const bootstrapResult = await bootstrapDefaultUsersIfEmpty();
  if (bootstrapResult?.seeded) {
    console.log(`Synchronized ${bootstrapResult.count} default demo auth users`);
  }

  const port = Number(process.env.PORT || 5000);
  const server = app.listen(port, () => {
    console.log(`PIMS backend running on port ${port}`);
    startBackgroundJobs();
  });

  server.on('error', (error) => {
    if (error?.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Stop the other backend process or change PORT in Backend/.env.`);
    } else {
      console.error('Backend server failed to start', error);
    }
    process.exit(1);
  });
};

start().catch((error) => {
  console.error('Failed to start backend', error);
  process.exit(1);
});

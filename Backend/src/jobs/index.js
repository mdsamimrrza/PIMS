const { startExpiryCheckJob } = require('./expiryCheck.job');
const { startLowStockCheckJob } = require('./lowStockCheck.job');
const { startEmergencyReconciliationJob } = require('./emergencyReconciliation');

const startBackgroundJobs = () => {
  if (process.env.ENABLE_BACKGROUND_JOBS === 'false') {
    console.log('[Jobs] Background jobs disabled by configuration.');
    return [];
  }

  const handles = [
    startLowStockCheckJob(),
    startExpiryCheckJob(),
    startEmergencyReconciliationJob()
  ].filter(Boolean);
  console.log(`[Jobs] Background jobs started: ${handles.length}`);
  return handles;
};

module.exports = {
  startBackgroundJobs
};

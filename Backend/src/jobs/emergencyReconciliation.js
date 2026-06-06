const cron = require('node-cron');
const EmergencyVisit = require('../models/EmergencyVisit.model');
const Alert = require('../models/Alert.model');
const { sendEmail } = require('../services/email.service'); // Assuming existing email service

const startEmergencyReconciliationJob = () => {
  cron.schedule('*/30 * * * *', async () => {
    console.log('[Job] Starting Emergency Reconciliation...');
    try {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

      const visits = await EmergencyVisit.find({
        'overrideDispenses.signedBy': null,
        'overrideDispenses.dispensedAt': { $lt: twoHoursAgo }
      });

      for (const visit of visits) {
        const unsignedItems = visit.overrideDispenses.filter(d => !d.signedBy && d.dispensedAt < twoHoursAgo);
        
        if (unsignedItems.length > 0) {
          // Create Admin Alert
          await Alert.create({
            type: 'emergency_override_unsigned',
            message: `Emergency override unsigned for > 2 hours. Visit: ${visit._id}. Items: ${unsignedItems.length}`,
            targetRole: 'admin',
            metadata: { visitId: visit._id }
          });

          // Send Email to Admin (Mocked as per requirement)
          if (process.env.ADMIN_EMAIL) {
            await sendEmail({
              to: process.env.ADMIN_EMAIL,
              subject: 'URGENT: Unsigned Emergency Override',
              text: `Emergency visit ${visit._id} has ${unsignedItems.length} unsigned medication overrides pending for over 2 hours.`
            });
          }
        }
      }
    } catch (error) {
      console.error('[Job Error] Emergency Reconciliation:', error.message);
    }
  });
};

module.exports = { startEmergencyReconciliationJob };

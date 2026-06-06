const emergencyService = require('../services/emergency.service');
const EmergencyVisit = require('../models/EmergencyVisit.model');

const createVisit = async (req, res, next) => {
  try {
    const actorId = req.session.user.id;
    const visit = await emergencyService.createVisit(actorId, req.body);
    res.status(201).json({ success: true, data: visit });
  } catch (error) {
    next(error);
  }
};

const assignTriage = async (req, res, next) => {
  try {
    const actorId = req.session.user.id;
    const visit = await emergencyService.assignTriage(req.params.id, actorId, req.body);
    res.status(200).json({ success: true, data: visit });
  } catch (error) {
    next(error);
  }
};

const getQueue = async (req, res, next) => {
  try {
    const visits = await emergencyService.getQueue();
    res.status(200).json({ success: true, data: visits });
  } catch (error) {
    next(error);
  }
};

const dispenseOverride = async (req, res, next) => {
  try {
    const actorId = req.session.user.id;
    const visit = await emergencyService.dispenseOverride(req.body.visitId, actorId, req.body);
    res.status(200).json({ success: true, data: visit });
  } catch (error) {
    next(error);
  }
};

const signOverride = async (req, res, next) => {
  try {
    const actorId = req.session.user.id;
    const result = await emergencyService.signOverride(req.params.visitId, req.params.index, actorId);
    res.status(200).json({ 
      success: true, 
      data: result.data, 
      warning: result.warning 
    });
  } catch (error) {
    next(error);
  }
};

const streamQueue = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendQueue = async () => {
    try {
      const visits = await emergencyService.getStreamData();
      res.write(`data: ${JSON.stringify(visits)}\n\n`);
    } catch (error) {
      console.error('SSE Stream Error:', error.message);
    }
  };

  // Initial send
  sendQueue();

  // Heartbeat every 30s
  const heartbeat = setInterval(() => {
    res.write(':heartbeat\n\n');
  }, 30000);

  // MongoDB Change Stream
  const changeStream = EmergencyVisit.watch();
  changeStream.on('change', () => {
    sendQueue();
  });

  req.on('close', () => {
    clearInterval(heartbeat);
    changeStream.close();
    res.end();
  });
};

module.exports = {
  createVisit,
  assignTriage,
  getQueue,
  dispenseOverride,
  signOverride,
  streamQueue
};

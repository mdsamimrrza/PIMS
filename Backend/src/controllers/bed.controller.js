const bedService = require('../services/bed.service');

const getBedLayout = async (req, res, next) => {
  try {
    const data = await bedService.getBedLayout();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getAvailable = async (req, res, next) => {
  try {
    const { ward } = req.query;
    const data = await bedService.getAvailableBeds(ward);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const data = await bedService.updateBedStatus(id, status, req.session?.user?.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getSanitQueue = async (req, res, next) => {
  try {
    const data = await bedService.getSanitizationQueue();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBedLayout,
  getAvailable,
  updateStatus,
  getSanitQueue
};

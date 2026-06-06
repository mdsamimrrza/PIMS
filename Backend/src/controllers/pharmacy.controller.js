const { createPharmacyOrder, getPharmacyOrderById } = require('../services/pharmacy.service');

const createOrder = async (req, res, next) => {
  try {
    const pharmacistId = req.user.userId;
    const order = await createPharmacyOrder(pharmacistId, req.body);
    
    res.status(201).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

const getOrder = async (req, res, next) => {
  try {
    const order = await getPharmacyOrderById(req.params.id);
    
    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getOrder
};

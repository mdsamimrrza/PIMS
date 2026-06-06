const User = require('../models/User.model');
const { sendError } = require('../utils/responseHandler');

const verifyToken = async (req, res, next) => {
  try {
    const userId = req.session?.user?.id;

    if (!userId) {
      return sendError(res, 'Unauthorised', 401);
    }

    const user = await User.findById(userId);

    if (!user || !user.isActive) {
      return sendError(res, 'Unauthorised', 401);
    }

    req.user = user.toSafeObject();
    req.auth = { sessionId: req.sessionID };

    return next();
  } catch (error) {
    return sendError(res, error.message || 'Unauthorised', 401);
  }
};

module.exports = {
  verifyToken
};

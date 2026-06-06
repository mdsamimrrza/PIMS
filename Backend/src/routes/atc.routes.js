const express = require('express');
const router = express.Router();
const atcController = require('../controllers/atc.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const atcValidator = require('../validators/atc.validator');

router.use(verifyToken);
router.use(requireRole('doctor', 'admin'));

router.get('/tree', atcController.getTree);
router.get('/search', atcValidator.validateAtcSearchQuery, atcController.search);
router.get('/:code', atcValidator.validateAtcCodeParam, atcController.getByCode);

module.exports = router;

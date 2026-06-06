const ATCCode = require('../models/ATCCode.model');

const toPlain = (doc) => (doc && typeof doc.toObject === 'function' ? doc.toObject() : doc);

const buildTree = (nodes, parentCode = null) => {
  return nodes
    .filter((node) => (node.parentCode || null) === parentCode)
    .map((node) => ({
      ...node,
      children: buildTree(nodes, node.code),
    }));
};

const getAtcTree = async () => {
  const codes = await ATCCode.find().sort({ level: 1, code: 1 });
  const plainCodes = codes.map(toPlain);
  return buildTree(plainCodes);
};

const getAtcByCode = async (code) => {
  const node = await ATCCode.findOne({ code: String(code || '').trim().toUpperCase() });

  if (!node) {
    const error = new Error('ATC code not found');
    error.statusCode = 404;
    throw error;
  }

  const children = await ATCCode.find({ parentCode: node.code }).sort({ code: 1 });

  return {
    ...toPlain(node),
    children: children.map(toPlain),
  };
};

const searchAtc = async (query) => {
  const term = String(query || '').trim();

  if (!term) {
    return [];
  }

  const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const codes = await ATCCode.find({
    $or: [{ code: regex }, { name: regex }],
  }).sort({ level: 1, code: 1 });

  return codes.map(toPlain);
};

module.exports = {
  getAtcTree,
  getAtcByCode,
  searchAtc
};

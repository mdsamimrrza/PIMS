const DEFAULT_LIMIT = 20;
const DEFAULT_MAX_LIMIT = 100;

const getPagination = (filters = {}, options = {}) => {
  const defaultLimit = Number(options.defaultLimit) > 0 ? Number(options.defaultLimit) : DEFAULT_LIMIT;
  const maxLimit = Number(options.maxLimit) > 0 ? Number(options.maxLimit) : DEFAULT_MAX_LIMIT;
  const page = Math.max(1, Number(filters.page) || 1);
  const requestedLimit = Number(filters.limit) || defaultLimit;
  const limit = Math.min(maxLimit, Math.max(1, requestedLimit));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const buildPagination = ({ page, limit, total }) => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});

module.exports = {
  getPagination,
  buildPagination
};
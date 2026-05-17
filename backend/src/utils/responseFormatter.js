/**
 * src/utils/responseFormatter.js
 * Uniform API response wrapper.
 * All controllers use these helpers to ensure consistent JSON shape.
 */

/**
 * Send a success response.
 * @param {Response} res - Express response object
 * @param {number}   statusCode
 * @param {string}   message
 * @param {*}        data
 * @param {object}   meta  - optional pagination / extras
 */
export const sendSuccess = (res, statusCode = 200, message = 'OK', data = null, meta = null) => {
  const body = { success: true, message };
  if (data !== null) body.data = data;
  if (meta !== null) body.meta = meta;
  return res.status(statusCode).json(body);
};

/**
 * Send an error response.
 */
export const sendError = (res, statusCode = 500, message = 'Internal Server Error', errors = null) => {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

/**
 * Pagination helper — builds meta object from mongoose query results.
 */
export const paginateMeta = (page, limit, total) => ({
  page: parseInt(page),
  limit: parseInt(limit),
  total,
  pages: Math.ceil(total / limit),
});

// ============================================================
// utils/response.js — Standardized Response Formatter
// ============================================================

/**
 * Success response formatter
 */
function successResponse(data = null, message = 'Success', statusCode = 200) {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Error response formatter
 */
function errorResponse(error, statusCode = 500, details = null) {
  const message = typeof error === 'string' ? error : error.message || 'An error occurred';
  
  return {
    success: false,
    error: message,
    ...(details && { details }),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Paginated response formatter
 */
function paginatedResponse(items, total, page = 1, limit = 10) {
  return {
    success: true,
    data: items,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse
};

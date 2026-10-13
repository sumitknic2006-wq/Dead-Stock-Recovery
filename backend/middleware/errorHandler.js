/**
 * 404 Not Found Middleware
 * Handles requests to undefined API endpoints
 */
export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Cannot ${req.method} ${req.originalUrl} - Route not found`,
      statusCode: 404
    }
  });
};

/**
 * Centralized Error-Handling Middleware
 * Catches all unhandled exceptions and formats a consistent JSON error response
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  
  const response = {
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      statusCode: statusCode
    }
  };

  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
};
